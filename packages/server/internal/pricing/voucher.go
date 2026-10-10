package pricing

import (
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/mhmadamrii/kommers/server/internal/model"
)

var (
	ErrVoucherNotFound   = errors.New("voucher code not found")
	ErrVoucherInactive   = errors.New("voucher is not active right now")
	ErrVoucherExhausted  = errors.New("voucher has been fully redeemed")
	ErrVoucherUsedByUser = errors.New("you have already used this voucher")
	ErrVoucherNoItems    = errors.New("voucher does not apply to any item in your cart")
)

// Line is one priced cart/order line, reduced to what voucher math needs.
type Line struct {
	OwnerID       uint
	SubtotalCents int64
}

func NormalizeCode(code string) string {
	return strings.ToUpper(strings.TrimSpace(code))
}

// VoucherDiscount works out what v takes off the given lines. A seller's
// voucher only sees that seller's lines; an admin's sees them all. The
// result never drops the order below 1 cent so a payment session can still
// be created. A MinSpend miss is returned as a descriptive error.
func VoucherDiscount(v model.Voucher, ownerIsAdmin bool, lines []Line) (int64, error) {
	var total, eligible int64
	for _, l := range lines {
		total += l.SubtotalCents
		if ownerIsAdmin || l.OwnerID == v.OwnerID {
			eligible += l.SubtotalCents
		}
	}
	if eligible == 0 {
		return 0, ErrVoucherNoItems
	}
	if eligible < v.MinSpendCents {
		return 0, &MinSpendError{MinCents: v.MinSpendCents}
	}
	d := v.DiscountFor(eligible)
	if d > total-1 {
		d = total - 1
	}
	if d < 0 {
		d = 0
	}
	return d, nil
}

type MinSpendError struct{ MinCents int64 }

func (e *MinSpendError) Error() string { return "minimum spend not reached for this voucher" }

// CheckVoucherUsable runs the buyer-independent and per-buyer eligibility
// checks. Pass a tx that already holds the voucher row lock when called from
// checkout so used_count can't race.
func CheckVoucherUsable(db *gorm.DB, v model.Voucher, userID uint) error {
	if !v.IsLive(time.Now()) {
		if v.UsageLimit != nil && v.UsedCount >= *v.UsageLimit {
			return ErrVoucherExhausted
		}
		return ErrVoucherInactive
	}
	var used int64
	if err := db.Model(&model.VoucherRedemption{}).
		Where("voucher_id = ? AND user_id = ?", v.ID, userID).Count(&used).Error; err != nil {
		return err
	}
	if int(used) >= v.PerUserLimit {
		return ErrVoucherUsedByUser
	}
	return nil
}

// OwnerIsAdmin reports whether the voucher's owner is a platform admin
// (making it cart-wide rather than seller-scoped).
func OwnerIsAdmin(db *gorm.DB, v model.Voucher) bool {
	var u model.User
	if err := db.Select("id", "role").First(&u, v.OwnerID).Error; err != nil {
		return false
	}
	return u.Role == model.RoleAdmin
}
