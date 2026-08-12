import Studio from "@/components/Studio";
import Wordmark from "@/components/Wordmark";

export default function Home() {
  return (
    <>
      <header className="mx-auto flex h-16 w-full max-w-[1180px] items-center px-5">
        <Wordmark />
      </header>

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 pt-6 pb-20 lg:pt-10">
        <h1 className="max-w-[14ch] font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-cream md:text-5xl lg:text-6xl">
          Get your builder pass.
        </h1>
        <p className="mt-4 max-w-[46ch] font-display text-[17px] leading-relaxed text-sand">
          Drop in a photo, add your name, and post it. No account, no waiting.
        </p>

        <div className="mt-10 lg:mt-14">
          <Studio />
        </div>
      </main>

      <footer className="mx-auto w-full max-w-[1180px] px-5 pb-10">
        <p className="border-t border-sand/15 pt-6 font-mono text-[11px] text-sand/60">
          HH Goa 2026. Made for everyone building on the coast.
        </p>
      </footer>
    </>
  );
}
