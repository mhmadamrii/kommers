package model

import "gorm.io/gorm"

// ReviewImage upload is deliberately decoupled from Review creation — a
// buyer can submit the rating/comment first and attach photos afterward.
type ReviewImage struct {
	gorm.Model
	ReviewID  uint   `gorm:"not null;index"`
	ObjectKey string `gorm:"size:512;not null"`
	SortOrder int    `gorm:"not null;default:0"`
}
