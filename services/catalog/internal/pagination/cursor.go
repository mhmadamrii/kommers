package pagination

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Cursor is an opaque keyset-pagination token: the (created_at, id) of the
// last row the client saw. Listing queries seek past it with a row-value
// comparison instead of OFFSET — O(index seek) at any depth and stable under
// concurrent inserts (docs/catalog-service.md § Pagination).
type Cursor struct {
	CreatedAt time.Time `json:"c"`
	ID        uuid.UUID `json:"i"`
}

func (c Cursor) Encode() string {
	b, _ := json.Marshal(c)
	return base64.RawURLEncoding.EncodeToString(b)
}

func Decode(token string) (Cursor, error) {
	var c Cursor
	b, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		return c, fmt.Errorf("invalid cursor encoding: %w", err)
	}
	if err := json.Unmarshal(b, &c); err != nil {
		return c, fmt.Errorf("invalid cursor payload: %w", err)
	}
	if c.ID == uuid.Nil || c.CreatedAt.IsZero() {
		return c, fmt.Errorf("cursor missing fields")
	}
	return c, nil
}
