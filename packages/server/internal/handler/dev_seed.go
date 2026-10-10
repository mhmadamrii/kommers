package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/mhmadamrii/kommers/server/internal/model"
)

type DevHandler struct {
	DB *gorm.DB
}

func NewDevHandler(db *gorm.DB) *DevHandler {
	return &DevHandler{DB: db}
}

type seedCategory struct {
	Name string
	Slug string
}

var seedCategories = []seedCategory{
	{"Elektronik", "elektronik"},
	{"Fashion", "fashion"},
	{"Rumah Tangga", "rumah-tangga"},
	{"Buku & Alat Tulis", "buku-alat-tulis"},
	{"Olahraga", "olahraga"},
	{"Kecantikan", "kecantikan"},
	{"Hobi & Mainan", "hobi-mainan"},
	{"Ibu & Bayi", "ibu-bayi"},
}

type seedProduct struct {
	Name         string
	CategorySlug string
	PriceCents   int64
	Stock        int
	Location     string
	FreeShipping bool
	// OnSale products get enrolled in the seeded demo Campaign below —
	// discounting now flows through Campaign, not a static product field.
	OnSale bool
}

var seedProducts = []seedProduct{
	{"Kemeja Flanel Lengan Panjang Pria", "fashion", 14990000, 50, "Bandung", true, true},
	{"Earphone Bluetooth TWS Noise Cancelling", "elektronik", 24990000, 80, "Jakarta Barat", true, true},
	{"Rak Buku Minimalis 5 Susun", "rumah-tangga", 24990000, 20, "Semarang", true, false},
	{"Novel Fiksi Best Seller Nasional", "buku-alat-tulis", 11000000, 100, "Yogyakarta", false, true},
	{"Matras Yoga Anti Slip 10mm", "olahraga", 6990000, 60, "Surabaya", true, false},
	{"Serum Wajah Vitamin C 20ml", "kecantikan", 7500000, 150, "Jakarta Selatan", true, true},
	{"Action Figure Koleksi Limited Edition", "hobi-mainan", 34990000, 15, "Tangerang", false, false},
	{"Baby Carrier Ergonomis Multifungsi", "ibu-bayi", 26990000, 30, "Bekasi", true, true},
	{"Smartwatch Layar AMOLED 1.9 Inch", "elektronik", 65990000, 25, "Depok", true, true},
	{"Tas Selempang Kanvas Unisex", "fashion", 9990000, 70, "Malang", false, false},
	{"Lampu Meja LED Dimmable", "rumah-tangga", 16000000, 40, "Solo", true, true},
	{"Dumbbell Set Adjustable 20kg", "olahraga", 32990000, 10, "Jakarta Timur", false, false},
}

const (
	seedAdminEmail  = "admin@kommers.dev"
	seedSellerEmail = "seller@kommers.dev"
	seedPassword    = "password123"
)

