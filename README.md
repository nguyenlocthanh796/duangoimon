# OngChu POS — Lean F&B Point of Sale Platform

<p align="center">
  <img src="screenshots/pos_menu_unified_clean.png" alt="OngChu POS Interface Overview" width="920"/>
</p>

<p align="center">
  <a href="https://ongchu.cloud"><img src="https://img.shields.io/badge/Platform-Web%20%7C%20Windows%20%7C%20Android-1c1917?style=flat-square" alt="Platform"/></a>
  <a href="https://app.ongchu.cloud"><img src="https://img.shields.io/badge/Production%20App-app.ongchu.cloud-b45309?style=flat-square" alt="Live App"/></a>
  <a href="https://github.com/nguyenlocthanh796/duangoimon/releases"><img src="https://img.shields.io/badge/Release-v2.0.0-15803d?style=flat-square" alt="Release"/></a>
  <img src="https://img.shields.io/badge/Architecture-Dual--Theme%20Universal-44403c?style=flat-square" alt="Architecture"/>
  <img src="https://img.shields.io/badge/License-Commercial%20%2F%20Proprietary-blue?style=flat-square" alt="License"/>
</p>

---

## 1. Executive Summary

**OngChu POS** is an enterprise-grade, ultra-lightweight Point-of-Sale and management ecosystem built specifically for F&B businesses, including Cafes, Milk Tea Shops, Restaurants, Quick-Service Counters, and Multi-Branch Chains.

Designed around the **"Zero-Gov / Lean Operator"** philosophy, the system eliminates administrative friction while enforcing absolute cash security, real-time audit trails, and sub-second touch latency.

