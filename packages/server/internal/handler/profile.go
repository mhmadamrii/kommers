package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/mhmadamrii/kommers/server/internal/middleware"
	"github.com/mhmadamrii/kommers/server/internal/model"
)

type ProfileHandler struct {
	DB *gorm.DB
}

func NewProfileHandler(db *gorm.DB) *ProfileHandler {
	return &ProfileHandler{DB: db}
}

type updateProfileRequest struct {
	FullName string `json:"full_name" binding:"required"`
}

// GetMe godoc
//
//	@Summary	Get the current user's profile
//	@Tags		profile
//	@Security	BearerAuth
//	@Produce	json
//	@Success	200	{object}	userResponse
//	@Failure	401	{object}	map[string]string
//	@Router		/api/v1/me [get]
func (h *ProfileHandler) GetMe(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uint)

	var user model.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	c.JSON(http.StatusOK, userResponse{
		ID:       user.ID,
		Email:    user.Email,
		FullName: user.FullName,
		Role:     user.Role,
	})
}

// UpdateMe godoc
//
//	@Summary	Update the current user's profile
//	@Tags		profile
//	@Security	BearerAuth
//	@Accept		json
//	@Produce	json
//	@Param		request	body		updateProfileRequest	true	"Profile payload"
//	@Success	200		{object}	userResponse
//	@Failure	400		{object}	map[string]string
//	@Failure	401		{object}	map[string]string
//	@Router		/api/v1/me [put]
func (h *ProfileHandler) UpdateMe(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uint)

	var req updateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user model.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	user.FullName = req.FullName
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
