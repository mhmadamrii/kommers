package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/google/uuid"

	"github.com/0xfaidev3/kommers/services/catalog/internal/cache"
	"github.com/0xfaidev3/kommers/services/catalog/internal/domain"
	"github.com/0xfaidev3/kommers/services/catalog/internal/pagination"
	"github.com/0xfaidev3/kommers/services/catalog/internal/repository"
	"github.com/0xfaidev3/kommers/services/catalog/internal/storage"
)

const (
	defaultPageSize = 20
	maxPageSize     = 100
)

type ProductHandler struct {
	products       *repository.ProductRepo
	categories     *repository.CategoryRepo
	cache          *cache.Cache
	images         *storage.ImageStore
	maxUploadBytes int64
}

func NewProductHandler(p *repository.ProductRepo, c *repository.CategoryRepo, ca *cache.Cache, img *storage.ImageStore, maxUploadBytes int64) *ProductHandler {
	return &ProductHandler{products: p, categories: c, cache: ca, images: img, maxUploadBytes: maxUploadBytes}
}

// List is the public listing: active products, optional category + q
// filters, keyset pagination. Deliberately uncached — cursor+filter combos
// explode the keyspace (docs/catalog-service.md § Caching).
func (h *ProductHandler) List(w http.ResponseWriter, r *http.Request) {
	f := repository.ListFilter{Limit: defaultPageSize}

	if v := r.URL.Query().Get("limit"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 {
			writeError(w, http.StatusBadRequest, "invalid limit")
			return
		}
		f.Limit = min(n, maxPageSize)
	}
	if v := r.URL.Query().Get("cursor"); v != "" {
		c, err := pagination.Decode(v)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid cursor")
			return
		}
		f.Cursor = &c
	}
	if slug := r.URL.Query().Get("category"); slug != "" {
		cat, err := h.categories.GetBySlug(r.Context(), slug)
		if err != nil {
			// Unknown category is an empty page, not an error — the
			// storefront filter UI shouldn't 404 on a stale link.
			writeJSON(w, http.StatusOK, map[string]any{"items": []domain.Product{}, "next_cursor": ""})
			return
		}
		f.CategoryID = &cat.ID
	}
	f.Query = r.URL.Query().Get("q")

	products, next, err := h.products.ListActive(r.Context(), f)
	if err != nil {
		writeRepoError(w, err)
		return
	}
	h.assembleImageURLs(products)
	writeJSON(w, http.StatusOK, map[string]any{"items": products, "next_cursor": next})
}

// GetBySlug is the public detail read: cache-aside on the final JSON payload
// (image URLs included — they're config-stable, so caching them is safe).
func (h *ProductHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	key := cache.ProductKey(slug)

	if b, ok := h.cache.Get(r.Context(), key); ok {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(b)
		return
	}

	p, err := h.products.GetActiveBySlug(r.Context(), slug)
	if err != nil {
		writeRepoError(w, err)
		return
	}
	h.assembleImageURLs([]domain.Product{*p})

	payload, _ := json.Marshal(p)
	h.cache.Set(r.Context(), key, payload)
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(payload)
}

type productRequest struct {
	CategoryID     uuid.UUID            `json:"category_id"`
	Name           string               `json:"name"`
	Slug           string               `json:"slug"`
	Description    string               `json:"description"`
	BasePriceCents int64                `json:"base_price_cents"`
	Status         domain.ProductStatus `json:"status"`
	DisplayStock   int                  `json:"display_stock"`
}

func (req *productRequest) validate() string {
	switch {
	case req.Name == "" || req.Slug == "":
		return "name and slug are required"
	case req.CategoryID == uuid.Nil:
		return "category_id is required"
	case req.BasePriceCents < 0:
		return "base_price_cents must be >= 0"
	case req.Status != "" && !req.Status.Valid():
		return "status must be draft, active, or archived"
	}
	return ""
}

func (h *ProductHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req productRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if msg := req.validate(); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	if req.Status == "" {
		req.Status = domain.StatusDraft
	}

	p := domain.Product{
		CategoryID:     req.CategoryID,
		Name:           req.Name,
		Slug:           req.Slug,
		Description:    req.Description,
		BasePriceCents: req.BasePriceCents,
		Status:         req.Status,
		DisplayStock:   req.DisplayStock,
	}
	if err := h.products.Create(r.Context(), &p); err != nil {
		writeRepoError(w, err)
		return
	}
	h.invalidateProduct(r.Context(), p.Slug)
	writeJSON(w, http.StatusCreated, p)
}

