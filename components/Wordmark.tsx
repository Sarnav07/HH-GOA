/**
 * Event wordmark. Forest monogram tile plus the lockup in the display serif,
 * matching the header of the pass itself.
 */
export default function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-[8px] bg-forest font-sans text-[13px] font-extrabold tracking-tight text-gold">
        HH
      </span>
      <span className="font-display text-[19px] leading-none font-black tracking-tight text-forest">
        Hacker House <span className="text-pink-deep">Goa</span>
      </span>
    </span>
  );
}
