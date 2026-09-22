package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/mhmadamrii/kommers/server/internal/middleware"
	"github.com/mhmadamrii/kommers/server/internal/model"
	"github.com/mhmadamrii/kommers/server/internal/token"
)

type AuthHandler struct {
	DB           *gorm.DB
	JWTSecret    string
	JWTExpiry    time.Duration
	CookieDomain string
	CookieSecure bool
	// CookieSameSite comes from config — "lax" only survives when the web
	// app and the API are the same site, which is local development only.
	CookieSameSite http.SameSite
}

func NewAuthHandler(db *gorm.DB, jwtSecret string, jwtExpiry time.Duration, cookieDomain string, cookieSecure bool, cookieSameSite http.SameSite) *AuthHandler {
	return &AuthHandler{
		DB:             db,
		JWTSecret:      jwtSecret,
		JWTExpiry:      jwtExpiry,
		CookieDomain:   cookieDomain,
		CookieSecure:   cookieSecure,
		CookieSameSite: cookieSameSite,
	}
}

type registerRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	FullName string `json:"full_name" binding:"required"`
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type authResponse struct {
	Token string       `json:"token"`
	User  userResponse `json:"user"`
}

type userResponse struct {
	ID       uint       `json:"id"`
	Email    string     `json:"email"`
	FullName string     `json:"full_name"`
	Role     model.Role `json:"role"`
}

// Register godoc
//
//	@Summary	Create a new user account
//	@Tags		auth
//	@Accept		json
//	@Produce	json
//	@Param		request	body		registerRequest	true	"Registration payload"
//	@Success	201		{object}	authResponse
//	@Failure	400		{object}	map[string]string
//	@Failure	409		{object}	map[string]string
//	@Router		/api/v1/auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existing model.User
	if err := h.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
		return
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	user := model.User{
		Email:        req.Email,
		PasswordHash: string(hash),
		FullName:     req.FullName,
		Role:         model.RoleCustomer,
	}
	if err := h.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	h.respondWithToken(c, http.StatusCreated, user)
}

// Login godoc
//
//	@Summary	Authenticate and receive a JWT
//	@Tags		auth
//	@Accept		json
//	@Produce	json
//	@Param		request	body		loginRequest	true	"Login payload"
//	@Success	200		{object}	authResponse
//	@Failure	400		{object}	map[string]string
//	@Failure	401		{object}	map[string]string
//	@Router		/api/v1/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user model.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	h.respondWithToken(c, http.StatusOK, user)
}

// Logout godoc
//
//	@Summary	Clear the auth cookie
//	@Tags		auth
//	@Success	204
//	@Router		/api/v1/auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	// Must match the attributes Set used, or the browser treats this as a
	// different cookie and leaves the original in place.
	c.SetSameSite(h.CookieSameSite)
	c.SetCookie(middleware.CookieName, "", -1, "/", h.CookieDomain, h.CookieSecure, true)
	c.Status(http.StatusNoContent)
}

func (h *AuthHandler) respondWithToken(c *gin.Context, status int, user model.User) {
	tok, err := token.Generate(h.JWTSecret, h.JWTExpiry, user.ID, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.SetSameSite(h.CookieSameSite)
	c.SetCookie(
		middleware.CookieName,
		tok,
		int(h.JWTExpiry.Seconds()),
		"/",
		h.CookieDomain,
		h.CookieSecure,
		true, // httpOnly
	)

	c.JSON(status, authResponse{
		Token: tok,
		User: userResponse{
			ID:       user.ID,
			Email:    user.Email,
			FullName: user.FullName,
			Role:     user.Role,
		},
	})
}
