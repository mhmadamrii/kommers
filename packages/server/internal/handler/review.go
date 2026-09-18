package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/mhmadamrii/kommers/server/internal/middleware"
	"github.com/mhmadamrii/kommers/server/internal/model"
	"github.com/mhmadamrii/kommers/server/internal/storage"
)

type ReviewHandler struct {
	DB            *gorm.DB
	Storage       *storage.Client
	PublicURLBase string
	Bucket        string
}

func NewReviewHandler(db *gorm.DB, storageClient *storage.Client, publicURLBase, bucket string) *ReviewHandler {
	return &ReviewHandler{DB: db, Storage: storageClient, PublicURLBase: publicURLBase, Bucket: bucket}
}

type reviewRequest struct {
	Rating  int    `json:"rating" binding:"required,gte=1,lte=5"`
	Comment string `json:"comment"`
}

type reviewImageResponse struct {
	ID  uint   `json:"id"`
	URL string `json:"url"`
}

type reviewResponse struct {
	ID           uint                  `json:"id"`
	ProductID    uint                  `json:"product_id"`
	Rating       int                   `json:"rating"`
	Comment      string                `json:"comment"`
	ReviewerName string                `json:"reviewer_name"`
	Images       []reviewImageResponse `json:"images"`
	CreatedAt    time.Time             `json:"created_at"`
}

func (h *ReviewHandler) newReviewResponse(r model.Review) reviewResponse {
	images := make([]reviewImageResponse, len(r.Images))
	for i, img := range r.Images {
		images[i] = reviewImageResponse{ID: img.ID, URL: storage.BuildPublicURL(h.PublicURLBase, h.Bucket, img.ObjectKey)}
	}
	return reviewResponse{
		ID:           r.ID,
		ProductID:    r.ProductID,
		Rating:       r.Rating,
		Comment:      r.Comment,
		ReviewerName: r.User.FullName,
		Images:       images,
		CreatedAt:    r.CreatedAt,
	}
}

// resolveProductBySlug looks up a product by slug, regardless of is_active —
// a buyer who already purchased/reviewed it shouldn't lose that history if
// the seller later deactivates the listing.
func (h *ReviewHandler) resolveProductBySlug(slug string) (model.Product, error) {
	var product model.Product
	err := h.DB.Where("slug = ?", slug).First(&product).Error
	return product, err
}

// hasPurchased reports whether userID has a non-cancelled order containing productID.
func (h *ReviewHandler) hasPurchased(userID, productID uint) (bool, error) {
	var count int64
	err := h.DB.Table("order_items").
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("orders.user_id = ? AND order_items.product_id = ? AND orders.status <> ?", userID, productID, model.OrderStatusCancelled).
		Count(&count).Error
	return count > 0, err
}

