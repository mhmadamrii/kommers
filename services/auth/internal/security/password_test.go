package security

import "testing"

func TestHashAndVerifyPassword(t *testing.T) {
	hash, err := HashPassword("s3cret!", 4)
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if !VerifyPassword(hash, "s3cret!") {
		t.Error("expected correct password to verify")
	}
	if VerifyPassword(hash, "wrong") {
		t.Error("expected wrong password to fail verification")
	}
}
