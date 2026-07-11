package handler

import (
	"bytes"
	"io"
	"net/http"
	"path"

	"github.com/google/uuid"

	"github.com/0xfaidev3/kommers/services/catalog/internal/domain"
)

// allowedImageTypes maps sniffed content types to stored file extensions.
// Sniffed (http.DetectContentType), never trusted from the client — a .jpg
// filename on an HTML payload is exactly the upload attack to stop here.
var allowedImageTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// UploadImage accepts a multipart "file" field, sniffs its real type,
// streams it to MinIO, and records the object key.
func (h *ProductHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	productID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid product id")
		return
	}

	p, err := h.products.GetByID(r.Context(), productID)
	if err != nil {
		writeRepoError(w, err)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, h.maxUploadBytes)
	if err := r.ParseMultipartForm(h.maxUploadBytes); err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, "image too large or malformed multipart body")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, `multipart field "file" is required`)
		return
	}
	defer file.Close()

	sniff := make([]byte, 512)
	n, err := io.ReadFull(file, sniff)
	if err != nil && err != io.ErrUnexpectedEOF {
		writeError(w, http.StatusBadRequest, "unreadable file")
		return
	}
	contentType := http.DetectContentType(sniff[:n])
	ext, ok := allowedImageTypes[contentType]
	if !ok {
		writeError(w, http.StatusUnsupportedMediaType, "only jpeg, png, or webp images are accepted")
		return
	}

	key := path.Join("products", p.ID.String(), uuid.NewString()+ext)
	body := io.MultiReader(bytes.NewReader(sniff[:n]), file)
	if err := h.images.Put(r.Context(), key, body, header.Size, contentType); err != nil {
		writeError(w, http.StatusServiceUnavailable, "image storage unavailable")
		return
	}

	img := domain.ProductImage{
		ProductID: p.ID,
		ObjectKey: key,
		Position:  len(p.Images),
		IsPrimary: len(p.Images) == 0 || r.FormValue("primary") == "true",
	}
	if err := h.products.CreateImage(r.Context(), &img); err != nil {
		_ = h.images.Remove(r.Context(), key)
		writeRepoError(w, err)
		return
	}
	img.URL = h.images.PublicURL(key)

	h.invalidateProduct(r.Context(), p.Slug)
	writeJSON(w, http.StatusCreated, img)
}

func (h *ProductHandler) DeleteImage(w http.ResponseWriter, r *http.Request) {
	productID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid product id")
		return
	}
	imageID, err := uuid.Parse(r.PathValue("imageId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid image id")
		return
	}

	img, err := h.products.GetImage(r.Context(), productID, imageID)
	if err != nil {
		writeRepoError(w, err)
		return
	}
	if err := h.products.DeleteImage(r.Context(), productID, imageID); err != nil {
		writeRepoError(w, err)
		return
	}
	_ = h.images.Remove(r.Context(), img.ObjectKey)

	h.invalidateProductByID(r.Context(), productID)
	w.WriteHeader(http.StatusNoContent)
}
