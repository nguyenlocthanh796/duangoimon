import asyncio
import os
import sys
from playwright.async_api import async_playwright

OUTPUT_DIR = r"D:\duanpos-ongchu\artifacts\ios_audit"
os.makedirs(OUTPUT_DIR, exist_ok=True)

DEVICES = {
    "iPhone_15_Pro": {
        "name": "iPhone 15 Pro",
        "viewport": {"width": 393, "height": 852},
        "device_scale_factor": 3,
        "is_mobile": True,
        "has_touch": True,
        "safe_area": {"top": 59, "bottom": 34, "left": 0, "right": 0},
        "island": {"width": 126, "height": 37, "top": 11},
        "home_bar": {"width": 139, "height": 5, "bottom": 8}
    },
    "iPhone_16_Pro_Max": {
        "name": "iPhone 16 Pro Max",
        "viewport": {"width": 440, "height": 956},
        "device_scale_factor": 3,
        "is_mobile": True,
        "has_touch": True,
        "safe_area": {"top": 62, "bottom": 34, "left": 0, "right": 0},
        "island": {"width": 126, "height": 37, "top": 14},
        "home_bar": {"width": 144, "height": 5, "bottom": 8}
    },
    "iPad_Pro_11": {
        "name": "iPad Pro 11-inch",
        "viewport": {"width": 834, "height": 1194},
        "device_scale_factor": 2,
        "is_mobile": False,
        "has_touch": True,
        "safe_area": {"top": 24, "bottom": 20, "left": 0, "right": 0},
        "island": None,
        "home_bar": {"width": 315, "height": 5, "bottom": 6}
    }
}

INJECT_STYLE_SCRIPT = """
(config) => {
    const sa = config.safe_area;
    const style = document.createElement('style');
    style.id = 'ios-emulator-safe-area-overrides';
    style.innerHTML = `
        :root {
            --sat: ${sa.top}px;
            --sab: ${sa.bottom}px;
            --sal: ${sa.left}px;
            --sar: ${sa.right}px;
        }
    `;
    document.head.appendChild(style);

    if (config.island) {
        const island = document.createElement('div');
        island.id = 'ios-dynamic-island-mock';
        island.style.position = 'fixed';
        island.style.top = config.island.top + 'px';
        island.style.left = '50%';
        island.style.transform = 'translateX(-50%)';
        island.style.width = config.island.width + 'px';
        island.style.height = config.island.height + 'px';
        island.style.backgroundColor = '#000000';
        island.style.borderRadius = '20px';
        island.style.zIndex = '999999';
        island.style.pointerEvents = 'none';
        island.style.boxShadow = '0 0 1px 1px rgba(255,255,255,0.05)';
        document.body.appendChild(island);
    }

    if (config.home_bar) {
        const bar = document.createElement('div');
        bar.id = 'ios-home-bar-mock';
        bar.style.position = 'fixed';
        bar.style.bottom = config.home_bar.bottom + 'px';
        bar.style.left = '50%';
        bar.style.transform = 'translateX(-50%)';
        bar.style.width = config.home_bar.width + 'px';
        bar.style.height = config.home_bar.height + 'px';
        bar.style.backgroundColor = 'rgba(255, 255, 255, 0.65)';
        bar.style.borderRadius = '3px';
        bar.style.zIndex = '999999';
        bar.style.pointerEvents = 'none';
        document.body.appendChild(bar);
    }
}
"""

ROUTES_TO_TEST = [
    {"name": "01_pos_tables", "url": "http://localhost:8085/"},
    {"name": "02_thanh_toan", "url": "http://localhost:8085/thanh-toan"},
    {"name": "03_cai_dat", "url": "http://localhost:8085/cai-dat"},
    {"name": "04_kds", "url": "http://localhost:8085/kds"},
    {"name": "05_hoa_don", "url": "http://localhost:8085/hoa-don"},
]

async def ensure_authenticated(page):
    try:
        if "/login" in page.url or await page.locator('text=Đăng Nhập Hệ Thống').count() > 0:
            print("  -> Authenticating into POS...")
            preset = page.locator('text=Quán Khách')
            if await preset.count() > 0:
                await preset.click()
                await page.wait_for_timeout(300)

            login_btn = page.locator('text=Đăng Nhập Hệ Thống')
            if await login_btn.count() > 0:
                await login_btn.click()
                await page.wait_for_timeout(1500)

            bind_btn = page.locator('text=Hoàn Tất Kích Hoạt')
            if await bind_btn.count() > 0:
                await bind_btn.click()
                await page.wait_for_timeout(1500)
    except Exception as e:
        print(f"  Auth check warning: {e}")

