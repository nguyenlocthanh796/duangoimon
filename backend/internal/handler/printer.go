package handler

import (
	"bytes"
	"fmt"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ongchu/pos-backend/internal/service"
)

var (
	cmdInit        = []byte{0x1B, 0x40}                   // ESC @ : Initialize printer
	cmdCodePage    = []byte{0x1B, 0x74, 0x00}             // ESC t 0 : Standard ASCII / Character Code table
	cmdAlignCenter = []byte{0x1B, 0x61, 0x01}             // ESC a 1 : Center Alignment
	cmdAlignLeft   = []byte{0x1B, 0x61, 0x00}             // ESC a 0 : Left Alignment
	cmdAlignRight  = []byte{0x1B, 0x61, 0x02}             // ESC a 2 : Right Alignment
	cmdFontHeader  = []byte{0x1D, 0x21, 0x11}             // GS ! 17 : Double height & double width
	cmdFontNormal  = []byte{0x1D, 0x21, 0x00}             // GS ! 0 : Normal font
	cmdAutoCut     = []byte{0x1D, 0x56, 0x41, 0x10}       // GS V 65 16 : Cut Paper (\x1d\x56\x41\x10)
	cmdDrawerKick  = []byte{0x1B, 0x70, 0x00, 0x19, 0xFA} // ESC p 0 25 250 : Kick Cash Drawer (\x1b\x70\x00\x19\xfa)
)

var bufferPool = sync.Pool{
	New: func() interface{} {
		return new(bytes.Buffer)
	},
}

var vnAsciiMap = map[rune]byte{
	'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a', 'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a', 'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
	'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A', 'Ă': 'A', 'Ắ': 'A', 'Ằ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A', 'Â': 'A', 'Ấ': 'A', 'Ầ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
	'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e', 'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
	'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E', 'Ê': 'E', 'Ế': 'E', 'Ề': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
	'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
	'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
	'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o', 'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o', 'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
	'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O', 'Ô': 'O', 'Ố': 'O', 'Ồ': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O', 'Ơ': 'O', 'Ớ': 'O', 'Ờ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
	'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u', 'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
	'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U', 'Ư': 'U', 'Ứ': 'U', 'Ừ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
	'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
	'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',
	'đ': 'd', 'Đ': 'D',
}

// WriteVietnameseClean writes ASCII-sanitized Vietnamese text directly into buf without heap string allocations
func WriteVietnameseClean(buf *bytes.Buffer, s string) {
	for _, r := range s {
		if ascii, ok := vnAsciiMap[r]; ok {
			buf.WriteByte(ascii)
		} else if r < 128 {
			buf.WriteByte(byte(r))
		} else {
			buf.WriteByte('?')
		}
	}
}

// RemoveVietnameseDiacritics converts Vietnamese UTF-8 to plain ASCII for thermal printer compatibility
func RemoveVietnameseDiacritics(s string) string {
	buf := bufferPool.Get().(*bytes.Buffer)
	buf.Reset()
	defer bufferPool.Put(buf)

	WriteVietnameseClean(buf, s)
	return buf.String()
}

type PrintReceiptRequest struct {
	PrinterIP   string      `json:"printer_ip"` // VD: 192.168.1.200 (nếu để trống chỉ tạo bytes)
	PrinterPort string      `json:"printer_port"`
	StoreName   string      `json:"store_name"`
	Address     string      `json:"address"`
	TableName   string      `json:"table_name"`
	Cashier     string      `json:"cashier"`
	OrderCode   string      `json:"order_code"`
	Items       []PrintItem `json:"items"`
	Subtotal    float64     `json:"subtotal"`
	Discount    float64     `json:"discount"`
	Total       float64     `json:"total"`
	CashGiven   float64     `json:"cash_given"`
	ChangeDue   float64     `json:"change_due"`
	Note        string      `json:"note"`
	BillURL     string      `json:"bill_url"`
	PrintQR     bool        `json:"print_qr"`
}

type PrintItem struct {
	Name      string  `json:"name"`
	Qty       int     `json:"qty"`
	UnitPrice float64 `json:"unit_price"`
	Amount    float64 `json:"amount"`
	Modifiers string  `json:"modifiers"`
}

