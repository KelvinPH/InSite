import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await inngest.send({ name: "insite/sites.refresh-all", data: {} });
  return NextResponse.json({ ok: true });
}
