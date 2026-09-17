package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/mhmadamrii/kommers/server/internal/middleware"
	"github.com/mhmadamrii/kommers/server/internal/model"
)

type CampaignHandler struct {
	DB *gorm.DB
}

func NewCampaignHandler(db *gorm.DB) *CampaignHandler {
	return &CampaignHandler{DB: db}
}

type campaignRequest struct {
	Name          string             `json:"name" binding:"required"`
	DiscountType  model.DiscountType `json:"discount_type" binding:"required,oneof=percent fixed"`
	DiscountValue int64              `json:"discount_value" binding:"required,gt=0"`
	StartsAt      time.Time          `json:"starts_at" binding:"required"`
	EndsAt        time.Time          `json:"ends_at" binding:"required"`
	StockLimit    *int               `json:"stock_limit" binding:"omitempty,gt=0"`
	FreeShipping  bool               `json:"free_shipping"`
	// Exactly one of these two must be set — a campaign targets either a
	// whole category or an explicit list of products, never both.
	CategoryID *uint  `json:"category_id"`
	ProductIDs []uint `json:"product_ids"`
}

type campaignResponse struct {
	ID            uint               `json:"id"`
	Name          string             `json:"name"`
	DiscountType  model.DiscountType `json:"discount_type"`
	DiscountValue int64              `json:"discount_value"`
	StartsAt      time.Time          `json:"starts_at"`
	EndsAt        time.Time          `json:"ends_at"`
	StockLimit    *int               `json:"stock_limit"`
	StockUsed     int                `json:"stock_used"`
	FreeShipping  bool               `json:"free_shipping"`
	IsActive      bool               `json:"is_active"`
	CategoryID    *uint              `json:"category_id,omitempty"`
	ProductIDs    []uint             `json:"product_ids,omitempty"`
	CreatedAt     time.Time          `json:"created_at"`
}

func newCampaignResponse(c model.Campaign) campaignResponse {
	productIDs := make([]uint, len(c.Products))
	for i, p := range c.Products {
		productIDs[i] = p.ID
	}
	return campaignResponse{
		ID:            c.ID,
		Name:          c.Name,
		DiscountType:  c.DiscountType,
		DiscountValue: c.DiscountValue,
		StartsAt:      c.StartsAt,
		EndsAt:        c.EndsAt,
		StockLimit:    c.StockLimit,
		StockUsed:     c.StockUsed,
		FreeShipping:  c.FreeShipping,
		IsActive:      c.IsActive,
		CategoryID:    c.CategoryID,
		ProductIDs:    productIDs,
		CreatedAt:     c.CreatedAt,
	}
}

// validateAndAuthorize checks the request shape and who's allowed to create
// it: a category-wide campaign spans other sellers' inventory, so only an
// admin may set one. A product-scoped campaign is fine for a seller as long
// as every listed product actually belongs to them.
func (h *CampaignHandler) validateAndAuthorize(c *gin.Context, req campaignRequest) (bool, string) {
	hasCategory := req.CategoryID != nil
	hasProducts := len(req.ProductIDs) > 0

	if hasCategory == hasProducts {
		return false, "set exactly one of category_id or product_ids"
	}
	if !req.EndsAt.After(req.StartsAt) {
		return false, "ends_at must be after starts_at"
	}
	if req.DiscountType == model.DiscountTypePercent && req.DiscountValue > 100 {
		return false, "percent discount_value must be between 1 and 100"
	}

	role, _ := c.MustGet(middleware.CtxRole).(model.Role)
	if role == model.RoleAdmin {
		return true, ""
	}

	if hasCategory {
		return false, "only an admin can create a category-wide campaign"
	}

	userID, _ := c.MustGet(middleware.CtxUserID).(uint)
	var count int64
	h.DB.Model(&model.Product{}).
		Where("id IN ? AND owner_id = ?", req.ProductIDs, userID).
		Count(&count)
	if int(count) != len(req.ProductIDs) {
		return false, "you can only run campaigns on your own products"
	}
	return true, ""
}

