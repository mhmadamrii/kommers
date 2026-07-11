package handler

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/google/uuid"

	"github.com/0xfaidev3/kommers/services/catalog/internal/cache"
	"github.com/0xfaidev3/kommers/services/catalog/internal/domain"
	"github.com/0xfaidev3/kommers/services/catalog/internal/repository"
)

type CategoryHandler struct {
	repo  *repository.CategoryRepo
	cache *cache.Cache
}

func NewCategoryHandler(repo *repository.CategoryRepo, c *cache.Cache) *CategoryHandler {
	return &CategoryHandler{repo: repo, cache: c}
}

// List is public: cache-aside on the full category list (small payload, hit
// on every storefront page render).
func (h *CategoryHandler) List(w http.ResponseWriter, r *http.Request) {
	if b, ok := h.cache.Get(r.Context(), cache.KeyCategories); ok {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(b)
		return
	}

	categories, err := h.repo.ListWithCounts(r.Context())
	if err != nil {
		writeRepoError(w, err)
		return
	}

	payload, _ := json.Marshal(map[string]any{"items": categories})
	h.cache.Set(r.Context(), cache.KeyCategories, payload)
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(payload)
}

type categoryRequest struct {
	Name     string     `json:"name"`
	Slug     string     `json:"slug"`
	ParentID *uuid.UUID `json:"parent_id"`
}

func (h *CategoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req categoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" || req.Slug == "" {
		writeError(w, http.StatusBadRequest, "name and slug are required")
		return
	}

	c := domain.Category{Name: req.Name, Slug: req.Slug, ParentID: req.ParentID}
	if err := h.repo.Create(r.Context(), &c); err != nil {
		writeRepoError(w, err)
		return
	}
	h.invalidate(r.Context())
	writeJSON(w, http.StatusCreated, c)
}

func (h *CategoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid category id")
		return
	}
	var req categoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" || req.Slug == "" {
		writeError(w, http.StatusBadRequest, "name and slug are required")
		return
	}

	c, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		writeRepoError(w, err)
		return
	}
	c.Name, c.Slug, c.ParentID = req.Name, req.Slug, req.ParentID
	if err := h.repo.Update(r.Context(), c); err != nil {
		writeRepoError(w, err)
		return
	}
	h.invalidate(r.Context())
	writeJSON(w, http.StatusOK, c)
}

func (h *CategoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid category id")
		return
	}

	hasProducts, err := h.repo.HasProducts(r.Context(), id)
	if err != nil {
		writeRepoError(w, err)
		return
	}
	if hasProducts {
		writeError(w, http.StatusConflict, "category still has products")
		return
	}

	if err := h.repo.Delete(r.Context(), id); err != nil {
		writeRepoError(w, err)
		return
	}
	h.invalidate(r.Context())
	w.WriteHeader(http.StatusNoContent)
}

func (h *CategoryHandler) invalidate(ctx context.Context) {
	h.cache.Delete(ctx, cache.KeyCategories)
}
