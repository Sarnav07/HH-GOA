/**
 * Event wordmark. A monogram in display type inside a tile-blue square, which
 * is the one geometric mark this page draws by hand.
 */
export default function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-[8px] bg-terracotta font-display text-[13px] font-extrabold tracking-tight text-cream">
        HH
      </span>
      <span className="font-display text-[15px] font-bold tracking-tight text-cream">
        Goa 2026
      </span>
    </span>
  );
}
