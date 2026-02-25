import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const paramsSchema = z.object({
  file: z.string().regex(/^[a-zA-Z0-9._-]+\.png$/),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> },
) {
  const params = paramsSchema.parse(await context.params);
  const baseDir = path.resolve(process.cwd(), "screenshots");
  const resolved = path.resolve(baseDir, params.file);

  if (!resolved.startsWith(baseDir + path.sep)) {
    return NextResponse.json({ error: "Invalid screenshot path" }, { status: 400 });
  }

  try {
    const bytes = await fs.readFile(resolved);
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Screenshot not found" }, { status: 404 });
  }
}
