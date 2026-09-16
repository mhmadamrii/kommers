package model

import "gorm.io/gorm"

type Category struct {
	gorm.Model
	Name     string    `gorm:"size:255;not null"`
	Slug     string    `gorm:"size:255;uniqueIndex;not null"`
	Products []Product `gorm:"foreignKey:CategoryID"`
}
