package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/webhook"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/mhmadamrii/kommers/server/internal/event"
	"github.com/mhmadamrii/kommers/server/internal/middleware"
	"github.com/mhmadamrii/kommers/server/internal/model"
	"github.com/mhmadamrii/kommers/server/internal/payment"
	"github.com/mhmadamrii/kommers/server/internal/pricing"
	"github.com/mhmadamrii/kommers/server/internal/storage"
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
	// Stripe nil disables checkout payment (503), same down-dependency
	// pattern as Storage/RabbitMQ elsewhere in this codebase — a missing
	// STRIPE_SECRET_KEY must never crash boot.
	Stripe              *payment.StripeClient
	StripeWebhookSecret string
	FrontendURL         string
	// PublicURLBase/Bucket build order-item image URLs — same pattern as
	// CartHandler, kept separate rather than shared since each handler owns
	// its own tiny image-URL-picking helper.
	PublicURLBase string
	Bucket        string
}

func NewOrderHandler(db *gorm.DB, events OrderEventPublisher, stripeClient *payment.StripeClient, stripeWebhookSecret, frontendURL, publicURLBase, bucket string) *OrderHandler {
	return &OrderHandler{
		DB:                  db,
		Events:              events,
		Stripe:              stripeClient,
		StripeWebhookSecret: stripeWebhookSecret,
		FrontendURL:         frontendURL,
		PublicURLBase:       publicURLBase,
		Bucket:              bucket,
	}
}

// primaryImageURL picks a product's primary image (falling back to the
// first by sort order) — mirrors CartHandler's ordering so order history
// shows the same thumbnail as everywhere else.
func (h *OrderHandler) primaryImageURL(images []model.ProductImage) string {
	if len(images) == 0 {
		return ""
	}
	best := images[0]
	for _, img := range images[1:] {
		if img.IsPrimary && !best.IsPrimary {
			best = img
		} else if img.IsPrimary == best.IsPrimary && img.SortOrder < best.SortOrder {
			best = img
		}
	}
	return storage.BuildPublicURL(h.PublicURLBase, h.Bucket, best.ObjectKey)
}

type checkoutRequest struct {
	AddressID uint `json:"address_id" binding:"required"`
}

type orderItemResponse struct {
	ID            uint   `json:"id"`
	ProductID     uint   `json:"product_id"`
	ProductSlug   string `json:"product_slug"`
	ProductName   string `json:"product_name"`
	ImageURL      string `json:"image_url"`
	SellerName    string `json:"seller_name"`
	Quantity      int    `json:"quantity"`
	PriceCents    int64  `json:"price_cents"`
	CampaignID    *uint  `json:"campaign_id,omitempty"`
	SubtotalCents int64  `json:"subtotal_cents"`
}

type orderResponse struct {
	ID            uint                `json:"id"`
	Status        model.OrderStatus   `json:"status"`
	PaymentStatus model.PaymentStatus `json:"payment_status"`
	AddressID     uint                `json:"address_id"`
	Address       *addressResponse    `json:"address,omitempty"`
	Currency      string              `json:"currency"`
	TotalCents    int64               `json:"total_cents"`
	Items         []orderItemResponse `json:"items"`
	CreatedAt     time.Time           `json:"created_at"`
}

// checkoutResponse is only returned by Checkout — CheckoutURL is where the
// frontend redirects the browser to pay; List/GetByID never need it again.
type checkoutResponse struct {
	orderResponse
	CheckoutURL string `json:"checkout_url"`
}

func (h *OrderHandler) newOrderResponse(o model.Order) orderResponse {
	items := make([]orderItemResponse, len(o.Items))
	for i, item := range o.Items {
		items[i] = orderItemResponse{
			ID:            item.ID,
			ProductID:     item.ProductID,
			ProductSlug:   item.Product.Slug,
			ProductName:   item.ProductName,
			ImageURL:      h.primaryImageURL(item.Product.Images),
			SellerName:    item.Product.Owner.FullName,
			Quantity:      item.Quantity,
			PriceCents:    item.PriceCents,
			CampaignID:    item.CampaignID,
			SubtotalCents: item.SubtotalCents,
		}
	}

	res := orderResponse{
		ID:            o.ID,
		Status:        o.Status,
		PaymentStatus: o.PaymentStatus,
		AddressID:     o.AddressID,
		Currency:      o.Currency,
		TotalCents:    o.TotalCents,
		Items:         items,
		CreatedAt:     o.CreatedAt,
	}
	if o.Address.ID != 0 {
		addr := newAddressResponse(o.Address)
		res.Address = &addr
	}
	return res
}

