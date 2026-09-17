// Package pricing computes the price a buyer actually pays right now,
// factoring in any live Campaign. It's the one place that logic lives —
// product listing, cart, and checkout all call through here instead of
// each re-deriving "is there a discount" on their own.
package pricing

import (
	"time"

	"gorm.io/gorm"

	"github.com/mhmadamrii/kommers/server/internal/model"
)

// LiveCampaigns returns every campaign currently active — time window,
// IsActive flag, and campaign-level stock not yet exhausted — with its
// explicit product targets preloaded.
func LiveCampaigns(db *gorm.DB) ([]model.Campaign, error) {
	var campaigns []model.Campaign
	now := time.Now()
	err := db.Preload("Products").
		Where("is_active = ? AND starts_at <= ? AND ends_at >= ?", true, now, now).
		Where("stock_limit IS NULL OR stock_used < stock_limit").
		Find(&campaigns).Error
	return campaigns, err
}

func appliesTo(c *model.Campaign, product model.Product) bool {
	if c.CategoryID != nil && *c.CategoryID == product.CategoryID {
		return true
	}
	for _, p := range c.Products {
		if p.ID == product.ID {
			return true
		}
	}
	return false
}

// BestFor picks whichever live campaign gives the lowest price for this
// product, or nil if none apply.
func BestFor(campaigns []model.Campaign, product model.Product) *model.Campaign {
	var best *model.Campaign
	var bestPrice int64
	for i := range campaigns {
		c := &campaigns[i]
		if !appliesTo(c, product) {
			continue
		}
		price := c.DiscountedPrice(product.PriceCents)
		if best == nil || price < bestPrice {
			best = c
			bestPrice = price
		}
	}
	return best
}

// Effective returns the price the buyer pays right now, whether free
// shipping applies (the product's own standing rule, or a live campaign
// granting it), and the campaign responsible — nil if there's no discount.
func Effective(campaigns []model.Campaign, product model.Product) (priceCents int64, freeShipping bool, campaign *model.Campaign) {
	best := BestFor(campaigns, product)
	if best == nil {
		return product.PriceCents, product.FreeShipping, nil
	}
	return best.DiscountedPrice(product.PriceCents), product.FreeShipping || best.FreeShipping, best
}
