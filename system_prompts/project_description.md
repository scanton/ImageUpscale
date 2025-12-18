You are Codex running inside VSCode. You have access to a repo folder already opened in VSCode named “ImageUpscale”. pnpm is installed. Build a simple Next.js web app that upscales a single user-selected image using FFmpeg on the server (Node runtime), then displays the upscaled result in the browser with a download button.

HIGH-LEVEL GOAL

- Next.js app (App Router) that lets me:
  1. pick an image from my local drive
  2. choose upscale settings (scale factor or target width/height; scaling algorithm)
  3. submit to a server endpoint that runs FFmpeg to upscale
  4. show original + upscaled preview
  5. allow download of the upscaled image

TECH / CONSTRAINTS

- Use Next.js with TypeScript.
- Use pnpm for all commands.
- Use App Router (app/).
- FFmpeg must run server-side via Node (child_process). DO NOT use Edge runtime.
- The server should accept multipart/form-data via Request.formData() (no heavy upload middleware unless truly necessary).
- Temporary files should be written to a temp directory (os.tmpdir()) and cleaned up.
- Validate inputs: file type (png/jpg/webp), max size (e.g., 10MB), and ensure numeric settings are sane.
- Keep it simple and robust. Prefer PNG output by default.
- Provide a clean minimal UI (basic CSS or Tailwind—your choice, but don’t overcomplicate).

FFMPEG DETAILS

- Implement upscale using FFmpeg scale filter:
  - scale factor mode: scale=iw*FACTOR:ih*FACTOR
  - target mode: scale=WIDTH:HEIGHT (allow -1 to preserve aspect if user chooses)
- Implement scaling algorithms by mapping UI choice to scale flags:
  - Lanczos => flags=lanczos
  - Bicubic => flags=bicubic
  - Bilinear => flags=bilinear
  - Nearest => flags=neighbor
- Example filter: -vf "scale=iw*2:ih*2:flags=lanczos"
- Output: PNG (default). Optionally allow JPG/WebP via dropdown (bonus).

UI REQUIREMENTS (SINGLE PAGE)

- Page with:
  - file input
  - mode selector: “Scale factor” vs “Target size”
  - if factor mode: factor dropdown or input (1.5, 2, 3, 4; allow decimals like 1.5)
  - if target mode: width + height inputs with helper “use -1 to keep aspect”; and quick presets (e.g., 1024 wide, 2048 wide) (optional)
  - algorithm dropdown: Lanczos/Bicubic/Bilinear/Nearest
  - output format dropdown: png/jpg/webp (optional; png required)
  - “Upscale” button with loading state
- After processing:
  - show original preview and upscaled preview side-by-side
  - show resulting dimensions + file size (if easy)
  - “Download upscaled image” button
  - Keep previews as <img> using object URLs.

SERVER API

- Create route: app/api/upscale/route.ts
- Accept POST only.
- Parse formData:
  - file: Blob
  - mode: "factor" | "target"
  - factor: string (if factor mode)
  - width/height: strings (if target mode)
  - algorithm: string
  - format: string (optional)
- Save uploaded blob to temp input file.
- Build FFmpeg command safely (no shell injection):
  - spawn("ffmpeg", ["-y", "-i", inputPath, "-vf", filterString, outputPath])
- If output format is jpg, set a reasonable quality (e.g., -q:v 2) (optional).
- Return the output bytes with proper Content-Type and a Content-Disposition filename.
- If FFmpeg is missing, return a friendly JSON error with instructions.

PROJECT SETUP / DELIVERABLES

1. Initialize project with:
   - pnpm create next-app@latest . (or equivalent) with TypeScript.
2. Implement UI in app/page.tsx.
3. Implement API route in app/api/upscale/route.ts.
4. Add small shared helpers:
   - lib/validate.ts (input validation)
   - lib/ffmpeg.ts (build filter string + algorithm mapping + spawn wrapper)
5. Add README.md with:
   - prerequisites (install ffmpeg; Mac: brew install ffmpeg; Windows: winget/choco; Linux: apt) and basic instructions for users not familiar with Next.js and GitHub (instructions for noobs)
   - how to run (pnpm dev)
   - notes about Node runtime and temp files
6. Add .gitignore file to keep from tracking all installed packages
7. Make sure it works end-to-end.

QUALITY BAR

- Code should be clean, commented, and defensive.
- Good error handling surfaced in the UI.
- No unnecessary dependencies. If you do add one, justify it.

IMPLEMENTATION DETAILS (IMPORTANT)

- In the client, submit using fetch with FormData to /api/upscale.
- When response is successful:
  - read as blob
  - createObjectURL(blob)
  - set it as src for the “upscaled” preview
  - also create a download link using an <a download>
- Show errors from JSON if response is not ok.
- Ensure the API response is not cached.

NOW DO THE WORK

- Generate the full code changes with file paths and complete file contents.
- Do not leave placeholders.
- After writing code, include a short “How to run” section and any troubleshooting tips.

BONUS (ONLY IF EASY)

- Show before/after dimension readouts by decoding images in the browser (create Image() and read naturalWidth/Height).
- Add a simple “Try another algorithm” button that reuses the same uploaded file (keep it in state) and resubmits.
