package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"gorm.io/gorm"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// writeRepoError maps the common repository failures onto HTTP statuses so
// every handler doesn't re-derive the same switch.
func writeRepoError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		writeError(w, http.StatusNotFound, "not found")
	case errors.Is(err, gorm.ErrDuplicatedKey) || isUniqueViolation(err):
		writeError(w, http.StatusConflict, "duplicate slug or sku")
	default:
		writeError(w, http.StatusInternalServerError, "internal error")
	}
}

func isUniqueViolation(err error) bool {
	type coder interface{ SQLState() string }
	var c coder
	// 23505 = unique_violation
	return errors.As(err, &c) && c.SQLState() == "23505"
}
