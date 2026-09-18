package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/mhmadamrii/kommers/server/internal/middleware"
	"github.com/mhmadamrii/kommers/server/internal/model"
	"github.com/mhmadamrii/kommers/server/internal/pricing"
	"github.com/mhmadamrii/kommers/server/internal/storage"
)

type CartHandler struct {
	DB            *gorm.DB
	PublicURLBase string
	Bucket        string
}

func NewCartHandler(db *gorm.DB, publicURLBase, bucket string) *CartHandler {
	return &CartHandler{DB: db, PublicURLBase: publicURLBase, Bucket: bucket}
}

// primaryImageURL picks the product's primary image (falling back to the
// first by sort order) — mirrors ProductHandler's ordering so the cart shows
// the same thumbnail as the product listing.
func (h *CartHandler) primaryImageURL(images []model.ProductImage) string {
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

type addCartItemRequest struct {
	ProductID uint `json:"product_id" binding:"required"`
	Quantity  int  `json:"quantity" binding:"required,gt=0"`
}

type updateCartItemRequest struct {
	Quantity int `json:"quantity" binding:"required,gt=0"`
}

type cartItemResponse struct {
	ID            uint   `json:"id"`
	ProductID     uint   `json:"product_id"`
	ProductName   string `json:"product_name"`
	ProductSlug   string `json:"product_slug"`
	ImageURL      string `json:"image_url"`
	Quantity      int    `json:"quantity"`
	PriceCents    int64  `json:"price_cents"`
	SubtotalCents int64  `json:"subtotal_cents"`
}

type cartResponse struct {
	ID         uint               `json:"id"`
	Items      []cartItemResponse `json:"items"`
	TotalCents int64              `json:"total_cents"`
}

func (h *CartHandler) newCartResponse(cart model.Cart) cartResponse {
	items := make([]cartItemResponse, len(cart.Items))
	var total int64
	for i, item := range cart.Items {
		subtotal := item.PriceCents * int64(item.Quantity)
		total += subtotal
		items[i] = cartItemResponse{
			ID:            item.ID,
			ProductID:     item.ProductID,
			ProductName:   item.Product.Name,
			ProductSlug:   item.Product.Slug,
			ImageURL:      h.primaryImageURL(item.Product.Images),
			Quantity:      item.Quantity,
			PriceCents:    item.PriceCents,
			SubtotalCents: subtotal,
		}
	}
	return cartResponse{ID: cart.ID, Items: items, TotalCents: total}
}

func (h *CartHandler) getOrCreateCart(userID uint) (*model.Cart, error) {
	var cart model.Cart
	err := h.DB.Preload("Items.Product.Images").Where("user_id = ?", userID).First(&cart).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		cart = model.Cart{UserID: &userID}
		if err := h.DB.Create(&cart).Error; err != nil {
			return nil, err
		}
		return &cart, nil
	}
	if err != nil {
		return nil, err
	}
	return &cart, nil
}

// Get godoc
//
//	@Summary	Get the current user's cart
//	@Tags		cart
//	@Security	BearerAuth
//	@Produce	json
//	@Success	200	{object}	cartResponse
//	@Failure	401	{object}	map[string]string
//	@Router		/api/v1/cart [get]
func (h *CartHandler) Get(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uint)

	cart, err := h.getOrCreateCart(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.JSON(http.StatusOK, h.newCartResponse(*cart))
}

