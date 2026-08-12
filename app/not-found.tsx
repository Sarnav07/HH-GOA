import Link from "next/link";
import Wordmark from "@/components/Wordmark";

export default function NotFound() {
  return (
    <>
      <header className="mx-auto flex h-16 w-full max-w-[1180px] items-center px-5">
        <Link href="/">
          <Wordmark />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col items-start justify-center gap-6 px-5 py-24">
        <h1 className="font-display text-4xl leading-[1.02] font-black tracking-tight text-forest md:text-5xl">
          That pass has expired.
        </h1>
        <p className="max-w-[46ch] font-sans text-[17px] leading-relaxed text-forest">
          The link is wrong, or the card behind it is gone. Making a new one
          takes about ten seconds.
        </p>
        <Link
          href="/"
          className="flex h-12 items-center justify-center rounded-full bg-pink-deep px-6 font-sans text-[15px] font-bold whitespace-nowrap text-cream transition-transform duration-150 hover:bg-pink active:translate-y-px"
        >
          Make your own
        </Link>
      </main>
    </>
  );
}
