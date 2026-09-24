package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/mhmadamrii/kommers/server/internal/middleware"
	"github.com/mhmadamrii/kommers/server/internal/model"
	"github.com/mhmadamrii/kommers/server/internal/pricing"
)

// WishlistHandler formats saved products through ProductHandler's response
// builders instead of duplicating them — a wishlisted product renders with
// the exact same shape (effective_price_cents, campaign, rating) a buyer
// already sees on GET /products, just filtered to what they saved.
type WishlistHandler struct {
	DB      *gorm.DB
	Product *ProductHandler
}

func NewWishlistHandler(db *gorm.DB, productHandler *ProductHandler) *WishlistHandler {
	return &WishlistHandler{DB: db, Product: productHandler}
}

// List godoc
//
//	@Summary	List the authenticated user's saved products
//	@Tags		wishlist
//	@Security	BearerAuth
//	@Produce	json
//	@Success	200	{array}	productResponse
//	@Failure	401	{object}	map[string]string
//	@Router		/api/v1/me/wishlist [get]
func (h *WishlistHandler) List(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uint)

	var items []model.WishlistItem
	if err := h.DB.
		Preload("Product.Owner").Preload("Product.Images").
		Where("user_id = ?", userID).
		Order("id desc").
		Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	// Preload applies the Product's own default scope (soft-delete aware),
	// so a product removed after being wishlisted comes back as a zero
	// value here rather than being silently excluded by the query above —
	// drop those rather than rendering a fake empty product card.
	products := make([]model.Product, 0, len(items))
	for _, item := range items {
		if item.Product.ID != 0 {
			products = append(products, item.Product)
		}
	}

	campaigns, err := pricing.LiveCampaigns(h.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	ratings := h.Product.ratingStatsFor(productIDs(products))

	c.JSON(http.StatusOK, h.Product.newProductListResponse(products, campaigns, ratings))
}

// Add godoc
//
//	@Summary	Save a product to the authenticated user's wishlist
//	@Tags		wishlist
//	@Security	BearerAuth
//	@Param		product_id	path	int	true	"Product ID"
//	@Success	204
//	@Failure	401	{object}	map[string]string
//	@Failure	404	{object}	map[string]string
//	@Router		/api/v1/wishlist/{product_id} [post]
func (h *WishlistHandler) Add(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uint)

	productID, err := strconv.ParseUint(c.Param("product_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid product id"})
		return
	}

	var product model.Product
	if err := h.DB.First(&product, productID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	item := model.WishlistItem{UserID: userID, ProductID: uint(productID)}
	// Idempotent: re-saving an already-wishlisted product is a no-op
	// success, not a conflict — a heart button toggled twice by a double
	// click should never surface a 409 for what the user experiences as
	// "yes, still saved".
	if err := h.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.Status(http.StatusNoContent)
}

// Remove godoc
//
//	@Summary	Remove a product from the authenticated user's wishlist
//	@Tags		wishlist
//	@Security	BearerAuth
//	@Param		product_id	path	int	true	"Product ID"
//	@Success	204
//	@Failure	401	{object}	map[string]string
//	@Router		/api/v1/wishlist/{product_id} [delete]
func (h *WishlistHandler) Remove(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uint)

	// Unscoped: same trap as CartItem (see CLAUDE.md) — the
	// (user_id, product_id) unique index doesn't know about deleted_at, so
	// a soft-deleted row would still occupy the slot and block re-saving
	// the same product later.
	if err := h.DB.Unscoped().
		Where("user_id = ? AND product_id = ?", userID, c.Param("product_id")).
		Delete(&model.WishlistItem{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.Status(http.StatusNoContent)
}
