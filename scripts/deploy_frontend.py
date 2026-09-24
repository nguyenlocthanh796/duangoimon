# -*- coding: utf-8 -*-
import os
import sys
import time
import paramiko

sys.stdout.reconfigure(encoding='utf-8')

HOST = os.getenv("VPS_HOST", "116.118.3.48")
PORT = 22
USER = "root"
PASS = os.getenv("VPS_PASSWORD", "Danh26062002")

LOCAL_DIST = r"d:\duanpos-ongchu\frontend\dist"
LOCAL_BACKEND = r"d:\duanpos-ongchu\backend"

REMOTE_APP = "/var/www/ongchu-app"
REMOTE_BACKEND = "/var/www/ongchu-backend"
REMOTE_BACKEND_SRC = "/var/www/ongchu-backend-src"

BLOCKED_EXTS = ('.db', '.sqlite', '.sqlite3', '.db-wal', '.db-shm', '.db-journal', '.sql', '.bak', '.exe')
BLOCKED_DIRS = {'data', 'tenants', 'bin', '.git', 'tests'}

def assert_safe_path(local_path, rel_path):
    parts = rel_path.replace("\\", "/").split("/")
    for p in parts:
        if p in BLOCKED_DIRS:
            raise RuntimeError(f"🚨 CRITICAL SECURITY GUARD: Blocked directory upload attempted: '{rel_path}'")
    lower = os.path.basename(local_path).lower()
    for ext in BLOCKED_EXTS:
        if lower.endswith(ext):
            raise RuntimeError(f"🚨 CRITICAL SECURITY GUARD: Blocked database/binary file upload attempted: '{local_path}'")

def upload_dir(ssh, sftp, local_dir, remote_dir, ignore_dirs=None):
    if ignore_dirs is None:
        ignore_dirs = []
    combined_ignore = set(ignore_dirs) | BLOCKED_DIRS
    for root, dirs, files in os.walk(local_dir):
        dirs[:] = [d for d in dirs if d not in combined_ignore and not d.startswith('.')]
        rel_path = os.path.relpath(root, local_dir).replace("\\", "/")
        target_remote = remote_dir if rel_path == "." else f"{remote_dir}/{rel_path}"
        
        _, out, _ = ssh.exec_command(f'mkdir -p "{target_remote}"')
        out.channel.recv_exit_status()
        
        for f in files:
            lower = f.lower()
            if any(lower.endswith(ext) for ext in BLOCKED_EXTS):
                continue
            local_file = os.path.join(root, f)
            rel_file = f if rel_path == "." else f"{rel_path}/{f}"
            assert_safe_path(local_file, rel_file)
            
            remote_file = f"{target_remote}/{f}"
            remote_file_dir = os.path.dirname(remote_file).replace("\\", "/")
            _, out_dir, _ = ssh.exec_command(f'mkdir -p "{remote_file_dir}"')
            out_dir.channel.recv_exit_status()
            
            sftp.put(local_file, remote_file)
            size_kb = os.path.getsize(local_file) / 1024
            print(f"  [+] Uploaded {rel_path}/{f} ({size_kb:.1f} KB)")

