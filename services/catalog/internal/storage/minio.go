package storage

import (
	"context"
	"fmt"
	"io"
	"log/slog"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// ImageStore streams product images to MinIO and hands back object keys.
// Only the key is stored in Postgres; clients read image bytes straight
// from MinIO via MINIO_PUBLIC_URL — bytes never proxy through this service.
type ImageStore struct {
	client    *minio.Client
	bucket    string
	publicURL string
}

func NewImageStore(endpoint, accessKey, secretKey, bucket, publicURL string, useSSL bool) (*ImageStore, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, err
	}
	return &ImageStore{client: client, bucket: bucket, publicURL: publicURL}, nil
}

// EnsureBucket creates the bucket and opens it for anonymous reads. Product
// images are public marketing content — presigning every GET adds latency
// for zero confidentiality gain (docs/catalog-service.md § Images).
// Best-effort: an unreachable MinIO must not stop the service from serving
// its Postgres-backed API (broken images beat a dead storefront).
func (s *ImageStore) EnsureBucket(ctx context.Context, logger *slog.Logger) {
	exists, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		logger.Warn("minio_unreachable", "bucket", s.bucket, "error", err.Error())
		return
	}
	if !exists {
		if err := s.client.MakeBucket(ctx, s.bucket, minio.MakeBucketOptions{}); err != nil {
			logger.Warn("minio_make_bucket_failed", "bucket", s.bucket, "error", err.Error())
			return
		}
	}

	policy := fmt.Sprintf(`{
		"Version": "2012-10-17",
		"Statement": [{
			"Effect": "Allow",
			"Principal": {"AWS": ["*"]},
			"Action": ["s3:GetObject"],
			"Resource": ["arn:aws:s3:::%s/*"]
		}]
	}`, s.bucket)
	if err := s.client.SetBucketPolicy(ctx, s.bucket, policy); err != nil {
		logger.Warn("minio_set_policy_failed", "bucket", s.bucket, "error", err.Error())
	}
}

func (s *ImageStore) Put(ctx context.Context, key string, r io.Reader, size int64, contentType string) error {
	_, err := s.client.PutObject(ctx, s.bucket, key, r, size, minio.PutObjectOptions{ContentType: contentType})
	return err
}

func (s *ImageStore) Remove(ctx context.Context, key string) error {
	return s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{})
}

// PublicURL assembles the client-facing URL for an object key.
func (s *ImageStore) PublicURL(key string) string {
	return fmt.Sprintf("%s/%s/%s", s.publicURL, s.bucket, key)
}
