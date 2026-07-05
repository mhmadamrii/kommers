package security

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"os"
	"path/filepath"
)

// LoadOrGenerateKeyPair reads an RSA private key from privatePath. If no file
// exists there, a new 2048-bit key is generated and persisted so restarts
// reuse the same key (and thus keep issuing/verifying tokens consistently).
func LoadOrGenerateKeyPair(privatePath string) (*rsa.PrivateKey, error) {
	if data, err := os.ReadFile(privatePath); err == nil {
		block, _ := pem.Decode(data)
		if block == nil {
			return nil, os.ErrInvalid
		}
		return x509.ParsePKCS1PrivateKey(block.Bytes)
	}

	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, err
	}

	if err := os.MkdirAll(filepath.Dir(privatePath), 0o700); err != nil {
		return nil, err
	}

	block := &pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(key)}
	if err := os.WriteFile(privatePath, pem.EncodeToMemory(block), 0o600); err != nil {
		return nil, err
	}

	return key, nil
}