func (h *ProductHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid product id")
		return
	}
	var req productRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if msg := req.validate(); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}

	p, err := h.products.GetByID(r.Context(), id)
	if err != nil {
		writeRepoError(w, err)
		return
	}
	oldSlug := p.Slug

	p.CategoryID = req.CategoryID
	p.Name = req.Name
	p.Slug = req.Slug
	p.Description = req.Description
	p.BasePriceCents = req.BasePriceCents
	if req.Status != "" {
		p.Status = req.Status
	}
	p.DisplayStock = req.DisplayStock

	if err := h.products.Update(r.Context(), p); err != nil {
		writeRepoError(w, err)
		return
	}
	// Old slug's cache entry must die too, or a renamed product keeps
	// serving from its former URL for a full TTL.
	h.invalidateProduct(r.Context(), oldSlug, p.Slug)
	writeJSON(w, http.StatusOK, p)
}

func (h *ProductHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid product id")
		return
	}

	p, err := h.products.GetByID(r.Context(), id)
	if err != nil {
		writeRepoError(w, err)
		return
	}
	if err := h.products.Delete(r.Context(), id); err != nil {
		writeRepoError(w, err)
		return
	}
	// Objects in MinIO are removed best-effort; an orphaned image is dead
	// weight in a bucket, not a correctness problem.
	for _, img := range p.Images {
		_ = h.images.Remove(r.Context(), img.ObjectKey)
	}
	h.invalidateProduct(r.Context(), p.Slug)
	w.WriteHeader(http.StatusNoContent)
}

type variantRequest struct {
	SKU          string          `json:"sku"`
	PriceCents   *int64          `json:"price_cents"`
	Attributes   json.RawMessage `json:"attributes"`
	DisplayStock int             `json:"display_stock"`
}

func (h *ProductHandler) CreateVariant(w http.ResponseWriter, r *http.Request) {
	productID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid product id")
		return
	}
	var req variantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.SKU == "" {
		writeError(w, http.StatusBadRequest, "sku is required")
		return
	}

	p, err := h.products.GetByID(r.Context(), productID)
	if err != nil {
		writeRepoError(w, err)
		return
	}

	if len(req.Attributes) == 0 {
		req.Attributes = json.RawMessage(`{}`)
	}
	v := domain.ProductVariant{
		ProductID:    p.ID,
		SKU:          req.SKU,
		PriceCents:   req.PriceCents,
		Attributes:   req.Attributes,
		DisplayStock: req.DisplayStock,
	}
	if err := h.products.CreateVariant(r.Context(), &v); err != nil {
		writeRepoError(w, err)
		return
	}
	h.invalidateProduct(r.Context(), p.Slug)
	writeJSON(w, http.StatusCreated, v)
}

func (h *ProductHandler) UpdateVariant(w http.ResponseWriter, r *http.Request) {
	productID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid product id")
		return
	}
	variantID, err := uuid.Parse(r.PathValue("variantId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid variant id")
		return
	}
	var req variantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.SKU == "" {
		writeError(w, http.StatusBadRequest, "sku is required")
		return
	}

	v, err := h.products.GetVariant(r.Context(), productID, variantID)
	if err != nil {
		writeRepoError(w, err)
		return
	}
	v.SKU = req.SKU
	v.PriceCents = req.PriceCents
	if len(req.Attributes) > 0 {
		v.Attributes = req.Attributes
	}
	v.DisplayStock = req.DisplayStock
	if err := h.products.UpdateVariant(r.Context(), v); err != nil {
		writeRepoError(w, err)
		return
	}
	h.invalidateProductByID(r.Context(), productID)
	writeJSON(w, http.StatusOK, v)
}

func (h *ProductHandler) DeleteVariant(w http.ResponseWriter, r *http.Request) {
	productID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid product id")
		return
	}
	variantID, err := uuid.Parse(r.PathValue("variantId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid variant id")
		return
	}
	if err := h.products.DeleteVariant(r.Context(), productID, variantID); err != nil {
		writeRepoError(w, err)
		return
	}
	h.invalidateProductByID(r.Context(), productID)
	w.WriteHeader(http.StatusNoContent)
}

func (h *ProductHandler) assembleImageURLs(products []domain.Product) {
	for i := range products {
		for j := range products[i].Images {
			products[i].Images[j].URL = h.images.PublicURL(products[i].Images[j].ObjectKey)
		}
	}
}

// invalidateProduct deletes the detail-cache entries for the given slugs plus
// the category list (its product counts shift with product writes).
func (h *ProductHandler) invalidateProduct(ctx context.Context, slugs ...string) {
	keys := make([]string, 0, len(slugs)+1)
	for _, s := range slugs {
		keys = append(keys, cache.ProductKey(s))
	}
	keys = append(keys, cache.KeyCategories)
	h.cache.Delete(ctx, keys...)
}

func (h *ProductHandler) invalidateProductByID(ctx context.Context, id uuid.UUID) {
	if p, err := h.products.GetByID(ctx, id); err == nil {
		h.invalidateProduct(ctx, p.Slug)
	}
}
