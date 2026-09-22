import http.server
import socketserver
import sqlite3
import json
import urllib.parse
import os

PORT = 8088
DB_PATH = r'D:\duanpos-ongchu\backend\ongchu_pos.db'

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OngChu POS — Trình Xem Database Web</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0F172A; color: #F8FAFC; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        header { background: #1E293B; border-bottom: 1px solid #334155; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; }
        .logo { font-size: 16px; font-weight: 700; color: #14B8A6; display: flex; align-items: center; gap: 8px; }
        .badge-path { background: #0F172A; border: 1px solid #334155; color: #94A3B8; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-family: monospace; }
        .container { display: flex; flex: 1; overflow: hidden; }
        aside { width: 280px; background: #1E293B; border-right: 1px solid #334155; display: flex; flex-direction: column; }
        .search-table { padding: 12px; border-bottom: 1px solid #334155; }
        .search-table input { width: 100%; background: #0F172A; border: 1px solid #334155; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 13px; outline: none; }
        .table-list { flex: 1; overflow-y: auto; list-style: none; padding: 6px; }
        .table-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; color: #CBD5E1; transition: 0.15s; margin-bottom: 2px; }
        .table-item:hover { background: #334155; color: #fff; }
        .table-item.active { background: #0D9488; color: #fff; font-weight: 600; }
        .table-badge { font-size: 11px; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 10px; font-family: monospace; }
        main { flex: 1; display: flex; flex-direction: column; background: #0F172A; overflow: hidden; }
        .toolbar { padding: 12px 20px; background: #1E293B; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .toolbar-left { display: flex; align-items: center; gap: 12px; }
        .current-table { font-size: 16px; font-weight: 600; color: #fff; }
        .search-row { background: #0F172A; border: 1px solid #334155; color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 13px; width: 240px; outline: none; }
        .table-wrapper { flex: 1; overflow: auto; padding: 0; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #1E293B; color: #94A3B8; font-weight: 600; text-align: left; padding: 10px 14px; position: sticky; top: 0; border-bottom: 2px solid #334155; z-index: 2; white-space: nowrap; }
        td { padding: 8px 14px; border-bottom: 1px solid #1E293B; color: #E2E8F0; white-space: nowrap; font-family: monospace; max-width: 300px; overflow: hidden; text-overflow: ellipsis; }
        tr:hover td { background: rgba(20, 184, 166, 0.08); color: #fff; }
        .null-val { color: #64748B; font-style: italic; }
        .pagination { padding: 10px 20px; background: #1E293B; border-top: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #94A3B8; }
        .btn-page { background: #334155; color: #fff; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
        .btn-page:disabled { opacity: 0.4; cursor: not-allowed; }
        .sql-box { padding: 12px 20px; background: #0B0F19; border-top: 1px solid #334155; display: flex; gap: 10px; }
        .sql-box input { flex: 1; background: #1E293B; border: 1px solid #334155; color: #38BDF8; font-family: monospace; padding: 8px 12px; border-radius: 6px; font-size: 13px; outline: none; }
        .btn-run { background: #0D9488; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; }
    </style>
</head>
<body>
    <header>
        <div class="logo">👑 OngChu POS — Web Database Explorer</div>
        <div class="badge-path">D:\duanpos-ongchu\backend\ongchu_pos.db</div>
    </header>
    <div class="container">
        <aside>
            <div class="search-table">
                <input type="text" id="searchTable" placeholder="🔍 Lọc bảng..." oninput="filterTables()">
            </div>
            <ul class="table-list" id="tableList"></ul>
        </aside>
        <main>
            <div class="toolbar">
                <div class="toolbar-left">
                    <span class="current-table" id="currentTableName">Chọn bảng để xem</span>
                    <span id="rowCountLabel" style="color: #64748B; font-size: 13px;"></span>
                </div>
                <div>
                    <input type="text" id="searchRow" class="search-row" placeholder="🔍 Tìm kiếm bản ghi..." onkeyup="if(event.key==='Enter') loadTableData()">
                </div>
            </div>
            <div class="table-wrapper">
                <table id="dataTable">
                    <thead id="tableHead"></thead>
                    <tbody id="tableBody"></tbody>
                </table>
            </div>
            <div class="pagination">
                <span id="pageInfo">Trang 1 / 1</span>
                <div>
                    <button class="btn-page" id="prevBtn" onclick="changePage(-1)">◀ Trang trước</button>
                    <button class="btn-page" id="nextBtn" onclick="changePage(1)">Trang sau ▶</button>
                </div>
            </div>
            <div class="sql-box">
                <input type="text" id="sqlInput" placeholder="Nhập câu lệnh SQL tuỳ ý (vd: SELECT * FROM dining_tables WHERE status='trong')" onkeyup="if(event.key==='Enter') runSql()">
                <button class="btn-run" onclick="runSql()">Chạy SQL</button>
            </div>
        </main>
    </div>
    <script>
        let allTables = [];
        let currentTable = '';
        let currentPage = 1;
        let totalPages = 1;

        async function loadTables() {
            const res = await fetch('/api/tables');
            allTables = await res.json();
            renderTableList();
            if (allTables.length > 0) {
                selectTable(allTables[0].name);
            }
        }

        function renderTableList() {
            const q = document.getElementById('searchTable').value.toLowerCase();
            const ul = document.getElementById('tableList');
            ul.innerHTML = '';
            allTables.filter(t => t.name.toLowerCase().includes(q)).forEach(t => {
                const li = document.createElement('li');
                li.className = 'table-item' + (t.name === currentTable ? ' active' : '');
                li.innerHTML = `<span>${t.name}</span><span class="table-badge">${t.count}</span>`;
                li.onclick = () => selectTable(t.name);
                ul.appendChild(li);
            });
        }

        function filterTables() { renderTableList(); }

        function selectTable(name) {
            currentTable = name;
            currentPage = 1;
            document.getElementById('searchRow').value = '';
            document.getElementById('currentTableName').textContent = name;
            renderTableList();
            loadTableData();
        }

        async function loadTableData() {
            if (!currentTable) return;
            const q = document.getElementById('searchRow').value;
            const res = await fetch(`/api/table-data?name=${encodeURIComponent(currentTable)}&page=${currentPage}&q=${encodeURIComponent(q)}`);
            const data = await res.json();
            renderTable(data);
        }

        function renderTable(data) {
            const head = document.getElementById('tableHead');
            const body = document.getElementById('tableBody');
            head.innerHTML = '<tr>' + data.columns.map(c => `<th>${c}</th>`).join('') + '</tr>';
            if (data.rows.length === 0) {
                body.innerHTML = `<tr><td colspan="${data.columns.length}" style="text-align:center; padding: 40px; color: #64748B;">Không có bản ghi nào</td></tr>`;
            } else {
                body.innerHTML = data.rows.map(r => '<tr>' + r.map(v => {
                    if (v === null || v === undefined) return '<td class="null-val">NULL</td>';
                    return `<td>${v}</td>`;
                }).join('') + '</tr>').join('');
            }
            totalPages = Math.max(1, Math.ceil(data.total / data.limit));
            document.getElementById('pageInfo').textContent = `Hiển thị ${data.rows.length} / ${data.total} bản ghi (Trang ${data.page} / ${totalPages})`;
            document.getElementById('rowCountLabel').textContent = `(${data.total} bản ghi)`;
            document.getElementById('prevBtn').disabled = currentPage <= 1;
            document.getElementById('nextBtn').disabled = currentPage >= totalPages;
        }

        function changePage(delta) {
            currentPage += delta;
            loadTableData();
        }

        async function runSql() {
            const sql = document.getElementById('sqlInput').value;
            if (!sql.trim()) return;
            const res = await fetch(`/api/execute-sql?sql=${encodeURIComponent(sql)}`);
            const data = await res.json();
            if (data.error) {
                alert('Lỗi SQL: ' + data.error);
                return;
            }
            if (data.columns) {
                document.getElementById('currentTableName').textContent = 'Kết quả truy vấn SQL';
                document.getElementById('rowCountLabel').textContent = `(${data.total} bản ghi)`;
                renderTable({ columns: data.columns, rows: data.rows, total: data.total, page: 1, limit: data.total });
            } else {
                alert('Thành công! Số dòng ảnh hưởng: ' + data.affected);
                loadTables();
                loadTableData();
            }
        }

        loadTables();
    </script>
</body>
</html>
"""

class DBViewerHandler(http.server.SimpleHTTPRequestHandler):
    def get_conn(self):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == '/api/tables':
            self.send_json(self.get_tables())
        elif path == '/api/table-data':
            table = query.get('name', [''])[0]
            page = int(query.get('page', [1])[0])
            search = query.get('q', [''])[0]
            self.send_json(self.get_table_data(table, page, search))
        elif path == '/api/execute-sql':
            raw_sql = query.get('sql', [''])[0]
            self.send_json(self.run_sql(raw_sql))
        else:
            self.send_html(HTML_TEMPLATE)

    def send_json(self, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, content):
        body = content.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def get_tables(self):
        conn = self.get_conn()
        c = conn.cursor()
        c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        tables = []
        for r in c.fetchall():
            name = r['name']
            if name.startswith('sqlite_'):
                continue
            cnt = conn.execute(f'SELECT count(*) FROM [{name}]').fetchone()[0]
            tables.append({'name': name, 'count': cnt})
        conn.close()
        return tables

    def get_table_data(self, table, page=1, search=''):
        conn = self.get_conn()
        c = conn.cursor()
        c.execute(f'PRAGMA table_info([{table}])')
        cols = [r['name'] for r in c.fetchall()]

        limit = 50
        offset = (page - 1) * limit
        where_clause = ''
        params = []
        if search:
            conditions = [f'CAST([{col}] AS TEXT) LIKE ?' for col in cols]
            where_clause = 'WHERE ' + ' OR '.join(conditions)
            params = [f'%{search}%'] * len(cols)

        total_cnt = conn.execute(f'SELECT count(*) FROM [{table}] {where_clause}', params).fetchone()[0]
        c.execute(f'SELECT * FROM [{table}] {where_clause} LIMIT ? OFFSET ?', params + [limit, offset])
        rows = []
        for r in c.fetchall():
            rows.append([r[k] for k in cols])
        conn.close()
        return {'columns': cols, 'rows': rows, 'total': total_cnt, 'page': page, 'limit': limit}

    def run_sql(self, sql):
        trimmed = sql.strip()
        if not trimmed:
            return {'error': 'Câu lệnh SQL rỗng'}
        # Chặn toàn bộ lệnh ghi/sửa/xoá để bảo vệ an toàn dữ liệu
        first_word = trimmed.split()[0].upper()
        if first_word not in ('SELECT', 'PRAGMA', 'EXPLAIN'):
            return {'error': 'Bảo mật: Chỉ cho phép câu lệnh truy vấn đọc (SELECT, PRAGMA). Cấm sửa/xoá dữ liệu!'}

        conn = self.get_conn()
        c = conn.cursor()
        try:
            c.execute(trimmed)
            if c.description:
                cols = [desc[0] for desc in c.description]
                rows = [[r[k] for k in cols] for r in c.fetchall()]
                conn.close()
                return {'columns': cols, 'rows': rows, 'total': len(rows)}
            conn.close()
            return {'columns': [], 'rows': [], 'total': 0}
        except Exception as e:
            conn.close()
            return {'error': str(e)}

if __name__ == '__main__':
    print(f"Web Database Explorer is running on LOCALHOST ONLY (127.0.0.1:{PORT})")
    with socketserver.TCPServer(("127.0.0.1", PORT), DBViewerHandler) as httpd:
        httpd.serve_forever()
