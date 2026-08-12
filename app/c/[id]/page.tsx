import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Wordmark from "@/components/Wordmark";
import { SIZES } from "@/lib/render";
import { findCard } from "@/lib/store";

/**
 * Share landing page.
 *
 * Its whole job is the link preview: X reads these tags and must show the card
 * the user actually generated, not a default thumbnail. The 1200x630 variant
 * exists precisely so nothing gets centre-cropped away.
 */
export async function generateMetadata({
  params,
}: PageProps<"/c/[id]">): Promise<Metadata> {
  const { id } = await params;
  const card = await findCard(id);
  if (!card) return { title: "Pass not found | Hacker House Goa 2026" };

  const title = "Builder Pass | Hacker House Goa 2026";
  const description = "Building at Hacker House Goa 2026. #FrameInGoa";
  const images = [
    {
      url: card.ogUrl,
      width: SIZES.og.w,
      height: SIZES.og.h,
      alt: "Hacker House Goa 2026 builder pass",
    },
  ];

  return {
    title,
    description,
    openGraph: { title, description, images, type: "website" },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function SharedCard({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const card = await findCard(id);
  if (!card) notFound();

  return (
    <>
      <header className="mx-auto flex h-16 w-full max-w-[1180px] items-center px-5">
        <Link href="/">
          <Wordmark />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col items-center gap-8 px-5 pt-6 pb-20">
        <Image
          src={card.cardUrl}
          alt="Hacker House Goa 2026 builder pass"
          width={SIZES.card.w}
          height={SIZES.card.h}
          priority
          unoptimized
          className="w-full max-w-[420px] rounded-[16px] shadow-[0_18px_50px_rgba(0,26,18,0.22)]"
        />

        <div className="flex w-full max-w-[420px] flex-col gap-3">
          <a
            href={card.cardUrl}
            download="hh-goa-2026-builder-pass.png"
            className="flex h-12 items-center justify-center rounded-full bg-pink-deep px-5 font-sans text-[15px] font-bold whitespace-nowrap text-cream transition-transform duration-150 hover:bg-pink active:translate-y-px"
          >
            Download
          </a>
          <Link
            href="/"
            className="flex h-12 items-center justify-center rounded-full border border-forest/60 px-5 font-sans text-[15px] font-bold whitespace-nowrap text-forest transition-transform duration-150 hover:border-forest hover:bg-forest/5 active:translate-y-px"
          >
            Make your own
          </Link>
        </div>
      </main>
    </>
  );
}
