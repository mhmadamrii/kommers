package router

import (
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"gorm.io/gorm"

	"github.com/mhmadamrii/kommers/server/internal/config"
	"github.com/mhmadamrii/kommers/server/internal/handler"
	"github.com/mhmadamrii/kommers/server/internal/middleware"
	"github.com/mhmadamrii/kommers/server/internal/model"
	"github.com/mhmadamrii/kommers/server/internal/payment"
	"github.com/mhmadamrii/kommers/server/internal/storage"
)

func New(db *gorm.DB, cfg config.Config, events handler.OrderEventPublisher, storageClient *storage.Client) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery(), middleware.Logger(), middleware.CORS(cfg.CORSAllowedOrigins))

	r.GET("/healthz", handler.Healthz)
	r.GET("/readyz", handler.Readyz)
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	jwtSecret := cfg.JWTSecret
	jwtExpiry := cfg.JWTExpiry

	authHandler := handler.NewAuthHandler(db, jwtSecret, jwtExpiry, cfg.CookieDomain, cfg.CookieSecure)
	productHandler := handler.NewProductHandler(db, storageClient, cfg.S3PublicURL, cfg.S3Bucket)
	sellerHandler := handler.NewSellerHandler(db)
	categoryHandler := handler.NewCategoryHandler(db)
	cartHandler := handler.NewCartHandler(db, cfg.S3PublicURL, cfg.S3Bucket)
	profileHandler := handler.NewProfileHandler(db)
	addressHandler := handler.NewAddressHandler(db)

	// StripeSecretKey empty (not configured) leaves stripeClient nil —
	// OrderHandler.Checkout then 503s instead of the server failing to boot.
	var stripeClient *payment.StripeClient
	if cfg.StripeSecretKey != "" {
		stripeClient = payment.NewStripeClient(cfg.StripeSecretKey)
	}
	orderHandler := handler.NewOrderHandler(db, events, stripeClient, cfg.StripeWebhookSecret, cfg.FrontendURL, cfg.S3PublicURL, cfg.S3Bucket)
	campaignHandler := handler.NewCampaignHandler(db)
	reviewHandler := handler.NewReviewHandler(db, storageClient, cfg.S3PublicURL, cfg.S3Bucket)

	v1 := r.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authHandler.Logout)
		}

		products := v1.Group("/products")
		{
			products.GET("", productHandler.List)
			products.GET("/:slug", productHandler.GetBySlug)

			admin := products.Group("")
			admin.Use(middleware.RequireAuth(jwtSecret), middleware.RequireRole(model.RoleAdmin, model.RoleSeller))
			{
				admin.POST("", productHandler.Create)
				admin.PUT("/:id", productHandler.Update)
				admin.DELETE("/:id", productHandler.Delete)
				admin.POST("/:id/images", productHandler.UploadImages)
				admin.DELETE("/:id/images/:image_id", productHandler.DeleteImage)
			}

			// Gin's router trees are per-HTTP-method, and each panics if two
			// routes at the same path position use different wildcard names.
			// The GET tree already named it :slug (GetBySlug above); the POST
			// tree already named it :id (the image upload route below) — so
			// the two review sub-routers below deliberately use different
			// param names for what is, to any caller, the identical URL.
			products.GET("/:slug/reviews", reviewHandler.List)

			reviewsGet := products.Group("/:slug/reviews")
			reviewsGet.Use(middleware.RequireAuth(jwtSecret))
			{
				reviewsGet.GET("/eligibility", reviewHandler.Eligibility)
			}

			reviewsPost := products.Group("/:id/reviews")
			reviewsPost.Use(middleware.RequireAuth(jwtSecret))
			{
				reviewsPost.POST("", reviewHandler.Create)
			}
		}

		reviews := v1.Group("/reviews")
		reviews.Use(middleware.RequireAuth(jwtSecret))
		{
			reviews.POST("/:id/images", reviewHandler.UploadImages)
		}

		sellers := v1.Group("/sellers")
		sellers.Use(middleware.RequireAuth(jwtSecret))
		{
			sellers.POST("/apply", sellerHandler.Apply)
		}

		categories := v1.Group("/categories")
		{
			categories.GET("", categoryHandler.List)

			categoryAdmin := categories.Group("")
			categoryAdmin.Use(middleware.RequireAuth(jwtSecret), middleware.RequireRole(model.RoleAdmin))
			{
				categoryAdmin.POST("", categoryHandler.Create)
			}
		}

		cart := v1.Group("/cart")
		cart.Use(middleware.RequireAuth(jwtSecret))
		{
			cart.GET("", cartHandler.Get)
			cart.POST("/items", cartHandler.AddItem)
			cart.PUT("/items/:id", cartHandler.UpdateItem)
			cart.DELETE("/items/:id", cartHandler.RemoveItem)
		}

		me := v1.Group("/me")
		me.Use(middleware.RequireAuth(jwtSecret))
		{
			me.GET("", profileHandler.GetMe)
			me.PUT("", profileHandler.UpdateMe)

			addresses := me.Group("/addresses")
			{
				addresses.GET("", addressHandler.List)
				addresses.POST("", addressHandler.Create)
				addresses.PUT("/:id", addressHandler.Update)
				addresses.DELETE("/:id", addressHandler.Delete)
			}

			me.GET("/products", productHandler.ListMine)
		}

		checkout := v1.Group("/checkout")
		checkout.Use(middleware.RequireAuth(jwtSecret))
		checkout.POST("", orderHandler.Checkout)

		// Public: authenticated by Stripe-Signature verification instead of
		// a bearer token — Stripe itself is the caller, never a logged-in user.
		v1.POST("/webhooks/stripe", orderHandler.StripeWebhook)

		orders := v1.Group("/orders")
		orders.Use(middleware.RequireAuth(jwtSecret))
		{
			orders.GET("", orderHandler.List)
			orders.GET("/:id", orderHandler.GetByID)
		}

		// Merchant-only: no public campaign browsing endpoint — buyers only
		// ever see the discount via a product's effective_price_cents.
		campaigns := v1.Group("/campaigns")
		campaigns.Use(middleware.RequireAuth(jwtSecret), middleware.RequireRole(model.RoleAdmin, model.RoleSeller))
		{
			campaigns.POST("", campaignHandler.Create)
			campaigns.GET("", campaignHandler.List)
			campaigns.DELETE("/:id", campaignHandler.Delete)
		}

		// Dev-only: never mounted outside local development, so it doesn't
		// exist as an attack surface (or a data-wipe risk) anywhere else.
		if cfg.Env == "development" {
			devHandler := handler.NewDevHandler(db)
			v1.POST("/dev/seed", devHandler.Seed)
		}
	}

	return r
}
