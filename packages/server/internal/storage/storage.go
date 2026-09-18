package storage

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	"github.com/mhmadamrii/kommers/server/internal/config"
)

type Client struct {
	mc        *minio.Client
	bucket    string
	publicURL string
}

func New(cfg config.Config) (*Client, error) {
	endpoint := strings.TrimPrefix(strings.TrimPrefix(cfg.S3Endpoint, "https://"), "http://")

	mc, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.S3AccessKeyID, cfg.S3SecretAccessKey, ""),
		Secure: cfg.S3UseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("create minio client: %w", err)
	}

	client := &Client{mc: mc, bucket: cfg.S3Bucket, publicURL: cfg.S3PublicURL}
	if err := client.ensureBucket(context.Background()); err != nil {
		return nil, err
	}
	return client, nil
}

func (c *Client) ensureBucket(ctx context.Context) error {
	exists, err := c.mc.BucketExists(ctx, c.bucket)
	if err != nil {
		return fmt.Errorf("check bucket: %w", err)
	}
	if exists {
		return nil
	}
	if err := c.mc.MakeBucket(ctx, c.bucket, minio.MakeBucketOptions{}); err != nil {
		return fmt.Errorf("create bucket: %w", err)
	}
	policy := fmt.Sprintf(`{
		"Version": "2012-10-17",
		"Statement": [{
			"Effect": "Allow",
			"Principal": {"AWS": ["*"]},
			"Action": ["s3:GetObject"],
			"Resource": ["arn:aws:s3:::%s/*"]
		}]
	}`, c.bucket)
	return c.mc.SetBucketPolicy(ctx, c.bucket, policy)
}

// Upload streams data to the bucket under a fresh UUID-prefixed key (so two
// sellers uploading "photo.jpg" never collide) and returns that object key.
func (c *Client) Upload(ctx context.Context, filename string, contentType string, size int64, data io.Reader) (string, error) {
	key := fmt.Sprintf("products/%s-%s", uuid.NewString(), filename)
	if _, err := c.mc.PutObject(ctx, c.bucket, key, data, size, minio.PutObjectOptions{ContentType: contentType}); err != nil {
		return "", fmt.Errorf("upload object: %w", err)
	}
	return key, nil
}

func (c *Client) Delete(ctx context.Context, objectKey string) error {
	return c.mc.RemoveObject(ctx, c.bucket, objectKey, minio.RemoveObjectOptions{})
}

// PublicURL builds the browser-facing URL for an object key.
func (c *Client) PublicURL(objectKey string) string {
	return BuildPublicURL(c.publicURL, c.bucket, objectKey)
}

// BuildPublicURL is the pure string-building half of PublicURL — usable by
// callers (e.g. read paths rendering already-uploaded images) even when no
// live *Client exists because object storage was unreachable at boot.
func BuildPublicURL(publicBaseURL, bucket, objectKey string) string {
	return strings.TrimSuffix(publicBaseURL, "/") + "/" + bucket + "/" + objectKey
}
