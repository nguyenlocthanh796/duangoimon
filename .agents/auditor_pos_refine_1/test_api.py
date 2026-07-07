import urllib.request
import json
import sys

API_URL = "http://localhost:8000/api/v1"

def request(path, method="GET", body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(f"{API_URL}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"Error {e.code}: {e.read().decode('utf-8')}")
        raise e

def run_tests():
    print("1. Logging in...")
    status, auth_data = request("/auth/login", method="POST", body={"username": "admin", "password": "admin123"})
    assert status == 200
    token = auth_data["access_token"]
    print("Login successful! Token acquired.")

    print("\n2. Getting tables...")
    status, tables = request("/ban-hang/tables", token=token)
    assert status == 200
    print(f"Found {len(tables)} tables.")
    for t in tables:
        print(f"  - Table {t['name']} (ID: {t['id']}): {t['status']}")

    print("\n3. Getting products...")
    status, products = request("/ban-hang/products", token=token)
    assert status == 200
    print(f"Found {len(products)} products.")

    if len(tables) > 0 and len(products) > 0:
        table = tables[0]
        product = products[0]
        print(f"\n4. Creating order for table '{table['name']}'...")
        order_payload = {
            "table_id": table["id"],
            "items": [
                {
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "quantity": 2,
                    "unit_price": product["price"],
                    "note": "Test order",
                    "options": {"size": "Regular", "toppings": []}
                }
            ]
        }
        status, order = request("/ban-hang/orders", method="POST", body=order_payload, token=token)
        assert status == 201
        order_id = order["id"]
        print(f"Order created successfully! ID: {order_id}, Total: {order['total_amount']}")

        print("\n5. Processing payment...")
        pay_payload = {
            "order_id": order_id,
            "payment_method": "tien_mat",
            "amount_received": order["total_amount"]
        }
        status, payment = request("/ban-hang/payments", method="POST", body=pay_payload, token=token)
        assert status == 200
        print("Payment processed successfully!")

        print("\n6. Verifying table status reset...")
        status, updated_tables = request("/ban-hang/tables", token=token)
        assert status == 200
        updated_table = next(t for t in updated_tables if t["id"] == table["id"])
        print(f"Table '{updated_table['name']}' status is now: {updated_table['status']}")
        assert updated_table["status"] == "trong"
        print("Table status reset verified successfully!")

    print("\nAll API tests PASSED!")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"Tests failed: {e}")
        sys.exit(1)
