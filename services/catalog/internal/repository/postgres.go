package repository

import (
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/0xfaidev3/kommers/services/catalog/internal/domain"
)

func NewPostgres(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, err
	}
	if err := migrate(db); err != nil {
		return nil, err
	}
	return db, nil
}

func migrate(db *gorm.DB) error {
	// pgcrypto for gen_random_uuid(), pg_trgm for the search stub. Both are
	// also in infra/postgres/init.sql, but that only runs on fresh volumes —
	// idempotent here so existing dev databases work too.
	for _, ext := range []string{"pgcrypto", "pg_trgm"} {
		if err := db.Exec("CREATE EXTENSION IF NOT EXISTS " + ext).Error; err != nil {
			return err
		}
	}

	if err := db.AutoMigrate(
		&domain.Category{},
		&domain.Product{},
		&domain.ProductVariant{},
		&domain.ProductImage{},
	); err != nil {
		return err
	}

	// GORM tags can't express a trgm GIN index — raw SQL for the search stub.
	return db.Exec(
		"CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops)",
	).Error
}
