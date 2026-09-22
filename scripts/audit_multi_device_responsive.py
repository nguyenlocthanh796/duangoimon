import asyncio
import os
import sys
from playwright.async_api import async_playwright

OUTPUT_DIR = r"D:\duanpos-ongchu\artifacts\responsive_audit"
os.makedirs(OUTPUT_DIR, exist_ok=True)

DEVICES = {
    "iPhone_15_Pro": {
        "name": "iPhone 15 Pro (Mobile Phone)",
        "viewport": {"width": 393, "height": 852},
        "device_scale_factor": 2,
        "is_mobile": True,
        "has_touch": True,
    },
    "iPad_10_2_Portrait": {
        "name": "iPad 10.2 Portrait (Tablet Dọc 810px)",
        "viewport": {"width": 810, "height": 1080},
        "device_scale_factor": 2,
        "is_mobile": True,
        "has_touch": True,
    },
    "iPad_Pro_11_Landscape": {
        "name": "iPad Pro 11 Landscape (Tablet Ngang 1194px)",
        "viewport": {"width": 1194, "height": 834},
        "device_scale_factor": 2,
        "is_mobile": True,
        "has_touch": True,
    },
    "POS_24_Inch_FullHD": {
        "name": "POS 24-inch (Desktop Large 1920x1080)",
        "viewport": {"width": 1920, "height": 1080},
        "device_scale_factor": 1,
        "is_mobile": False,
        "has_touch": False,
    }
}

async def audit_device(playwright, dev_key, dev_cfg):
    print(f"[*] Audit: {dev_key}...")
    browser = await playwright.chromium.launch(headless=True)
    context = await browser.new_context(
        viewport=dev_cfg["viewport"],
        device_scale_factor=dev_cfg["device_scale_factor"],
        is_mobile=dev_cfg["is_mobile"],
        has_touch=dev_cfg["has_touch"],
    )
    page = await context.new_page()

    await page.goto("http://localhost:8085/login")
    await page.wait_for_timeout(1000)

    # Chọn Quán Khách và Đăng nhập
    preset = page.locator('text=Quán Khách (quanquan)')
    if await preset.count() > 0:
        await preset.click()
        await page.wait_for_timeout(300)

    submit_btn = page.locator('text=Đăng Nhập Hệ Thống')
    if await submit_btn.count() > 0:
        await submit_btn.click()
        await page.wait_for_timeout(1000)

    bind_btn = page.locator('text=Hoàn Tất Kích Hoạt')
    if await bind_btn.count() > 0:
        await bind_btn.click()
        await page.wait_for_timeout(1000)

    # Đảm bảo đã vào màn POS
    await page.goto("http://localhost:8085")
    await page.wait_for_timeout(1500)

    # 1. Bán hàng POS
    await page.screenshot(path=os.path.join(OUTPUT_DIR, f"{dev_key}_01_pos_home.png"))

    # 2. Chuyển sang Thực đơn
    await page.goto("http://localhost:8085/thuc-don")
    await page.wait_for_timeout(1500)
    await page.screenshot(path=os.path.join(OUTPUT_DIR, f"{dev_key}_02_thuc_don.png"))

    # 3. Chuyển sang KDS Bếp/Bar
    await page.goto("http://localhost:8085/kds")
    await page.wait_for_timeout(1500)
    await page.screenshot(path=os.path.join(OUTPUT_DIR, f"{dev_key}_03_kds.png"))

    # 4. Chuyển sang Sổ đơn
    await page.goto("http://localhost:8085/hoa-don")
    await page.wait_for_timeout(1500)
    await page.screenshot(path=os.path.join(OUTPUT_DIR, f"{dev_key}_04_hoa_don.png"))

    # 5. Chuyển sang Giao ca
    await page.goto("http://localhost:8085/giao-ca")
    await page.wait_for_timeout(1500)
    await page.screenshot(path=os.path.join(OUTPUT_DIR, f"{dev_key}_05_giao_ca.png"))

    await context.close()
    await browser.close()
    print(f"[+] Done: {dev_key}")

async def main():
    async with async_playwright() as p:
        for key, cfg in DEVICES.items():
            await audit_device(p, key, cfg)

if __name__ == "__main__":
    asyncio.run(main())
