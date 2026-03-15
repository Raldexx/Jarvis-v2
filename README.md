# ⚡ JARVIS v2 — Tauri Edition

> Python/PyQt6 → **Rust + Tauri + Svelte** migration

---

> **📢 Honest Note**
>
> I'm not very experienced with Rust, so I heavily relied on AI assistance (Claude) throughout this migration.
> The Rust backend code — especially the `unsafe` Windows API parts for Spotify detection — was largely AI-generated.
> I understand the overall architecture and the logic, but if you're diving deep into the Rust side,
> just know it was a learning-by-doing process with a lot of AI help. No shame in that. 🤖
>
> The original [JARVIS v1](https://github.com/Raldexx/jarvis-v1) was written by me in Python/PyQt6.
> This is a full rewrite to make it faster, lighter, and cross-platform via Tauri.

---

---

## 🗂 Proje Yapısı

```
jarvis-tauri/
├── src-tauri/              ← BACKEND (Rust)
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs         ← Entry point
│       ├── lib.rs          ← Tauri builder + system tray
│       └── commands.rs     ← Tüm Tauri komutları
│
├── src/                    ← FRONTEND (Svelte)
│   ├── app.html
│   ├── routes/
│   │   ├── +layout.js      ← SSR kapalı (Tauri için şart)
│   │   ├── +layout.svelte  ← CSS vars, polling başlatma
│   │   └── +page.svelte    ← Ana panel UI
│   └── lib/
│       ├── stores/
│       │   └── system.js   ← Merkezi state + tüm invoke() çağrıları
│       └── components/
│           ├── CircleGauge.svelte
│           ├── MiniGraph.svelte
│           ├── SpotifyVisualizer.svelte
│           ├── SettingsPanel.svelte
│           ├── ActionsPanel.svelte
│           └── StatsPanel.svelte
│
├── package.json
├── svelte.config.js
└── vite.config.js
```

---

## 🚀 Kurulum

### 1. Gereksinimler

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Node.js >= 18 (pnpm veya npm)
npm install -g pnpm   # önerilen

# Tauri CLI
cargo install tauri-cli --version "^2.0"
```

### 2. Bağımlılıkları kur

```bash
cd jarvis-tauri
pnpm install        # veya: npm install
```

### 3. Geliştirme modu

```bash
pnpm tauri dev
```

### 4. Release build

```bash
pnpm tauri build
# → src-tauri/target/release/bundle/ altında .exe / .msi
```

---

## 🔧 Python → Rust Karşılıkları

| Python (orijinal)         | Rust / Tauri                          |
|---------------------------|---------------------------------------|
| `psutil.cpu_percent()`    | `sysinfo::System::global_cpu_usage()` |
| `psutil.virtual_memory()` | `sysinfo::System::used_memory()`      |
| `psutil.disk_usage('/')`  | `sysinfo::Disks`                      |
| `psutil.net_io_counters()`| `sysinfo::Networks`                   |
| `psutil.sensors_temperatures()` | `sysinfo::Components`           |
| `win32gui.EnumWindows()`  | `winapi::EnumWindows` (unsafe Rust)   |
| `requests.get(wttr.in)`   | `reqwest::get()`                      |
| `pyttsx3.speak()`         | Web Speech API (`speechSynthesis`)    |
| `QSystemTrayIcon`         | `tauri::tray::TrayIconBuilder`        |
| `PyQt6` tüm UI            | Svelte + CSS                          |

---

## 🎨 Temalar

`src/lib/stores/system.js` içindeki `THEMES` objesinden değiştir.
Ayarlar `localStorage`'a kaydedilir, uygulama her açılışta hatırlar.

---

## ➕ Yeni Özellik Eklemek

### Backend'e yeni komut ekle

`src-tauri/src/commands.rs`'ye yeni `#[tauri::command]` fonksiyon yaz,
sonra `lib.rs`'deki `invoke_handler` listesine ekle:

```rust
// commands.rs
#[tauri::command]
pub fn get_gpu_stats() -> Option<GpuStats> {
    // ...
}

// lib.rs
.invoke_handler(tauri::generate_handler![
    commands::get_system_stats,
    commands::get_gpu_stats,   // ← ekle
])
```

### Frontend'de kullan

```js
// system.js veya herhangi bir component
import { invoke } from '@tauri-apps/api/core';
const gpu = await invoke('get_gpu_stats');
```

---

## 📝 Notlar

- **Spotify** tespiti sadece Windows'ta çalışır (Window title API).
  `commands.rs`'de `#[cfg(target_os = "windows")]` ile koşullandırılmıştır.
- **GPU sıcaklığı**: `sysinfo` sisteme bağlı olarak döndürür,
  NVIDIA için `nvml-wrapper` crate'i eklenebilir (ileride).
- **TTS**: `pyttsx3` yerine Web Speech API kullanılıyor — ayrı kurulum yok.
- **Daily stats** localStorage'da saklanır, her gün otomatik sıfırlanır.