- **Web POS**: [https://app.ongchu.cloud](https://app.ongchu.cloud) (Instant deployment, zero installation required)
- **Windows Native**: Ultra-light ~12MB standalone binary with minimal RAM footprint (<20MB)
- **Mobile & Tablet**: High-performance 60 FPS Native engine across iOS and Android

---

## 2. Core Operational Pillars

| Pillar | Technical Implementation | Operational Value |
|---|---|---|
| **1-Touch Ordering** | Multi-table state machine with instant seat/order switching | Order processing and bill split execution under 3 seconds |
| **Instant Petty Cash (`/so-quy`)** | Real-time petty expense journal with auto-ledgering | Direct cash-out tracking (ice, fresh produce, salary advances) |
| **Cash Drawer Audit (`/giao-ca`)** | Exact cash counting and shift balance reconciliation | Instant variance detection and automatic shift handover reporting |
| **3 Golden Numbers P&L (`/bao-cao-loi-nhuan`)** | Real-time formula: `Drawer Cash` + `Bank VietQR` = `Net Profit` | Zero-latency financial clarity without complex accounting delays |
| **Direct ESC/POS Thermal Printing** | Native Raw TCP Socket (Port 9100) with RJ11 pulse triggers | Driverless LAN printing (K80/K58) and automated paper cutting |
| **Active Anti-Fraud Engine** | Real-time Telegram goroutine alerts on high-risk events | Instant notification for voided items, high discounts (>20%), and manual drawer kicks |

---

## 3. Product Gallery

<div align="center">
  <table>
    <tr>
      <td width="50%" align="center">
        <img src="screenshots/03_pos_so_do_ban.png" alt="Table Management" width="100%"/><br/>
        <sub><b>Table Layout & Area Zoning</b></sub>
      </td>
      <td width="50%" align="center">
        <img src="screenshots/05_pos_thuc_don_mon_an.png" alt="Menu Catalog" width="100%"/><br/>
        <sub><b>Menu Ordering & Instant Customization</b></sub>
      </td>
    </tr>
    <tr>
      <td width="50%" align="center">
        <img src="screenshots/11_thanh_toan_tien_mat_numpad.png" alt="Cash Payment Numpad" width="100%"/><br/>
        <sub><b>Rapid Cash Numpad & Change Calculation</b></sub>
      </td>
      <td width="50%" align="center">
        <img src="screenshots/12_thanh_toan_vietqr_napas247.png" alt="Dynamic VietQR Payment" width="100%"/><br/>
        <sub><b>Dynamic VietQR & MB Soundbox Integration</b></sub>
      </td>
    </tr>
    <tr>
      <td width="50%" align="center">
        <img src="screenshots/13_kds_tong_quan.png" alt="Kitchen Display System" width="100%"/><br/>
        <sub><b>Kitchen / Barista Display System (KDS)</b></sub>
      </td>
      <td width="50%" align="center">
        <img src="screenshots/21_bao_cao_3_con_so_vang.png" alt="P&L Report" width="100%"/><br/>
        <sub><b>3 Golden Numbers P&L Real-Time Analytics</b></sub>
      </td>
    </tr>
    <tr>
      <td width="50%" align="center">
        <img src="screenshots/18_so_quy_tao_phieu_chi_3s.png" alt="Petty Cash Voucher" width="100%"/><br/>
        <sub><b>3-Second Petty Cash Flow Ledger</b></sub>
      </td>
      <td width="50%" align="center">
        <img src="screenshots/20_giao_ca_tong_ket_ca.png" alt="Shift Closing Summary" width="100%"/><br/>
        <sub><b>Shift Closing & Drawer Reconciliation</b></sub>
      </td>
    </tr>
  </table>
</div>

---

## 4. Platform Distribution & Downloads

| Platform | Format | Release Link | Notes |
|---|---|---|---|
| **Windows Desktop** | `.exe` (~12MB) | [Download Windows App](https://github.com/nguyenlocthanh796/duangoimon/releases/latest) | Standalone portable executable, no runtime required |
| **Android Tablet & Phone** | `.apk` (~25MB) | [Download Android APK](https://github.com/nguyenlocthanh796/duangoimon/releases/latest) | Compatible with POS handheld terminals, Android 8.0+ |
| **Universal Web App** | PWA | [Launch Web POS](https://app.ongchu.cloud) | Instant cloud sync, offline-ready local cache |

---

## 5. Operational Documentation (SOP)

Detailed operating procedures for cashiers, managers, and store owners:

- [Standard Operating Procedure: POS Sales & Order Management](docs/01_huong_dan_ban_hang.md)
- [Petty Cash Management: 3-Second Market Expense Ledger](docs/02_so_quy_chi_cho.md)
- [Shift Reconciliation: 30-Second Cash Drawer Audit](docs/03_giao_ca_dem_ket.md)
- [Hardware Integration: ESC/POS Thermal Printers & Cash Drawers](docs/04_ket_noi_may_in.md)
- [Security Controls: Telegram Anti-Fraud Configuration](docs/05_chong_gian_lan_telegram.md)

---

## 6. Enterprise Security & Architecture Standards

1. **Zero-Source Deployment**: Production environments execute exclusively stripped, hardened binaries. No application source code or raw database files are exposed on public hosts.
2. **Deterministic Multi-Tenancy**: Complete logical separation of store configurations, catalog metadata, inventory ledgers, and transaction histories.
3. **Double-Entry Cash Controls**: Cash movements are strictly immutable, requiring explicit manager PIN verification and audit reason logging for all post-print modifications.
4. **Hardware-Direct Thermal Printing**: Bypass OS print spoolers with direct TCP socket communication, ensuring immediate receipt generation and cash drawer triggers.

---

## 7. Support & Community

- **Issue Tracker**: [Submit Bug Report](https://github.com/nguyenlocthanh796/duangoimon/issues/new?template=bug_report.md)
- **Feature Requests**: [Submit Proposal](https://github.com/nguyenlocthanh796/duangoimon/issues/new?template=feature_request.md)
- **Official Website**: [https://ongchu.cloud](https://ongchu.cloud)
- **Technical Hotline & Zalo**: `0392.387.165`

---

<p align="center">
  <sub>Copyright © 2026 OngChu POS Ecosystem. All rights reserved.</sub>
</p>
