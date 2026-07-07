FROM python:3.14-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Runtime ──
FROM python:3.14-slim

WORKDIR /app
COPY --from=builder /usr/local/lib/python3.14/site-packages /usr/local/lib/python3.14/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import http.client; http.client.HTTPConnection('localhost',8000).request('GET','/healthz'); assert http.client.HTTPConnection('localhost',8000).getresponse().status == 200"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
