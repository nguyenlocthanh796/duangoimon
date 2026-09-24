package models

import (
	"encoding/json"
	"time"
)

// ModifierOption tùy chọn kích cỡ (Size S/M/L) hoặc Topping đính kèm
type ModifierOption struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	PriceDelta float64 `json:"priceDelta,omitempty"`
	Price      float64 `json:"price,omitempty"`
	IsDefault  bool    `json:"isDefault,omitempty"`
}

// Tenant đại diện cho thương hiệu quán
type Tenant struct {
	ID               string     `gorm:"primaryKey;size:36" json:"id"`
	Name             string     `gorm:"size:255;not null" json:"name"`
	Subdomain        string     `gorm:"size:100;uniqueIndex;not null" json:"subdomain"`
	Phone            string     `gorm:"size:20" json:"phone"`
	SubscriptionPlan string     `gorm:"size:50;default:'pro'" json:"subscription_plan"` // trial, standard, pro, enterprise
	LicenseExpiresAt *time.Time `json:"license_expires_at"`
	IsActive         bool       `gorm:"default:true" json:"is_active"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// Branch đại diện cho chi nhánh
type Branch struct {
	ID          string    `gorm:"primaryKey;size:36" json:"id"`
	TenantID    string    `gorm:"size:36;index;not null" json:"tenant_id"`
	Name        string    `gorm:"size:255;not null" json:"name"`
	Address     string    `json:"address"`
	Phone       string    `gorm:"size:20" json:"phone"`
	ManagerName string    `gorm:"size:100" json:"manager_name"`
	IsMain      bool      `gorm:"default:false" json:"is_main"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TenantBranch đại diện cho chi nhánh trong mô hình SaaS Multi-Branch
type TenantBranch struct {
	ID          string    `gorm:"primaryKey;size:36" json:"id"`
	TenantID    string    `gorm:"size:36;index;not null" json:"tenant_id"`
	Name        string    `gorm:"size:255;not null" json:"name"`
	Address     string    `gorm:"size:500" json:"address"`
	Phone       string    `gorm:"size:20" json:"phone"`
	ManagerName string    `gorm:"size:100" json:"manager_name"`
	IsMain      bool      `gorm:"default:false" json:"is_main"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (TenantBranch) TableName() string {
	return "tenant_branches"
}

// User đại diện cho Chủ Quán, Quản lý, Thu ngân
type User struct {
	ID           string    `gorm:"primaryKey;size:36" json:"id"`
	TenantID     string    `gorm:"size:36;index;not null" json:"tenant_id"`
	BranchID     *string   `gorm:"size:36" json:"branch_id"`
	Username     string    `gorm:"size:100;not null" json:"username"`
	PasswordHash string    `gorm:"size:255" json:"-"`
	FullName     string    `gorm:"size:255;not null" json:"full_name"`
	Role         string    `gorm:"size:50;default:'cashier'" json:"role"` // owner, manager, cashier, waiter, kitchen
	PinCode      string    `gorm:"size:10" json:"pin_code"`
	IsActive     bool      `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Category nhóm thực đơn
type Category struct {
	ID        string    `gorm:"primaryKey;size:36" json:"id"`
	TenantID  string    `gorm:"size:36;index;not null" json:"tenant_id"`
	Name      string    `gorm:"size:255;not null" json:"name"`
	Icon      string    `gorm:"size:100;default:'food-outline'" json:"icon"`
	SortOrder int       `gorm:"default:0" json:"sort_order"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

// Area khu vực bàn ăn (Tầng Trệt, Lầu 1, Sân Vườn, Mang Về)
type Area struct {
	ID        string    `gorm:"primaryKey;size:36" json:"id"`
	TenantID  string    `gorm:"size:36;index;not null" json:"tenant_id"`
	BranchID  string    `gorm:"size:36;index;not null" json:"branch_id"`
	Name      string    `gorm:"size:100;not null" json:"name"`
	SortOrder int       `gorm:"default:0" json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}

// Topping / Modifier món ăn kèm (Trân châu, Thạch, Pudding, Kem cheese...)
type Topping struct {
	ID         string    `gorm:"primaryKey;size:36" json:"id"`
	TenantID   string    `gorm:"size:36;index;not null" json:"tenant_id"`
	Name       string    `gorm:"size:100;not null" json:"name"`
	PriceDelta float64   `gorm:"type:numeric(15,2);default:0" json:"price_delta"`
	SortOrder  int       `gorm:"default:0" json:"sort_order"`
	IsActive   bool      `gorm:"default:true" json:"is_active"`
	CreatedAt  time.Time `json:"created_at"`
}

// Product món ăn / đồ uống
type Product struct {
	ID           string       `gorm:"primaryKey;size:36" json:"id"`
	TenantID     string       `gorm:"size:36;index;not null" json:"tenant_id"`
	CategoryID   *string      `gorm:"size:36;index" json:"category_id"`
	Code         string       `gorm:"size:50" json:"code"`
	Name         string       `gorm:"size:255;not null" json:"name"`
	Unit         string       `gorm:"size:50;default:'Phần'" json:"unit"`
	CostPrice    float64      `gorm:"type:numeric(15,2);default:0" json:"cost_price"` // Giá vốn tính từ định lượng nguyên liệu
	SellingPrice float64      `gorm:"type:numeric(15,2);not null" json:"selling_price"`
	ImageURL     string       `json:"image_url"`
	Station      string       `gorm:"size:50;default:'bar'" json:"station"` // bar, kitchen, snack
	IsOutOfStock bool         `gorm:"default:false" json:"is_out_of_stock"` // 86 status
	IsCombo      bool         `gorm:"default:false" json:"is_combo"`
	ComboDetails string       `gorm:"type:text" json:"combo_details"`
	SizesJSON    string       `gorm:"column:sizes;type:text" json:"-"`
	ToppingsJSON string       `gorm:"column:toppings;type:text" json:"-"`
	SortOrder    int          `gorm:"default:0" json:"sort_order"`
	IsPinned     bool         `gorm:"default:false" json:"is_pinned"`
	IsActive     bool         `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time    `json:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at"`
	Recipes      []RecipeItem `gorm:"foreignKey:ProductID" json:"recipes,omitempty"`
}

func (p Product) MarshalJSON() ([]byte, error) {
	type Alias Product
	var sizes []ModifierOption
	if p.SizesJSON != "" {
		_ = json.Unmarshal([]byte(p.SizesJSON), &sizes)
	}
	if sizes == nil {
		sizes = []ModifierOption{}
	}
	var toppings []ModifierOption
	if p.ToppingsJSON != "" {
		_ = json.Unmarshal([]byte(p.ToppingsJSON), &toppings)
	}
	if toppings == nil {
		toppings = []ModifierOption{}
	}
	return json.Marshal(&struct {
		Alias
		Sizes    []ModifierOption `json:"sizes"`
		Toppings []ModifierOption `json:"toppings"`
	}{
		Alias:    (Alias)(p),
		Sizes:    sizes,
		Toppings: toppings,
	})
}

// Ingredient nguyên vật liệu thực tế (Trà, Sữa, Phô Mai, Đá, Rau, Thịt...)
type Ingredient struct {
	ID                 string    `gorm:"primaryKey;size:36" json:"id"`
	TenantID           string    `gorm:"size:36;index;not null" json:"tenant_id"`
	BranchID           string    `gorm:"size:36;index;not null" json:"branch_id"`
	SKU                string    `gorm:"size:50" json:"sku"`
	Name               string    `gorm:"size:255;not null" json:"name"` // Tên: Cốt Trà Đen, Sữa Đặc Ông Thọ, Đá Cây
	Category           string    `gorm:"size:50;default:'nguyen_lieu'" json:"category"` // nguyen_lieu, dong_goi, hang_hoa_ban_ngay
	Unit               string    `gorm:"size:50;not null" json:"unit"`  // gram, ml, quả, cây, bịch, kg
	CurrentStock       float64   `gorm:"type:numeric(15,2);default:0" json:"current_stock"`
	MinStock           float64   `gorm:"type:numeric(15,2);default:0" json:"min_stock"` // Mức báo động sắp hết
	AvgCostPrice       float64   `gorm:"type:numeric(15,2);default:0" json:"avg_cost_price"` // Giá mua chợ bình quân
	YieldRate          float64   `gorm:"type:numeric(5,2);default:100" json:"yield_rate"` // % Thành phẩm sau sơ chế (VD: 75% thịt, 85% rau)
	EffectiveCostPrice float64   `gorm:"type:numeric(15,2);default:0" json:"effective_cost_price"`
	SupplierName       string    `gorm:"size:255" json:"supplier_name"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// RecipeItem định mức nguyên liệu cho 1 món
type RecipeItem struct {
	ID           string      `gorm:"primaryKey;size:36" json:"id"`
	ProductID    string      `gorm:"size:36;index;not null" json:"product_id"`
	IngredientID string      `gorm:"size:36;index;not null" json:"ingredient_id"`
	Ingredient   *Ingredient `gorm:"foreignKey:IngredientID" json:"ingredient,omitempty"`
	QuantityUsed float64     `gorm:"type:numeric(15,2);not null" json:"quantity_used"` // 30g trà, 40ml sữa
	CreatedAt    time.Time   `json:"created_at"`
}

// DiningTable bàn ăn
type DiningTable struct {
	ID                   string     `gorm:"primaryKey;size:36" json:"id"`
	TenantID             string     `gorm:"size:36;index;not null" json:"tenant_id"`
	BranchID             string     `gorm:"size:36;index;not null" json:"branch_id"`
	AreaID               *string    `gorm:"size:36;index" json:"area_id"`
	AreaName             string     `gorm:"size:100;default:'Tầng 1'" json:"area_name"`
	Name                 string     `gorm:"size:100;not null" json:"name"`
	Capacity             int        `gorm:"default:4" json:"capacity"`
	SortOrder            int        `gorm:"default:0" json:"sort_order"`
	Status               string     `gorm:"size:50;default:'trong'" json:"status"` // trong, dang_phuc_vu, dat_truoc, da_in_tam_tinh
	ActiveOrderID        *string    `gorm:"size:36" json:"active_order_id"`
	ActiveOrderTotal     float64    `gorm:"-" json:"active_order_total,omitempty"`
	ActiveOrderItemCount int        `gorm:"-" json:"active_order_item_count,omitempty"`
	OccupiedSince        *time.Time `gorm:"-" json:"occupied_since,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
}

// Order hóa đơn bán hàng
type Order struct {
	ID             string      `gorm:"primaryKey;size:36" json:"id"`
	TenantID       string      `gorm:"size:36;index;not null" json:"tenant_id"`
	BranchID       string      `gorm:"size:36;index;not null" json:"branch_id"`
	ClientOrderID  *string     `gorm:"size:100;uniqueIndex" json:"client_order_id"` // UUID sinh từ client khi offline
	OrderCode      string      `gorm:"size:50;not null" json:"order_code"`
	TableID        *string     `gorm:"size:36;index" json:"table_id"`
	CashierName    string      `gorm:"size:255" json:"cashier_name"`
	CustomerName   string      `gorm:"size:255" json:"customer_name"`
	OrderType      string      `gorm:"size:50;default:'dine_in'" json:"order_type"`
	Status         string      `gorm:"size:50;default:'dang_xu_ly'" json:"status"` // dang_xu_ly, da_thanh_toan, da_huy
	Subtotal       float64     `gorm:"type:numeric(15,2);default:0" json:"subtotal"`
	DiscountAmount float64     `gorm:"type:numeric(15,2);default:0" json:"discount_amount"`
	TotalAmount    float64     `gorm:"type:numeric(15,2);not null" json:"total_amount"`
	TotalCostPrice float64     `gorm:"type:numeric(15,2);default:0" json:"total_cost_price"` // Tổng giá vốn thực
	PaymentMethod  string      `gorm:"size:50" json:"payment_method"`                        // tien_mat, chuyen_khoan_vietqr, hon_hop
	CashAmount     float64     `gorm:"type:numeric(15,2);default:0" json:"cash_amount"`      // Tiền mặt thực thu
	BankAmount     float64     `gorm:"type:numeric(15,2);default:0" json:"bank_amount"`      // Chuyển khoản QR thực thu
	PointsUsed     int         `gorm:"default:0" json:"points_used"`                         // Điểm CRM đã đổi
	PointsEarned   int         `gorm:"default:0" json:"points_earned"`                       // Điểm CRM tích lũy được
	CustomerID     *string     `gorm:"size:36;index" json:"customer_id"`
	PaidAmount     float64     `gorm:"type:numeric(15,2);default:0" json:"paid_amount"`
	ChangeAmount   float64     `gorm:"type:numeric(15,2);default:0" json:"change_amount"`
	ShiftID        *string     `gorm:"size:36;index" json:"shift_id"` // Thuộc ca làm việc nào
	VoidReason     string      `gorm:"size:255" json:"void_reason"`
	VoidedBy       string      `gorm:"size:255" json:"voided_by"`
	VoidedAt       *time.Time  `json:"voided_at"`
	Note           string      `json:"note"`
	CreatedAt      time.Time   `gorm:"index" json:"created_at"`
	PaidAt         *time.Time  `json:"paid_at"`
	Items          []OrderItem `gorm:"foreignKey:OrderID" json:"items,omitempty"`
}

// OrderItem món trong đơn
type OrderItem struct {
	ID            string    `gorm:"primaryKey;size:36" json:"id"`
	OrderID       string    `gorm:"size:36;index;not null" json:"order_id"`
	ProductID     *string   `gorm:"size:36" json:"product_id"`
	ProductName   string    `gorm:"size:255;not null" json:"product_name"`
	UnitPrice     float64   `gorm:"type:numeric(15,2);not null" json:"unit_price"`
	CostPrice     float64   `gorm:"type:numeric(15,2);default:0" json:"cost_price"`
	Quantity      float64   `gorm:"type:numeric(10,2);not null" json:"quantity"`
	ModifierNames string    `json:"modifier_names"`
	Station       string    `gorm:"size:50;default:'bar'" json:"station"` // bar, kitchen, snack
	SelectedSize  string    `gorm:"size:50" json:"selected_size"`         // Size S, M, L
	SugarLevel    string    `gorm:"size:50" json:"sugar_level"`           // 0%, 30%, 50%, 100%
	IceLevel      string    `gorm:"size:50" json:"ice_level"`             // Không đá, Ít đá, Bình thường
	ToppingsJSON  string    `gorm:"type:text" json:"toppings_json"`       // Mảng JSON các topping kèm giá
	TotalPrice    float64   `gorm:"type:numeric(15,2);not null" json:"total_price"`
	KitchenStatus string    `gorm:"size:50;default:'cho_che_bien'" json:"kitchen_status"` // cho_che_bien, dang_che_bien, da_xong, da_phuc_vu
	Note          string    `json:"note"`
	CreatedAt     time.Time `json:"created_at"`
}

func (o OrderItem) MarshalJSON() ([]byte, error) {
	type Alias OrderItem
	return json.Marshal(&struct {
		Alias
		Name string  `json:"name"`
		Qty  float64 `json:"qty"`
	}{
		Alias: Alias(o),
		Name:  o.ProductName,
		Qty:   o.Quantity,
	})
}

// 💵 SỔ QUỸ TIỀN MẶT THỰC CHIẾN (Cash Transactions - Không cần hóa đơn đỏ)
type CashTransaction struct {
	ID            string     `gorm:"primaryKey;size:36" json:"id"`
	TenantID      string     `gorm:"size:36;index;not null" json:"tenant_id"`
	BranchID      string     `gorm:"size:36;index;not null" json:"branch_id"`
	ShiftID       *string    `gorm:"size:36;index" json:"shift_id"`
	Type          string     `gorm:"size:20;not null" json:"type"` // thu (Cash In), chi (Cash Out)
	Category      string     `gorm:"size:100;not null" json:"category"` // chi_mua_da, chi_mua_rau_cho, chi_ung_luong, chi_mat_bang, thu_khac
	Amount        float64    `gorm:"type:numeric(15,2);not null" json:"amount"`
	Description   string     `gorm:"not null" json:"description"` // Mua 2 bao đá cây, 5kg chanh sả ngoài chợ...
	PerformedBy   string     `gorm:"size:255;not null" json:"performed_by"` // Người thực hiện
	Status        string     `gorm:"size:20;default:'completed'" json:"status"` // completed, voided
	PaymentMethod string     `gorm:"size:30;default:'tien_mat'" json:"payment_method"` // tien_mat, chuyen_khoan
	ExpenseType   string     `gorm:"size:30;default:'hoat_dong'" json:"expense_type"` // hoat_dong, co_dinh
	VoidReason    *string    `gorm:"size:255" json:"void_reason,omitempty"`
	VoidedBy      *string    `gorm:"size:255" json:"voided_by,omitempty"`
	VoidedAt      *time.Time `json:"voided_at,omitempty"`
	CreatedAt     time.Time  `gorm:"index" json:"created_at"`
}

// ⏱️ QUẢN LÝ CA LÀM VIỆC & KÉT TIỀN THU NGÂN (Shift Audit & Cash Reconciliation)
type CashShift struct {
	ID                 string     `gorm:"primaryKey;size:36" json:"id"`
	TenantID           string     `gorm:"size:36;index;not null" json:"tenant_id"`
	BranchID           string     `gorm:"size:36;index;not null" json:"branch_id"`
	CashierID          string     `gorm:"size:36;not null" json:"cashier_id"`
	CashierName        string     `gorm:"size:255;not null" json:"cashier_name"`
	ShiftName          string     `gorm:"size:100;not null" json:"shift_name"` // Ca Sáng, Ca Chiều, Ca Tối
	StartingCash       float64    `gorm:"type:numeric(15,2);not null" json:"starting_cash"` // Tiền lẻ có sẵn đầu ca
	TotalCashSales     float64    `gorm:"type:numeric(15,2);default:0" json:"total_cash_sales"` // Doanh thu tiền mặt trong ca
	TotalVietQRSales   float64    `gorm:"type:numeric(15,2);default:0" json:"total_vietqr_sales"` // Doanh thu chuyển khoản trong ca
	TotalCashIn        float64    `gorm:"type:numeric(15,2);default:0" json:"total_cash_in"` // Thu ngoài trong ca
	TotalCashOut       float64    `gorm:"type:numeric(15,2);default:0" json:"total_cash_out"` // Chi ngoài trong ca (mua đá, rau...)
	ExpectedEndingCash float64    `gorm:"type:numeric(15,2);default:0" json:"expected_ending_cash"` // Tiền mặt lý thuyết trong két
	ActualEndingCash   float64    `gorm:"type:numeric(15,2);default:0" json:"actual_ending_cash"` // Tiền mặt thu ngân đếm thực tế
	DifferenceAmount   float64    `gorm:"type:numeric(15,2);default:0" json:"difference_amount"` // Lệch két: Dương (+), Âm (-)
	Status             string     `gorm:"size:50;default:'dang_mo'" json:"status"` // dang_mo, da_dong
	Note               string     `json:"note"`
	OpenedAt           time.Time  `json:"opened_at"`
	ClosedAt           *time.Time `json:"closed_at"`
}

// 🛡️ NHẬT KÝ CHỐNG THẤT THOÁT & GIAN LẬN NỘI BỘ (Anti-Fraud Activity Logs)
type AuditLog struct {
	ID          string    `gorm:"primaryKey;size:36" json:"id"`
	TenantID    string    `gorm:"size:36;index;not null" json:"tenant_id"`
	BranchID    string    `gorm:"size:36;index;not null" json:"branch_id"`
	Action      string    `gorm:"size:100;not null" json:"action"` // huy_mon, in_tam_tinh, mo_ket_tay, chiet_khau_vuot_muc, doi_gia
	PerformedBy string    `gorm:"size:255;not null" json:"performed_by"`
	OrderID     *string   `gorm:"size:36" json:"order_id"`
	Details     string    `json:"details"`
	Severity    string    `gorm:"size:20;default:'info'" json:"severity"` // info, warning, danger
	CreatedAt   time.Time `gorm:"index" json:"created_at"`
}

// POSSettings Cấu hình quán, Mẫu bill in nhiệt & Tài khoản nhận tiền VietQR
type POSSettings struct {
	ID              string    `gorm:"primaryKey;size:36" json:"id"`
	TenantID        string    `gorm:"size:36;index;not null" json:"tenant_id"`
	BranchID        string    `gorm:"size:36;index;not null" json:"branch_id"`
	StoreName       string    `gorm:"size:255;default:'OngChu POS F&B'" json:"store_name"`
	StoreAddress    string    `json:"store_address"`
	StorePhone      string    `gorm:"size:50" json:"store_phone"`
	Slogan          string    `json:"slogan"`
	OpeningHours    string    `gorm:"size:100;default:'07:00 - 22:30'" json:"opening_hours"`
	WifiName        string    `gorm:"size:100" json:"wifi_name"`
	WifiPassword    string    `gorm:"size:100" json:"wifi_password"`
	Website         string    `json:"website"`
	FacebookPage    string    `json:"facebook_page"`

	BankCode          string `gorm:"size:50;default:'MB'" json:"bank_code"`
	BankName          string `gorm:"size:100;default:'MBBank'" json:"bank_name"`
	BankAccountNo     string `gorm:"size:100" json:"bank_account_no"`
	BankAccountName   string `gorm:"size:255" json:"bank_account_name"`
	BankBranch        string `json:"bank_branch"`
	TransferSyntax    string `gorm:"default:'[MA_DON]'" json:"transfer_syntax"`
	QRPaymentTemplate string `gorm:"default:'compact2'" json:"qr_payment_template"`

	// Loa Báo Có Soundbox (MB Bank, VCB, BIDV...)
	SoundboxProvider  string `gorm:"size:50;default:'mbbank'" json:"soundbox_provider"`
	MBSoundboxEnabled bool   `gorm:"default:false" json:"mb_soundbox_enabled"`
	MBSoundboxID      string `gorm:"size:100" json:"mb_soundbox_id"`
	MBMerchantID      string `gorm:"size:100" json:"mb_merchant_id"`
	MBRefPrefix       string `gorm:"size:50;default:'HD'" json:"mb_ref_prefix"`
	MBRawQRString     string `gorm:"type:text" json:"mb_raw_qr_string"`

	ReceiptTitle        string `gorm:"default:'HÓA ĐƠN THANH TOÁN'" json:"receipt_title"`
	ReceiptFooter       string `gorm:"default:'Cảm ơn Quý khách và hẹn gặp lại!'" json:"receipt_footer"`
	PrinterIP           string `gorm:"size:50;default:'192.168.1.200'" json:"printer_ip"`
	PrinterPort         int    `gorm:"default:9100" json:"printer_port"`
	PaperSize           string `gorm:"size:20;default:'K80'" json:"paper_size"` // K80, K58
	PrintCopies         int    `gorm:"default:1" json:"print_copies"`
	PrintQROnBill       bool   `gorm:"default:true" json:"print_qr_on_bill"`
	PrintWifiOnBill     bool   `gorm:"default:true" json:"print_wifi_on_bill"`
	PrintCashierOnBill  bool   `gorm:"default:true" json:"print_cashier_on_bill"`
	PrintItemNoteOnBill bool   `gorm:"default:true" json:"print_item_note_on_bill"`
	PrintBarcodeOnBill  bool   `gorm:"default:true" json:"print_barcode_on_bill"`
	AutoCut             bool   `gorm:"default:true" json:"auto_cut"`
	KickDrawer          bool   `gorm:"default:true" json:"kick_drawer"`

	KitchenPrinterIP     string `gorm:"size:50;default:'192.168.1.201'" json:"kitchen_printer_ip"`
	KitchenPrinterPort   int    `gorm:"default:9100" json:"kitchen_printer_port"`
	EnableKitchenPrinter bool   `gorm:"default:false" json:"enable_kitchen_printer"`

	VATRate               float64 `gorm:"type:numeric(5,2);default:0" json:"vat_rate"`
	ServiceFeeRate        float64 `gorm:"type:numeric(5,2);default:0" json:"service_fee_rate"`
	FlatSurcharge         float64 `gorm:"type:numeric(15,2);default:0" json:"flat_surcharge"`
	SurchargeLabel        string  `gorm:"size:255" json:"surcharge_label"`
	DefaultOrderChannel   string  `gorm:"size:50;default:'dine_in'" json:"default_order_channel"`
	AutoPrintOnPayment    bool    `gorm:"default:true" json:"auto_print_on_payment"`
	RequireTableSelection bool    `gorm:"default:true" json:"require_table_selection"`
	AllowNegativeStock    bool    `gorm:"default:true" json:"allow_negative_stock"`
	RequirePinForVoid     bool    `gorm:"default:true" json:"require_pin_for_void"`
	HighDiscountThreshold float64 `gorm:"type:numeric(5,2);default:20" json:"high_discount_threshold"`
	EnableKDS             bool    `gorm:"default:true" json:"enable_kds"`
	KDSAutoCleanupMinutes int     `gorm:"default:30" json:"kds_auto_cleanup_minutes"`

	// Tùy chọn Đường Đá & Ghi chú nhanh
	EnableSugarIceModifier bool   `gorm:"default:true" json:"enable_sugar_ice_modifier"`
	SugarIceCategories     string `gorm:"type:text" json:"sugar_ice_categories"`
	QuickNotesList         string `gorm:"type:text" json:"quick_notes_list"`

	TelegramBotToken     string `json:"telegram_bot_token"`
	TelegramChatID       string `json:"telegram_chat_id"`
	EnableTelegramAlerts bool   `gorm:"default:false" json:"enable_telegram_alerts"`
	CFDWelcomeMessage    string `gorm:"default:'Kính Chào Quý Khách!'" json:"cfd_welcome_message"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// PurchaseOrder bảng quản lý nhập hàng từ nhà cung cấp
type PurchaseOrder struct {
	ID          string              `gorm:"primaryKey;size:36" json:"id"`
	TenantID    string              `gorm:"size:36;index;not null" json:"tenant_id"`
	BranchID    string              `gorm:"size:36;index;not null" json:"branch_id"`
	POCode      string              `gorm:"size:50;not null" json:"po_code"` // PO-20260904-01
	Supplier    string              `gorm:"size:255;not null" json:"supplier"`
	TotalAmount float64             `gorm:"type:numeric(15,2);not null" json:"total_amount"`
	PaymentType string              `gorm:"size:50;default:'tien_mat'" json:"payment_type"`
	CreatedBy   string              `gorm:"size:255;not null" json:"created_by"`
	Note        string              `json:"note"`
	CreatedAt   time.Time           `json:"created_at"`
	Items       []PurchaseOrderItem `gorm:"foreignKey:POID" json:"items,omitempty"`
}

// PurchaseOrderItem chi tiết nguyên liệu nhập kho
type PurchaseOrderItem struct {
	ID           string  `gorm:"primaryKey;size:36" json:"id"`
	POID         string  `gorm:"size:36;index;not null" json:"po_id"`
	IngredientID string  `gorm:"size:36;index;not null" json:"ingredient_id"`
	Quantity     float64 `gorm:"type:numeric(15,2);not null" json:"quantity"`
	UnitPrice    float64 `gorm:"type:numeric(15,2);not null" json:"unit_price"`
	TotalPrice   float64 `gorm:"type:numeric(15,2);not null" json:"total_price"`
}

// InventoryAdjustment xuất hủy / hao hụt / kiểm kê cân bằng kho
type InventoryAdjustment struct {
	ID           string    `gorm:"primaryKey;size:36" json:"id"`
	TenantID     string    `gorm:"size:36;index;not null" json:"tenant_id"`
	BranchID     string    `gorm:"size:36;index;not null" json:"branch_id"`
	IngredientID string    `gorm:"size:36;index;not null" json:"ingredient_id"`
	Type         string    `gorm:"size:50;not null" json:"type"` // xuat_huy_hong, can_bang_kiem_ke, hao_hut
	SystemStock  float64   `gorm:"type:numeric(15,2);default:0" json:"system_stock"`
	ActualStock  float64   `gorm:"type:numeric(15,2);default:0" json:"actual_stock"`
	Quantity     float64   `gorm:"type:numeric(15,2);not null" json:"quantity"` // Chênh lệch (Actual - System hoặc lượng hủy)
	Reason       string    `gorm:"size:255;not null" json:"reason"`
	PerformedBy  string    `gorm:"size:255;not null" json:"performed_by"`
	CreatedAt    time.Time `json:"created_at"`
}

// Customer quản lý khách hàng thân thiết & tích điểm (CRM nhẹ)
type Customer struct {
	ID            string    `gorm:"primaryKey;size:36" json:"id"`
	TenantID      string    `gorm:"size:36;index;not null" json:"tenant_id"`
	BranchID      string    `gorm:"size:36;index;not null" json:"branch_id"`
	Name          string    `gorm:"size:255;not null" json:"name"`
	Phone         string    `gorm:"size:50;index;not null" json:"phone"`
	Birthday      string    `gorm:"size:20" json:"birthday"`
	PointsBalance int       `gorm:"default:0" json:"points_balance"`
	TotalSpend    float64   `gorm:"type:numeric(15,2);default:0" json:"total_spend"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Vendor nhà cung cấp nguyên vật liệu
type Vendor struct {
	ID            string    `gorm:"primaryKey;size:36" json:"id"`
	TenantID      string    `gorm:"size:36;index;not null" json:"tenant_id"`
	BranchID      string    `gorm:"size:36;index;not null" json:"branch_id"`
	Name          string    `gorm:"size:255;not null" json:"name"`
	Phone         string    `gorm:"size:50" json:"phone"`
	Address       string    `json:"address"`
	ContactPerson string    `gorm:"size:255" json:"contact_person"`
	Notes         string    `json:"notes"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Staff nhân sự & cấu hình lương đa dạng (theo giờ, theo tháng, theo ca)
type Staff struct {
	ID                     string         `gorm:"primaryKey;size:36" json:"id"`
	TenantID               string         `gorm:"size:36;index;not null" json:"tenant_id"`
	BranchID               string         `gorm:"size:36;index;not null" json:"branch_id"`
	Name                   string         `gorm:"size:255;not null" json:"name"`
	Phone                  string         `gorm:"size:50;not null" json:"phone"`
	Role                   string         `gorm:"size:50;default:'phuc_vu'" json:"role"` // phuc_vu, pha_che, thu_ngan, quan_ly, bao_ve
	WageType               string         `gorm:"size:50;default:'hourly'" json:"wage_type"` // hourly, monthly, per_shift
	WageRate               float64        `gorm:"type:numeric(15,2);not null" json:"wage_rate"` // mức lương: 22k/h, 7tr/tháng, 180k/ca
	Allowance              float64        `gorm:"type:numeric(15,2);default:0" json:"allowance"` // phụ cấp chuyên cần/ăn uống
	OvertimeRateMultiplier float64        `gorm:"type:numeric(5,2);default:1.5" json:"overtime_rate_multiplier"` // hệ số tăng ca OT
	IsActive               bool           `gorm:"default:true" json:"is_active"`
	CreatedAt              time.Time      `json:"created_at"`
	UpdatedAt              time.Time      `json:"updated_at"`
	Shifts                 []StaffShift   `gorm:"foreignKey:StaffID" json:"shifts,omitempty"`
	Advances               []StaffAdvance `gorm:"foreignKey:StaffID" json:"advances,omitempty"`
}

// StaffShift chấm công ca làm việc thực tế
type StaffShift struct {
	ID            string     `gorm:"primaryKey;size:36" json:"id"`
	StaffID       string     `gorm:"size:36;index;not null" json:"staff_id"`
	ShiftType     string     `gorm:"size:50;not null" json:"shift_type"` // ca_sang, ca_chieu, ca_toi, ca_gay
	WorkDate      string     `gorm:"size:20;not null" json:"work_date"`  // YYYY-MM-DD
	ClockIn       time.Time  `json:"clock_in"`
	ClockOut      *time.Time `json:"clock_out"`
	RegularHours  float64    `gorm:"type:numeric(6,2);default:0" json:"regular_hours"`
	OvertimeHours float64    `gorm:"type:numeric(6,2);default:0" json:"overtime_hours"`
	Note          string     `json:"note"`
	Status        string     `gorm:"size:50;default:'active'" json:"status"` // active, completed
	CreatedAt     time.Time  `json:"created_at"`
}

// StaffAdvance tạm ứng lương thực tế liên kết Sổ Quỹ Tiền Mặt
type StaffAdvance struct {
	ID                string    `gorm:"primaryKey;size:36" json:"id"`
	StaffID           string    `gorm:"size:36;index;not null" json:"staff_id"`
	Amount            float64   `gorm:"type:numeric(15,2);not null" json:"amount"`
	Reason            string    `json:"reason"`
	CashTransactionID *string   `gorm:"size:36" json:"cash_transaction_id"`
	CreatedAt         time.Time `json:"created_at"`
}

// StaffPayroll bảng tính lương và phiếu chi lương kỳ kế toán
type StaffPayroll struct {
	ID                string     `gorm:"primaryKey;size:36" json:"id"`
	StaffID           string     `gorm:"size:36;index;not null" json:"staff_id"`
	PeriodMonth       int        `gorm:"not null" json:"period_month"` // 1 - 12
	PeriodYear        int        `gorm:"not null" json:"period_year"`  // 2026
	BaseSalary        float64    `gorm:"type:numeric(15,2);default:0" json:"base_salary"`
	Allowance         float64    `gorm:"type:numeric(15,2);default:0" json:"allowance"`
	OvertimePay       float64    `gorm:"type:numeric(15,2);default:0" json:"overtime_pay"`
	Bonus             float64    `gorm:"type:numeric(15,2);default:0" json:"bonus"`
	Deductions        float64    `gorm:"type:numeric(15,2);default:0" json:"deductions"`
	Advances          float64    `gorm:"type:numeric(15,2);default:0" json:"advances"`
	NetSalary         float64    `gorm:"type:numeric(15,2);not null" json:"net_salary"` // Thực lĩnh
	Status            string     `gorm:"size:50;default:'pending'" json:"status"` // pending, paid
	PaidAt            *time.Time `json:"paid_at"`
	CashTransactionID *string    `gorm:"size:36" json:"cash_transaction_id"`
	CreatedAt         time.Time  `json:"created_at"`
}

// RecurringExpense chi phí cố định & vận hành định kỳ (Thuê mặt bằng, WiFi, rác, phần mềm...)
type RecurringExpense struct {
	ID          string    `gorm:"primaryKey;size:36" json:"id"`
	TenantID    string    `gorm:"size:36;index;not null" json:"tenant_id"`
	BranchID    string    `gorm:"size:36;index;not null" json:"branch_id"`
	Title       string    `gorm:"size:255;not null" json:"title"`
	Category    string    `gorm:"size:100;not null" json:"category"` // mat_bang, dien_nuoc, internet, bao_tri, khac
	Amount      float64   `gorm:"type:numeric(15,2);not null" json:"amount"`
	Frequency   string    `gorm:"size:50;default:'monthly'" json:"frequency"` // monthly, weekly, daily, yearly
	DueDay      int       `gorm:"default:1" json:"due_day"`
	AutoRecord  bool      `gorm:"default:false" json:"auto_record"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

// TenantDevice thiết bị POS / KDS / CFD / Phục Vụ thuộc quán (Device Fleet)
type TenantDevice struct {
	ID         string    `gorm:"primaryKey;size:36" json:"id"`
	TenantID   string    `gorm:"size:36;index;not null" json:"tenant_id"`
	BranchID   string    `gorm:"size:36;index" json:"branch_id"`
	DeviceName string    `gorm:"size:100;not null" json:"device_name"`
	DeviceRole string    `gorm:"size:50;not null" json:"device_role"` // pos, kds, cfd, waiter
	Platform   string    `gorm:"size:50" json:"platform"`            // android, ios, web
	AppVersion string    `gorm:"size:20" json:"app_version"`
	IPAddress  string    `gorm:"size:50" json:"ip_address"`
	IsOnline   bool      `gorm:"default:false" json:"is_online"`
	LastActive time.Time `json:"last_active"`
	CreatedAt  time.Time `json:"created_at"`
}

// SaaSInvoice hóa đơn thu tiền bản quyền SaaS của Chủ Dự Án
type SaaSInvoice struct {
	ID            string    `gorm:"primaryKey;size:36" json:"id"`
	TenantID      string    `gorm:"size:36;index;not null" json:"tenant_id"`
	InvoiceCode   string    `gorm:"size:50;uniqueIndex;not null" json:"invoice_code"` // INV-2026-0001
	Amount        float64   `gorm:"type:numeric(15,2);not null" json:"amount"`
	MonthsAdded   int       `gorm:"not null" json:"months_added"`
	PaymentMethod string    `gorm:"size:50;default:'vietqr'" json:"payment_method"`   // vietqr, cash, bank_transfer
	Note          string    `json:"note"`
	CreatedAt     time.Time `json:"created_at"`
}

// TenantAddonConfig cấu hình module tính năng mở rộng & đơn giá phụ phí từng quán
type TenantAddonConfig struct {
	ID         string    `gorm:"primaryKey;size:36" json:"id"`
	TenantID   string    `gorm:"size:36;index;not null" json:"tenant_id"`
	AddonCode  string    `gorm:"size:50;not null" json:"addon_code"` // kds, cfd, telegram_fraud, pnl_reports, cash_shifts, multi_branch
	AddonName  string    `gorm:"size:100;not null" json:"addon_name"`
	IsEnabled  bool      `gorm:"default:false" json:"is_enabled"`
	MonthlyFee float64   `gorm:"type:numeric(15,2);default:0" json:"monthly_fee"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// SaaSLicenseKey mã kích hoạt bản quyền SaaS theo ngày (7 ngày, 15 ngày, 30 ngày...)
type SaaSLicenseKey struct {
	Key              string     `gorm:"primaryKey;size:50" json:"key"` // OC-PRO-30D-XXXX
	Plan             string     `gorm:"size:50;not null" json:"plan"`  // trial, standard, pro, enterprise
	DurationDays     int        `gorm:"not null" json:"duration_days"` // 7, 15, 30...
	MaxBranches      int        `gorm:"default:1" json:"max_branches"`
	MaxDevices       int        `gorm:"default:2" json:"max_devices"`
	IsUsed           bool       `gorm:"default:false" json:"is_used"`
	UsedByTenantID   string     `gorm:"size:36;index" json:"used_by_tenant_id"`
	UsedByTenantName string     `gorm:"size:255" json:"used_by_tenant_name"`
	UsedAt           *time.Time `json:"used_at"`
	Note             string     `json:"note"`
	CreatedAt        time.Time  `json:"created_at"`
}

func (SaaSLicenseKey) TableName() string {
	return "saas_license_keys"
}

// SaaSPlanConfig cấu hình bảng giá và ma trận tính năng động của từng gói
type SaaSPlanConfig struct {
	PlanID        string    `gorm:"primaryKey;size:50" json:"plan_id"` // trial, standard, pro, enterprise
	Name          string    `gorm:"size:100;not null" json:"name"`
	PricePerMonth float64   `gorm:"type:numeric(15,2);default:0" json:"price_per_month"`
	MaxBranches   int       `gorm:"default:1" json:"max_branches"`
	MaxDevices    int       `gorm:"default:2" json:"max_devices"`
	Tagline       string    `gorm:"size:255" json:"tagline"`
	FeaturesJson  string    `gorm:"type:text" json:"features_json"` // JSON mảng tính năng
	EnabledAddons string    `gorm:"size:255" json:"enabled_addons"` // comma-separated: kds,cfd,telegram_fraud,pnl_reports,cash_shifts,multi_branch
	UpdatedAt     time.Time `json:"updated_at"`
}

// PaymentIdempotencyKey khóa chống trùng lặp và replay cho các giao dịch ngân hàng / webhook
type PaymentIdempotencyKey struct {
	ID            string    `gorm:"primaryKey;size:64" json:"id"`
	TenantID      string    `gorm:"size:36;index;not null" json:"tenant_id"`
	ReferenceCode string    `gorm:"size:100;uniqueIndex;not null" json:"reference_code"`
	Amount        float64   `gorm:"type:numeric(15,2);not null" json:"amount"`
	Status        string    `gorm:"size:50;not null;default:'PROCESSED'" json:"status"`
	CreatedAt     time.Time `json:"created_at"`
}

func (PaymentIdempotencyKey) TableName() string {
	return "payment_idempotency_keys"
}

