# -*- coding: utf-8 -*-
import os
import sys
import glob
import paramiko

HOST = os.getenv("VPS_HOST", "116.118.3.48")
PORT = int(os.getenv("VPS_PORT", "22"))
USER = os.getenv("VPS_USER", "root")
PASS = os.getenv("VPS_PASSWORD", "Danh26062002")
KEY_PATH = os.getenv("VPS_SSH_KEY")

if not PASS and not KEY_PATH:
    default_ed25519 = os.path.expanduser("~/.ssh/id_ed25519")
    default_rsa = os.path.expanduser("~/.ssh/id_rsa")
    if os.path.exists(default_ed25519):
        KEY_PATH = default_ed25519
    elif os.path.exists(default_rsa):
        KEY_PATH = default_rsa
    else:
        sys.exit("ABORT: Không tìm thấy VPS_PASSWORD hoặc SSH key trong ~/.ssh/. Vui lòng cấu hình!")

LOCAL_DIR = r"d:\duanpos-ongchu\landing"
REMOTE_DIRS = [
    "/var/www/ongchu-landing",
    "/var/www/posgit/frontend/dist/landing"
]

def main():
    print(f"Connecting to VPS {HOST} via SSH...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    connected = False
    if KEY_PATH:
        try:
            ssh.connect(HOST, PORT, USER, key_filename=KEY_PATH, timeout=15, banner_timeout=60)
            connected = True
        except Exception as e:
            print(f"Key auth failed ({e}), falling back to password...")
    if not connected:
        ssh.connect(HOST, PORT, USER, PASS, timeout=15, banner_timeout=60)
    sftp = ssh.open_sftp()
    print("SSH connection established.")

    def sftp_put_if_changed(local_p, remote_p):
        fname = os.path.basename(local_p)
        force_upload = fname.endswith(('.html', '.css', '.js'))
        if not force_upload:
            try:
                rstat = sftp.stat(remote_p)
                if rstat.st_size == os.path.getsize(local_p):
                    print(f"  [=] Unchanged: {fname}")
                    return
            except IOError:
                pass
        sftp.put(local_p, remote_p)
        print(f"  [+] Uploaded {fname} ({os.path.getsize(local_p)} bytes)")

    for rdir in REMOTE_DIRS:
        print(f"\nDeploying to {rdir}...")
        ssh.exec_command(f"mkdir -p {rdir}/assets {rdir}/downloads")

        # 1. Upload root files
        for fname in ["index.html", "tai-app.html", "privacy.html", "cafe.html", "quan-an.html", "styles.css", "app.js", "robots.txt", "sitemap.xml", "llms.txt"]:
            local_path = os.path.join(LOCAL_DIR, fname)
            if os.path.exists(local_path):
                remote_path = f"{rdir}/{fname}"
                sftp_put_if_changed(local_path, remote_path)

        # 2. Upload assets
        assets_dir = os.path.join(LOCAL_DIR, "assets")
        for asset_path in glob.glob(os.path.join(assets_dir, "*.*")):
            aname = os.path.basename(asset_path)
            remote_asset = f"{rdir}/assets/{aname}"
            sftp_put_if_changed(asset_path, remote_asset)

        # 3. Upload downloads metadata & files
        downloads_dir = os.path.join(LOCAL_DIR, "downloads")
        if os.path.exists(downloads_dir):
            for dl_path in glob.glob(os.path.join(downloads_dir, "*.*")):
                dlname = os.path.basename(dl_path)
                remote_dl = f"{rdir}/downloads/{dlname}"
                sftp_put_if_changed(dl_path, remote_dl)

        # Permissions
        cmd = f"chown -R www-data:www-data {rdir} && chmod -R 755 {rdir}"
        ssh.exec_command(cmd)

    # 4. Upload & reload nginx if nginx_ongchu.conf exists
    local_nginx = r"d:\duanpos-ongchu\nginx_ongchu.conf"
    if os.path.exists(local_nginx):
        try:
            print("\nUpdating Nginx configuration...")
            sftp.put(local_nginx, "/etc/nginx/sites-available/ongchu.cloud")
            ssh.exec_command("ln -sf /etc/nginx/sites-available/ongchu.cloud /etc/nginx/sites-enabled/ongchu.cloud")
        except Exception as e:
            print(f"  [!] Note on nginx conf: {e}")

    # Reload nginx
    print("\nValidating Nginx configuration & reloading...")
    stdin, stdout, stderr = ssh.exec_command("nginx -t && systemctl reload nginx")
    print("STDOUT:", stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print("STDERR:", err)

    sftp.close()
    ssh.close()
    print("Deployment finished successfully!")

if __name__ == "__main__":
    main()

