/* eslint-disable @next/next/no-img-element */
"use client";

import { type ChangeEvent, useEffect, useState } from "react";

type Mode = "factor" | "target";
type Algorithm = "lanczos" | "bicubic" | "bilinear" | "nearest";
type Format = "png" | "jpg" | "webp";

const factorPresets = ["1.5", "2", "3", "4"];
const widthPresets = [
  { label: "1024 wide", width: "1024", height: "-1" },
  { label: "2048 wide", width: "2048", height: "-1" },
];

const formatBytes = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const readDimensions = async (source: Blob | string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    const url = typeof source === "string" ? source : URL.createObjectURL(source);

    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      if (typeof source !== "string") URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      reject(new Error("Could not read image dimensions."));
      if (typeof source !== "string") URL.revokeObjectURL(url);
    };

    img.src = url;
  });

export default function Home() {
  const [mode, setMode] = useState<Mode>("factor");
  const [factor, setFactor] = useState("2");
  const [width, setWidth] = useState("2048");
  const [height, setHeight] = useState("-1");
  const [algorithm, setAlgorithm] = useState<Algorithm>("lanczos");
  const [format, setFormat] = useState<Format>("png");

  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [originalDims, setOriginalDims] = useState<{ width: number; height: number } | null>(null);

  const [upscaledUrl, setUpscaledUrl] = useState<string | null>(null);
  const [upscaledDims, setUpscaledDims] = useState<{ width: number; height: number } | null>(null);
  const [upscaledSize, setUpscaledSize] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(
    () => () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (upscaledUrl) URL.revokeObjectURL(upscaledUrl);
    },
    [originalUrl, upscaledUrl]
  );

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    setError(null);
    setFile(selected);
    if (originalUrl) URL.revokeObjectURL(originalUrl);

    const url = URL.createObjectURL(selected);
    setOriginalUrl(url);
    setOriginalDims(null);

    try {
      const dims = await readDimensions(url);
      setOriginalDims(dims);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Pick an image to upscale first.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
    formData.append("algorithm", algorithm);
    formData.append("format", format);

    if (mode === "factor") {
      formData.append("factor", factor);
    } else {
      formData.append("width", width);
      formData.append("height", height);
    }

    try {
      const response = await fetch("/api/upscale", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = "Upscaling failed.";
        try {
          const data = await response.json();
          message = data?.error ?? message;
        } catch {
          // Ignore JSON parse issues
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      if (upscaledUrl) URL.revokeObjectURL(upscaledUrl);
      const objectUrl = URL.createObjectURL(blob);
      setUpscaledUrl(objectUrl);
      setUpscaledSize(blob.size);

      try {
        const dims = await readDimensions(blob);
        setUpscaledDims(dims);
      } catch (err) {
        console.error(err);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadName = `upscaled.${format === "jpg" ? "jpg" : format}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
        <header className="flex flex-col gap-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.15em] text-slate-200">
            FFmpeg Upscaler
          </div>
          <h1 className="text-3xl font-semibold md:text-4xl">Sharper images in one click.</h1>
          <p className="max-w-3xl text-slate-200/80">
            Pick a photo, choose how you want to scale it, and let FFmpeg do the heavy lifting on
            the server. The result shows up right here with a download link.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/60 backdrop-blur">
            <form
              className="flex flex-col gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmit();
              }}
            >
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-100">Image</label>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  onChange={onFileChange}
                  className="block w-full cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-slate-100 file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-indigo-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:border-indigo-400/60 focus:border-indigo-400/70 focus:outline-none focus:ring-1 focus:ring-indigo-400/40"
                />
                <p className="text-xs text-slate-300/70">
                  PNG, JPG, or WebP · Max 10MB · Everything runs server-side.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {(["factor", "target"] as Mode[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      mode === value
                        ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                        : "border-white/15 bg-white/5 text-slate-100 hover:border-indigo-400/50"
                    }`}
                  >
                    {value === "factor" ? "Scale factor" : "Target size"}
                  </button>
                ))}
              </div>

              {mode === "factor" ? (
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-100">Scale factor</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      value={factor}
                      onChange={(e) => setFactor(e.target.value)}
                      className="w-32 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-slate-100 focus:border-indigo-400/70 focus:outline-none focus:ring-1 focus:ring-indigo-400/40"
                    />
                    <div className="flex flex-wrap gap-2">
                      {factorPresets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFactor(preset)}
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            factor === preset
                              ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                              : "border-white/15 bg-white/5 text-slate-100 hover:border-indigo-400/50"
                          }`}
                        >
                          {preset}×
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-slate-100">Width</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        className="w-28 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-slate-100 focus:border-indigo-400/70 focus:outline-none focus:ring-1 focus:ring-indigo-400/40"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-slate-100">Height</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="w-28 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-slate-100 focus:border-indigo-400/70 focus:outline-none focus:ring-1 focus:ring-indigo-400/40"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-300/70">
                    Use -1 for width or height to preserve aspect ratio.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {widthPresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setWidth(preset.width);
                          setHeight(preset.height);
                        }}
                        className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-100 transition hover:border-indigo-400/60"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-100">Algorithm</label>
                  <select
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
                    className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-slate-100 focus:border-indigo-400/70 focus:outline-none focus:ring-1 focus:ring-indigo-400/40"
                  >
                    <option value="lanczos">Lanczos (sharpest)</option>
                    <option value="bicubic">Bicubic</option>
                    <option value="bilinear">Bilinear</option>
                    <option value="nearest">Nearest</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-100">Output format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as Format)}
                    className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-slate-100 focus:border-indigo-400/70 focus:outline-none focus:ring-1 focus:ring-indigo-400/40"
                  >
                    <option value="png">PNG (recommended)</option>
                    <option value="jpg">JPG</option>
                    <option value="webp">WebP</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-indigo-500/60"
                >
                  {isLoading ? "Upscaling…" : "Upscale"}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!file || isLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-indigo-400/60 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-slate-400/80"
                >
                  Try another algorithm
                </button>
                <p className="text-xs text-slate-300/70">
                  No uploads stay on the server—files are processed in a temp directory then cleaned.
                </p>
              </div>
            </form>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-slate-950/50">
              <div className="flex items-center justify-between gap-2 pb-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Original</p>
                  <p className="text-sm text-slate-100">
                    {originalDims
                      ? `${originalDims.width} × ${originalDims.height}`
                      : "Waiting for a file"}
                  </p>
                </div>
                <p className="text-sm text-slate-200/80">{formatBytes(file?.size ?? null)}</p>
              </div>
              <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-900/60">
                {originalUrl ? (
                  <img
                    src={originalUrl}
                    alt="Original preview"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    Choose an image to preview it.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-slate-950/50">
              <div className="flex items-center justify-between gap-2 pb-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Upscaled</p>
                  <p className="text-sm text-slate-100">
                    {upscaledDims
                      ? `${upscaledDims.width} × ${upscaledDims.height}`
                      : "Not processed yet"}
                  </p>
                </div>
                <p className="text-sm text-slate-200/80">{formatBytes(upscaledSize)}</p>
              </div>
              <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-900/60">
                {upscaledUrl ? (
                  <img
                    src={upscaledUrl}
                    alt="Upscaled preview"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    {isLoading ? "Processing…" : "Run an upscale to see the result."}
                  </div>
                )}
              </div>
              {upscaledUrl && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <a
                    href={upscaledUrl}
                    download={downloadName}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-50 shadow-md shadow-emerald-500/30 transition hover:bg-emerald-400"
                  >
                    Download upscaled image
                  </a>
                  <p className="text-xs text-slate-300/70">
                    Preview uses an in-browser object URL; nothing is stored remotely.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