async def capture_device(browser, dev_key, dev_config):
    context = await browser.new_context(
        viewport=dev_config["viewport"],
        device_scale_factor=dev_config["device_scale_factor"],
        is_mobile=dev_config["is_mobile"],
        has_touch=dev_config["has_touch"],
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
    )
    
    sa = dev_config["safe_area"]
    await context.add_init_script(f"window.__INITIAL_SAFE_AREA_INSETS__ = {{top: {sa['top']}, bottom: {sa['bottom']}, left: {sa['left']}, right: {sa['right']}}};")

    page = await context.new_page()

    await page.goto("http://localhost:8085/", wait_until="networkidle", timeout=20000)
    await page.wait_for_timeout(1000)
    await ensure_authenticated(page)

    for route in ROUTES_TO_TEST:
        try:
            print(f"[{dev_config['name']}] Loading {route['name']} -> {route['url']}")
            await page.goto(route["url"], wait_until="networkidle", timeout=15000)
            await page.wait_for_timeout(1200)
            await ensure_authenticated(page)
            await page.evaluate(INJECT_STYLE_SCRIPT, dev_config)
            await page.wait_for_timeout(300)

            filename = f"{dev_key}_{route['name']}.png"
            filepath = os.path.join(OUTPUT_DIR, filename)
            await page.screenshot(path=filepath)
            print(f"  -> Saved: {filepath}")

            if route["name"] == "01_pos_tables":
                goi_mon_tab = page.locator('text=Gọi Món')
                if await goi_mon_tab.count() > 0:
                    await goi_mon_tab.first.click()
                    await page.wait_for_timeout(800)
                    menu_file = os.path.join(OUTPUT_DIR, f"{dev_key}_01b_pos_menu.png")
                    await page.screenshot(path=menu_file)
                    print(f"  -> Saved Menu: {menu_file}")
        except Exception as e:
            print(f"  Error on {route['name']}: {e}")

    try:
        await context.close()
    except Exception:
        pass

async def test_interactive_flow(browser):
    dev_config = DEVICES["iPhone_15_Pro"]
    print("\n>>> [INTERACTIVE FLOW] Testing full ordering & payment flow on iPhone 15 Pro...")
    context = await browser.new_context(
        viewport=dev_config["viewport"],
        device_scale_factor=dev_config["device_scale_factor"],
        is_mobile=True,
        has_touch=True,
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
    )
    sa = dev_config["safe_area"]
    await context.add_init_script(f"window.__INITIAL_SAFE_AREA_INSETS__ = {{top: {sa['top']}, bottom: {sa['bottom']}, left: {sa['left']}, right: {sa['right']}}};")

    page = await context.new_page()
    await page.goto("http://localhost:8085/", wait_until="networkidle", timeout=20000)
    await page.wait_for_timeout(1000)
    await ensure_authenticated(page)
    await page.evaluate(INJECT_STYLE_SCRIPT, dev_config)
    await page.wait_for_timeout(500)

    # 1. Click Bàn 01
    print("  Step 1: Selecting Bàn 01...")
    ban01 = page.locator('text=Bàn 01')
    if await ban01.count() > 0:
        await ban01.first.click()
        await page.wait_for_timeout(800)
    else:
        goi_mon = page.locator('text=Gọi Món')
        if await goi_mon.count() > 0:
            await goi_mon.first.click()
            await page.wait_for_timeout(800)

    await page.screenshot(path=os.path.join(OUTPUT_DIR, "flow_01_selected_table.png"))

    # 2. Add item to cart
    print("  Step 2: Adding items to cart...")
    banh_mi = page.locator('text=Bánh Mì Que Hải Phòng')
    if await banh_mi.count() > 0:
        await banh_mi.first.click()
        await page.wait_for_timeout(500)

    # Thử click nút thêm món nhanh aria-label
    quick_add = page.locator('[aria-label="Thêm món nhanh"]')
    if await quick_add.count() > 0:
        await quick_add.first.click()
        await page.wait_for_timeout(500)

    # Nếu có món thứ 2, click tiếp
    bac_xiu = page.locator('text=Bạc Xỉu Sữa Dừa')
    if await bac_xiu.count() > 0:
        await bac_xiu.first.click()
        await page.wait_for_timeout(500)

    await page.screenshot(path=os.path.join(OUTPUT_DIR, "flow_02_added_items.png"))

    # 3. Checkout
    print("  Step 3: Navigating to Checkout...")
    pay_btn = page.locator('text=Tính Tiền').or_(page.locator('text=Thanh Toán'))
    if await pay_btn.count() > 0:
        await pay_btn.first.click()
        await page.wait_for_timeout(1000)
    else:
        await page.goto("http://localhost:8085/thanh-toan", wait_until="networkidle")
        await page.wait_for_timeout(1000)

    await page.evaluate(INJECT_STYLE_SCRIPT, dev_config)
    await page.screenshot(path=os.path.join(OUTPUT_DIR, "flow_03_payment_screen.png"))

    # 4. Complete Payment
    print("  Step 4: Confirming payment (Xong & In Bill)...")
    finish_btn = page.locator('text=Xong & In Bill')
    if await finish_btn.count() > 0:
        await finish_btn.first.click()
        await page.wait_for_timeout(1500)

    await page.evaluate(INJECT_STYLE_SCRIPT, dev_config)
    await page.screenshot(path=os.path.join(OUTPUT_DIR, "flow_04_after_payment.png"))

    # 5. Cold start simulation (App reload & rehydration)
    print("  Step 5: Testing Cold Start Rehydration (reload page)...")
    await page.reload(wait_until="networkidle")
    await page.wait_for_timeout(1500)
    await page.goto("http://localhost:8085/", wait_until="networkidle")
    await page.wait_for_timeout(1000)
    await page.evaluate(INJECT_STYLE_SCRIPT, dev_config)
    await page.screenshot(path=os.path.join(OUTPUT_DIR, "flow_05_cold_start_rehydrate.png"))
    print("  -> Flow test completed successfully!")

    await context.close()

async def main():
    print("=== KHOI CHAY MOI TRUONG TEST GIA LAP IOS ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for dev_key, dev_config in DEVICES.items():
            await capture_device(browser, dev_key, dev_config)
        await test_interactive_flow(browser)
        await browser.close()
    print(f"=== HOAN TAT! Anh chup tai: {OUTPUT_DIR} ===")

if __name__ == "__main__":
    asyncio.run(main())
