package model

import "gorm.io/gorm"

type Role string

const (
	RoleCustomer Role = "customer"
	RoleAdmin    Role = "admin"
)

type User struct {
	gorm.Model
	Email        string `gorm:"size:255;uniqueIndex;not null"`
	PasswordHash string `gorm:"size:255;not null"`
	FullName     string `gorm:"size:255"`
	Role         Role   `gorm:"size:20;not null;default:customer"`
}