// WriteESCPOSQRCode ghi lệnh in mã QR trực tiếp vào buffer máy in nhiệt (chuẩn phần cứng GS ( k)
func WriteESCPOSQRCode(buf *bytes.Buffer, data string) {
	if data == "" {
		return
	}
	// 1. Model: QR Code Model 2 (Function 165)
	buf.Write([]byte{0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00})

	// 2. Module Size: 5 dots (Function 167)
	buf.Write([]byte{0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x05})

	// 3. Error Correction Level: Level M (15%) (Function 169)
	buf.Write([]byte{0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31})

	// 4. Store Data (Function 180)
	dataLen := len(data) + 3
	pL := byte(dataLen & 0xFF)
	pH := byte((dataLen >> 8) & 0xFF)
	buf.Write([]byte{0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30})
	buf.WriteString(data)

	// 5. Print QR Code (Function 181)
	buf.Write([]byte{0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30})
	buf.WriteByte('\n')
}

// BuildESCPOSReceiptBuffer writes a standard 80mm/58mm thermal raw byte stream directly into buf
func BuildESCPOSReceiptBuffer(req PrintReceiptRequest, buf *bytes.Buffer) {
	// ESC @ : Initialize printer
	buf.Write(cmdInit)

	// ESC t 0 : Standard ASCII / Character Code table
	buf.Write(cmdCodePage)

	// ESC a 1 : Center Alignment
	buf.Write(cmdAlignCenter)

	// GS ! 17 : Double height & double width for Header
	buf.Write(cmdFontHeader)
	if req.StoreName == "" {
		buf.WriteString("ONGCHU POS\n")
	} else {
		WriteVietnameseClean(buf, req.StoreName)
		buf.WriteByte('\n')
	}

	// GS ! 0 : Normal font
	buf.Write(cmdFontNormal)
	if req.Address != "" {
		WriteVietnameseClean(buf, req.Address)
		buf.WriteByte('\n')
	}
	buf.WriteString("--------------------------------\n")

	// ESC a 0 : Left Alignment
	buf.Write(cmdAlignLeft)
	buf.WriteString("Ban: ")
	WriteVietnameseClean(buf, req.TableName)
	buf.WriteString("  Thu Ngan: ")
	WriteVietnameseClean(buf, req.Cashier)
	buf.WriteByte('\n')

	buf.WriteString(fmt.Sprintf("Ma HD: %-10s Gio: %s\n", req.OrderCode, time.Now().Format("15:04 02/01/2006")))
	buf.WriteString("--------------------------------\n")
	buf.WriteString(fmt.Sprintf("%-16s %3s %10s\n", "Ten Mon", "SL", "T.Tien"))
	buf.WriteString("--------------------------------\n")

	for _, item := range req.Items {
		nameClean := RemoveVietnameseDiacritics(item.Name)
		if len(nameClean) > 16 {
			nameClean = nameClean[:16]
		}
		buf.WriteString(fmt.Sprintf("%-16s %3d %10.0f\n", nameClean, item.Qty, item.Amount))
		if item.Modifiers != "" {
			buf.WriteString("  * ")
			WriteVietnameseClean(buf, item.Modifiers)
			buf.WriteByte('\n')
		}
	}

	buf.WriteString("--------------------------------\n")

	// ESC a 2 : Right Alignment
	buf.Write(cmdAlignRight)
	buf.WriteString(fmt.Sprintf("Tong Tien: %12.0f d\n", req.Total))
	if req.CashGiven > 0 {
		buf.WriteString(fmt.Sprintf("Khach Dua: %12.0f d\n", req.CashGiven))
		buf.WriteString(fmt.Sprintf("Tien Thoi: %12.0f d\n", req.ChangeDue))
	}

	// In mã QR Hóa đơn điện tử nếu có
	billLink := req.BillURL
	if billLink == "" && req.PrintQR && req.OrderCode != "" {
		billLink = fmt.Sprintf("https://ongchu.cloud/b/%s", req.OrderCode)
	}
	if billLink != "" {
		buf.WriteString("--------------------------------\n")
		buf.Write(cmdAlignCenter)
		WriteESCPOSQRCode(buf, billLink)
		buf.WriteString("Quet QR xem hoa don dien tu\n")
	}

	// ESC a 1 : Center
	buf.Write(cmdAlignCenter)
	buf.WriteString("--------------------------------\n")
	buf.WriteString("Cam on quy khach - Hen gap lai!\n\n")

	// GS V 65 16 : Cut Paper (\x1d\x56\x41\x10)
	buf.Write(cmdAutoCut)

	// ESC p 0 25 250 : Kick Cash Drawer (\x1b\x70\x00\x19\xfa)
	buf.Write(cmdDrawerKick)
}

