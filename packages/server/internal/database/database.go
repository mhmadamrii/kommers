package database

import (
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/mhmadamrii/kommers/server/internal/model"
)

func Connect(dsn string) (*gorm.DB, error) {
	return gorm.Open(postgres.Open(dsn), &gorm.Config{})
}

func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&model.User{},
		&model.Category{},
		&model.Product{},
		&model.Cart{},
		&model.CartItem{},
		&model.Address{},
		&model.Order{},
		&model.OrderItem{},
	)
}
