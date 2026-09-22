# -*- coding: utf-8 -*-
import os
import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

HOST = os.getenv("VPS_HOST", "116.118.3.48")
PORT = 22
USER = "root"
PASS = os.getenv("VPS_PASSWORD", "")

def main():
    print("==================================================")
    print("🧹 DỌN DẸP & TỐI ƯU HÓA HỆ THỐNG VPS (116.118.3.48)")
    print("==================================================")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=15)
    
    def exec_cmd(cmd, desc=""):
        if desc:
            print(f"\n--- {desc} ---")
        print(f"$ {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='ignore').strip()
        err = stderr.read().decode('utf-8', errors='ignore').strip()
        if out:
            print(out)
        if err and "warning" not in err.lower():
            print(f"[NOTE] {err}")
        return out

    # 1. Dung lượng trước khi dọn
    exec_cmd("df -h /", "1. DUNG LƯỢNG Ổ ĐĨA TRƯỚC KHI DỌN DẸP")

    # 2. Dọn dẹp các tệp cài đặt và file tạm trong /tmp
    exec_cmd("""
        # Xóa các tệp nén cài đặt Go, file test tạm trong /tmp
        rm -rf /tmp/go.tar.gz /tmp/pip-* /tmp/go-build* /tmp/3proxy
        rm -f /tmp/*.py /tmp/*.sql /tmp/*.json /tmp/*.txt
        echo "✓ Đã dọn dẹp thư mục /tmp"
    """, "2. DỌN DẸP CÁC FILE TẠM & TỆP CÀI ĐẶT TRONG /tmp")

    # 3. Dọn dẹp APT Cache & Package thừa
    exec_cmd("""
        apt-get clean -y
        apt-get autoclean -y
        apt-get autoremove -y --purge
        echo "✓ Đã dọn sạch apt cache & package thừa"
    """, "3. DỌN SẠCH APT PACKAGE CACHE")

    # 4. Thu gọn System Logs cũ (Journal Logs, btmp, wtmp)
    exec_cmd("""
        journalctl --vacuum-time=3d
        journalctl --vacuum-size=50M
        # Truncate large failed login logs
        > /var/log/btmp
        rm -f /var/log/*.1 /var/log/*.gz
        echo "✓ Đã tối ưu hóa log hệ thống"
    """, "4. THU GỌN SYSTEM LOGS")

    # 5. Dọn dẹp Go Build Cache & Module Cache không cần thiết
    exec_cmd("""
        go clean -cache -testcache 2>/dev/null || true
        echo "✓ Đã dọn Go build cache"
    """, "5. DỌN DẸP GO BUILD CACHE")

    # 6. Dung lượng sau khi dọn dẹp
    exec_cmd("df -h /", "6. DUNG LƯỢNG Ổ ĐĨA SAU KHI DỌN DẸP")

    # 7. Kiểm tra trạng thái các dịch vụ cốt lõi
    exec_cmd("""
        systemctl is-active ongchu-backend.service
        systemctl is-active nginx.service
        curl -s http://127.0.0.1:8080/health
    """, "7. KIỂM TRA SỨC KHỎE DỊCH VỤ SAU DỌN DẸP")

    ssh.close()
    print("\n==================================================")
    print("🎉 HOÀN TẤT DỌN DẸP & TỐI ƯU HÓA VPS THÀNH CÔNG!")
    print("==================================================")

if __name__ == "__main__":
    main()