// Seed godoc
//
//	@Summary	Seed dev data — admin+seller users, categories, products (idempotent; only mounted when ENV=development)
//	@Tags		dev
//	@Success	200	{object}	map[string]any
//	@Router		/api/v1/dev/seed [post]
func (h *DevHandler) Seed(c *gin.Context) {
	admin, err := h.seedUser(seedAdminEmail, "Admin kommers", model.RoleAdmin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	seller, err := h.seedUser(seedSellerEmail, "Seller Demo", model.RoleSeller)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	categoryBySlug := make(map[string]model.Category, len(seedCategories))
	for _, sc := range seedCategories {
		var category model.Category
		if err := h.DB.Where("slug = ?", sc.Slug).
			FirstOrCreate(&category, model.Category{Name: sc.Name, Slug: sc.Slug}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		categoryBySlug[sc.Slug] = category
	}

	productsSeeded := 0
	var onSaleProductIDs, flashProductIDs []uint
	for _, sp := range seedProducts {
		category, ok := categoryBySlug[sp.CategorySlug]
		if !ok {
			continue
		}
		slug := slugify(sp.Name)

		var existing model.Product
		err := h.DB.Where("slug = ?", slug).First(&existing).Error
		if err == nil {
			if sp.OnSale {
				onSaleProductIDs = append(onSaleProductIDs, existing.ID)
			} else {
				flashProductIDs = append(flashProductIDs, existing.ID)
			}
			continue // already seeded
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		product := model.Product{
			CategoryID:   category.ID,
			OwnerID:      seller.ID,
			Name:         sp.Name,
			Slug:         slug,
			PriceCents:   sp.PriceCents,
			Stock:        sp.Stock,
			IsActive:     true,
			Location:     sp.Location,
			FreeShipping: sp.FreeShipping,
		}
		if err := h.DB.Create(&product).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		productsSeeded++
		if sp.OnSale {
			onSaleProductIDs = append(onSaleProductIDs, product.ID)
		} else {
			flashProductIDs = append(flashProductIDs, product.ID)
		}
	}

	campaignCreated := false
	if len(onSaleProductIDs) > 0 {
		var existingCampaign model.Campaign
		err := h.DB.Where("name = ?", "Gajian Sale").First(&existingCampaign).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			products := make([]model.Product, len(onSaleProductIDs))
			for i, id := range onSaleProductIDs {
				products[i] = model.Product{Model: gorm.Model{ID: id}}
			}
			campaign := model.Campaign{
				Name:          "Gajian Sale",
				OwnerID:       seller.ID,
				DiscountType:  model.DiscountTypePercent,
				DiscountValue: 30,
				StartsAt:      time.Now(),
				EndsAt:        time.Now().Add(72 * time.Hour),
				StockLimit:    nil,
				FreeShipping:  true,
				IsActive:      true,
				Products:      products,
			}
			if err := h.DB.Create(&campaign).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			campaignCreated = true
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	flashCreated, err := h.seedFlashSale(seller.ID, flashProductIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	vouchersCreated, err := h.seedVouchers(admin.ID, seller.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"flash_sale_created": flashCreated,
		"vouchers_created":   vouchersCreated,
		"admin_email":        admin.Email,
		"seller_email":       seller.Email,
		"password":           seedPassword,
		"categories":         len(categoryBySlug),
		"products_seeded":    productsSeeded,
		"campaign_created":   campaignCreated,
	})
}

func (h *DevHandler) seedUser(email, fullName string, role model.Role) (model.User, error) {
	var user model.User
	err := h.DB.Where("email = ?", email).First(&user).Error
	if err == nil {
		return user, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return model.User{}, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(seedPassword), bcrypt.DefaultCost)
	if err != nil {
		return model.User{}, err
	}

	user = model.User{
		Email:        email,
		PasswordHash: string(hash),
		FullName:     fullName,
		Role:         role,
	}
	if err := h.DB.Create(&user).Error; err != nil {
		return model.User{}, err
	}
	return user, nil
}

// seedFlashSale adds a short, stock-capped campaign on the products the
// "Gajian Sale" doesn't already cover, so the storefront's flash-sale strip
// has something live with a visible countdown and a "units left" bar.
func (h *DevHandler) seedFlashSale(sellerID uint, productIDs []uint) (bool, error) {
	if len(productIDs) == 0 {
		return false, nil
	}
	var existing model.Campaign
	err := h.DB.Where("name = ?", "Flash Sale Kilat").First(&existing).Error
	if err == nil {
		return false, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return false, err
	}
	products := make([]model.Product, len(productIDs))
	for i, id := range productIDs {
		products[i] = model.Product{Model: gorm.Model{ID: id}}
	}
	limit := 40
	camp := model.Campaign{
		Name:          "Flash Sale Kilat",
		OwnerID:       sellerID,
		DiscountType:  model.DiscountTypePercent,
		DiscountValue: 50,
		StartsAt:      time.Now(),
		EndsAt:        time.Now().Add(6 * time.Hour),
		StockLimit:    &limit,
		IsActive:      true,
		Products:      products,
	}
	return true, h.DB.Create(&camp).Error
}

// seedVouchers adds one platform-wide percent voucher (admin) and one
// seller-scoped fixed voucher, both valid for 30 days.
func (h *DevHandler) seedVouchers(adminID, sellerID uint) (int, error) {
	capCents := int64(5000000) // Rp50.000
	seeds := []model.Voucher{
		{
			Code: "HEMAT10", Name: "Diskon 10% semua produk", OwnerID: adminID,
			DiscountType: model.DiscountTypePercent, DiscountValue: 10,
			MaxDiscountCents: &capCents, MinSpendCents: 10000000, PerUserLimit: 1,
		},
		{
			Code: "TOKO20K", Name: "Potongan Rp20.000 dari toko", OwnerID: sellerID,
			DiscountType: model.DiscountTypeFixed, DiscountValue: 2000000,
			MinSpendCents: 5000000, PerUserLimit: 2,
		},
	}
	created := 0
	for _, v := range seeds {
		var existing model.Voucher
		err := h.DB.Where("code = ?", v.Code).First(&existing).Error
		if err == nil {
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return created, err
		}
		v.StartsAt = time.Now().Add(-time.Hour)
		v.EndsAt = time.Now().Add(30 * 24 * time.Hour)
		v.IsActive = true
		if err := h.DB.Create(&v).Error; err != nil {
			return created, err
		}
		created++
	}
	return created, nil
}
