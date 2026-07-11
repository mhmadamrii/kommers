package httpmiddleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORS(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTeapot)
	})
	h := CORS([]string{"http://localhost:3000", " http://app.example "}, next)

	t.Run("preflight from allowed origin is answered without hitting next", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "/auth/login", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want %d", rec.Code, http.StatusNoContent)
		}
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
			t.Errorf("Allow-Origin = %q, want origin echoed", got)
		}
		if rec.Header().Get("Access-Control-Allow-Methods") == "" {
			t.Error("Allow-Methods missing on preflight")
		}
	})

	t.Run("actual request from allowed origin gets CORS header and reaches next", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if rec.Code != http.StatusTeapot {
			t.Fatalf("status = %d, want next handler's %d", rec.Code, http.StatusTeapot)
		}
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
			t.Errorf("Allow-Origin = %q, want origin echoed", got)
		}
	})

	t.Run("disallowed origin gets no CORS headers", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
		req.Header.Set("Origin", "http://evil.example")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if rec.Code != http.StatusTeapot {
			t.Fatalf("status = %d, want request passed through to next", rec.Code)
		}
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Errorf("Allow-Origin = %q, want empty", got)
		}
	})

	t.Run("origins are trimmed of whitespace", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
		req.Header.Set("Origin", "http://app.example")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://app.example" {
			t.Errorf("Allow-Origin = %q, want trimmed origin matched", got)
		}
	})

	t.Run("request without Origin header passes through untouched", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if rec.Code != http.StatusTeapot {
			t.Fatalf("status = %d, want next handler's %d", rec.Code, http.StatusTeapot)
		}
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Errorf("Allow-Origin = %q, want empty", got)
		}
	})
}
