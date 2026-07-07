# -*- coding: utf-8 -*-
import os
import sys
import io
import psycopg

# Force UTF-8 stdout on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# --- Config ---
DATABASE_URL_ENV = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/pos_db",
)
SYNC_DSN = DATABASE_URL_ENV.replace("postgresql+psycopg://", "postgresql://")

# --- The Image URL to use for all products ---
# This is a placeholder URL. In a real scenario, you would upload your image
# to a service like S3, Cloudinary, or Imgur and get a public URL.
NEW_IMAGE_URL = "https://i.imgur.com/GgCVT7i.jpeg"

def update_product_images():
    print("=" * 60)
    print("POS F&B - Update Product Images Script")
    print("=" * 60)
    print(f"Connecting to: {SYNC_DSN}")

    try:
        with psycopg.connect(SYNC_DSN) as conn:
            with conn.cursor() as cur:
                print(f"\\nSetting image_url to NULL for all products...")

                cur.execute(
                    "UPDATE ban_hang.products SET image_url = NULL"
                )
                
                # The 'rowcount' attribute gives the number of updated rows
                updated_count = cur.rowcount
                conn.commit()

                print(f"\\n      [OK] Successfully updated {updated_count} products.")

    except psycopg.Error as e:
        print(f"\\n[ERROR] Database operation failed: {e}")
        sys.exit(1)

    print("\\n" + "=" * 60)
    print("[SUCCESS] Image update completed!")
    print("=" * 60)

if __name__ == "__main__":
    update_product_images()
