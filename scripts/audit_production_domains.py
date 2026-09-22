# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import asyncio
from playwright.async_api import async_playwright
import json

TARGET_URLS = [
    "https://ongchu.cloud",
    "https://www.ongchu.cloud",
    "https://app.ongchu.cloud",
    "https://app.ongchu.cloud/login",
    "https://app.ongchu.cloud/thuc-don",
    "https://app.ongchu.cloud/cai-dat",
    "https://app.ongchu.cloud/hoa-don",
    "https://app.ongchu.cloud/kds",
    "https://app.ongchu.cloud/thanh-toan",
]

async def audit_domain(browser, url):
    print(f"\n==================================================")
    print(f"[AUDITING]: {url}")
    print(f"==================================================")
    page = await browser.new_page(
        viewport={"width": 1280, "height": 800},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    )

    console_errors = []
    page_errors = []
    failed_requests = []

    page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ["error", "warning"] else None)
    page.on("pageerror", lambda exc: page_errors.append(str(exc)))
    page.on("requestfailed", lambda req: failed_requests.append(f"{req.method} {req.url} -> {req.failure}"))

    try:
        resp = await page.goto(url, wait_until="networkidle", timeout=30000)
        status = resp.status if resp else "NO_RESP"
        title = await page.title()
        print(f"  [STATUS]: {status}")
        print(f"  [TITLE]:  {title}")

        await page.wait_for_timeout(3000)

        # Check critical DOM elements
        root_children = await page.evaluate("() => document.getElementById('root') ? document.getElementById('root').children.length : -1")
        body_text_len = await page.evaluate("() => document.body.innerText.trim().length")
        body_snippet = await page.evaluate("() => document.body.innerText.trim().substring(0, 150).replace(/\\n/g, ' ')")
        print(f"  [DOM Root Children]: {root_children}")
        print(f"  [Body Text Length]:  {body_text_len} characters")
        print(f"  [Body Text Snippet]: {body_snippet}")

        # Report errors
        print(f"  [Console Warnings/Errors]: {len(console_errors)}")
        for ce in console_errors[:10]:
            print(f"    WARN/ERR: {ce}")

        print(f"  [Uncaught JS Errors]:     {len(page_errors)}")
        for pe in page_errors:
            print(f"    PAGE_ERR: {pe}")

        print(f"  [Failed Network Req]:     {len(failed_requests)}")
        for fr in failed_requests:
            print(f"    FAIL_REQ: {fr}")

    except Exception as e:
        print(f"  [EXCEPTION]: {e}")
    finally:
        await page.close()

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for url in TARGET_URLS:
            await audit_domain(browser, url)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
