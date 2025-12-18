import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promises as fs } from "node:fs";
import type { OutputFormat, UpscaleAlgorithm, UpscaleParams } from "./validate";

const algorithmFlagMap: Record<UpscaleAlgorithm, string> = {
  lanczos: "lanczos",
  bicubic: "bicubic",
  bilinear: "bilinear",
  nearest: "neighbor",
};

export const buildScaleFilter = (params: UpscaleParams) => {
  const flags = algorithmFlagMap[params.algorithm] ?? algorithmFlagMap.lanczos;

  if (params.mode === "factor") {
    const factor = params.factor ?? 1;
    return `scale=iw*${factor}:ih*${factor}:flags=${flags}`;
  }

  const width = params.width ?? -1;
  const height = params.height ?? -1;
  return `scale=${width}:${height}:flags=${flags}`;
};

export const formatToExtension = (format: OutputFormat) =>
  format === "jpg" ? "jpg" : format;

export const createTempFilePath = (extension: string) =>
  join(tmpdir(), `upscale-${randomUUID()}.${extension}`);

export const runFfmpeg = async (
  inputPath: string,
  outputPath: string,
  filter: string,
  format: OutputFormat
) => {
  const args = ["-y", "-i", inputPath, "-vf", filter];

  if (format === "jpg") {
    args.push("-q:v", "2");
  }

  args.push(outputPath);

  await new Promise<void>((resolve, reject) => {
    const subprocess = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });

    let stderr = "";
    subprocess.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    subprocess.on("error", (err) => reject(err));
    subprocess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr.trim()}`));
      }
    });
  });

  const data = await fs.readFile(outputPath);
  return data;
};
