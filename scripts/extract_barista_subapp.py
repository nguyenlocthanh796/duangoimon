#!/usr/bin/env python3
"""
OngChu Barista SOP Sub-App Extractor
Extracts the Barista SOP Module (frontend/lib/modules/barista-sop)
into an independent, production-ready Expo SDK 52 Standalone Repository.
"""

import os
import sys
import shutil
import argparse
import json
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def generate_package_json(project_name="ongchu-barista-sop"):
    return {
        "name": project_name,
        "version": "1.0.0",
        "description": "OngChu Barista SOP & So Cong Thuc - Standalone Expo SDK 52 Sub-App",
        "main": "index.ts",
        "scripts": {
            "start": "expo start",
            "android": "expo start --android",
            "ios": "expo start --ios",
            "web": "expo start --web",
            "dev": "expo start -c",
            "build:web": "expo export -p web"
        },
        "dependencies": {
            "@expo/vector-icons": "^14.0.4",
            "@react-native-async-storage/async-storage": "1.23.1",
            "expo": "~52.0.0",
            "expo-haptics": "~14.0.0",
            "expo-status-bar": "~2.0.0",
            "react": "18.3.1",
            "react-dom": "18.3.1",
            "react-native": "0.76.6",
            "react-native-safe-area-context": "4.12.0",
            "react-native-web": "~0.19.13",
            "zustand": "^5.0.3"
        },
        "devDependencies": {
            "@babel/core": "^7.25.2",
            "@types/react": "~18.3.12",
            "typescript": "^5.3.3"
        },
        "private": True
    }

def generate_app_json(app_name="OngChu Barista SOP", slug="ongchu-barista-sop"):
    return {
        "expo": {
            "name": app_name,
            "slug": slug,
            "version": "1.0.0",
            "orientation": "default",
            "icon": "./assets/icon.png",
            "userInterfaceStyle": "automatic",
            "splash": {
                "image": "./assets/splash.png",
                "resizeMode": "contain",
                "backgroundColor": "#14110E"
            },
            "ios": {
                "supportsTablet": True,
                "bundleIdentifier": "cloud.ongchu.baristasop"
            },
            "android": {
                "adaptiveIcon": {
                    "foregroundImage": "./assets/adaptive-icon.png",
                    "backgroundColor": "#14110E"
                },
                "package": "cloud.ongchu.baristasop"
            },
            "web": {
                "favicon": "./assets/favicon.png",
                "bundler": "metro"
            },
            "plugins": []
        }
    }

def generate_tsconfig():
    return {
        "extends": "expo/tsconfig.base",
        "compilerOptions": {
            "strict": True,
            "paths": {
                "@/*": ["./src/*"]
            }
        }
    }

def generate_readme(project_name="OngChu Barista SOP"):
    return f"""# {project_name} (Expo SDK 52)
> **So Cong Thuc Pha Che Chuan SOP & Tro Ly Nau Me Doc Lap Cho Quan F&B**

Ung dung doc lap toi uu cho iPad quay Bar va Dien thoai nhan vien pha che:
- So Cong Thuc: Quan ly BOM, Dinh luong nguyen lieu da kich co (M/L), Tinh gia von (COGS) & Ty suat loi nhuan tuc thi.
- Che do Focus Station: Man hinh pha che truc quan theo tung buoc SOP, hien thi buoc ke tiep (Next-Step Preview), am thanh bao hieu khi hoan thanh.
- Tro Ly Da Dong Ho (Multi-Timer Engine): Ho tro u song song nhieu me tra (Tra lai, Oolong nuong, Hong tra, Tran chau) co dem nguoc, chuong bao dong va in tem dan binh u han su dung.

---

## Khoi Chay Nhanh Trong 30 Giay

```bash
# 1. Cai dat thu vien:
npm install

# 2. Khoi chay ung dung:
npm run dev

# 3. Mo tren thiet bi:
# - Bam 'a' de mo Android
# - Bam 'i' de mo iOS Simulator
# - Bam 'w' de mo Web PWA (http://localhost:8081)
```

---

## Cau Truc Ma Nguon

```
src/
|-- barista-sop/          # Core module (components, constants, store, types)
|-- theme/                # Indochine Dual-Theme (#F9F6F0 / #14110E)
|-- components/ui/        # Shared UI components (<AppText>, etc.)
|-- utils/                # Sound synthesis, format, labelPrinter
`-- App.tsx               # Root entry component
```
"""

