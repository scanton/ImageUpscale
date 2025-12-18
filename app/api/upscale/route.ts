import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import {
  buildScaleFilter,
  createTempFilePath,
  formatToExtension,
  runFfmpeg,
} from "@/lib/ffmpeg";
import {
  contentTypeForFormat,
  deriveExtension,
  validateFormData,
} from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let inputPath: string | undefined;
  let outputPath: string | undefined;

  try {
    const formData = await request.formData();
    const validation = validateFormData(formData);

    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { file, params } = validation;
    const inputExtension = deriveExtension((file as File).name, file.type);
    const outputExtension = formatToExtension(params.format);

    inputPath = createTempFilePath(inputExtension);
    outputPath = createTempFilePath(outputExtension);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(inputPath, fileBuffer);

    const filter = buildScaleFilter(params);
    const outputBuffer = await runFfmpeg(inputPath, outputPath, filter, params.format);

    const headers = new Headers({
      "Content-Type": contentTypeForFormat(params.format),
      "Content-Disposition": `attachment; filename="upscaled-${Date.now()}.${outputExtension}"`,
      "Cache-Control": "no-store, max-age=0",
    });

    return new NextResponse(outputBuffer, { status: 200, headers });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upscaling failed.";
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return NextResponse.json(
        {
          error:
            "FFmpeg is not installed or not in PATH. Install it (brew install ffmpeg / sudo apt install ffmpeg / choco install ffmpeg) and try again.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    const cleanups = [];
    if (inputPath) cleanups.push(fs.unlink(inputPath).catch(() => undefined));
    if (outputPath) cleanups.push(fs.unlink(outputPath).catch(() => undefined));
    if (cleanups.length) {
      await Promise.all(cleanups);
    }
  }
}

export function GET() {
  return NextResponse.json({ error: "Use POST for this endpoint." }, { status: 405 });
}