// Checkout godoc
//
//	@Summary	Convert the current cart into an order and start a Stripe Checkout Session
//	@Tags		orders
//	@Security	BearerAuth
//	@Accept		json
//	@Produce	json
//	@Param		request	body		checkoutRequest	true	"Checkout payload"
//	@Success	201		{object}	checkoutResponse
//	@Failure	400		{object}	map[string]string
//	@Failure	401		{object}	map[string]string
//	@Failure	404		{object}	map[string]string
//	@Failure	409		{object}	map[string]string
//	@Failure	502		{object}	map[string]string
//	@Failure	503		{object}	map[string]string
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

		// Candidate campaigns are read once outside the per-item lock; the
		// actual authoritative check (still live, stock not exhausted) happens
		// per-item below by re-locking that specific campaign row, same
		// pattern as the product stock lock.
		candidateCampaigns, err := pricing.LiveCampaigns(tx)
		if err != nil {
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

			// Price is recomputed fresh here, never trusted from the cart
			// snapshot — a promo that ended or sold out between add-to-cart
			// and checkout must not still apply.
			priceCents := product.PriceCents
			var campaignID *uint

			if candidate := pricing.BestFor(candidateCampaigns, product); candidate != nil {
				var campaign model.Campaign
				if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&campaign, candidate.ID).Error; err == nil {
					if campaign.IsLive(time.Now()) {
						fits := campaign.StockLimit == nil || *campaign.StockLimit-campaign.StockUsed >= item.Quantity
						if fits {
							priceCents = campaign.DiscountedPrice(product.PriceCents)
							campaign.StockUsed += item.Quantity
							if err := tx.Save(&campaign).Error; err != nil {
								return err
							}
							cid := campaign.ID
							campaignID = &cid
						}
						// Not enough campaign stock left for the whole line:
						// v1 doesn't split one line across two price tiers,
						// so this item simply checks out at the base price.
					}
				}
			}

			subtotal := priceCents * int64(item.Quantity)
			total += subtotal
			orderItem := model.OrderItem{
				OrderID:       order.ID,
				ProductID:     item.ProductID,
				ProductName:   item.Product.Name,
				Quantity:      item.Quantity,
				PriceCents:    priceCents,
				CampaignID:    campaignID,
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

	h.DB.Preload("Items.Product.Owner").Preload("Items.Product.Images").Preload("Address").First(&order, order.ID)

	if h.Stripe == nil {
		if err := h.restoreStockAndCancel(order, model.OrderStatusCancelled, model.PaymentStatusFailed); err != nil {
			slog.Error("restore stock after stripe unavailable failed", "order_id", order.ID, "error", err)
		}
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "payment processing unavailable"})
		return
	}

	lineItems := make([]payment.CheckoutLineItem, len(order.Items))
	for i, item := range order.Items {
		lineItems[i] = payment.CheckoutLineItem{
			Name:       item.ProductName,
			UnitAmount: item.PriceCents,
			Quantity:   int64(item.Quantity),
		}
	}

	successURL := fmt.Sprintf("%s/orders/%d?payment=success", h.FrontendURL, order.ID)
	cancelURL := fmt.Sprintf("%s/orders/%d?payment=cancelled", h.FrontendURL, order.ID)

	session, currencyUsed, err := h.Stripe.CreateCheckoutSessionWithFallback(
		c.Request.Context(), "idr", "usd", lineItems, successURL, cancelURL,
		map[string]string{"order_id": strconv.FormatUint(uint64(order.ID), 10)},
	)
	if err != nil {
		slog.Error("create stripe checkout session failed", "order_id", order.ID, "error", err)
		if rbErr := h.restoreStockAndCancel(order, model.OrderStatusCancelled, model.PaymentStatusFailed); rbErr != nil {
			slog.Error("restore stock after stripe session failure failed", "order_id", order.ID, "error", rbErr)
		}
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to start payment: " + err.Error()})
		return
	}

	order.PaymentProvider = "stripe"
	order.PaymentRef = session.ID
	order.Currency = currencyUsed
	if err := h.DB.Save(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

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

	c.JSON(http.StatusCreated, checkoutResponse{orderResponse: h.newOrderResponse(order), CheckoutURL: session.URL})
}

