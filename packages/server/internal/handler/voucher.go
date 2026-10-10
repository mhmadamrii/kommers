package handler

import (
	"errors"
	"net/http"
	"regexp"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/mhmadamrii/kommers/server/internal/middleware"
	"github.com/mhmadamrii/kommers/server/internal/model"
	"github.com/mhmadamrii/kommers/server/internal/pricing"
)

type VoucherHandler struct {
	DB *gorm.DB
}

func NewVoucherHandler(db *gorm.DB) *VoucherHandler {
	return &VoucherHandler{DB: db}
}

var voucherCodeRe = regexp.MustCompile(`^[A-Z0-9_-]{3,40}$`)

type voucherRequest struct {
	Code             string             `json:"code" binding:"required"`
	Name             string             `json:"name" binding:"required"`
	DiscountType     model.DiscountType `json:"discount_type" binding:"required,oneof=percent fixed"`
	DiscountValue    int64              `json:"discount_value" binding:"required,gt=0"`
	MaxDiscountCents *int64             `json:"max_discount_cents" binding:"omitempty,gt=0"`
	MinSpendCents    int64              `json:"min_spend_cents" binding:"gte=0"`
	UsageLimit       *int               `json:"usage_limit" binding:"omitempty,gt=0"`
	PerUserLimit     int                `json:"per_user_limit" binding:"omitempty,gt=0"`
	StartsAt         time.Time          `json:"starts_at" binding:"required"`
	EndsAt           time.Time          `json:"ends_at" binding:"required"`
}

type voucherResponse struct {
	ID               uint               `json:"id"`
	Code             string             `json:"code"`
	Name             string             `json:"name"`
	Scope            string             `json:"scope"` // "platform" (admin) or "seller"
	SellerName       string             `json:"seller_name,omitempty"`
	DiscountType     model.DiscountType `json:"discount_type"`
	DiscountValue    int64              `json:"discount_value"`
	MaxDiscountCents *int64             `json:"max_discount_cents,omitempty"`
	MinSpendCents    int64              `json:"min_spend_cents"`
	UsageLimit       *int               `json:"usage_limit"`
	UsedCount        int                `json:"used_count"`
	PerUserLimit     int                `json:"per_user_limit"`
	StartsAt         time.Time          `json:"starts_at"`
	EndsAt           time.Time          `json:"ends_at"`
	IsActive         bool               `json:"is_active"`
	// UsedByMe is only set on the buyer-facing available list.
	UsedByMe bool `json:"used_by_me"`
}

func newVoucherResponse(v model.Voucher) voucherResponse {
	scope := "seller"
	if v.Owner.Role == model.RoleAdmin {
		scope = "platform"
	}
	res := voucherResponse{
		ID: v.ID, Code: v.Code, Name: v.Name, Scope: scope,
		DiscountType: v.DiscountType, DiscountValue: v.DiscountValue,
		MaxDiscountCents: v.MaxDiscountCents, MinSpendCents: v.MinSpendCents,
		UsageLimit: v.UsageLimit, UsedCount: v.UsedCount, PerUserLimit: v.PerUserLimit,
		StartsAt: v.StartsAt, EndsAt: v.EndsAt, IsActive: v.IsActive,
	}
	if scope == "seller" {
		res.SellerName = v.Owner.FullName
	}
	return res
}

// Create godoc
//
//	@Summary	Create a voucher (admin: platform-wide; seller: own products only)
//	@Tags		vouchers
//	@Security	BearerAuth
//	@Accept		json
//	@Produce	json
//	@Param		request	body		voucherRequest	true	"Voucher payload"
//	@Success	201		{object}	voucherResponse
//	@Failure	400		{object}	map[string]string
//	@Failure	409		{object}	map[string]string
//	@Router		/api/v1/vouchers [post]
func (h *VoucherHandler) Create(c *gin.Context) {
	var req voucherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	code := pricing.NormalizeCode(req.Code)
	switch {
	case !voucherCodeRe.MatchString(code):
		c.JSON(http.StatusBadRequest, gin.H{"error": "code must be 3-40 letters, digits, - or _"})
		return
	case !req.EndsAt.After(req.StartsAt):
		c.JSON(http.StatusBadRequest, gin.H{"error": "ends_at must be after starts_at"})
		return
	case req.DiscountType == model.DiscountTypePercent && req.DiscountValue > 100:
		c.JSON(http.StatusBadRequest, gin.H{"error": "percent discount_value must be between 1 and 100"})
		return
	}
	if req.PerUserLimit == 0 {
		req.PerUserLimit = 1
	}

	v := model.Voucher{
		Code:             code,
		Name:             req.Name,
		OwnerID:          c.MustGet(middleware.CtxUserID).(uint),
		DiscountType:     req.DiscountType,
		DiscountValue:    req.DiscountValue,
		MaxDiscountCents: req.MaxDiscountCents,
		MinSpendCents:    req.MinSpendCents,
		UsageLimit:       req.UsageLimit,
		PerUserLimit:     req.PerUserLimit,
		StartsAt:         req.StartsAt,
		EndsAt:           req.EndsAt,
		IsActive:         true,
	}
	if err := h.DB.Create(&v).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			c.JSON(http.StatusConflict, gin.H{"error": "voucher code already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	h.DB.Preload("Owner").First(&v, v.ID)
	c.JSON(http.StatusCreated, newVoucherResponse(v))
}

// List godoc
//
//	@Summary	List vouchers (admin sees all, seller sees their own)
//	@Tags		vouchers
//	@Security	BearerAuth
//	@Produce	json
//	@Success	200	{array}	voucherResponse
//	@Router		/api/v1/vouchers [get]
func (h *VoucherHandler) List(c *gin.Context) {
	role, _ := c.MustGet(middleware.CtxRole).(model.Role)
	query := h.DB.Preload("Owner").Order("id desc")
	if role != model.RoleAdmin {
		query = query.Where("owner_id = ?", c.MustGet(middleware.CtxUserID).(uint))
	}
	var vouchers []model.Voucher
	if err := query.Find(&vouchers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	res := make([]voucherResponse, len(vouchers))
	for i, v := range vouchers {
		res[i] = newVoucherResponse(v)
	}
	c.JSON(http.StatusOK, res)
}

// Delete godoc
//
//	@Summary	Delete a voucher (admin, or the owning seller)
//	@Tags		vouchers
//	@Security	BearerAuth
//	@Param		id	path	int	true	"Voucher ID"
//	@Success	204
//	@Failure	403	{object}	map[string]string
//	@Failure	404	{object}	map[string]string
//	@Router		/api/v1/vouchers/{id} [delete]
func (h *VoucherHandler) Delete(c *gin.Context) {
	var v model.Voucher
	if err := h.DB.First(&v, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "voucher not found"})
		return
	}
	role, _ := c.MustGet(middleware.CtxRole).(model.Role)
	if role != model.RoleAdmin && v.OwnerID != c.MustGet(middleware.CtxUserID).(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "you do not own this voucher"})
		return
	}
	if err := h.DB.Delete(&v).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.Status(http.StatusNoContent)
}

