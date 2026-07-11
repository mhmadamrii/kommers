package httpmiddleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
)

type correlationIDKey struct{}

const RequestIDHeader = "X-Request-ID"

// CorrelationID propagates a request ID from the incoming header if present,
// otherwise generates one. It's echoed back on the response and stored in
// the request context so downstream logging can tag every line with it —
// the cheap precursor to real distributed tracing (deferred to Phase 10).
func CorrelationID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get(RequestIDHeader)
		if id == "" {
			id = uuid.NewString()
		}
		w.Header().Set(RequestIDHeader, id)
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), correlationIDKey{}, id)))
	})
}

func RequestID(ctx context.Context) string {
	if id, ok := ctx.Value(correlationIDKey{}).(string); ok {
		return id
	}
	return ""
}