// BuildESCPOSBytes builds a standard 80mm/58mm thermal raw byte stream with buffer pool
func BuildESCPOSBytes(req PrintReceiptRequest) []byte {
	buf := bufferPool.Get().(*bytes.Buffer)
	buf.Reset()
	defer bufferPool.Put(buf)

	BuildESCPOSReceiptBuffer(req, buf)

	res := make([]byte, buf.Len())
	copy(res, buf.Bytes())
	return res
}

// isSafePrinterIP kiểm tra IP máy in chống tấn công SSRF và quét mạng nội bộ
func isSafePrinterIP(ipStr string) bool {
	cleanIP := strings.TrimSpace(ipStr)
	if cleanIP == "" {
		return false
	}
	ip := net.ParseIP(cleanIP)
	if ip == nil {
		return false // Chỉ cho phép định dạng IP rõ ràng, không cho phép hostname để chống DNS rebinding
	}
	// Chặn metadata cloud AWS/GCP (169.254.169.254) và multicast/unspecified
	if ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsMulticast() || ip.IsUnspecified() {
		return false
	}
	return true
}

// PrintReceipt in hóa đơn bán hàng trực tiếp qua mạng LAN cổng TCP 9100
func PrintReceipt(c *gin.Context) {
	var req PrintReceiptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	buf := bufferPool.Get().(*bytes.Buffer)
	buf.Reset()
	defer bufferPool.Put(buf)

	BuildESCPOSReceiptBuffer(req, buf)
	bytesCount := buf.Len()

	// Nếu có cấu hình Printer IP, kết nối trực tiếp qua TCP socket cổng 9100
	if req.PrinterIP != "" {
		if !isSafePrinterIP(req.PrinterIP) {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Địa chỉ IP máy in không hợp lệ hoặc bị chặn vì lý do an toàn mạng (SSRF Protection)",
			})
			return
		}

		port := req.PrinterPort
		if port == "" {
			port = "9100"
		}
		target := fmt.Sprintf("%s:%s", req.PrinterIP, port)
		conn, err := net.DialTimeout("tcp", target, 3*time.Second)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"status":        "warning",
				"message":       fmt.Sprintf("Khong the ket noi toi may in tai %s: %v", target, err),
				"bytes_created": bytesCount,
			})
			return
		}
		defer conn.Close()

		// Set write deadline on socket
		if err := conn.SetWriteDeadline(time.Now().Add(5 * time.Second)); err != nil {
			log.Printf("Warning: failed to set write deadline: %v", err)
		}

		// Direct zero-copy stream from buffer to TCP socket
		_, err = buf.WriteTo(conn)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"status":  "error",
				"message": fmt.Sprintf("Loi khi gui bytes toi may in: %v", err),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":     "success",
			"message":    fmt.Sprintf("Da gui thanh cong toi may in tai %s", target),
			"bytes_sent": bytesCount,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "success",
		"message":       "ESC/POS bytes generated successfully",
		"bytes_created": bytesCount,
	})
}

type OpenDrawerRequest struct {
	PrinterIP   string `json:"printer_ip"`
	PrinterPort string `json:"printer_port"`
	CashierName string `json:"cashier_name"`
}

