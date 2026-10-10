package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/mhmadamrii/kommers/server/internal/model"
	"github.com/mhmadamrii/kommers/server/internal/pricing"
)

// FlashSaleHandler is the public, buyer-facing view of Campaigns: the same
// time-boxed, stock-capped promotions merchants already create, surfaced with
// a countdown and "units left" so the storefront can show them as flash sales.
type FlashSaleHandler struct {
	DB      *gorm.DB
	Product *ProductHandler
}

func NewFlashSaleHandler(db *gorm.DB, productHandler *ProductHandler) *FlashSaleHandler {
	return &FlashSaleHandler{DB: db, Product: productHandler}
}

// How far ahead an upcoming campaign is teased on the storefront.
const flashSaleTeaserWindow = 24 * time.Hour

// Max products shown per category-wide campaign.
const flashSaleCategoryProductLimit = 12

type flashSaleProduct struct {
	productResponse
	SalePriceCents int64 `json:"sale_price_cents"`
}

type flashSaleResponse struct {
	ID            uint               `json:"id"`
	Name          string             `json:"name"`
	Status        string             `json:"status"` // "live" | "upcoming"
	DiscountType  model.DiscountType `json:"discount_type"`
	DiscountValue int64              `json:"discount_value"`
	StartsAt      time.Time          `json:"starts_at"`
	EndsAt        time.Time          `json:"ends_at"`
	FreeShipping  bool               `json:"free_shipping"`
	StockLimit    *int               `json:"stock_limit"`
	StockUsed     int                `json:"stock_used"`
	Products      []flashSaleProduct `json:"products"`
}

// List godoc
//
//	@Summary	List live and soon-starting flash sales (public)
//	@Tags		flash-sales
//	@Produce	json
//	@Success	200	{array}	flashSaleResponse
//	@Router		/api/v1/flash-sales [get]
func (h *FlashSaleHandler) List(c *gin.Context) {
	now := time.Now()

	var campaigns []model.Campaign
	if err := h.DB.Preload("Products", "is_active = ?", true).
		Preload("Products.Owner").Preload("Products.Images").
		Where("is_active = ? AND ends_at >= ? AND starts_at <= ?", true, now, now.Add(flashSaleTeaserWindow)).
		Where("stock_limit IS NULL OR stock_used < stock_limit").
		Order("starts_at asc").Find(&campaigns).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	live, err := pricing.LiveCampaigns(h.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	res := make([]flashSaleResponse, 0, len(campaigns))
	for _, camp := range campaigns {
		products := camp.Products
		if camp.CategoryID != nil {
			h.DB.Preload("Owner").Preload("Images").
				Where("is_active = ? AND category_id = ?", true, *camp.CategoryID).
				Order("id desc").Limit(flashSaleCategoryProductLimit).Find(&products)
		}
		if len(products) == 0 {
			continue
		}

		ratings := h.Product.ratingStatsFor(productIDs(products))
		items := make([]flashSaleProduct, len(products))
		for i, p := range products {
			items[i] = flashSaleProduct{
				productResponse: h.Product.newProductResponse(p, live, ratings),
				SalePriceCents:  camp.DiscountedPrice(p.PriceCents),
			}
		}

		status := "live"
		if now.Before(camp.StartsAt) {
			status = "upcoming"
		}
		res = append(res, flashSaleResponse{
			ID: camp.ID, Name: camp.Name, Status: status,
			DiscountType: camp.DiscountType, DiscountValue: camp.DiscountValue,
			StartsAt: camp.StartsAt, EndsAt: camp.EndsAt, FreeShipping: camp.FreeShipping,
			StockLimit: camp.StockLimit, StockUsed: camp.StockUsed, Products: items,
		})
	}

	c.JSON(http.StatusOK, res)
}
