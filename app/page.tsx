import Studio from "@/components/Studio";
import Wordmark from "@/components/Wordmark";

export default function Home() {
  return (
    <>
      <header className="mx-auto flex h-16 w-full max-w-[1180px] items-center px-5">
        <Wordmark />
      </header>

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 pt-6 pb-20 lg:pt-10">
        <h1 className="max-w-[16ch] font-display text-4xl leading-[1.02] font-black tracking-tight text-forest md:text-5xl lg:text-6xl">
          Get your <span className="text-pink-deep">builder pass</span>.
        </h1>
        <p className="mt-4 max-w-[46ch] font-sans text-[17px] leading-relaxed text-forest">
          Drop in a photo, add your name, and post it. No account, no waiting.
        </p>

        <div className="mt-10 lg:mt-14">
          <Studio />
        </div>
      </main>

      <footer className="mx-auto w-full max-w-[1180px] px-5 pb-10">
        <p className="border-t border-forest/25 pt-6 font-mono text-[11px] text-forest/80">
          Hacker House Goa 2026. Goa, India. 28-31 Oct 2026.
        </p>
      </footer>
    </>
  );
}
