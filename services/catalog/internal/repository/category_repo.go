package repository

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/0xfaidev3/kommers/services/catalog/internal/domain"
)

type CategoryRepo struct {
	db *gorm.DB
}

func NewCategoryRepo(db *gorm.DB) *CategoryRepo {
	return &CategoryRepo{db: db}
}

// ListWithCounts returns all categories with a computed count of their
// active products — one grouped query, not N count queries.
func (r *CategoryRepo) ListWithCounts(ctx context.Context) ([]domain.Category, error) {
	var categories []domain.Category
	if err := r.db.WithContext(ctx).Order("name").Find(&categories).Error; err != nil {
		return nil, err
	}

	type row struct {
		CategoryID uuid.UUID
		N          int64
	}
	var counts []row
	err := r.db.WithContext(ctx).
		Model(&domain.Product{}).
		Select("category_id, count(*) as n").
		Where("status = ?", domain.StatusActive).
		Group("category_id").
		Scan(&counts).Error
	if err != nil {
		return nil, err
	}

	byID := make(map[uuid.UUID]int64, len(counts))
	for _, c := range counts {
		byID[c.CategoryID] = c.N
	}
	for i := range categories {
		categories[i].ProductCount = byID[categories[i].ID]
	}
	return categories, nil
}

func (r *CategoryRepo) GetBySlug(ctx context.Context, slug string) (*domain.Category, error) {
	var c domain.Category
	if err := r.db.WithContext(ctx).Where("slug = ?", slug).First(&c).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *CategoryRepo) Create(ctx context.Context, c *domain.Category) error {
	return r.db.WithContext(ctx).Create(c).Error
}

func (r *CategoryRepo) Update(ctx context.Context, c *domain.Category) error {
	return r.db.WithContext(ctx).Save(c).Error
}

func (r *CategoryRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Category, error) {
	var c domain.Category
	if err := r.db.WithContext(ctx).First(&c, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *CategoryRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.Category{}, "id = ?", id).Error
}

// HasProducts guards category deletion — deleting a category out from under
// its products would orphan them silently.
func (r *CategoryRepo) HasProducts(ctx context.Context, id uuid.UUID) (bool, error) {
	var n int64
	err := r.db.WithContext(ctx).Model(&domain.Product{}).Where("category_id = ?", id).Count(&n).Error
	return n > 0, err
}
