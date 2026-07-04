package observability

import "context"

// Tracer is a placeholder seam for distributed tracing. Real OpenTelemetry
// wiring lands in Phase 10 (CLAUDE.MD) across all services at once, instead
// of pulling the SDK into each service piecemeal.
type Tracer interface {
	StartSpan(ctx context.Context, name string) (context.Context, func())
}

type noopTracer struct{}

func NewTracer() Tracer { return noopTracer{} }

func (noopTracer) StartSpan(ctx context.Context, _ string) (context.Context, func()) {
	return ctx, func() {}
}
