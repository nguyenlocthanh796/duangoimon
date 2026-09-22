import os
import sys
import shutil
import subprocess
import paramiko

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

app_dir = r"d:\duanpos-ongchu\desktop-app"
dist_src = r"d:\duanpos-ongchu\frontend\dist"
dist_dst = os.path.join(app_dir, "dist")

print("1. Preparing desktop-app package...")
os.makedirs(app_dir, exist_ok=True)
if os.path.exists(dist_dst):
    shutil.rmtree(dist_dst)
shutil.copytree(dist_src, dist_dst)

go_mod_path = os.path.join(app_dir, "go.mod")
with open(go_mod_path, "w", encoding="utf-8") as f:
    f.write("module ongchu-desktop\n\ngo 1.22\n")

main_go_path = os.path.join(app_dir, "main.go")
with open(main_go_path, "w", encoding="utf-8") as f:
    f.write('''package main

import (
	"embed"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"os/exec"
	"syscall"
	"time"
)

//go:embed dist/*
var distFS embed.FS

func openApp(url string) {
	chromePaths := []string{
		`C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`,
		`C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe`,
		`C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe`,
		`C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe`,
	}
	for _, p := range chromePaths {
		cmd := exec.Command(p, fmt.Sprintf("--app=%s", url), "--window-size=1440,900")
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		if err := cmd.Start(); err == nil {
			return
		}
	}
	cmd := exec.Command("cmd", "/c", "start", url)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	_ = cmd.Start()
}

func main() {
	subFS, err := fs.Sub(distFS, "dist")
	if err != nil {
		openApp("https://app.ongchu.cloud")
		return
	}

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		openApp("https://app.ongchu.cloud")
		return
	}
	port := listener.Addr().(*net.TCPAddr).Port

	fileServer := http.FileServer(http.FS(subFS))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache")
		fileServer.ServeHTTP(w, r)
	})

	serverURL := fmt.Sprintf("http://127.0.0.1:%d", port)

	go func() {
		time.Sleep(200 * time.Millisecond)
		openApp(serverURL)
	}()

	_ = http.Serve(listener, nil)
}
''')

print("2. Compiling Windows Native Exe (~12MB)...")
go_exe = r"d:\duanpos-ongchu\go_sdk\go\bin\go.exe"
out_exe = r"d:\duanpos-ongchu\landing\downloads\ongchu-pos-desktop.exe"
env = os.environ.copy()
env["GOOS"] = "windows"
env["GOARCH"] = "amd64"
env["CGO_ENABLED"] = "0"

res = subprocess.run([go_exe, "build", "-ldflags=-s -w -H=windowsgui", "-o", out_exe, "."], cwd=app_dir, env=env, capture_output=True, text=True)
print("Build STDOUT:", res.stdout)
print("Build STDERR:", res.stderr)

if not os.path.exists(out_exe):
    print("[-] Build failed!")
    sys.exit(1)

exe_size = os.path.getsize(out_exe)
print(f"[+] Build successful: {out_exe} ({exe_size} bytes / {exe_size / 1024 / 1024:.2f} MB)")

print("\n3. Uploading to VPS (116.118.3.48)...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(os.getenv("VPS_HOST", "116.118.3.48"), int(os.getenv("VPS_PORT", "22")), os.getenv("VPS_USER", "root"), os.getenv("VPS_PASSWORD", ""), timeout=15)
sftp = ssh.open_sftp()

remote_targets = [
    "/var/www/ongchu-landing/downloads/ongchu-pos-desktop.exe",
    "/var/www/posgit/frontend/dist/landing/downloads/ongchu-pos-desktop.exe"
]

for target in remote_targets:
    target_dir = os.path.dirname(target)
    ssh.exec_command(f"mkdir -p {target_dir}")
    print(f"Uploading to {target}...")
    sftp.put(out_exe, target)
    ssh.exec_command(f"chown www-data:www-data {target} && chmod 755 {target}")
    print(f"  [+] Uploaded successfully.")

# Upload nginx config if updated
local_nginx = r"d:\duanpos-ongchu\nginx_ongchu.conf"
if os.path.exists(local_nginx):
    sftp.put(local_nginx, "/etc/nginx/sites-available/ongchu.cloud")
    ssh.exec_command("ln -sf /etc/nginx/sites-available/ongchu.cloud /etc/nginx/sites-enabled/ongchu.cloud && systemctl reload nginx")
    print("  [+] Nginx configuration reloaded.")

sftp.close()
ssh.close()
print("\n[+] ALL DONE! ongchu-pos-desktop.exe is live on https://ongchu.cloud/downloads/ongchu-pos-desktop.exe")
