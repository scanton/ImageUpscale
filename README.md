# FFmpeg Image Upscaler (Next.js)

Simple Next.js App Router tool to upload one image, upscale it on the server with FFmpeg, preview both versions, and download the result.

## Prerequisites

- Node.js 18+ and pnpm installed.
- FFmpeg installed and available on your PATH:
  - **macOS:** `brew install ffmpeg`
  - **Windows:** `winget install Gyan.FFmpeg` or `choco install ffmpeg`
  - **Ubuntu/Debian:** `sudo apt update && sudo apt install ffmpeg`
  - **Other distros:** use your package manager or download from https://ffmpeg.org/download.html

## Quick start (beginner friendly)

1) Clone or download this repository.
2) Install dependencies:
   ```bash
   pnpm install
   ```
3) Start the dev server:
   ```bash
   pnpm dev
   ```
4) Open http://localhost:3000 in your browser.
5) Upload a PNG/JPG/WebP (max 10MB), pick either:
   - **Scale factor** (1.5x/2x/3x/4x or custom decimal), or
   - **Target size** (set width/height, -1 keeps aspect).
6) Choose scaling algorithm (Lanczos/Bicubic/Bilinear/Nearest) and output format (PNG/JPG/WebP).
7) Click **Upscale**, preview original vs. upscaled, then **Download upscaled image**.

## Notes

- Server runtime is **Node** (not Edge) and uses `ffmpeg` via `child_process.spawn`.
- Uploads are saved to a temp directory (`os.tmpdir()`) and cleaned up after each request.
- API endpoint: `POST /api/upscale` expects `multipart/form-data` with the file and settings.
- Client uses `fetch` + `FormData`; previews use in-browser object URLs (no files persist on the server).

## Troubleshooting

- **FFmpeg missing:** ensure `ffmpeg` runs in your terminal (`ffmpeg -version`). Install it with the commands above.
- **Ports busy:** if `:3000` is taken, run `pnpm dev -- --port 3001` and open that port instead.
- **Slow install:** network hiccups can slow pnpm. Re-run `pnpm install` if it fails the first time.