// OpenDrawer kích hoạt xung điện RJ11 mở két đựng tiền và gửi cảnh báo Telegram
func OpenDrawer(c *gin.Context) {
	var req OpenDrawerRequest
	_ = c.ShouldBindJSON(&req)

	cashier := req.CashierName
	if cashier == "" {
		cashier = "Thu ngân"
	}
	service.GlobalTelegramAlert.AlertManualDrawerKick(cashier)

	if req.PrinterIP != "" {
		if !isSafePrinterIP(req.PrinterIP) {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Địa chỉ IP máy in không hợp lệ (SSRF Protection)",
			})
			return
		}

		port := req.PrinterPort
		if port == "" {
			port = "9100"
		}
		target := fmt.Sprintf("%s:%s", req.PrinterIP, port)
		conn, err := net.DialTimeout("tcp", target, 3*time.Second)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"status":  "warning",
				"message": fmt.Sprintf("Không thể kết nối máy in tại %s: %v", target, err),
				"bytes":   cmdDrawerKick,
			})
			return
		}
		defer conn.Close()

		_, err = conn.Write(cmdDrawerKick)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"status":  "error",
				"message": fmt.Sprintf("Lỗi kích két: %v", err),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "Đã mở ngăn kéo đựng tiền",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Lệnh kích két (RJ11) đã được tạo",
		"bytes":   cmdDrawerKick,
	})
}

type PrintKitchenRequest struct {
	PrinterIP   string             `json:"printer_ip"`
	PrinterPort string             `json:"printer_port"`
	Station     string             `json:"station"` // bar, kitchen, snack
	TableName   string             `json:"table_name"`
	OrderCode   string             `json:"order_code"`
	Items       []PrintKitchenItem `json:"items"`
	Note        string             `json:"note"`
}

type PrintKitchenItem struct {
	Name      string `json:"name"`
	Qty       int    `json:"qty"`
	Modifiers string `json:"modifiers"`
	Note      string `json:"note"`
}

// BuildESCPOSKitchenBuffer tạo chuỗi byte in phiếu chế biến bếp/bar
func BuildESCPOSKitchenBuffer(req PrintKitchenRequest, buf *bytes.Buffer) {
	buf.Write(cmdInit)
	buf.Write(cmdCodePage)
	buf.Write(cmdAlignCenter)
	buf.Write(cmdFontHeader)

	stationTitle := "PHIEU CHE BIEN"
	st := strings.ToLower(req.Station)
	if st == "bar" {
		stationTitle = "PHIEU PHA CHE (BAR)"
	} else if st == "kitchen" {
		stationTitle = "PHIEU BEP NONG"
	} else if st == "snack" {
		stationTitle = "PHIEU QUAY SNACK"
	}
	buf.WriteString(stationTitle + "\n")

	buf.Write(cmdFontNormal)
	buf.WriteString("--------------------------------\n")
	buf.Write(cmdAlignLeft)
	buf.WriteString(fmt.Sprintf("Ban: %-12s Ma: %s\n", RemoveVietnameseDiacritics(req.TableName), req.OrderCode))
	buf.WriteString(fmt.Sprintf("Gio: %s\n", time.Now().Format("15:04:05 02/01/2006")))
	buf.WriteString("--------------------------------\n")
	buf.WriteString(fmt.Sprintf("%-22s %4s\n", "Ten Mon", "SL"))
	buf.WriteString("--------------------------------\n")

	for _, item := range req.Items {
		nameClean := RemoveVietnameseDiacritics(item.Name)
		if len(nameClean) > 22 {
			nameClean = nameClean[:22]
		}
		buf.Write(cmdFontHeader)
		buf.WriteString(fmt.Sprintf("%-18s %3d\n", nameClean, item.Qty))
		buf.Write(cmdFontNormal)
		if item.Modifiers != "" {
			buf.WriteString("  * ")
			WriteVietnameseClean(buf, item.Modifiers)
			buf.WriteByte('\n')
		}
		if item.Note != "" {
			buf.WriteString("  (GC: ")
			WriteVietnameseClean(buf, item.Note)
			buf.WriteString(")\n")
		}
	}

	buf.WriteString("--------------------------------\n")
	if req.Note != "" {
		buf.WriteString("Ghi chu: ")
		WriteVietnameseClean(buf, req.Note)
		buf.WriteString("\n--------------------------------\n")
	}
	buf.WriteString("\n\n")
	buf.Write(cmdAutoCut)
}

