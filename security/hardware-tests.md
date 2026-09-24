# 🖨️ HARDWARE, ESC/POS & CASH DRAWER SECURITY TESTS

## 1. Test Matrix

| Test ID | Target Component | Attack Vector / Check | Expected Behavior | Actual Result |
|---|---|---|---|---|
| **HW-01** | `isSafePrinterIP` | Input `169.254.169.254` (Cloud Metadata) | Blocked as unsafe (`false`) | **PASS** |
| **HW-02** | `isSafePrinterIP` | Input `http://attacker.com` / `localhost` | Blocked as unsafe (`false`) | **PASS** |
| **HW-03** | `isSafePrinterIP` | Input `192.168.1.200` (LAN IP) | Allowed as safe (`true`) | **PASS** |
| **HW-04** | Cash Drawer RJ11 | Manual drawer trigger without active order | Emits byte `\x1B\x70\x00\x19\xFA` + Triggers Telegram Bot Fraud Alert | **PASS** |
| **HW-05** | ESC/POS Command Stream | Raw receipt buffer generation | Structured bytes with `WriteVietnameseClean` (no memory overflow / heap exploit) | **PASS** |

## 2. Regression Test Evidence
- Command: `go test -v ./internal/handler -run "TestSSRFPrinterProtection|TestPrinterOpenDrawerAndKitchen"`
- Result: `PASS`
