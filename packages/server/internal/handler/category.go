package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/mhmadamrii/kommers/server/internal/model"
)

type CategoryHandler struct {
	DB *gorm.DB
}

func NewCategoryHandler(db *gorm.DB) *CategoryHandler {
	return &CategoryHandler{DB: db}
}

type categoryRequest struct {
	Name string `json:"name" binding:"required"`
}

type categoryResponse struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

func newCategoryResponse(c model.Category) categoryResponse {
	return categoryResponse{ID: c.ID, Name: c.Name, Slug: c.Slug}
}

// List godoc
//
//	@Summary	List categories
//	@Tags		categories
//	@Produce	json
//	@Success	200	{array}	categoryResponse
//	@Router		/api/v1/categories [get]
func (h *CategoryHandler) List(c *gin.Context) {
	var categories []model.Category
	if err := h.DB.Order("name asc").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	res := make([]categoryResponse, len(categories))
	for i, cat := range categories {
		res[i] = newCategoryResponse(cat)
	}

	c.JSON(http.StatusOK, res)
}

// Create godoc
//
//	@Summary	Create a category (admin only)
//	@Tags		categories
//	@Security	BearerAuth
//	@Accept		json
//	@Produce	json
//	@Param		request	body		categoryRequest	true	"Category payload"
//	@Success	201		{object}	categoryResponse
//	@Failure	400		{object}	map[string]string
//	@Failure	401		{object}	map[string]string
//	@Failure	403		{object}	map[string]string
//	@Failure	409		{object}	map[string]string
//	@Router		/api/v1/categories [post]
func (h *CategoryHandler) Create(c *gin.Context) {
	var req categoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	slug := slugify(req.Name)
	var existing model.Category
	if err := h.DB.Where("slug = ?", slug).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "category with a similar name already exists"})
		return
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	category := model.Category{Name: req.Name, Slug: slug}
	if err := h.DB.Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.JSON(http.StatusCreated, newCategoryResponse(category))
}
