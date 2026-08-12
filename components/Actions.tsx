"use client";

import { type RefObject, useEffect, useState } from "react";
import { DownloadSimple, LinkSimple, Spinner, XLogo } from "@phosphor-icons/react";
import { tweetCaption } from "@/lib/brand";
import type { PreviewHandle } from "./CardPreview";

type Props = {
  preview: RefObject<PreviewHandle | null>;
  name: string;
  title: string;
  ready: boolean;
};

type Status =
  | { kind: "idle" }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string };

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

export default function Actions({ preview, name, title, ready }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copying, setCopying] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [canLink, setCanLink] = useState(false);

  // Link sharing only exists when a blob store is configured. Probe once so the
  // affordance is absent rather than present-and-broken.
  useEffect(() => {
    let alive = true;
    fetch("/api/card")
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((d: { configured?: boolean }) => {
        if (alive) setCanLink(Boolean(d.configured));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const filename = () => `hacker-house-goa-2026-${slug(name)}.png`;

  async function download() {
    setStatus({ kind: "idle" });
    setDownloading(true);
    try {
      saveBlob(await preview.current!.toBlob("card"), filename());
    } catch {
      setStatus({ kind: "error", message: "Could not build the image. Try again." });
    } finally {
      setDownloading(false);
    }
  }

  async function share() {
    setStatus({ kind: "idle" });

    // X's web intent takes text and a url, never a file, so the composer can
    // only ever carry the caption. The image reaches the post through the
    // native share sheet on mobile, or by the user attaching the download.
    const caption = tweetCaption(title);
    const intent = `https://x.com/intent/tweet?text=${encodeURIComponent(caption)}`;

    // The native sheet is only better on a real phone, where the X app is a
    // share target and the image rides along. Desktop Chrome also reports it
    // can share files, but there the sheet is the OS one, which does not offer
    // X at all: the user asked for X and would get a system dialog instead.
    // So the sheet is gated on touch, and every desktop opens the composer.
    const isTouch =
      window.matchMedia("(pointer: coarse)").matches &&
      navigator.maxTouchPoints > 0;

    // Whether the browser accepts a file must be decided synchronously, before
    // the real PNG exists. A one-byte stand-in answers the same question.
    const probe = new File([new Uint8Array(1)], "probe.png", {
      type: "image/png",
    });
    const canShareFiles =
      isTouch &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [probe] });

    // Opened synchronously, BEFORE any await. Once a promise resolves the user
    // activation has lapsed and popup blockers suppress the window, which is
    // what made this button feel dead.
    const composer = canShareFiles
      ? null
      : window.open(intent, "_blank", "noopener,noreferrer");

    setSharing(true);
    try {
      const card = await preview.current!.toBlob("card");
      const file = new File([card], filename(), { type: "image/png" });

      // On a phone this hands the real PNG to the X app with the caption
      // already written, which is the flow the brief actually wants.
      if (canShareFiles && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: caption });
          return;
        } catch (err) {
          // Dismissing the sheet is a choice, not a failure.
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
        // The sheet failed for a real reason. The composer was not opened up
        // front on this path, so open it now and fall through to the download.
        window.open(intent, "_blank", "noopener,noreferrer");
      }

      saveBlob(card, filename());
      setStatus({
        kind: "done",
        message: composer
          ? "Pass downloaded. Attach it in the X composer."
          : "Pass downloaded. Open X and attach it to your post.",
      });
    } catch {
      setStatus({
        kind: "error",
        message: "Could not build the image. Try again.",
      });
    } finally {
      setSharing(false);
    }
  }

  async function copyLink() {
    setStatus({ kind: "idle" });
    setCopying(true);
    try {
      const [card, og] = await Promise.all([
        preview.current!.toBlob("card"),
        preview.current!.toBlob("og"),
      ]);

      const body = new FormData();
      body.append("card", card);
      body.append("og", og);

      const res = await fetch("/api/card", { method: "POST", body });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const { id } = (await res.json()) as { id: string };

      await navigator.clipboard.writeText(`${window.location.origin}/c/${id}`);
      setStatus({ kind: "done", message: "Link copied. Paste it into your post." });
    } catch {
      setStatus({ kind: "error", message: "Could not publish the link. Try again." });
    } finally {
      setCopying(false);
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

      {canLink ? (
        <button
          type="button"
          onClick={copyLink}
          disabled={!ready || copying}
          className="mt-3 flex items-center gap-1.5 font-mono text-[12px] text-forest underline underline-offset-4 transition-opacity duration-150 hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <LinkSimple size={14} weight="bold" />
          {copying ? "Publishing link" : "Copy link with preview"}
        </button>
      ) : null}

      {status.kind === "error" ? (
        <p role="alert" className="mt-2 font-mono text-[12px] text-pink-deep">
          {status.message}
        </p>
      ) : status.kind === "done" ? (
        <p role="status" className="mt-2 font-mono text-[12px] text-forest">
          {status.message}
        </p>
      ) : !ready ? (
        <p className="mt-2 font-mono text-[11px] text-forest/80">
          Add a photo and your name to unlock these.
        </p>
      ) : null}
    </div>
  );
}
