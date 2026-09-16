package model

import "gorm.io/gorm"

type Product struct {
	gorm.Model
	CategoryID  uint     `gorm:"not null;index"`
	Category    Category `gorm:"foreignKey:CategoryID"`
	Name        string   `gorm:"size:255;not null"`
	Slug        string   `gorm:"size:255;uniqueIndex;not null"`
	Description string   `gorm:"type:text"`
	PriceCents  int64    `gorm:"not null"`
	Stock       int      `gorm:"not null;default:0"`
	ImageURL    string   `gorm:"size:512"`
	IsActive    bool     `gorm:"not null;default:true"`
}