def extract_subapp(target_dir, base_frontend_dir):
    out_path = Path(target_dir).resolve()
    base_path = Path(base_frontend_dir).resolve()
    module_path = base_path / "lib" / "modules" / "barista-sop"

    if not module_path.exists():
        print(f"[-] Error: Barista module directory not found at {module_path}")
        sys.exit(1)

    print(f"[+] Creating standalone project at: {out_path}")
    os.makedirs(out_path, exist_ok=True)
    os.makedirs(out_path / "src", exist_ok=True)
    os.makedirs(out_path / "assets", exist_ok=True)

    # 1. Copy Barista Module to src/
    shutil.copytree(module_path, out_path / "src" / "barista-sop", dirs_exist_ok=True)
    print("  [OK] Copied Barista SOP core module")

    # 2. Copy Standalone Theme
    theme_src = base_path / "lib" / "theme"
    if theme_src.exists():
        shutil.copytree(theme_src, out_path / "src" / "theme", dirs_exist_ok=True)
        print("  [OK] Copied Theme definitions")

    # 3. Copy Hooks
    hooks_dest = out_path / "src" / "hooks"
    os.makedirs(hooks_dest, exist_ok=True)
    if (base_path / "lib" / "hooks" / "useResponsive.ts").exists():
        shutil.copy2(base_path / "lib" / "hooks" / "useResponsive.ts", hooks_dest / "useResponsive.ts")
        print("  [OK] Copied responsive layout hooks")

    # 4. Copy UI Components
    ui_src = base_path / "lib" / "components" / "ui"
    if ui_src.exists():
        shutil.copytree(ui_src, out_path / "src" / "components" / "ui", dirs_exist_ok=True)
        print("  [OK] Copied UI design system components")

    # 5. Copy Utils (sound, format, labelPrinter)
    utils_dest = out_path / "src" / "utils"
    os.makedirs(utils_dest, exist_ok=True)
    for u in ["sound.ts", "format.ts", "labelPrinter.ts"]:
        src_u = base_path / "lib" / "utils" / u
        if src_u.exists():
            shutil.copy2(src_u, utils_dest / u)
    print("  [OK] Copied sound synthesis and utility helpers")

    # 6. Generate Root App.tsx and index.ts
    app_tsx_content = """import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BaristaSOPApp } from './src/barista-sop';
import { useTheme } from './src/theme';

export default function App() {
  const { isDark } = useTheme();
  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <BaristaSOPApp />
    </SafeAreaProvider>
  );
}
"""
    with open(out_path / "App.tsx", "w", encoding="utf-8") as f:
        f.write(app_tsx_content)

    index_ts_content = """import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
"""
    with open(out_path / "index.ts", "w", encoding="utf-8") as f:
        f.write(index_ts_content)

    # 7. Write configs
    with open(out_path / "package.json", "w", encoding="utf-8") as f:
        json.dump(generate_package_json(), f, indent=2, ensure_ascii=False)

    with open(out_path / "app.json", "w", encoding="utf-8") as f:
        json.dump(generate_app_json(), f, indent=2, ensure_ascii=False)

    with open(out_path / "tsconfig.json", "w", encoding="utf-8") as f:
        json.dump(generate_tsconfig(), f, indent=2, ensure_ascii=False)

    with open(out_path / "README.md", "w", encoding="utf-8") as f:
        f.write(generate_readme())

    print(f"\n[SUCCESS] Standalone Barista SOP Sub-App successfully extracted to:")
    print(f"    {out_path}")
    print("\nNext steps to run:")
    print(f"  cd {out_path}")
    print("  npm install")
    print("  npm run dev")

def main():
    parser = argparse.ArgumentParser(description="Extract Barista SOP Sub-App to Standalone Repo")
    parser.add_argument(
        "--out", "-o",
        default="../ongchu-barista-sop-standalone",
        help="Destination directory for standalone sub-app"
    )
    parser.add_argument(
        "--frontend-dir", "-f",
        default="d:/duanpos-ongchu/frontend",
        help="Base frontend directory containing lib/modules/barista-sop"
    )
    args = parser.parse_args()

    extract_subapp(args.out, args.frontend_dir)

if __name__ == "__main__":
    main()
