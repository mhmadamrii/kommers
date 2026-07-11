package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type ProductStatus string

const (
	StatusDraft    ProductStatus = "draft"
	StatusActive   ProductStatus = "active"
	StatusArchived ProductStatus = "archived"
)

func (s ProductStatus) Valid() bool {
	switch s {
	case StatusDraft, StatusActive, StatusArchived:
		return true
	}
	return false
}

type Category struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name      string     `gorm:"not null" json:"name"`
	Slug      string     `gorm:"uniqueIndex;not null" json:"slug"`
	ParentID  *uuid.UUID `gorm:"type:uuid" json:"parent_id,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`

	// ProductCount is computed at read time, never stored.
	ProductCount int64 `gorm:"-" json:"product_count"`
}

type Product struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CategoryID  uuid.UUID `gorm:"type:uuid;not null;index:idx_products_listing,priority:1" json:"category_id"`
	Name        string    `gorm:"not null" json:"name"`
	Slug        string    `gorm:"uniqueIndex;not null" json:"slug"`
	Description string    `json:"description"`
	// Money is integer cents everywhere in this system — floats corrupt money.
	BasePriceCents int64         `gorm:"not null" json:"base_price_cents"`
	Status         ProductStatus `gorm:"not null;default:draft" json:"status"`
	// display_stock is a denormalized display value only. Authoritative stock
	// arrives with Inventory Service (Phase 4) — see docs/catalog-service.md.
	DisplayStock int       `gorm:"not null;default:0" json:"display_stock"`
	CreatedAt    time.Time `gorm:"index:idx_products_listing,priority:2,sort:desc" json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	Variants []ProductVariant `gorm:"constraint:OnDelete:CASCADE" json:"variants,omitempty"`
	Images   []ProductImage   `gorm:"constraint:OnDelete:CASCADE" json:"images,omitempty"`
}

type ProductVariant struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProductID uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"`
	SKU       string    `gorm:"uniqueIndex;not null" json:"sku"`
	// PriceCents nil means the variant sells at the product's base price.
	PriceCents *int64 `json:"price_cents,omitempty"`
	// Attributes is free-form (size/color/material...) — schema varies per
	// product type, which is exactly what jsonb is for.
	Attributes   json.RawMessage `gorm:"type:jsonb;default:'{}'" json:"attributes"`
	DisplayStock int             `gorm:"not null;default:0" json:"display_stock"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

type ProductImage struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProductID uuid.UUID `gorm:"type:uuid;not null;index:idx_product_images_order,priority:1" json:"product_id"`
	ObjectKey string    `gorm:"not null" json:"-"`
	Position  int       `gorm:"not null;default:0;index:idx_product_images_order,priority:2" json:"position"`
	IsPrimary bool      `gorm:"not null;default:false" json:"is_primary"`
	CreatedAt time.Time `json:"created_at"`

	// URL is assembled from MINIO_PUBLIC_URL at response time, never stored.
	URL string `gorm:"-" json:"url"`
}
