FROM golang:1.26-alpine AS builder
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/auth ./cmd/server

FROM gcr.io/distroless/static-debian12
COPY --from=builder /out/auth /auth
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/auth"]