// List godoc
//
//	@Summary	List a product's reviews
//	@Tags		reviews
//	@Produce	json
//	@Param		slug	path		string	true	"Product slug"
//	@Success	200		{array}		reviewResponse
//	@Failure	404		{object}	map[string]string
//	@Router		/api/v1/products/{slug}/reviews [get]
func (h *ReviewHandler) List(c *gin.Context) {
	product, err := h.resolveProductBySlug(c.Param("slug"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	var reviews []model.Review
	if err := h.DB.Preload("User").Preload("Images").
		Where("product_id = ?", product.ID).
		Order("id desc").
		Find(&reviews).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	res := make([]reviewResponse, len(reviews))
	for i, r := range reviews {
		res[i] = h.newReviewResponse(r)
	}
	c.JSON(http.StatusOK, res)
}

type reviewEligibilityResponse struct {
	CanReview       bool `json:"can_review"`
	AlreadyReviewed bool `json:"already_reviewed"`
}

// Eligibility godoc
//
//	@Summary	Whether the authenticated user can review a product (purchased it, hasn't reviewed yet)
//	@Tags		reviews
//	@Security	BearerAuth
//	@Produce	json
//	@Param		slug	path		string	true	"Product slug"
//	@Success	200		{object}	reviewEligibilityResponse
//	@Failure	404		{object}	map[string]string
//	@Router		/api/v1/products/{slug}/reviews/eligibility [get]
func (h *ReviewHandler) Eligibility(c *gin.Context) {
	product, err := h.resolveProductBySlug(c.Param("slug"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}
	userID := c.MustGet(middleware.CtxUserID).(uint)

	purchased, err := h.hasPurchased(userID, product.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	var reviewCount int64
	if err := h.DB.Model(&model.Review{}).
		Where("product_id = ? AND user_id = ?", product.ID, userID).
		Count(&reviewCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.JSON(http.StatusOK, reviewEligibilityResponse{
		CanReview:       purchased && reviewCount == 0,
		AlreadyReviewed: reviewCount > 0,
	})
}

// Create godoc
//
//	@Summary	Review a product you've purchased (one review per buyer per product)
//	@Tags		reviews
//	@Security	BearerAuth
//	@Accept		json
//	@Produce	json
//	@Param		slug	path		string			true	"Product slug"
//	@Param		request	body		reviewRequest	true	"Review payload"
//	@Success	201		{object}	reviewResponse
//	@Failure	400		{object}	map[string]string
//	@Failure	403		{object}	map[string]string
//	@Failure	404		{object}	map[string]string
//	@Failure	409		{object}	map[string]string
//	@Router		/api/v1/products/{slug}/reviews [post]
func (h *ReviewHandler) Create(c *gin.Context) {
	// Registered on the POST tree as :id (see router.go) — same URL as the
	// GET routes' :slug, still a slug value, just a different Gin param key.
	product, err := h.resolveProductBySlug(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}
	userID := c.MustGet(middleware.CtxUserID).(uint)

	var req reviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	purchased, err := h.hasPurchased(userID, product.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	if !purchased {
		c.JSON(http.StatusForbidden, gin.H{"error": "you can only review products you've purchased"})
		return
	}

	var existing model.Review
	err = h.DB.Where("product_id = ? AND user_id = ?", product.ID, userID).First(&existing).Error
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "you already reviewed this product"})
		return
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	review := model.Review{
		ProductID: product.ID,
		UserID:    userID,
		Rating:    req.Rating,
		Comment:   req.Comment,
	}
	if err := h.DB.Create(&review).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	h.DB.Preload("User").Preload("Images").First(&review, review.ID)

	c.JSON(http.StatusCreated, h.newReviewResponse(review))
}

// UploadImages godoc
//
//	@Summary	Upload photos for your own review (uploadable any time after the review exists)
//	@Tags		reviews
//	@Security	BearerAuth
//	@Accept		multipart/form-data
//	@Produce	json
//	@Param		id		path		int		true	"Review ID"
//	@Param		images	formData	file	true	"Image files (field name: images)"
//	@Success	201		{object}	reviewResponse
//	@Failure	400		{object}	map[string]string
//	@Failure	403		{object}	map[string]string
//	@Failure	404		{object}	map[string]string
//	@Failure	503		{object}	map[string]string
//	@Router		/api/v1/reviews/{id}/images [post]
func (h *ReviewHandler) UploadImages(c *gin.Context) {
	if h.Storage == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "image storage unavailable"})
		return
	}

	userID := c.MustGet(middleware.CtxUserID).(uint)

	var review model.Review
	if err := h.DB.First(&review, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "review not found"})
		return
	}
	if review.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "you do not own this review"})
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "expected multipart/form-data"})
		return
	}
	files := form.File["images"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no images provided (field name: images)"})
		return
	}

	var existingCount int64
	if err := h.DB.Model(&model.ReviewImage{}).Where("review_id = ?", review.ID).Count(&existingCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	for i, fileHeader := range files {
		if fileHeader.Size > maxImageSizeBytes {
			c.JSON(http.StatusBadRequest, gin.H{"error": fileHeader.Filename + " exceeds 5MB limit"})
			return
		}
		contentType := fileHeader.Header.Get("Content-Type")
		if !allowedImageContentTypes[contentType] {
			c.JSON(http.StatusBadRequest, gin.H{"error": fileHeader.Filename + " must be jpeg, png, webp, or gif"})
			return
		}

		file, err := fileHeader.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			return
		}

		objectKey, err := h.Storage.Upload(c.Request.Context(), fileHeader.Filename, contentType, fileHeader.Size, file)
		file.Close()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			return
		}

		image := model.ReviewImage{ReviewID: review.ID, ObjectKey: objectKey, SortOrder: int(existingCount) + i}
		if err := h.DB.Create(&image).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			return
		}
	}

	h.DB.Preload("User").Preload("Images").First(&review, review.ID)
	c.JSON(http.StatusCreated, h.newReviewResponse(review))
}
