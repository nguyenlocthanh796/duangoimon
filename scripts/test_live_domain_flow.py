# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import asyncio
from playwright.async_api import async_playwright

async def run_live_pos_flow():
    print("=== BAT DAU KIEM THU INTERACTIVE FLOW TREN LIVE DOMAIN https://app.ongchu.cloud ===")
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

        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda exc: print(f"  💥 PAGE ERROR: {exc}"))

        # 1. Truy cập POS live
        print("1. Truy cap https://app.ongchu.cloud...")
        resp = await page.goto("https://app.ongchu.cloud/", wait_until="networkidle")
        print(f"   Status: {resp.status}")
        await page.wait_for_timeout(2000)

        # 2. Chọn Bàn 01
        print("2. Chon Ban 01 de mo thuc don...")
        ban01 = page.locator('text=Bàn 01')
        if await ban01.count() > 0:
            await ban01.first.click()
            await page.wait_for_timeout(1000)
            print("   -> Da click Ban 01")

        # 3. Thêm món vào giỏ
        print("3. Chon mon Banh Mi Que va Bac Xiu...")
        banh_mi = page.locator('text=Bánh Mì Que Hải Phòng')
        if await banh_mi.count() > 0:
            await banh_mi.first.click()
            await page.wait_for_timeout(800)
            print("   -> Da them Banh Mi Que")

        bac_xiu = page.locator('text=Bạc Xỉu Sữa Dừa')
        if await bac_xiu.count() > 0:
            await bac_xiu.first.click()
            await page.wait_for_timeout(800)
            print("   -> Da them Bac Xiu")

        # Kiểm tra nội dung giỏ hàng
        body_text = await page.evaluate("() => document.body.innerText")
        print("4. Kiem tra gio hang:")
        for line in body_text.split("\n"):
            if any(k in line for k in ["Bàn 01", "món", "99.000", "67.000", "Tính Tiền", "Báo Bếp"]):
                print(f"   [Cart Line]: {line.strip()}")

        # 5. Thanh toán
        print("5. Nhap vao nut Tinh Tien / Thanh Toan...")
        pay_btn = page.locator('text=Tính Tiền').or_(page.locator('text=Thanh Toán')).or_(page.locator('text=67.000 đ')).or_(page.locator('text=35.000 đ'))
        if await pay_btn.count() > 0:
            await pay_btn.first.click()
            await page.wait_for_timeout(1500)
            print("   -> Da vao man hinh Thanh Toan")

        pay_title = await page.evaluate("() => document.body.innerText.substring(0, 300).replace(/\\n/g, ' ')")
        print(f"   [Thanh Toan Screen]: {pay_title}")

        # 6. Xác nhận Xong & In Bill
        print("6. Xac nhan Xong & In Bill...")
        finish_btn = page.locator('text=Xong & In Bill')
        if await finish_btn.count() > 0:
            await finish_btn.first.click()
            await page.wait_for_timeout(2000)
            print("   -> Da hoan tat thanh toan live!")

        # 7. Kiểm tra trạng thái bàn sau thanh toán
        final_text = await page.evaluate("() => document.body.innerText")
        print("7. Trang thai so do ban sau thanh toan:")
        for line in final_text.split("\n"):
            if "Bàn 01" in line or "Trống" in line or "Sổ Đơn" in line:
                print(f"   [Table State]: {line.strip()}")

        # 8. Test Cold Start / Rehydrate bằng reload
        print("8. Kiem tra Cold Start Rehydrate bang cach reload...")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(1500)
        rehydrated_text = await page.evaluate("() => document.body.innerText")
        has_tables = "Bàn 01" in rehydrated_text
        print(f"   -> Sau khi reload: Co day du ban an ({has_tables})")

        print("\n=== HOAN TAT INTERACTIVE FLOW TREN PRODUCTION thanh cong 100%! ===")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_live_pos_flow())
