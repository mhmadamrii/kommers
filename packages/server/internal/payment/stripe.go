package payment

import (
	"context"
	"errors"
	"strings"

	"github.com/stripe/stripe-go/v82"
)

type StripeClient struct {
	client *stripe.Client
}

func NewStripeClient(secretKey string) *StripeClient {
	return &StripeClient{client: stripe.NewClient(secretKey)}
}

type CheckoutLineItem struct {
	Name string
	// UnitAmount is in the smallest unit of whatever currency the session
	// ends up created in — see CreateCheckoutSessionWithFallback.
	UnitAmount int64
	Quantity   int64
}

// CreateCheckoutSessionWithFallback tries preferredCurrency first (this
// store's nominal currency, "idr") and falls back to fallbackCurrency
// ("usd") only when Stripe rejects the currency itself — a real, common
// restriction for non-Indonesia-based test accounts — never on unrelated
// errors, which are returned as-is. UnitAmount is reused verbatim across
// both attempts: there's no real FX conversion here, just a currency-label
// fallback so the demo keeps working.
func (s *StripeClient) CreateCheckoutSessionWithFallback(
	ctx context.Context,
	preferredCurrency, fallbackCurrency string,
	items []CheckoutLineItem,
	discountCents int64,
	successURL, cancelURL string,
	metadata map[string]string,
) (session *stripe.CheckoutSession, currencyUsed string, err error) {
	session, err = s.createCheckoutSession(ctx, preferredCurrency, items, discountCents, successURL, cancelURL, metadata)
	if err == nil {
		return session, preferredCurrency, nil
	}
	if !isCurrencyUnsupportedError(err) {
		return nil, "", err
	}

	session, err = s.createCheckoutSession(ctx, fallbackCurrency, items, discountCents, successURL, cancelURL, metadata)
	if err != nil {
		return nil, "", err
	}
	return session, fallbackCurrency, nil
}

func (s *StripeClient) createCheckoutSession(
	ctx context.Context,
	currency string,
	items []CheckoutLineItem,
	discountCents int64,
	successURL, cancelURL string,
	metadata map[string]string,
) (*stripe.CheckoutSession, error) {
	lineItems := make([]*stripe.CheckoutSessionCreateLineItemParams, len(items))
	for i, item := range items {
		lineItems[i] = &stripe.CheckoutSessionCreateLineItemParams{
			PriceData: &stripe.CheckoutSessionCreateLineItemPriceDataParams{
				Currency: stripe.String(currency),
				ProductData: &stripe.CheckoutSessionCreateLineItemPriceDataProductDataParams{
					Name: stripe.String(item.Name),
				},
				UnitAmount: stripe.Int64(item.UnitAmount),
			},
			Quantity: stripe.Int64(item.Quantity),
		}
	}

	params := &stripe.CheckoutSessionCreateParams{
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		LineItems:  lineItems,
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
		Metadata:   metadata,
	}

	// A voucher is applied as a one-off, single-use amount-off coupon in the
	// session's currency — Stripe line items can't be negative. Created per
	// attempt, so a currency-fallback retry gets a coupon in the right currency.
	if discountCents > 0 {
		coupon, err := s.client.V1Coupons.Create(ctx, &stripe.CouponCreateParams{
			AmountOff:      stripe.Int64(discountCents),
			Currency:       stripe.String(currency),
			Duration:       stripe.String("once"),
			MaxRedemptions: stripe.Int64(1),
			Name:           stripe.String("Voucher"),
		})
		if err != nil {
			return nil, err
		}
		params.Discounts = []*stripe.CheckoutSessionCreateDiscountParams{{Coupon: stripe.String(coupon.ID)}}
	}

	return s.client.V1CheckoutSessions.Create(ctx, params)
}

func isCurrencyUnsupportedError(err error) bool {
	var stripeErr *stripe.Error
	if errors.As(err, &stripeErr) {
		return strings.Contains(strings.ToLower(stripeErr.Msg), "currency")
	}
	return strings.Contains(strings.ToLower(err.Error()), "currency")
}
