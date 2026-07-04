package repository

import (
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/0xfaidev3/kommers/services/auth/internal/domain"
)

func NewPostgres(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&domain.User{}); err != nil {
		return nil, err
	}

	return db, nil
}
