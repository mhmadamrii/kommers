FROM golang:1.26-alpine AS builder
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/auth ./cmd/server
RUN mkdir -p /app/keys && chown -R 65532:65532 /app

FROM gcr.io/distroless/static-debian12
WORKDIR /app
COPY --from=builder /out/auth /auth
COPY --from=builder --chown=65532:65532 /app/keys /app/keys
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/auth"]
