---
name: v3-crossplatform-build
description: v3 跨端出包全靠 GitHub Actions；本机无 Rust 工具链；本地与远端路径 em-dash 差异
metadata:
  type: project
---

# v3 跨端构建事实（2026-10-29，P0–P6 落地）

- **出包一律走 `.github/workflows/build.yml`**（web/desktop×3/android 矩阵；手动触发或推 `v*` tag）。用户明确要求打包流全在 Actions。**产物范围按用户要求裁剪**：不要 Intel mac 包（只出 aarch64 dmg）；android 只出 arm64 单 apk（不拆 abi、不出 aab）。手动触发默认创建 Release（tag=v+版本号）并挂全产物。2026-10-29 流水线全绿（run 40818623679）。
- **tauri-action 手动触发不上传**：无 tagName 时它 skip all uploads——桌面产物必须显式 `actions/upload-artifact`（已在 desktop job 里做，路径写在矩阵 artifact-path）。
- **Rust 托盘/菜单代码必须 `#[cfg(desktop)]` 门控**：tauri 的 `menu`/`tray` 模块与 `WebviewWindow::unminimize` 桌面专属，android 交叉编译报 E0432/E0599（lib.rs 已门控；前端用 `isDesktopTauri()` 区分）。
- **本机（admin 的 mac）没有 Rust/cargo**——`tauri dev`、`tauri build`、`tauri android init` 本地都跑不了；这些只在 CI 或用户装 rustup 后可用。本地验证 = `client/` tsc + eslint + vite build + `server/convergence-smoke.mjs`。
- **路径 em-dash 只剩远端**：本地目录已改名 `coordination-v2`（ASCII），但 `deploy/config.sh` 的 `REMOTE_APP_DIR=/home/coordinationv2/coordination—v2` 在服务器上仍是 em-dash——引用必须带双引号，别"顺手统一"远端路径。
- `client/src-tauri/gen/`（android 工程、schemas）不入库：CI 每次 `tauri android init` + `scripts/android-patch.mjs`（cleartext/CAMERA/INTERNET）现生成。
- iOS 只预留未出包；App 产物未签名（dmg 右键打开、apk 为 debug 签名）。

相关：[[server-112-124-21-6-topology]]
