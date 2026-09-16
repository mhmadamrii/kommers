package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/mhmadamrii/kommers/server/internal/middleware"
	"github.com/mhmadamrii/kommers/server/internal/model"
)

type SellerHandler struct {
	DB *gorm.DB
}

func NewSellerHandler(db *gorm.DB) *SellerHandler {
	return &SellerHandler{DB: db}
}

type applySellerRequest struct {
	AcceptTerms bool `json:"accept_terms" binding:"required"`
}

// Apply godoc
//
//	@Summary	Apply to become a seller
//	@Tags		sellers
//	@Security	BearerAuth
//	@Accept		json
//	@Produce	json
//	@Param		request	body		applySellerRequest	true	"Terms acceptance"
//	@Success	200		{object}	userResponse
//	@Failure	400		{object}	map[string]string
//	@Failure	401		{object}	map[string]string
//	@Failure	409		{object}	map[string]string
//	@Router		/api/v1/sellers/apply [post]
func (h *SellerHandler) Apply(c *gin.Context) {
	var req applySellerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "terms and conditions must be accepted"})
		return
	}

	userID := c.MustGet(middleware.CtxUserID).(uint)

	var user model.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	if user.Role == model.RoleSeller {
		c.JSON(http.StatusConflict, gin.H{"error": "already a seller"})
		return
	}
	if user.Role == model.RoleAdmin {
		c.JSON(http.StatusConflict, gin.H{"error": "admins cannot apply as sellers"})
		return
	}

	now := time.Now()
	user.Role = model.RoleSeller
	user.TermsAcceptedAt = &now

	if err := h.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.JSON(http.StatusOK, userResponse{
		ID:       user.ID,
		Email:    user.Email,
		FullName: user.FullName,
		Role:     user.Role,
	})
}