// authorizeOwner reports whether the authenticated user may mutate a
// campaign owned by ownerID: admins may touch any, sellers only their own.
func (h *CampaignHandler) authorizeOwner(c *gin.Context, ownerID uint) bool {
	if role, _ := c.MustGet(middleware.CtxRole).(model.Role); role == model.RoleAdmin {
		return true
	}
	if userID, _ := c.MustGet(middleware.CtxUserID).(uint); userID == ownerID {
		return true
	}
	c.JSON(http.StatusForbidden, gin.H{"error": "you do not own this campaign"})
	return false
}

// Create godoc
//
//	@Summary	Create a promotion campaign (admin: any target; seller: own products only)
//	@Tags		campaigns
//	@Security	BearerAuth
//	@Accept		json
//	@Produce	json
//	@Param		request	body		campaignRequest	true	"Campaign payload"
//	@Success	201		{object}	campaignResponse
//	@Failure	400		{object}	map[string]string
//	@Failure	401		{object}	map[string]string
//	@Failure	403		{object}	map[string]string
//	@Router		/api/v1/campaigns [post]
func (h *CampaignHandler) Create(c *gin.Context) {
	var req campaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if ok, reason := h.validateAndAuthorize(c, req); !ok {
		status := http.StatusBadRequest
		if reason == "only an admin can create a category-wide campaign" ||
			reason == "you can only run campaigns on your own products" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": reason})
		return
	}

	campaign := model.Campaign{
		Name:          req.Name,
		OwnerID:       c.MustGet(middleware.CtxUserID).(uint),
		DiscountType:  req.DiscountType,
		DiscountValue: req.DiscountValue,
		StartsAt:      req.StartsAt,
		EndsAt:        req.EndsAt,
		StockLimit:    req.StockLimit,
		FreeShipping:  req.FreeShipping,
		IsActive:      true,
		CategoryID:    req.CategoryID,
	}
	if len(req.ProductIDs) > 0 {
		products := make([]model.Product, len(req.ProductIDs))
		for i, id := range req.ProductIDs {
			products[i] = model.Product{Model: gorm.Model{ID: id}}
		}
		campaign.Products = products
	}

	if err := h.DB.Create(&campaign).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	h.DB.Preload("Products").First(&campaign, campaign.ID)

	c.JSON(http.StatusCreated, newCampaignResponse(campaign))
}

// List godoc
//
//	@Summary	List campaigns (admin sees all, seller sees their own)
//	@Tags		campaigns
//	@Security	BearerAuth
//	@Produce	json
//	@Success	200	{array}	campaignResponse
//	@Failure	401	{object}	map[string]string
//	@Router		/api/v1/campaigns [get]
func (h *CampaignHandler) List(c *gin.Context) {
	role, _ := c.MustGet(middleware.CtxRole).(model.Role)
	query := h.DB.Preload("Products").Order("id desc")
	if role != model.RoleAdmin {
		userID := c.MustGet(middleware.CtxUserID).(uint)
		query = query.Where("owner_id = ?", userID)
	}

	var campaigns []model.Campaign
	if err := query.Find(&campaigns).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	res := make([]campaignResponse, len(campaigns))
	for i, camp := range campaigns {
		res[i] = newCampaignResponse(camp)
	}
	c.JSON(http.StatusOK, res)
}

// Delete godoc
//
//	@Summary	Cancel a campaign (admin, or the owning seller)
//	@Tags		campaigns
//	@Security	BearerAuth
//	@Param		id	path	int	true	"Campaign ID"
//	@Success	204
//	@Failure	401	{object}	map[string]string
//	@Failure	403	{object}	map[string]string
//	@Failure	404	{object}	map[string]string
//	@Router		/api/v1/campaigns/{id} [delete]
func (h *CampaignHandler) Delete(c *gin.Context) {
	var campaign model.Campaign
	if err := h.DB.First(&campaign, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}
	if !h.authorizeOwner(c, campaign.OwnerID) {
		return
	}

	if err := h.DB.Delete(&campaign).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.Status(http.StatusNoContent)
}