// PrintKitchen in phiếu chế biến cho bếp hoặc quầy pha chế qua mạng LAN
func PrintKitchen(c *gin.Context) {
	var req PrintKitchenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	buf := bufferPool.Get().(*bytes.Buffer)
	buf.Reset()
	defer bufferPool.Put(buf)

	BuildESCPOSKitchenBuffer(req, buf)
	bytesCount := buf.Len()

	if req.PrinterIP != "" {
		if !isSafePrinterIP(req.PrinterIP) {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Địa chỉ IP máy in không hợp lệ (SSRF Protection)",
			})
			return
		}

		port := req.PrinterPort
		if port == "" {
			port = "9100"
		}
		target := fmt.Sprintf("%s:%s", req.PrinterIP, port)
		conn, err := net.DialTimeout("tcp", target, 3*time.Second)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"status":        "warning",
				"message":       fmt.Sprintf("Khong the ket noi toi may in tai %s: %v", target, err),
				"bytes_created": bytesCount,
			})
			return
		}
		defer conn.Close()

		if err := conn.SetWriteDeadline(time.Now().Add(5 * time.Second)); err != nil {
			log.Printf("Warning: failed to set write deadline: %v", err)
		}

		_, err = buf.WriteTo(conn)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"status":  "error",
				"message": fmt.Sprintf("Loi khi gui bytes toi may in: %v", err),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":     "success",
			"message":    fmt.Sprintf("Da gui phieu bep toi may in tai %s", target),
			"bytes_sent": bytesCount,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "success",
		"message":       "Kitchen ESC/POS bytes generated successfully",
		"bytes_created": bytesCount,
	})
}

// CupStickerItem đại diện cho 1 tem nhãn dán ly trà sữa / cafe
type CupStickerItem struct {
	StickerID    string   `json:"stickerId"`
	OrderCode    string   `json:"orderCode"`
	TableName    string   `json:"tableName"`
	ItemName     string   `json:"itemName"`
	SelectedSize string   `json:"selectedSize"`
	SugarLevel   string   `json:"sugarLevel"`
	IceLevel     string   `json:"iceLevel"`
	Toppings     []string `json:"toppings"`
	Note         string   `json:"note"`
	UnitPrice    float64  `json:"unitPrice"`
	CupIndex     int      `json:"cupIndex"`
	TotalCups    int      `json:"totalCups"`
	OrderTime    string   `json:"orderTime"`
	StoreName    string   `json:"storeName"`
}

// PrintCupLabelsRequest payload yêu cầu in tem dán ly TSPL
type PrintCupLabelsRequest struct {
	PrinterIP   string           `json:"printer_ip"`
	PrinterPort int              `json:"printer_port"`
	LabelSize   string           `json:"label_size"` // "50x30" hoặc "40x30"
	Stickers    []CupStickerItem `json:"stickers"`
}

