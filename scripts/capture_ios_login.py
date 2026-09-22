import asyncio
import os
import sys
from playwright.async_api import async_playwright

OUTPUT_DIR = r"D:\duanpos-ongchu\artifacts\ios_login_audit"
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
    "iPhone_13_Mini": {
        "name": "iPhone 13 Mini",
        "viewport": {"width": 375, "height": 812},
        "device_scale_factor": 3,
        "is_mobile": True,
        "has_touch": True,
        "safe_area": {"top": 50, "bottom": 34, "left": 0, "right": 0},
        "island": None,
        "home_bar": {"width": 134, "height": 5, "bottom": 8}
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

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        for dev_key, dev_config in DEVICES.items():
            print(f"=== CAPTURING FOR {dev_config['name']} ===")
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
            
            # 1. Điều hướng thẳng tới /login
            await page.goto("http://localhost:8085/login", wait_until="networkidle", timeout=25000)
            await page.wait_for_timeout(1000)
            await page.evaluate(INJECT_STYLE_SCRIPT, dev_config)
            
            # Ảnh 1: Màn hình Form Đăng nhập ban đầu
            screen1 = os.path.join(OUTPUT_DIR, f"{dev_key}_01_account_form.png")
            await page.screenshot(path=screen1, full_page=False)
            print(f"  Captured: {screen1}")
            
            # Mở trợ lý Quên mật khẩu
            forgot_pwd = page.locator('text=Quên mật khẩu?')
            if await forgot_pwd.count() > 0:
                await forgot_pwd.click()
                await page.wait_for_timeout(400)
                screen_forgot = os.path.join(OUTPUT_DIR, f"{dev_key}_02_forgot_pwd.png")
                await page.screenshot(path=screen_forgot, full_page=False)
                print(f"  Captured: {screen_forgot}")
                # Đóng lại
                await page.locator('text=Đóng hỗ trợ').click()
                await page.wait_for_timeout(400)

            # Chọn Quán Khách (quanquan) và bấm Đăng Nhập Hệ Thống
            preset = page.locator('text=Quán Khách (quanquan)')
            if await preset.count() > 0:
                await preset.click()
                await page.wait_for_timeout(400)
                
            submit_btn = page.locator('text=Đăng Nhập Hệ Thống')
            if await submit_btn.count() > 0:
                await submit_btn.click()
                await page.wait_for_timeout(1000)
                
            # Ảnh bước 2: Kích hoạt / Đặt tên thiết bị
            bind_btn = page.locator('text=Hoàn Tất Kích Hoạt')
            if await bind_btn.count() > 0:
                screen_bind = os.path.join(OUTPUT_DIR, f"{dev_key}_03_device_setup.png")
                await page.screenshot(path=screen_bind, full_page=False)
                print(f"  Captured: {screen_bind}")
                
                # Bấm Hoàn tất kích hoạt để liên kết máy quầy
                await bind_btn.click()
                await page.wait_for_timeout(1500)
                
            # Bây giờ máy đã bound -> Vào lại /login để xem màn hình PIN Pad
            await page.goto("http://localhost:8085/login", wait_until="networkidle", timeout=15000)
            await page.wait_for_timeout(1000)
            await page.evaluate(INJECT_STYLE_SCRIPT, dev_config)
            
            # Ảnh 4: Màn hình Vào Ca Nhanh bằng Mã PIN
            screen_pin = os.path.join(OUTPUT_DIR, f"{dev_key}_04_pin_pad.png")
            await page.screenshot(path=screen_pin, full_page=False)
            print(f"  Captured: {screen_pin}")
            
            # Thao tác nhập thử PIN: bấm số 2 (Thu Ngân)
            key2 = page.locator('text=2').first
            if await key2.count() > 0:
                await key2.click()
                await page.wait_for_timeout(200)
                await key2.click()
                await page.wait_for_timeout(200)
                screen_pin_entering = os.path.join(OUTPUT_DIR, f"{dev_key}_05_pin_entering.png")
                await page.screenshot(path=screen_pin_entering, full_page=False)
                print(f"  Captured: {screen_pin_entering}")
                
            # Bấm Quên mã PIN vào ca?
            forgot_pin = page.locator('text=Quên mã PIN vào ca?')
            if await forgot_pin.count() > 0:
                await forgot_pin.click()
                await page.wait_for_timeout(400)
                screen_forgot_pin = os.path.join(OUTPUT_DIR, f"{dev_key}_06_forgot_pin_prompt.png")
                await page.screenshot(path=screen_forgot_pin, full_page=False)
                print(f"  Captured: {screen_forgot_pin}")
                
            await context.close()
            
        await browser.close()
        print("ALL SCENARIOS CAPTURED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(run())