// AddItem godoc
//
//	@Summary	Add a product to the cart (or increase quantity if already present)
//	@Tags		cart
//	@Security	BearerAuth
//	@Accept		json
//	@Produce	json
//	@Param		request	body		addCartItemRequest	true	"Item payload"
//	@Success	200		{object}	cartResponse
//	@Failure	400		{object}	map[string]string
//	@Failure	401		{object}	map[string]string
//	@Failure	404		{object}	map[string]string
//	@Failure	409		{object}	map[string]string
//	@Router		/api/v1/cart/items [post]
func (h *CartHandler) AddItem(c *gin.Context) {
	var req addCartItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.MustGet(middleware.CtxUserID).(uint)

	var product model.Product
	if err := h.DB.Where("is_active = ?", true).First(&product, req.ProductID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	campaigns, err := pricing.LiveCampaigns(h.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	effectivePrice, _, _ := pricing.Effective(campaigns, product)

	cart, err := h.getOrCreateCart(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	var item model.CartItem
	err = h.DB.Where("cart_id = ? AND product_id = ?", cart.ID, product.ID).First(&item).Error
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		if product.Stock < req.Quantity {
			c.JSON(http.StatusConflict, gin.H{"error": "insufficient stock"})
			return
		}
		item = model.CartItem{
			CartID:     cart.ID,
			ProductID:  product.ID,
			Quantity:   req.Quantity,
			PriceCents: effectivePrice,
		}
		if err := h.DB.Create(&item).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			return
		}
	case err == nil:
		newQuantity := item.Quantity + req.Quantity
		if product.Stock < newQuantity {
			c.JSON(http.StatusConflict, gin.H{"error": "insufficient stock"})
			return
		}
		item.Quantity = newQuantity
		item.PriceCents = effectivePrice
		if err := h.DB.Save(&item).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			return
		}
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	cart, err = h.getOrCreateCart(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.JSON(http.StatusOK, h.newCartResponse(*cart))
}

// UpdateItem godoc
//
//	@Summary	Update a cart item's quantity
//	@Tags		cart
//	@Security	BearerAuth
//	@Accept		json
//	@Produce	json
//	@Param		id		path		int						true	"Cart item ID"
//	@Param		request	body		updateCartItemRequest	true	"Quantity payload"
//	@Success	200		{object}	cartResponse
//	@Failure	400		{object}	map[string]string
//	@Failure	401		{object}	map[string]string
//	@Failure	404		{object}	map[string]string
//	@Failure	409		{object}	map[string]string
//	@Router		/api/v1/cart/items/{id} [put]
func (h *CartHandler) UpdateItem(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uint)

	var item model.CartItem
	if err := h.DB.Preload("Product").First(&item, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "cart item not found"})
		return
	}

	var cart model.Cart
	if err := h.DB.First(&cart, item.CartID).Error; err != nil || cart.UserID == nil || *cart.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "cart item not found"})
		return
	}

	var req updateCartItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if item.Product.Stock < req.Quantity {
		c.JSON(http.StatusConflict, gin.H{"error": "insufficient stock"})
		return
	}

	campaigns, err := pricing.LiveCampaigns(h.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	effectivePrice, _, _ := pricing.Effective(campaigns, item.Product)

	item.Quantity = req.Quantity
	item.PriceCents = effectivePrice
	if err := h.DB.Save(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	updatedCart, err := h.getOrCreateCart(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.JSON(http.StatusOK, h.newCartResponse(*updatedCart))
}

// RemoveItem godoc
//
//	@Summary	Remove an item from the cart
//	@Tags		cart
//	@Security	BearerAuth
//	@Param		id	path	int	true	"Cart item ID"
//	@Success	204
//	@Failure	401	{object}	map[string]string
//	@Failure	404	{object}	map[string]string
//	@Router		/api/v1/cart/items/{id} [delete]
func (h *CartHandler) RemoveItem(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uint)

	var item model.CartItem
	if err := h.DB.First(&item, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "cart item not found"})
		return
	}

	var cart model.Cart
	if err := h.DB.First(&cart, item.CartID).Error; err != nil || cart.UserID == nil || *cart.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "cart item not found"})
		return
	}

	// Hard delete: a soft-deleted row would still hold the (cart_id, product_id)
	// unique slot and collide if the same product is added back later.
	if err := h.DB.Unscoped().Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.Status(http.StatusNoContent)
}
