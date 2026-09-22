package service

import (
	"fmt"
	"net/url"
	"strings"
)

// GenerateVietQRQuickLink tạo URL ảnh VietQR Napas 247 động khớp 100% số tiền hóa đơn
func GenerateVietQRQuickLink(bankCode string, accountNo string, accountName string, amount float64, orderCode string) string {
	baseURL := fmt.Sprintf("https://img.vietqr.io/image/%s-%s-compact2.png", bankCode, accountNo)
	params := url.Values{}
	params.Add("amount", fmt.Sprintf("%.0f", amount))
	params.Add("addInfo", fmt.Sprintf("TT %s", orderCode))
	params.Add("accountName", accountName)
	return fmt.Sprintf("%s?%s", baseURL, params.Encode())
}

// formatTLV formats an EMVCo Tag-Length-Value string
func formatTLV(tag string, value string) string {
	return fmt.Sprintf("%s%02d%s", tag, len(value), value)
}

// calculateCRC16 calculates CCITT-FALSE CRC16 checksum for EMVCo
func calculateCRC16(data string) string {
	crc := uint16(0xFFFF)
	for i := 0; i < len(data); i++ {
		crc ^= uint16(data[i]) << 8
		for j := 0; j < 8; j++ {
			if (crc & 0x8000) != 0 {
				crc = (crc << 1) ^ 0x1021
			} else {
				crc <<= 1
			}
		}
	}
	return fmt.Sprintf("%04X", crc)
}

// GenerateVietQREMVCo generates an EMVCo compliant Napas 247 payload string
func GenerateVietQREMVCo(bankBin string, accountNo string, amount float64, orderCode string) string {
	// Subtags for Tag 38 (Merchant Account Info - Napas)
	napasGUID := formatTLV("00", "A000000727")
	
	// Beneficiary Info: Tag 00 = Bank BIN, Tag 01 = Account Number
	binTLV := formatTLV("00", bankBin)
	accTLV := formatTLV("01", accountNo)
	beneficiary := formatTLV("01", binTLV+accTLV)
	serviceCode := formatTLV("02", "QRIBFTTA")
	tag38Value := napasGUID + beneficiary + serviceCode
	tag38 := formatTLV("38", tag38Value)

	// Format Indicator & Initiation Method (Dynamic = 12)
	payload := formatTLV("00", "01") + formatTLV("01", "12")
	payload += tag38
	payload += formatTLV("53", "704") // VND Currency
	if amount > 0 {
		payload += formatTLV("54", fmt.Sprintf("%.0f", amount))
	}
	payload += formatTLV("58", "VN") // Country Code

	// Additional Data Field (Tag 62)
	if orderCode != "" {
		infoClean := strings.TrimSpace(orderCode)
		tag62Value := formatTLV("08", fmt.Sprintf("TT %s", infoClean))
		payload += formatTLV("62", tag62Value)
	}

	// CRC placeholder (Tag 63)
	payloadForCRC := payload + "6304"
	crc := calculateCRC16(payloadForCRC)
	return payloadForCRC + crc
}

// GenerateMBSoundboxDynamicQR phát sinh chuỗi EMVCo Napas 247 động tích hợp Loa Báo Có MB Bank
func GenerateMBSoundboxDynamicQR(merchantID string, soundboxID string, refPrefix string, amount float64, orderCode string) string {
	if refPrefix == "" {
		refPrefix = "HD"
	}

	napasGUID := formatTLV("00", "A000000727")
	binTLV := formatTLV("00", "970422") // MB Bank BIN
	mercTLV := formatTLV("01", merchantID)
	beneficiary := formatTLV("01", binTLV+mercTLV)
	serviceCode := formatTLV("02", "QRIBFTTA")
	tag38 := formatTLV("38", napasGUID+beneficiary+serviceCode)

	payload := formatTLV("00", "01") + formatTLV("01", "12")
	payload += tag38
	payload += formatTLV("53", "704")
	if amount > 0 {
		payload += formatTLV("54", fmt.Sprintf("%.0f", amount))
	}
	payload += formatTLV("58", "VN")

	tag62Value := ""
	if refPrefix != "" {
		tag62Value += formatTLV("01", refPrefix)
	}
	if soundboxID != "" {
		tag62Value += formatTLV("08", soundboxID)
	}
	if tag62Value != "" {
		payload += formatTLV("62", tag62Value)
	}

	payloadForCRC := payload + "6304"
	crc := calculateCRC16(payloadForCRC)
	return payloadForCRC + crc
}

