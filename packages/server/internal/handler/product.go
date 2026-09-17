package handler

import (
	"errors"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/mhmadamrii/kommers/server/internal/middleware"
	"github.com/mhmadamrii/kommers/server/internal/model"
)

type ProductHandler struct {
	DB *gorm.DB
}

func NewProductHandler(db *gorm.DB) *ProductHandler {
	return &ProductHandler{DB: db}
}

type productRequest struct {
	CategoryID         uint   `json:"category_id" binding:"required"`
	Name               string `json:"name" binding:"required"`
	Description        string `json:"description"`
	PriceCents         int64  `json:"price_cents" binding:"required,gt=0"`
	OriginalPriceCents *int64 `json:"original_price_cents"`
	Stock              int    `json:"stock" binding:"gte=0"`
	ImageURL           string `json:"image_url"`
	IsActive           *bool  `json:"is_active"`
	Location           string `json:"location"`
	FreeShipping       bool   `json:"free_shipping"`
}

type ownerResponse struct {
	ID       uint   `json:"id"`
	Email    string `json:"email"`
	FullName string `json:"full_name"`
}

type productResponse struct {
	ID                 uint          `json:"id"`
	CategoryID         uint          `json:"category_id"`
	Owner              ownerResponse `json:"owner"`
	Name               string        `json:"name"`
	Slug               string        `json:"slug"`
	Description        string        `json:"description"`
	PriceCents         int64         `json:"price_cents"`
	OriginalPriceCents *int64        `json:"original_price_cents,omitempty"`
	Stock              int           `json:"stock"`
	ImageURL           string        `json:"image_url"`
	IsActive           bool          `json:"is_active"`
	Location           string        `json:"location"`
	FreeShipping       bool          `json:"free_shipping"`
	CreatedAt          time.Time     `json:"created_at"`
	UpdatedAt          time.Time     `json:"updated_at"`
}

func newProductResponse(p model.Product) productResponse {
	return productResponse{
		ID:         p.ID,
		CategoryID: p.CategoryID,
		Owner: ownerResponse{
			ID:       p.Owner.ID,
			Email:    p.Owner.Email,
			FullName: p.Owner.FullName,
		},
		Name:               p.Name,
		Slug:               p.Slug,
		Description:        p.Description,
		PriceCents:         p.PriceCents,
		OriginalPriceCents: p.OriginalPriceCents,
		Stock:              p.Stock,
		ImageURL:           p.ImageURL,
		IsActive:           p.IsActive,
		Location:           p.Location,
		FreeShipping:       p.FreeShipping,
		CreatedAt:          p.CreatedAt,
		UpdatedAt:          p.UpdatedAt,
	}
}

func newProductListResponse(products []model.Product) []productResponse {
	res := make([]productResponse, len(products))
	for i, p := range products {
		res[i] = newProductResponse(p)
	}
	return res
}

// authorizeOwner reports whether the authenticated user may mutate a product
// owned by ownerID: admins may touch any product, sellers only their own.
func (h *ProductHandler) authorizeOwner(c *gin.Context, ownerID uint) bool {
	if role, _ := c.MustGet(middleware.CtxRole).(model.Role); role == model.RoleAdmin {
		return true
	}
	if userID, _ := c.MustGet(middleware.CtxUserID).(uint); userID == ownerID {
		return true
	}
	c.JSON(http.StatusForbidden, gin.H{"error": "you do not own this product"})
	return false
}

var slugSanitizer = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	slug := slugSanitizer.ReplaceAllString(strings.ToLower(s), "-")
	return strings.Trim(slug, "-")
}

// List godoc
//
//	@Summary	List active products
//	@Tags		products
//	@Produce	json
//	@Param		page		query		int		false	"Page number"		default(1)
//	@Param		limit		query		int		false	"Page size"			default(20)
//	@Param		category_id	query		int		false	"Filter by category"
//	@Param		q			query		string	false	"Search by product name"
//	@Success	200			{array}		productResponse
//	@Router		/api/v1/products [get]
func (h *ProductHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	query := h.DB.Preload("Owner").Where("is_active = ?", true)

	if categoryID, err := strconv.Atoi(c.Query("category_id")); err == nil && categoryID > 0 {
		query = query.Where("category_id = ?", categoryID)
	}
	if q := strings.TrimSpace(c.Query("q")); q != "" {
		query = query.Where("name ILIKE ?", "%"+q+"%")
	}

	var products []model.Product
	if err := query.
		Limit(limit).Offset((page - 1) * limit).
		Order("id desc").
		Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.JSON(http.StatusOK, newProductListResponse(products))
}

