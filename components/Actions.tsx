"use client";

import { type RefObject, useState } from "react";
import { DownloadSimple, Spinner, XLogo } from "@phosphor-icons/react";
import { TWEET_CAPTION } from "@/lib/brand";
import type { PreviewHandle } from "./CardPreview";

type Props = {
  preview: RefObject<PreviewHandle | null>;
  name: string;
  ready: boolean;
};

const slug = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "builder";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export default function Actions({ preview, name, ready }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setError(null);
    setDownloading(true);
    try {
      const blob = await preview.current!.toBlob("card");
      saveBlob(blob, `hacker-house-goa-2026-${slug(name)}.png`);
    } catch {
      setError("Could not build the image. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function share() {
    setError(null);
    setSharing(true);
    try {
      const card = await preview.current!.toBlob("card");
      const file = new File([card], `hacker-house-goa-2026-${slug(name)}.png`, {
        type: "image/png",
      });

      // On a phone this hands the real PNG to the X app with the caption
      // already written, which is the flow the brief actually wants.
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: TWEET_CAPTION });
          return;
        } catch (err) {
          // A user dismissing the sheet is not a failure worth reporting.
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
      }

      // Everywhere else: publish the card, then open the tweet composer with a
      // link whose OG preview is the card itself.
      const og = await preview.current!.toBlob("og");
      const body = new FormData();
      body.append("card", card);
      body.append("og", og);

      const res = await fetch("/api/card", { method: "POST", body });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const { id } = (await res.json()) as { id: string };

      const url = `${window.location.origin}/c/${id}`;
      window.open(
        `https://x.com/intent/tweet?text=${encodeURIComponent(
          TWEET_CAPTION,
        )}&url=${encodeURIComponent(url)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch {
      setError("Could not open X. Download the image and post it directly.");
    } finally {
      setSharing(false);
    }
  }

  const base =
    "flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-5 font-sans text-[15px] font-bold whitespace-nowrap transition-transform duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={download}
          disabled={!ready || downloading}
          className={`${base} bg-pink-deep text-cream hover:bg-pink`}
        >
          {downloading ? (
            <Spinner size={18} weight="bold" className="animate-spin" />
          ) : (
            <DownloadSimple size={18} weight="bold" />
          )}
          Download
        </button>

        <button
          type="button"
          onClick={share}
          disabled={!ready || sharing}
          className={`${base} border border-forest/60 text-forest hover:border-forest hover:bg-forest/5`}
        >
          {sharing ? (
            <Spinner size={18} weight="bold" className="animate-spin" />
          ) : (
            <XLogo size={18} weight="bold" />
          )}
          Share to X
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-2 font-mono text-[12px] text-pink-deep">
          {error}
        </p>
      ) : !ready ? (
        <p className="mt-2 font-mono text-[11px] text-forest/80">
          Add a photo and your name to unlock these.
        </p>
      ) : null}
    </div>
  );
}
