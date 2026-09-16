package router

import (
	"time"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"gorm.io/gorm"

	"github.com/mhmadamrii/kommers/server/internal/handler"
	"github.com/mhmadamrii/kommers/server/internal/middleware"
	"github.com/mhmadamrii/kommers/server/internal/model"
)

func New(db *gorm.DB, jwtSecret string, jwtExpiry time.Duration, events handler.OrderEventPublisher) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery(), middleware.Logger())

	r.GET("/healthz", handler.Healthz)
	r.GET("/readyz", handler.Readyz)
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	authHandler := handler.NewAuthHandler(db, jwtSecret, jwtExpiry)
	productHandler := handler.NewProductHandler(db)
	sellerHandler := handler.NewSellerHandler(db)
	categoryHandler := handler.NewCategoryHandler(db)
	cartHandler := handler.NewCartHandler(db)
	profileHandler := handler.NewProfileHandler(db)
	addressHandler := handler.NewAddressHandler(db)
	orderHandler := handler.NewOrderHandler(db, events)

	v1 := r.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
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
			}
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
		}

		checkout := v1.Group("/checkout")
		checkout.Use(middleware.RequireAuth(jwtSecret))
		checkout.POST("", orderHandler.Checkout)

		orders := v1.Group("/orders")
		orders.Use(middleware.RequireAuth(jwtSecret))
		{
			orders.GET("", orderHandler.List)
			orders.GET("/:id", orderHandler.GetByID)
		}
	}

	return r
}
