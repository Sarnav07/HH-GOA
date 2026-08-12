"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageSquare, Spinner, UploadSimple } from "@phosphor-icons/react";
import { decodePhoto, DecodeError } from "@/lib/decode";

type Props = {
  onPhoto: (photo: ImageBitmap) => void;
  hasPhoto: boolean;
};

export default function Dropzone({ onPhoto, hasPhoto }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      setError(null);
      setBusy(true);
      try {
        onPhoto(await decodePhoto(file));
      } catch (err) {
        setError(
          err instanceof DecodeError
            ? err.message
            : "Something went wrong reading that photo.",
        );
      } finally {
        setBusy(false);
      }
    },
    [onPhoto],
  );

  // Paste straight from the clipboard, which is how most desktop users have a
  // photo to hand.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])][0];
      if (file) void accept(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [accept]);

  return (
    <div>
      <label
        htmlFor="photo"
        className="mb-2 block font-mono text-[11px] tracking-[0.18em] text-forest uppercase"
      >
        Your photo
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void accept(e.dataTransfer.files[0]);
        }}
        className={`rounded-[16px] border border-dashed p-4 transition-colors duration-200 ${
          over
            ? "border-pink-deep bg-pink/10"
            : "border-forest/60 bg-cream-lift"
        }`}
      >
        <input
          ref={inputRef}
          id="photo"
          type="file"
          accept="image/*,.heic,.heif"
          className="sr-only"
          onChange={(e) => {
            void accept(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex w-full items-center gap-3 rounded-[8px] px-1 py-2 text-left transition-transform duration-150 active:scale-[0.99] disabled:opacity-70"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-forest text-gold">
            {busy ? (
              <Spinner size={22} weight="bold" className="animate-spin" />
            ) : hasPhoto ? (
              <ImageSquare size={22} weight="bold" />
            ) : (
              <UploadSimple size={22} weight="bold" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block font-sans text-[15px] font-bold text-forest-deep">
              {busy
                ? "Reading your photo"
                : hasPhoto
                  ? "Choose a different photo"
                  : "Upload a photo"}
            </span>
            <span className="block font-mono text-[11px] text-forest/80">
              JPG, PNG, or HEIC. Drop or paste one too.
            </span>
          </span>
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-2 font-mono text-[12px] text-pink-deep">
          {error}
        </p>
      ) : hasPhoto ? (
        <p className="mt-2 font-mono text-[11px] text-forest/80">
          Drag the card to reposition. Pinch or use the zoom slider.
        </p>
      ) : null}
    </div>
  );
}