def main():
    print(f"==================================================")
    print(f"🚀 ONGCHU POS - DEPLOYMENT LÊN VPS {HOST}")
    print(f"==================================================")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print("1. Kết nối SSH tới VPS...")
    if PASS:
        ssh.connect(HOST, PORT, USER, PASS, timeout=15, banner_timeout=60)
    else:
        KEY_PATH = os.getenv("VPS_SSH_KEY", os.path.expanduser("~/.ssh/id_ed25519"))
        ssh.connect(HOST, PORT, USER, key_filename=KEY_PATH, timeout=15, banner_timeout=60)
    sftp = ssh.open_sftp()
    print("   ✓ SSH kết nối thành công.")

    # 1. Clean old static assets in /var/www/ongchu-app/_expo and assets
    print("\n2. Uploading Frontend Web PWA...")
    ssh.exec_command(f"mkdir -p {REMOTE_APP}")
    upload_dir(ssh, sftp, LOCAL_DIST, REMOTE_APP)

    # 2. Create legacy entry symlink to guarantee no 404 for cached clients
    web_js_dir = os.path.join(LOCAL_DIST, "_expo", "static", "js", "web")
    entry_files = [f for f in os.listdir(web_js_dir) if f.startswith("entry-") and f.endswith(".js")]
    new_entry = entry_files[0] if entry_files else "entry-652b609f35eef159f756182a6eecd970.js"
    print(f"   ✓ Identified current entry bundle: {new_entry}")

    legacy_hashes = [
        "entry-652b609f35eef159f756182a6eecd970.js",
        "entry-877dde00ba31ab9a7884cf3887e4dd5a.js",
        "entry-77541012693c77cce58cece3d7d92edb.js",
        "entry-9a0933b185db84229492fade16022a9e.js",
        "entry-9bb747ac94483377d4070b945a899925.js",
        "entry-d5ce8f0ce89e0a14e5e32123d7939edd.js",
        "entry-00df4234902605a519d367933b7cf2da.js",
        "entry-49795c9104e3bb7401b6bec62896112a.js",
        "entry-296f1d9b39c2477ebfcdc0121e28d8dd.js",
        "entry-7ff21647300bb0d61e821c9d1f942f92.js",
        "entry-a4144700f8b60b05954b7f7b0dfb0e4d.js",
        "entry-9a76c5afb35378b2483325f3ecda18c8.js",
        "entry-a2b2e6e01abae244c0411b713fa65cd8.js",
        "entry-dd5fa7a3f62f1f98605716b2a4caa94f.js",
        "entry-2bcc36e8b97930de15a2fd9bcd742191.js",
        "entry-87c2e6243da12f29abc7c8c822be018e.js",
        "entry-340c844e597c2f8efe15dc4de62b08b5.js",
        "entry-082fecd8c0abdf7695da05227757970b.js",
        "entry-a4aa85e71eb04ce45deeec96c6773d82.js",
        "entry-25e5abd88a2f5c451c02be22e4f1b9c6.js",
    ]
    symlink_parts = " && ".join([f"ln -sf {new_entry} {h}" for h in legacy_hashes if h != new_entry])
    legacy_symlink_cmd = f"cd {REMOTE_APP}/_expo/static/js/web && {symlink_parts} || true"
    ssh.exec_command(legacy_symlink_cmd)

    # 2. Create dummy /sw.js to eliminate 404 spam in Nginx logs
    sw_file = f"{REMOTE_APP}/sw.js"
    with sftp.file(sw_file, "w") as f:
        f.write("// OngChu POS ServiceWorker Stub\nself.addEventListener('install', () => self.skipWaiting());\nself.addEventListener('activate', () => self.clients.claim());\n")
    print("   ✓ Đã upload Frontend Web.")

    # 2.5. Pre-compress static assets on VPS for zero-copy Nginx sendfile
    gzip_cmd = f"find {REMOTE_APP}/ -type f \\( -name '*.js' -o -name '*.css' -o -name '*.json' -o -name '*.svg' -o -name '*.ttf' -o -name '*.html' \\) -exec gzip -9 -k -f {{}} +"
    ssh.exec_command(gzip_cmd)

    # 3. Update Nginx configuration
    print("\n3. Updating Nginx configuration...")
    sftp.put(r"d:\duanpos-ongchu\nginx_ongchu.conf", "/etc/nginx/sites-available/ongchu.cloud")
    ssh.exec_command("ln -sf /etc/nginx/sites-available/ongchu.cloud /etc/nginx/sites-enabled/ongchu.cloud && rm -f /etc/nginx/sites-enabled/ongchu-app")
    stdin, stdout, stderr = ssh.exec_command("nginx -t")
    if stdout.channel.recv_exit_status() != 0:
        print("   ❌ Nginx config syntax error:\n", stderr.read().decode('utf-8', errors='replace'))
        sys.exit(1)
    ssh.exec_command("systemctl reload nginx")
    print("   ✓ Nginx config updated & reloaded.")

    # 4. Set permissions & Restart Services
    print("\n4. Setting permissions...")
    cmd = f"chown -R www-data:www-data {REMOTE_APP}"
    ssh.exec_command(cmd)

    sftp.close()
    ssh.close()
    print("\n==================================================")
    print("🎉 DEPLOYMENT TOÀN DIỆN THÀNH CÔNG 100%!")
    print("==================================================")

if __name__ == "__main__":
    main()
