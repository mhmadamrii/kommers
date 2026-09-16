package router

import (
	"github.com/gin-gonic/gin"

	"github.com/mhmadamrii/kommers/server/internal/handler"
	"github.com/mhmadamrii/kommers/server/internal/middleware"
)

func New() *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery(), middleware.Logger())

	r.GET("/healthz", handler.Healthz)
	r.GET("/readyz", handler.Readyz)

	return r
}