// GetBySlug godoc
//
//	@Summary	Get an active product by slug
//	@Tags		products
//	@Produce	json
//	@Param		slug	path		string	true	"Product slug"
//	@Success	200		{object}	productResponse
//	@Failure	404		{object}	map[string]string
//	@Router		/api/v1/products/{slug} [get]
func (h *ProductHandler) GetBySlug(c *gin.Context) {
	var product model.Product
	if err := h.DB.Preload("Owner").Where("slug = ? AND is_active = ?", c.Param("slug"), true).First(&product).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	c.JSON(http.StatusOK, newProductResponse(product))
}

// Create godoc
//
//	@Summary	Create a product (admin or seller — becomes the owner)
//	@Tags		products
//	@Security	BearerAuth
//	@Accept		json
//	@Produce	json
//	@Param		request	body		productRequest	true	"Product payload"
//	@Success	201		{object}	productResponse
//	@Failure	400		{object}	map[string]string
//	@Failure	401		{object}	map[string]string
//	@Failure	403		{object}	map[string]string
//	@Router		/api/v1/products [post]
func (h *ProductHandler) Create(c *gin.Context) {
	var req productRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var category model.Category
	if err := h.DB.First(&category, req.CategoryID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "category not found"})
		return
	}

	slug := slugify(req.Name)
	var existing model.Product
	if err := h.DB.Where("slug = ?", slug).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "product with a similar name already exists"})
		return
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	product := model.Product{
		CategoryID:         req.CategoryID,
		OwnerID:            c.MustGet(middleware.CtxUserID).(uint),
		Name:               req.Name,
		Slug:               slug,
		Description:        req.Description,
		PriceCents:         req.PriceCents,
		OriginalPriceCents: req.OriginalPriceCents,
		Stock:              req.Stock,
		ImageURL:           req.ImageURL,
		IsActive:           isActive,
		Location:           req.Location,
		FreeShipping:       req.FreeShipping,
	}
	if err := h.DB.Create(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	h.DB.Preload("Owner").First(&product, product.ID)

	c.JSON(http.StatusCreated, newProductResponse(product))
}

// Update godoc
//
//	@Summary	Update a product (admin, or the owning seller)
//	@Tags		products
//	@Security	BearerAuth
//	@Accept		json
//	@Produce	json
//	@Param		id		path		int				true	"Product ID"
//	@Param		request	body		productRequest	true	"Product payload"
//	@Success	200		{object}	productResponse
//	@Failure	400		{object}	map[string]string
//	@Failure	401		{object}	map[string]string
//	@Failure	403		{object}	map[string]string
//	@Failure	404		{object}	map[string]string
//	@Router		/api/v1/products/{id} [put]
func (h *ProductHandler) Update(c *gin.Context) {
	var product model.Product
	if err := h.DB.Preload("Owner").First(&product, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}
	if !h.authorizeOwner(c, product.OwnerID) {
		return
	}

	var req productRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var category model.Category
	if err := h.DB.First(&category, req.CategoryID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "category not found"})
		return
	}

	slug := slugify(req.Name)
	var existing model.Product
	if err := h.DB.Where("slug = ? AND id <> ?", slug, product.ID).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "product with a similar name already exists"})
		return
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	isActive := product.IsActive
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	product.CategoryID = req.CategoryID
	product.Name = req.Name
	product.Slug = slug
	product.Description = req.Description
	product.PriceCents = req.PriceCents
	product.OriginalPriceCents = req.OriginalPriceCents
	product.Stock = req.Stock
	product.ImageURL = req.ImageURL
	product.IsActive = isActive
	product.Location = req.Location
	product.FreeShipping = req.FreeShipping

	if err := h.DB.Save(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.JSON(http.StatusOK, newProductResponse(product))
}

// Delete godoc
//
//	@Summary	Delete a product (admin, or the owning seller)
//	@Tags		products
//	@Security	BearerAuth
//	@Param		id	path	int	true	"Product ID"
//	@Success	204
//	@Failure	401	{object}	map[string]string
//	@Failure	403	{object}	map[string]string
//	@Failure	404	{object}	map[string]string
//	@Router		/api/v1/products/{id} [delete]
func (h *ProductHandler) Delete(c *gin.Context) {
	var product model.Product
	if err := h.DB.First(&product, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}
	if !h.authorizeOwner(c, product.OwnerID) {
		return
	}

	if err := h.DB.Delete(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.Status(http.StatusNoContent)
}
