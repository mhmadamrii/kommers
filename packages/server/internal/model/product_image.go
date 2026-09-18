package model

import "gorm.io/gorm"

type ProductImage struct {
	gorm.Model
	ProductID uint   `gorm:"not null;index"`
	ObjectKey string `gorm:"size:512;not null"`
	SortOrder int    `gorm:"not null;default:0"`
	IsPrimary bool   `gorm:"not null;default:false"`
}
