import { NextResponse } from "next/server";
import { z } from "zod";

import { createCommentJobForAllActiveAccounts } from "@/lib/jobs";

const bodySchema = z.object({
  postUrl: z.string().url(),
  dryRun: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const job = await createCommentJobForAllActiveAccounts(body.postUrl, { dryRun: body.dryRun });
    return NextResponse.json({ id: job.id, status: job.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create comment job";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
