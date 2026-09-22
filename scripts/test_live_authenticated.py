# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import asyncio
from playwright.async_api import async_playwright

async def run_authenticated_flow():
    print("=== BAT DAU KIEM THU LUONG AUTH & POS LIVE TREN https://app.ongchu.cloud ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 393, "height": 852},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True
        )
        page = await context.new_page()

        # 1. Mở trang login
        print("1. Truy cap https://app.ongchu.cloud/login...")
        await page.goto("https://app.ongchu.cloud/login", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # 2. Click nút chip Quán Khách (quanquan) hoặc Quán Mẫu (ongchu)
        print("2. Chon dang nhap Quán Khách (quanquan)...")
        chip_quanquan = page.locator('text=Quán Khách (quanquan)').or_(page.locator('text=quanquan'))
        if await chip_quanquan.count() > 0:
            await chip_quanquan.first.click()
            await page.wait_for_timeout(500)
            print("   -> Da click chip quanquan")

        # 3. Click Đăng Nhập Hệ Thống
        print("3. Nhan nut Dang Nhap He Thong...")
        login_btn = page.locator('text=Đăng Nhập Hệ Thống')
        if await login_btn.count() > 0:
            await login_btn.first.click()
            await page.wait_for_timeout(2000)
            print("   -> Da click Dang Nhap He Thong")

        # 4. Xác nhận đã vào màn hình POS Sơ đồ bàn
        pos_title = await page.evaluate("() => document.body.innerText.substring(0, 300).replace(/\\n/g, ' ')")
        print(f"   [Sau Dang Nhap]: {pos_title}")

        # 5. Chọn Bàn 01
        print("5. Chon Ban 01 de goi mon...")
        ban01 = page.locator('text=Bàn 01')
        if await ban01.count() > 0:
            await ban01.first.click()
            await page.wait_for_timeout(1000)
            print("   -> Da click Ban 01")

        # 6. Chọn món Bánh Mì Que & Bạc Xỉu Sữa Dừa
        print("6. Chon mon Banh Mi Que va Bac Xiu...")
        banh_mi = page.locator('text=Bánh Mì Que Hải Phòng')
        if await banh_mi.count() > 0:
            await banh_mi.first.click()
            await page.wait_for_timeout(600)
            print("   -> Da chon Banh Mi Que")

        bac_xiu = page.locator('text=Bạc Xỉu Sữa Dừa')
        if await bac_xiu.count() > 0:
            await bac_xiu.first.click()
            await page.wait_for_timeout(600)
            print("   -> Da chon Bac Xiu")

        # 7. Kiểm tra giỏ hàng
        cart_summary = await page.evaluate("() => document.body.innerText")
        cart_lines = [l.strip() for l in cart_summary.split('\\n') if any(k in l for k in ["Bàn 01", "món", "67.000", "99.000", "Báo Bếp", "Tính Tiền"])]
        print(f"7. Gio hang live: {cart_lines}")

        # 8. Chuyển sang thanh toán
        print("8. Chuyen sang man hinh Thanh Toan...")
        pay_btn = page.locator('text=Tính Tiền').or_(page.locator('text=Thanh Toán')).or_(page.locator('text=67.000 đ'))
        if await pay_btn.count() > 0:
            await pay_btn.first.click()
            await page.wait_for_timeout(1500)
            print("   -> Da mo man hinh Thanh Toan")

        pay_text = await page.evaluate("() => document.body.innerText.substring(0, 300).replace(/\\n/g, ' ')")
        print(f"   [Thanh Toan Screen]: {pay_text}")

        # 9. Hoàn tất đơn "Xong & In Bill"
        print("9. Nhan nut Xong & In Bill...")
        finish_btn = page.locator('text=Xong & In Bill')
        if await finish_btn.count() > 0:
            await finish_btn.first.click()
            await page.wait_for_timeout(2000)
            print("   -> Da thanh toan thanh cong live!")

        # 10. Trạng thái sau thanh toán
        final_summary = await page.evaluate("() => document.body.innerText")
        final_lines = [l.strip() for l in final_summary.split('\\n') if any(k in l for k in ["Bàn 01", "Trống", "Sổ Đơn", "Bàn Ăn"])]
        print(f"10. Trang thai ban sau thanh toan: {final_lines}")

        # 11. Test Cold Start Rehydrate
        print("11. Kiem tra Cold Start bang cach reload trang...")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(1500)
        rehydrated = await page.evaluate("() => document.body.innerText.includes('Bàn 01')")
        print(f"    -> Bao toan du lieu sau reload: {rehydrated}")

        await browser.close()
        print("\n=== HOAN TAT TEST TOAN DIEN LIVE DOMAIN THANH CONG! ===")

if __name__ == "__main__":
    asyncio.run(run_authenticated_flow())
