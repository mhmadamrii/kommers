package model

import "gorm.io/gorm"

type Address struct {
	gorm.Model
	UserID     uint   `gorm:"not null;index"`
	User       User   `gorm:"foreignKey:UserID"`
	Label      string `gorm:"size:100"`
	Recipient  string `gorm:"size:255;not null"`
	Phone      string `gorm:"size:50;not null"`
	Line1      string `gorm:"size:255;not null"`
	Line2      string `gorm:"size:255"`
	City       string `gorm:"size:100;not null"`
	State      string `gorm:"size:100"`
	PostalCode string `gorm:"size:20;not null"`
	Country    string `gorm:"size:100;not null"`
	IsDefault  bool   `gorm:"not null;default:false"`
}
