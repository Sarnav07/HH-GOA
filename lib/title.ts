/**
 * Builder title generator.
 *
 * Deterministic: the same name and stack always produce the same title, so a
 * builder who regenerates their card gets the card they already shared. The
 * reroll button advances a salt rather than reaching for Math.random, which
 * keeps the result reproducible from state alone.
 */

const TITLES = [
  "Tide Architect",
  "Susegad Shipper",
  "Low Tide Debugger",
  "Monsoon Refactorer",
  "Anjuna Night Deploy",
  "Ferry Route Optimizer",
  "Salt Air Systems",
  "Sandbar Cartographer",
  "Beachfront Compiler",
  "Kingfisher Latency",
  "Palolem Prototyper",
  "Backwater Backend",
  "Feni Powered Frontend",
  "Sunset Merge Captain",
  "Chapora Fort Architect",
  "Barefoot Benchmarker",
  "Cashew Grove Cryptographer",
  "Vagator Cliff Scaler",
  "Shack Table Shipper",
  "Trawler Fleet Operator",
  "Laterite Stack Mason",
  "Dolphin Watch Observer",
  "Coconut Mile Optimizer",
  "Estuary Edge Runner",
  "Siolim Bridge Builder",
  "Rice Field Rewriter",
  "Hammock Hours Hacker",
  "Arambol Sunrise Pusher",
];

/** FNV-1a. Small, fast, and stable across engines. */
function hash(input: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function builderTitle(name: string, stack: string, salt = 0) {
  const seed = `${name.trim().toLowerCase()}|${stack.trim().toLowerCase()}|${salt}`;
  return TITLES[hash(seed) % TITLES.length];
}
