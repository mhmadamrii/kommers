# Built from the repo root so the shared services/pkg module is in context:
#   podman build -f services/catalog/Dockerfile .
FROM golang:1.26-alpine AS builder
WORKDIR /src

COPY services/pkg/ services/pkg/
COPY services/catalog/go.mod services/catalog/go.sum services/catalog/
WORKDIR /src/services/catalog
RUN go mod download

COPY services/catalog/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/catalog ./cmd/server

FROM gcr.io/distroless/static-debian12
WORKDIR /app
COPY --from=builder /out/catalog /catalog
USER nonroot:nonroot
EXPOSE 8081
ENTRYPOINT ["/catalog"]
