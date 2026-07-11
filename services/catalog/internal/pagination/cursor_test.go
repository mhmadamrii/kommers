package pagination

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestCursorRoundTrip(t *testing.T) {
	in := Cursor{CreatedAt: time.Now().UTC().Truncate(time.Microsecond), ID: uuid.New()}

	out, err := Decode(in.Encode())
	if err != nil {
		t.Fatalf("Decode() error = %v", err)
	}
	if !out.CreatedAt.Equal(in.CreatedAt) || out.ID != in.ID {
		t.Errorf("roundtrip = %+v, want %+v", out, in)
	}
}

func TestDecodeRejectsGarbage(t *testing.T) {
	for name, token := range map[string]string{
		"not base64":     "!!!not-base64!!!",
		"not json":       "bm90LWpzb24",
		"empty":          "",
		"missing fields": "e30", // "{}"
	} {
		t.Run(name, func(t *testing.T) {
			if _, err := Decode(token); err == nil {
				t.Errorf("Decode(%q) = nil error, want error", token)
			}
		})
	}
}
