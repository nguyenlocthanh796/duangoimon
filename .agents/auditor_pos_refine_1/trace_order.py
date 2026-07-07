import sys
import os
import traceback

sys.path.append(r"e:\posa\backend")

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run():
    # Login
    login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    print("Login status:", login_res.status_code)
    if login_res.status_code != 200:
        print("Login failed:", login_res.text)
        return
    token = login_res.json()["access_token"]

    # Get tables
    tables_res = client.get("/api/v1/ban-hang/tables", headers={"Authorization": f"Bearer {token}"})
    tables = tables_res.json()
    table_id = tables[0]["id"]

    # Get products
    products_res = client.get("/api/v1/ban-hang/products", headers={"Authorization": f"Bearer {token}"})
    products = products_res.json()
    product_id = products[0]["id"]
    product_price = products[0]["price"]

    # Create order
    order_payload = {
        "table_id": table_id,
        "items": [
            {
                "product_id": product_id,
                "product_name": products[0]["name"],
                "quantity": 2,
                "unit_price": product_price,
                "note": "Test order",
                "options": {"size": "Regular", "toppings": []}
            }
        ]
    }

    print("Creating order...")
    try:
        order_res = client.post("/api/v1/ban-hang/orders", json=order_payload, headers={"Authorization": f"Bearer {token}"})
        print("Order status:", order_res.status_code)
        print("Order response:", order_res.text)
    except Exception as e:
        traceback.print_exc()

if __name__ == "__main__":
    run()
