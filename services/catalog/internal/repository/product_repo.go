package repository

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/0xfaidev3/kommers/services/catalog/internal/domain"
	"github.com/0xfaidev3/kommers/services/catalog/internal/pagination"
)

type ProductRepo struct {
	db *gorm.DB
}

func NewProductRepo(db *gorm.DB) *ProductRepo {
	return &ProductRepo{db: db}
}

type ListFilter struct {
	CategoryID *uuid.UUID
	Query      string
	Cursor     *pagination.Cursor
	Limit      int
}

// ListActive returns one page of active products plus the cursor for the
// next page (empty when this is the last page). Keyset pagination: seek past
// the cursor with a row-value comparison, never OFFSET.
func (r *ProductRepo) ListActive(ctx context.Context, f ListFilter) ([]domain.Product, string, error) {
	q := r.db.WithContext(ctx).
		Model(&domain.Product{}).
		Where("status = ?", domain.StatusActive).
		Order("created_at DESC, id DESC").
		Limit(f.Limit + 1) // one extra row to know if a next page exists

	if f.CategoryID != nil {
		q = q.Where("category_id = ?", *f.CategoryID)
	}
	if f.Query != "" {
		// ILIKE backed by the trgm GIN index — the Phase 8 OpenSearch swap
		// replaces this implementation behind the same query parameter.
		q = q.Where("name ILIKE ?", "%"+f.Query+"%")
	}
	if f.Cursor != nil {
		q = q.Where("(created_at, id) < (?, ?)", f.Cursor.CreatedAt, f.Cursor.ID)
	}

	var products []domain.Product
	if err := q.Preload("Images").Find(&products).Error; err != nil {
		return nil, "", err
	}

	next := ""
	if len(products) > f.Limit {
		products = products[:f.Limit]
		last := products[len(products)-1]
		next = pagination.Cursor{CreatedAt: last.CreatedAt, ID: last.ID}.Encode()
	}
	return products, next, nil
}

// GetActiveBySlug is the public product-detail read: full aggregate,
// active products only.
func (r *ProductRepo) GetActiveBySlug(ctx context.Context, slug string) (*domain.Product, error) {
	var p domain.Product
	err := r.db.WithContext(ctx).
		Preload("Variants").
		Preload("Images", func(db *gorm.DB) *gorm.DB { return db.Order("position") }).
		Where("slug = ? AND status = ?", slug, domain.StatusActive).
		First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// GetByID is the admin read: any status, full aggregate.
func (r *ProductRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Product, error) {
	var p domain.Product
	err := r.db.WithContext(ctx).
		Preload("Variants").
		Preload("Images", func(db *gorm.DB) *gorm.DB { return db.Order("position") }).
		First(&p, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ProductRepo) Create(ctx context.Context, p *domain.Product) error {
	return r.db.WithContext(ctx).Create(p).Error
}

func (r *ProductRepo) Update(ctx context.Context, p *domain.Product) error {
	return r.db.WithContext(ctx).Omit("Variants", "Images").Save(p).Error
}

func (r *ProductRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Select("Variants", "Images").Delete(&domain.Product{ID: id}).Error
}

func (r *ProductRepo) CreateVariant(ctx context.Context, v *domain.ProductVariant) error {
	return r.db.WithContext(ctx).Create(v).Error
}

func (r *ProductRepo) GetVariant(ctx context.Context, productID, variantID uuid.UUID) (*domain.ProductVariant, error) {
	var v domain.ProductVariant
	err := r.db.WithContext(ctx).First(&v, "id = ? AND product_id = ?", variantID, productID).Error
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *ProductRepo) UpdateVariant(ctx context.Context, v *domain.ProductVariant) error {
	return r.db.WithContext(ctx).Save(v).Error
}

func (r *ProductRepo) DeleteVariant(ctx context.Context, productID, variantID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Delete(&domain.ProductVariant{}, "id = ? AND product_id = ?", variantID, productID).Error
}

func (r *ProductRepo) CreateImage(ctx context.Context, img *domain.ProductImage) error {
	return r.db.WithContext(ctx).Create(img).Error
}

func (r *ProductRepo) GetImage(ctx context.Context, productID, imageID uuid.UUID) (*domain.ProductImage, error) {
	var img domain.ProductImage
	err := r.db.WithContext(ctx).First(&img, "id = ? AND product_id = ?", imageID, productID).Error
	if err != nil {
		return nil, err
	}
	return &img, nil
}

func (r *ProductRepo) DeleteImage(ctx context.Context, productID, imageID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Delete(&domain.ProductImage{}, "id = ? AND product_id = ?", imageID, productID).Error
}