// restoreStockAndCancel reverses the stock (and campaign stock_used) decrement
// from a Checkout run and marks the order terminal — used both when payment
// setup itself fails and when a Stripe session expires unpaid.
func (h *OrderHandler) restoreStockAndCancel(order model.Order, newStatus model.OrderStatus, newPaymentStatus model.PaymentStatus) error {
	return h.DB.Transaction(func(tx *gorm.DB) error {
		var items []model.OrderItem
		if err := tx.Where("order_id = ?", order.ID).Find(&items).Error; err != nil {
			return err
		}
		for _, item := range items {
			if err := tx.Model(&model.Product{}).Where("id = ?", item.ProductID).
				UpdateColumn("stock", gorm.Expr("stock + ?", item.Quantity)).Error; err != nil {
				return err
			}
			if item.CampaignID != nil {
				if err := tx.Model(&model.Campaign{}).Where("id = ?", *item.CampaignID).
					UpdateColumn("stock_used", gorm.Expr("stock_used - ?", item.Quantity)).Error; err != nil {
					return err
				}
			}
		}
		return tx.Model(&model.Order{}).Where("id = ?", order.ID).
			Updates(map[string]interface{}{"status": newStatus, "payment_status": newPaymentStatus}).Error
	})
}

// StripeWebhook godoc
//
//	@Summary	Stripe webhook receiver (checkout.session.completed / checkout.session.expired)
//	@Tags		orders
//	@Accept		json
//	@Produce	json
//	@Success	200
//	@Failure	400	{object}	map[string]string
//	@Router		/api/v1/webhooks/stripe [post]
func (h *OrderHandler) StripeWebhook(c *gin.Context) {
	payloadBytes, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	evt, err := webhook.ConstructEvent(payloadBytes, c.GetHeader("Stripe-Signature"), h.StripeWebhookSecret)
	if err != nil {
		slog.Error("stripe webhook signature verification failed", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid signature"})
		return
	}

	switch evt.Type {
	case "checkout.session.completed":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(evt.Data.Raw, &session); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "malformed payload"})
			return
		}
		if err := h.DB.Model(&model.Order{}).
			Where("payment_ref = ?", session.ID).
			Updates(map[string]interface{}{
				"status":         model.OrderStatusPaid,
				"payment_status": model.PaymentStatusPaid,
			}).Error; err != nil {
			slog.Error("mark order paid failed", "session_id", session.ID, "error", err)
		}

	case "checkout.session.expired":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(evt.Data.Raw, &session); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "malformed payload"})
			return
		}
		var order model.Order
		err := h.DB.Where("payment_ref = ? AND status = ?", session.ID, model.OrderStatusPending).First(&order).Error
		if err == nil {
			if restoreErr := h.restoreStockAndCancel(order, model.OrderStatusCancelled, model.PaymentStatusFailed); restoreErr != nil {
				slog.Error("restore stock after session expiry failed", "order_id", order.ID, "error", restoreErr)
			}
		}
	}

	c.Status(http.StatusOK)
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
	if err := h.DB.Preload("Items.Product.Owner").Preload("Items.Product.Images").Preload("Address").
		Where("user_id = ?", userID).Order("id desc").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	res := make([]orderResponse, len(orders))
	for i, o := range orders {
		res[i] = h.newOrderResponse(o)
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
	query := h.DB.Preload("Items.Product.Owner").Preload("Items.Product.Images").Preload("Address")
	if role != model.RoleAdmin {
		query = query.Where("user_id = ?", userID)
	}
	if err := query.First(&order, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	c.JSON(http.StatusOK, h.newOrderResponse(order))
}
