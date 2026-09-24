# 🏢 TENANT & BRANCH ISOLATION TESTS

## 1. Multi-Tenant Isolation Verification

### Case A: Dining Tables Isolation
- **Vector**: Request `GET /api/v1/tables?tenant_id=tenant_fake_test_999` with Tenant A Bearer Token.
- **Expected**: Backend rejects or returns 0 tables.
- **Actual Evidence**: Status `404 Not Found`, Count = 0.
- **Result**: **PASS**

### Case B: Cash Flow & Financial Ledger Isolation
- **Vector**: Request `GET /api/v1/cash/transactions?tenant_id=tenant_fake_test_999` with Tenant A Bearer Token.
- **Expected**: Backend rejects or returns 0 cash transactions.
- **Actual Evidence**: Status `404 Not Found`, Count = 0.
- **Result**: **PASS**

### Case C: SQL Injection Boundary Testing
- **Vectors tested**:
  1. `' OR 1=1 --`
  2. `'; DROP TABLE orders; --`
  3. `' UNION SELECT null, null, null --`
  4. `admin' --`
- **Expected**: Handled as sanitized string literal by GORM Parameterized Query; no SQL syntax error (no HTTP 500).
- **Actual Evidence**: Status `200 OK` (0 matched rows), no internal server error.
- **Result**: **PASS**