// Available godoc
//
//	@Summary	List vouchers a buyer can currently use
//	@Tags		vouchers
//	@Security	BearerAuth
//	@Produce	json
//	@Success	200	{array}	voucherResponse
//	@Router		/api/v1/me/vouchers [get]
func (h *VoucherHandler) Available(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uint)
	now := time.Now()

	var vouchers []model.Voucher
	if err := h.DB.Preload("Owner").
		Where("is_active = ? AND starts_at <= ? AND ends_at >= ?", true, now, now).
		Where("usage_limit IS NULL OR used_count < usage_limit").
		Order("ends_at asc").Find(&vouchers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	type usage struct {
		VoucherID uint
		N         int
	}
	var usages []usage
	h.DB.Model(&model.VoucherRedemption{}).Select("voucher_id, count(*) as n").
		Where("user_id = ?", userID).Group("voucher_id").Scan(&usages)
	used := map[uint]int{}
	for _, u := range usages {
		used[u.VoucherID] = u.N
	}

	res := make([]voucherResponse, 0, len(vouchers))
	for _, v := range vouchers {
		r := newVoucherResponse(v)
		r.UsedByMe = used[v.ID] >= v.PerUserLimit
		res = append(res, r)
	}
	c.JSON(http.StatusOK, res)
}

type validateVoucherRequest struct {
	Code string `json:"code" binding:"required"`
}

type validateVoucherResponse struct {
	Code          string `json:"code"`
	Name          string `json:"name"`
	SubtotalCents int64  `json:"subtotal_cents"`
	DiscountCents int64  `json:"discount_cents"`
	TotalCents    int64  `json:"total_cents"`
}

// Validate godoc
//
//	@Summary	Preview a voucher against the current cart
//	@Tags		vouchers
//	@Security	BearerAuth
//	@Accept		json
//	@Produce	json
//	@Param		request	body		validateVoucherRequest	true	"Voucher code"
//	@Success	200		{object}	validateVoucherResponse
//	@Failure	400		{object}	map[string]string
//	@Failure	404		{object}	map[string]string
//	@Router		/api/v1/vouchers/validate [post]
func (h *VoucherHandler) Validate(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uint)
	var req validateVoucherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var v model.Voucher
	if err := h.DB.Where("code = ?", pricing.NormalizeCode(req.Code)).First(&v).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": pricing.ErrVoucherNotFound.Error()})
		return
	}
	if err := pricing.CheckVoucherUsable(h.DB, v, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var cart model.Cart
	if err := h.DB.Preload("Items.Product").Where("user_id = ?", userID).First(&cart).Error; err != nil || len(cart.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cart is empty"})
		return
	}
	campaigns, err := pricing.LiveCampaigns(h.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	lines := make([]pricing.Line, len(cart.Items))
	var subtotal int64
	for i, item := range cart.Items {
		price, _, _ := pricing.Effective(campaigns, item.Product)
		lines[i] = pricing.Line{OwnerID: item.Product.OwnerID, SubtotalCents: price * int64(item.Quantity)}
		subtotal += lines[i].SubtotalCents
	}

	discount, err := pricing.VoucherDiscount(v, pricing.OwnerIsAdmin(h.DB, v), lines)
	if err != nil {
		var minErr *pricing.MinSpendError
		if errors.As(err, &minErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "min_spend_cents": minErr.MinCents})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, validateVoucherResponse{
		Code: v.Code, Name: v.Name,
		SubtotalCents: subtotal, DiscountCents: discount, TotalCents: subtotal - discount,
	})
}
