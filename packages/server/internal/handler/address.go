package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/mhmadamrii/kommers/server/internal/middleware"
	"github.com/mhmadamrii/kommers/server/internal/model"
)

type AddressHandler struct {
	DB *gorm.DB
}

func NewAddressHandler(db *gorm.DB) *AddressHandler {
	return &AddressHandler{DB: db}
}

type addressRequest struct {
	Label      string `json:"label"`
	Recipient  string `json:"recipient" binding:"required"`
	Phone      string `json:"phone" binding:"required"`
	Line1      string `json:"line1" binding:"required"`
	Line2      string `json:"line2"`
	City       string `json:"city" binding:"required"`
	State      string `json:"state"`
	PostalCode string `json:"postal_code" binding:"required"`
	Country    string `json:"country" binding:"required"`
	IsDefault  *bool  `json:"is_default"`
}

type addressResponse struct {
	ID         uint   `json:"id"`
	Label      string `json:"label"`
	Recipient  string `json:"recipient"`
	Phone      string `json:"phone"`
	Line1      string `json:"line1"`
	Line2      string `json:"line2"`
	City       string `json:"city"`
	State      string `json:"state"`
	PostalCode string `json:"postal_code"`
	Country    string `json:"country"`
	IsDefault  bool   `json:"is_default"`
}

func newAddressResponse(a model.Address) addressResponse {
	return addressResponse{
		ID:         a.ID,
		Label:      a.Label,
		Recipient:  a.Recipient,
		Phone:      a.Phone,
		Line1:      a.Line1,
		Line2:      a.Line2,
		City:       a.City,
		State:      a.State,
		PostalCode: a.PostalCode,
		Country:    a.Country,
		IsDefault:  a.IsDefault,
	}
}

// unsetOtherDefaults clears is_default on every other address belonging to userID.
func (h *AddressHandler) unsetOtherDefaults(userID uint, exceptID uint) error {
	return h.DB.Model(&model.Address{}).
		Where("user_id = ? AND id <> ?", userID, exceptID).
		Update("is_default", false).Error
}

// List godoc
//
//	@Summary	List the current user's addresses
//	@Tags		addresses
//	@Security	BearerAuth
//	@Produce	json
//	@Success	200	{array}	addressResponse
//	@Failure	401	{object}	map[string]string
//	@Router		/api/v1/me/addresses [get]
func (h *AddressHandler) List(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uint)

	var addresses []model.Address
	if err := h.DB.Where("user_id = ?", userID).Order("is_default desc, id asc").Find(&addresses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	res := make([]addressResponse, len(addresses))
	for i, a := range addresses {
		res[i] = newAddressResponse(a)
	}

	c.JSON(http.StatusOK, res)
}

// Create godoc
//
//	@Summary	Add a new address
//	@Tags		addresses
//	@Security	BearerAuth
//	@Accept		json
//	@Produce	json
//	@Param		request	body		addressRequest	true	"Address payload"
//	@Success	201		{object}	addressResponse
//	@Failure	400		{object}	map[string]string
//	@Failure	401		{object}	map[string]string
//	@Router		/api/v1/me/addresses [post]
func (h *AddressHandler) Create(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uint)

	var req addressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existingCount int64
	if err := h.DB.Model(&model.Address{}).Where("user_id = ?", userID).Count(&existingCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	isDefault := existingCount == 0
	if req.IsDefault != nil {
		isDefault = *req.IsDefault || isDefault
	}

	address := model.Address{
		UserID:     userID,
		Label:      req.Label,
		Recipient:  req.Recipient,
		Phone:      req.Phone,
		Line1:      req.Line1,
		Line2:      req.Line2,
		City:       req.City,
		State:      req.State,
		PostalCode: req.PostalCode,
		Country:    req.Country,
		IsDefault:  isDefault,
	}
	if err := h.DB.Create(&address).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	if isDefault {
		if err := h.unsetOtherDefaults(userID, address.ID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			return
		}
	}

	c.JSON(http.StatusCreated, newAddressResponse(address))
}

// Update godoc
//
//	@Summary	Update an address
//	@Tags		addresses
//	@Security	BearerAuth
//	@Accept		json
//	@Produce	json
//	@Param		id		path		int				true	"Address ID"
//	@Param		request	body		addressRequest	true	"Address payload"
//	@Success	200		{object}	addressResponse
//	@Failure	400		{object}	map[string]string
//	@Failure	401		{object}	map[string]string
//	@Failure	404		{object}	map[string]string
//	@Router		/api/v1/me/addresses/{id} [put]
func (h *AddressHandler) Update(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uint)

	var address model.Address
	if err := h.DB.Where("id = ? AND user_id = ?", c.Param("id"), userID).First(&address).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "address not found"})
		return
	}

	var req addressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	address.Label = req.Label
	address.Recipient = req.Recipient
	address.Phone = req.Phone
	address.Line1 = req.Line1
	address.Line2 = req.Line2
	address.City = req.City
	address.State = req.State
	address.PostalCode = req.PostalCode
	address.Country = req.Country
	if req.IsDefault != nil {
		address.IsDefault = *req.IsDefault
	}

	if err := h.DB.Save(&address).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	if address.IsDefault {
		if err := h.unsetOtherDefaults(userID, address.ID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			return
		}
	}

	c.JSON(http.StatusOK, newAddressResponse(address))
}

// Delete godoc
//
//	@Summary	Delete an address
//	@Tags		addresses
//	@Security	BearerAuth
//	@Param		id	path	int	true	"Address ID"
//	@Success	204
//	@Failure	401	{object}	map[string]string
//	@Failure	404	{object}	map[string]string
//	@Router		/api/v1/me/addresses/{id} [delete]
func (h *AddressHandler) Delete(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uint)

	result := h.DB.Where("id = ? AND user_id = ?", c.Param("id"), userID).Delete(&model.Address{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "address not found"})
		return
	}

	c.Status(http.StatusNoContent)
}
