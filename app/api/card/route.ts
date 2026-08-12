import { NextResponse } from "next/server";
import { hasBlobStore, newId, storeCard } from "@/lib/store";

/** Generous for a PNG of this size, tight enough to refuse anything odd. */
const MAX_UPLOAD = 8 * 1024 * 1024;

/**
 * Capability probe. The client uses this to decide whether to offer link
 * sharing at all, so an unconfigured deployment shows no affordance rather
 * than a button that always fails.
 */
export async function GET() {
  return NextResponse.json({ configured: hasBlobStore() });
}

export async function POST(request: Request) {
  if (!hasBlobStore()) {
    return NextResponse.json(
      { error: "Sharing by link is not configured on this deployment." },
      { status: 501 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Malformed upload." }, { status: 400 });
  }

  const card = form.get("card");
  const og = form.get("og");

  if (!(card instanceof Blob) || !(og instanceof Blob)) {
    return NextResponse.json(
      { error: "Both images are required." },
      { status: 400 },
    );
  }

  for (const blob of [card, og]) {
    if (blob.type !== "image/png") {
      return NextResponse.json({ error: "PNG only." }, { status: 415 });
    }
    if (blob.size > MAX_UPLOAD || blob.size === 0) {
      return NextResponse.json({ error: "Image too large." }, { status: 413 });
    }
  }

  const id = newId();
  await storeCard(id, card, og);

  return NextResponse.json({ id });
}
