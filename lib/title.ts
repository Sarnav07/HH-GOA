/**
 * Builder title and serial.
 *
 * Deterministic: the same name and stack always produce the same title and the
 * same pass number, so a builder who regenerates their card gets the card they
 * already shared. The reroll button advances a salt rather than reaching for
 * Math.random, which keeps the result reproducible from state alone.
 *
 * Register follows the official pass artwork: two-word call signs that read
 * well in caps inside the gold pill.
 */
import { hash32 } from "./motifs";

const TITLES = [
  "Signal Chaser",
  "Hackathon Champion",
  "Tide Architect",
  "Night Shipper",
  "Monsoon Refactorer",
  "Sandbar Cartographer",
  "Cliff Scaler",
  "Shack Table Builder",
  "Salt Air Systems",
  "Ferry Route Optimizer",
  "Low Tide Debugger",
  "Backwater Backend",
  "Sunrise Merger",
  "Fort Wall Architect",
  "Barefoot Benchmarker",
  "Cashew Grove Cryptographer",
  "Trawler Fleet Operator",
  "Laterite Stack Mason",
  "Dolphin Watch Observer",
  "Estuary Edge Runner",
  "Bridge Builder",
  "Rice Field Rewriter",
  "Hammock Hours Hacker",
  "Coconut Mile Optimizer",
  "Deep Work Diver",
  "Terminal Beachcomber",
  "Sunset Deploy Captain",
  "Palm Shade Prototyper",
];

const seedOf = (name: string, stack: string, salt: number) =>
  `${name.trim().toLowerCase()}|${stack.trim().toLowerCase()}|${salt}`;

export function builderTitle(name: string, stack: string, salt = 0) {
  return TITLES[hash32(seedOf(name, stack, salt)) % TITLES.length];
}

/** Pass number printed under the barcode. Stable for a given builder. */
export function builderSerial(name: string, stack: string, salt = 0) {
  const n = hash32(`serial|${seedOf(name, stack, salt)}`) % 1_000_000;
  return `HH-GOA-${String(n).padStart(6, "0")}`;
}
