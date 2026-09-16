package handler

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/mhmadamrii/kommers/server/internal/event"
	"github.com/mhmadamrii/kommers/server/internal/middleware"
	"github.com/mhmadamrii/kommers/server/internal/model"
)

// OrderEventPublisher is satisfied by *broker.Publisher. Kept as an
// interface so this package doesn't depend on the AMQP client, and so
// OrderHandler works fine with it left nil (broker unavailable).
type OrderEventPublisher interface {
	PublishOrderCreated(ctx context.Context, evt event.OrderCreatedEvent) error
}

type OrderHandler struct {
	DB     *gorm.DB
	Events OrderEventPublisher
}

func NewOrderHandler(db *gorm.DB, events OrderEventPublisher) *OrderHandler {
	return &OrderHandler{DB: db, Events: events}
}

type checkoutRequest struct {
	AddressID uint `json:"address_id" binding:"required"`
}

type orderItemResponse struct {
	ID            uint   `json:"id"`
	ProductID     uint   `json:"product_id"`
	ProductName   string `json:"product_name"`
	Quantity      int    `json:"quantity"`
	PriceCents    int64  `json:"price_cents"`
	SubtotalCents int64  `json:"subtotal_cents"`
}

type orderResponse struct {
	ID            uint                `json:"id"`
	Status        model.OrderStatus   `json:"status"`
	PaymentStatus model.PaymentStatus `json:"payment_status"`
	AddressID     uint                `json:"address_id"`
	TotalCents    int64               `json:"total_cents"`
	Items         []orderItemResponse `json:"items"`
	CreatedAt     time.Time           `json:"created_at"`
}

func newOrderResponse(o model.Order) orderResponse {
	items := make([]orderItemResponse, len(o.Items))
	for i, item := range o.Items {
		items[i] = orderItemResponse{
			ID:            item.ID,
			ProductID:     item.ProductID,
			ProductName:   item.ProductName,
			Quantity:      item.Quantity,
			PriceCents:    item.PriceCents,
			SubtotalCents: item.SubtotalCents,
		}
	}
	return orderResponse{
		ID:            o.ID,
		Status:        o.Status,
		PaymentStatus: o.PaymentStatus,
		AddressID:     o.AddressID,
		TotalCents:    o.TotalCents,
		Items:         items,
		CreatedAt:     o.CreatedAt,
	}
}

// Checkout godoc
//
//	@Summary	Convert the current cart into an order (payment integration pending)
//	@Tags		orders
//	@Security	BearerAuth
//	@Accept		json
//	@Produce	json
//	@Param		request	body		checkoutRequest	true	"Checkout payload"
//	@Success	201		{object}	orderResponse
//	@Failure	400		{object}	map[string]string
//	@Failure	401		{object}	map[string]string
//	@Failure	404		{object}	map[string]string
//	@Failure	409		{object}	map[string]string
//	@Router		/api/v1/checkout [post]
func (h *OrderHandler) Checkout(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uint)

	var req checkoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var address model.Address
	if err := h.DB.Where("id = ? AND user_id = ?", req.AddressID, userID).First(&address).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "address not found"})
		return
	}

	var cart model.Cart
	if err := h.DB.Preload("Items.Product").Where("user_id = ?", userID).First(&cart).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cart is empty"})
		return
	}
	if len(cart.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cart is empty"})
		return
	}

	var order model.Order
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		order = model.Order{
			UserID:        userID,
			AddressID:     address.ID,
			Status:        model.OrderStatusPending,
			PaymentStatus: model.PaymentStatusPending,
		}
		if err := tx.Create(&order).Error; err != nil {
			return err
		}

		var total int64
		for _, item := range cart.Items {
			// Lock the row so two concurrent checkouts can't both read stale stock
			// and both succeed past the check below (overselling).
			var product model.Product
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&product, item.ProductID).Error; err != nil {
				return errors.New("product not found: " + item.Product.Name)
			}
			if product.Stock < item.Quantity {
				return errors.New("insufficient stock for " + product.Name)
			}

			product.Stock -= item.Quantity
			if err := tx.Save(&product).Error; err != nil {
				return err
			}

			subtotal := item.PriceCents * int64(item.Quantity)
			total += subtotal
			orderItem := model.OrderItem{
				OrderID:       order.ID,
				ProductID:     item.ProductID,
				ProductName:   item.Product.Name,
				Quantity:      item.Quantity,
				PriceCents:    item.PriceCents,
				SubtotalCents: subtotal,
			}
			if err := tx.Create(&orderItem).Error; err != nil {
				return err
			}
		}

		order.TotalCents = total
		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		// Hard delete: soft-deleted rows would collide with the (cart_id, product_id)
		// unique index if the buyer adds the same product to their next cart.
		if err := tx.Unscoped().Where("cart_id = ?", cart.ID).Delete(&model.CartItem{}).Error; err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	h.DB.Preload("Items").First(&order, order.ID)

	// Best-effort: a down/unreachable broker must never fail checkout.
	if h.Events != nil {
		var user model.User
		if err := h.DB.First(&user, userID).Error; err == nil {
			evt := event.OrderCreatedEvent{
				OrderID:    order.ID,
				UserID:     order.UserID,
				UserEmail:  user.Email,
				TotalCents: order.TotalCents,
				CreatedAt:  order.CreatedAt,
			}
			if err := h.Events.PublishOrderCreated(c.Request.Context(), evt); err != nil {
				slog.Error("publish order.created failed", "order_id", order.ID, "error", err)
			}
		}
	}

	c.JSON(http.StatusCreated, newOrderResponse(order))
}

// List godoc
//
//	@Summary	List the current user's orders
//	@Tags		orders
//	@Security	BearerAuth
//	@Produce	json
//	@Success	200	{array}	orderResponse
//	@Failure	401	{object}	map[string]string
//	@Router		/api/v1/orders [get]
func (h *OrderHandler) List(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uint)

	var orders []model.Order
	if err := h.DB.Preload("Items").Where("user_id = ?", userID).Order("id desc").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	res := make([]orderResponse, len(orders))
	for i, o := range orders {
		res[i] = newOrderResponse(o)
	}

	c.JSON(http.StatusOK, res)
}

// GetByID godoc
//
//	@Summary	Get an order by ID
//	@Tags		orders
//	@Security	BearerAuth
//	@Produce	json
//	@Param		id	path		int	true	"Order ID"
//	@Success	200	{object}	orderResponse
//	@Failure	401	{object}	map[string]string
//	@Failure	404	{object}	map[string]string
//	@Router		/api/v1/orders/{id} [get]
func (h *OrderHandler) GetByID(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uint)
	role, _ := c.MustGet(middleware.CtxRole).(model.Role)

	var order model.Order
	query := h.DB.Preload("Items")
	if role != model.RoleAdmin {
		query = query.Where("user_id = ?", userID)
	}
	if err := query.First(&order, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	c.JSON(http.StatusOK, newOrderResponse(order))
}
