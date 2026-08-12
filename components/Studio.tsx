"use client";

import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { builderSerial, builderTitle } from "@/lib/title";
import CardPreview, { type PreviewHandle } from "./CardPreview";
import Dropzone from "./Dropzone";
import Actions from "./Actions";

const STACKS = [
  "frontend",
  "backend",
  "full-stack",
  "ML",
  "infra",
  "design",
  "solidity",
  "mobile",
];

export default function Studio() {
  const preview = useRef<PreviewHandle>(null);
  const [name, setName] = useState("");
  const [stack, setStack] = useState("");
  const [salt, setSalt] = useState(0);
  const [photo, setPhoto] = useState<ImageBitmap | null>(null);

  const title = useMemo(
    () => (name.trim() ? builderTitle(name, stack, salt) : ""),
    [name, stack, salt],
  );

  const serial = useMemo(
    () => builderSerial(name, stack, salt),
    [name, stack, salt],
  );

  // ImageBitmaps hold decoded memory until closed, and a user trying five
  // photos would otherwise leak all five. Closing happens on replacement
  // rather than in an effect cleanup, which under StrictMode would dispose the
  // bitmap that is still on screen.
  function replacePhoto(next: ImageBitmap) {
    setPhoto((current) => {
      current?.close();
      return next;
    });
  }

  const ready = Boolean(photo && name.trim());
  const reduce = useReducedMotion();

  // The only motion on the page: the card and the controls settle in on load,
  // which establishes that the card is the subject and the fields serve it.
  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  const field =
    "h-12 w-full rounded-[8px] border border-forest/60 bg-cream-lift px-3.5 font-sans text-[15px] text-forest-deep placeholder:text-forest/80 focus:border-pink-deep focus:outline-none";
  const label =
    "mb-2 block font-mono text-[11px] tracking-[0.18em] text-forest uppercase";

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)] lg:items-start lg:gap-14">
      {/* Preview leads on mobile so the card is visibly reacting as you type. */}
      <motion.div
        {...enter(0.05)}
        className="order-1 flex justify-center lg:order-2 lg:sticky lg:top-8"
      >
        <CardPreview
          ref={preview}
          name={name}
          stack={stack}
          title={title}
          serial={serial}
          photo={photo}
        />
      </motion.div>

      <motion.div
        {...enter(0.14)}
        className="order-2 flex flex-col gap-6 lg:order-1"
      >
        <Dropzone onPhoto={replacePhoto} hasPhoto={Boolean(photo)} />

        <div>
          <label className={label} htmlFor="name">
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rhea Fernandes"
            maxLength={40}
            autoComplete="name"
            className={field}
          />
        </div>

        <div>
          <label className={label} htmlFor="stack">
            Stack or role
          </label>
          <input
            id="stack"
            value={stack}
            onChange={(e) => setStack(e.target.value)}
            placeholder="full-stack, shipping too fast"
            maxLength={44}
            className={field}
          />
          <div className="mt-2.5 flex flex-wrap gap-2">
            {STACKS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStack(s)}
                className={`rounded-full border px-3 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
                  stack === s
                    ? "border-pink-deep bg-pink/15 text-forest-deep"
                    : "border-forest/60 text-forest hover:border-forest"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={label}>Builder title</span>
          <div className="flex items-center gap-3">
            <p className="font-sans text-[17px] font-bold text-pink-deep">
              {title || "Add your name to get one"}
            </p>
            {title ? (
              <button
                type="button"
                onClick={() => setSalt((s) => s + 1)}
                aria-label="Generate a different builder title"
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-forest/60 text-forest transition-transform duration-150 hover:border-forest hover:bg-forest hover:text-cream active:scale-95"
              >
                <ArrowsClockwise size={16} weight="bold" />
              </button>
            ) : null}
          </div>
        </div>

        <Actions preview={preview} name={name} title={title} ready={ready} />
      </motion.div>
    </div>
  );
}