// BuildTSPLCupLabelsBuffer tạo chuỗi lệnh TSPL chuẩn cho máy in tem nhiệt dán ly
func BuildTSPLCupLabelsBuffer(req PrintCupLabelsRequest, buf *bytes.Buffer) {
	labelW := 50
	labelH := 30
	if req.LabelSize == "40x30" {
		labelW = 40
		labelH = 30
	}

	for _, s := range req.Stickers {
		buf.WriteString(fmt.Sprintf("SIZE %d mm, %d mm\r\n", labelW, labelH))
		buf.WriteString("GAP 2 mm, 0 mm\r\n")
		buf.WriteString("DIRECTION 1\r\n")
		buf.WriteString("CLS\r\n")

		// 1. Quán & STT Ly: ONGCHU POS [1/3]
		storeName := s.StoreName
		if storeName == "" {
			storeName = "ONGCHU POS"
		}
		cleanStore := RemoveVietnameseDiacritics(storeName)
		buf.WriteString(fmt.Sprintf("TEXT 15,10,\"2\",0,1,1,\"%s [%d/%d]\"\r\n", cleanStore, s.CupIndex, s.TotalCups))

		// 2. Bàn & Mã đơn: Ban 01 * CHO-01
		cleanTable := RemoveVietnameseDiacritics(s.TableName)
		cleanCode := RemoveVietnameseDiacritics(s.OrderCode)
		buf.WriteString(fmt.Sprintf("TEXT 15,35,\"2\",0,1,1,\"%s * %s\"\r\n", cleanTable, cleanCode))
		buf.WriteString(fmt.Sprintf("BAR 15,60,%d,2\r\n", labelW*8-30))

		// 3. Tên món: Tra Sua Oolong (L)
		cleanItem := RemoveVietnameseDiacritics(s.ItemName)
		if s.SelectedSize != "" {
			cleanItem += fmt.Sprintf(" (%s)", s.SelectedSize)
		}
		buf.WriteString(fmt.Sprintf("TEXT 15,70,\"3\",0,1,1,\"%s\"\r\n", cleanItem))

		// 4. Đường / Đá
		var opts []string
		if s.SugarLevel != "" {
			opts = append(opts, RemoveVietnameseDiacritics(s.SugarLevel))
		}
		if s.IceLevel != "" {
			opts = append(opts, RemoveVietnameseDiacritics(s.IceLevel))
		}
		if len(opts) > 0 {
			buf.WriteString(fmt.Sprintf("TEXT 15,110,\"2\",0,1,1,\"%s\"\r\n", strings.Join(opts, " | ")))
		}

		// 5. Toppings
		if len(s.Toppings) > 0 {
			var tops []string
			for _, t := range s.Toppings {
				tops = append(tops, RemoveVietnameseDiacritics(t))
			}
			buf.WriteString(fmt.Sprintf("TEXT 15,140,\"2\",0,1,1,\"+%s\"\r\n", strings.Join(tops, ", ")))
		}

		// 6. Ghi chú
		if s.Note != "" {
			buf.WriteString(fmt.Sprintf("TEXT 15,170,\"1\",0,1,1,\"*%s\"\r\n", RemoveVietnameseDiacritics(s.Note)))
		}

		// 7. Giá & Giờ
		buf.WriteString(fmt.Sprintf("TEXT 15,195,\"2\",0,1,1,\"%.0fd * %s\"\r\n", s.UnitPrice, s.OrderTime))
		buf.WriteString("PRINT 1,1\r\n")
	}
}

// PrintCupLabels in danh sách tem dán ly TSPL qua cổng TCP 9100
func PrintCupLabels(c *gin.Context) {
	var req PrintCupLabelsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Stickers) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Không có tem nhãn để in"})
		return
	}

	buf := bufferPool.Get().(*bytes.Buffer)
	buf.Reset()
	defer bufferPool.Put(buf)

	BuildTSPLCupLabelsBuffer(req, buf)
	bytesCount := buf.Len()

	if req.PrinterIP != "" {
		if !isSafePrinterIP(req.PrinterIP) {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Địa chỉ IP máy in không hợp lệ (SSRF Protection)",
			})
			return
		}

		port := req.PrinterPort
		if port == 0 {
			port = 9100
		}
		target := fmt.Sprintf("%s:%d", req.PrinterIP, port)
		conn, err := net.DialTimeout("tcp", target, 3*time.Second)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"status":         "warning",
				"message":        fmt.Sprintf("Khong the ket noi toi may in tem tai %s: %v", target, err),
				"bytes_created":  bytesCount,
				"stickers_count": len(req.Stickers),
			})
			return
		}
		defer conn.Close()

		if err := conn.SetWriteDeadline(time.Now().Add(5 * time.Second)); err != nil {
			log.Printf("Warning: failed to set write deadline: %v", err)
		}

		_, err = buf.WriteTo(conn)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"status":  "error",
				"message": fmt.Sprintf("Loi khi gui bytes toi may in tem: %v", err),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":         "success",
			"message":        fmt.Sprintf("Da gui %d tem toi may in tai %s", len(req.Stickers), target),
			"bytes_sent":     bytesCount,
			"stickers_count": len(req.Stickers),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":         "success",
		"message":        "TSPL cup labels generated successfully",
		"bytes_created":  bytesCount,
		"stickers_count": len(req.Stickers),
	})
}


