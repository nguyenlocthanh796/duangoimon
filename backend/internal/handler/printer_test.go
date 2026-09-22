package handler

import (
	"bytes"
	"testing"
)

func TestRemoveVietnameseDiacritics(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"Trà Sữa Trân Châu Đường Đen", "Tra Sua Tran Chau Duong Den"},
		{"Cà phê sữa đá Sài Gòn", "Ca phe sua da Sai Gon"},
		{"Bánh mì chả lụa & phô mai", "Banh mi cha lua & pho mai"},
		{"100% Nguyên Chất - 50.000đ", "100% Nguyen Chat - 50.000d"},
	}

	for _, tt := range tests {
		got := RemoveVietnameseDiacritics(tt.input)
		if got != tt.expected {
			t.Errorf("RemoveVietnameseDiacritics(%q) = %q; want %q", tt.input, got, tt.expected)
		}
	}
}

func TestWriteVietnameseClean(t *testing.T) {
	buf := new(bytes.Buffer)
	input := "Phở Bò Tái Nạm & Nước Dừa Tươi"
	expected := "Pho Bo Tai Nam & Nuoc Dua Tuoi"

	WriteVietnameseClean(buf, input)
	if buf.String() != expected {
		t.Errorf("WriteVietnameseClean() = %q; want %q", buf.String(), expected)
	}
}

func TestBuildESCPOSBytesHardwareOpcodes(t *testing.T) {
	req := PrintReceiptRequest{
		StoreName: "Quán Trà Sữa Ông Chủ",
		Address:   "123 Đường Số 1, Quận 1",
		TableName: "Bàn 01",
		Cashier:   "Thu Ngân 1",
		OrderCode: "HD-123456",
		Items: []PrintItem{
			{
				Name:      "Trà Sữa Trân Châu",
				Qty:       2,
				UnitPrice: 30000,
				Amount:    60000,
				Modifiers: "Ít đường, Nhiều đá",
			},
		},
		Subtotal:  60000,
		Total:     60000,
		CashGiven: 100000,
		ChangeDue: 40000,
	}

	rawBytes := BuildESCPOSBytes(req)
	if len(rawBytes) == 0 {
		t.Fatal("BuildESCPOSBytes returned empty slice")
	}

	// 1. Verify ESC @ (Init printer: 0x1B, 0x40)
	if !bytes.Contains(rawBytes, []byte{0x1B, 0x40}) {
		t.Error("Missing ESC @ (0x1B, 0x40) Init command")
	}

	// 2. Verify ESC t 0 (ASCII code page: 0x1B, 0x74, 0x00)
	if !bytes.Contains(rawBytes, []byte{0x1B, 0x74, 0x00}) {
		t.Error("Missing ESC t 0 (0x1B, 0x74, 0x00) Code page command")
	}

	// 3. Verify GS ! 17 (Double size header: 0x1D, 0x21, 0x11)
	if !bytes.Contains(rawBytes, []byte{0x1D, 0x21, 0x11}) {
		t.Error("Missing GS ! 17 (0x1D, 0x21, 0x11) Header font command")
	}

	// 4. Verify Auto-cut opcode GS V 65 16: \x1d\x56\x41\x10 (0x1D, 0x56, 0x41, 0x10)
	if !bytes.Contains(rawBytes, []byte{0x1D, 0x56, 0x41, 0x10}) {
		t.Error("Missing GS V 65 16 (0x1D, 0x56, 0x41, 0x10) Auto-cut command")
	}

	// 5. Verify Cash Drawer kick opcode ESC p 0 25 250: \x1b\x70\x00\x19\xfa (0x1B, 0x70, 0x00, 0x19, 0xFA)
	if !bytes.Contains(rawBytes, []byte{0x1B, 0x70, 0x00, 0x19, 0xFA}) {
		t.Error("Missing ESC p (0x1B, 0x70, 0x00, 0x19, 0xFA) Cash Drawer kick command")
	}

	// 6. Verify Content contains sanitized strings
	rawStr := string(rawBytes)
	if !bytes.Contains(rawBytes, []byte("Quan Tra Sua Ong Chu")) {
		t.Errorf("Receipt does not contain clean StoreName. Content: %s", rawStr)
	}
	if !bytes.Contains(rawBytes, []byte("Tra Sua Tran Cha")) {
		t.Errorf("Receipt does not contain clean ItemName. Content: %s", rawStr)
	}
	if !bytes.Contains(rawBytes, []byte("It duong, Nhieu da")) {
		t.Errorf("Receipt does not contain clean Modifiers. Content: %s", rawStr)
	}
}
