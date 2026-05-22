import raw from "./data/vocab.json";

export interface Word {
  id: string;
  word: string;
  ipa: string;
  meaning: string;
  example: string;
  synonyms: string;
  deck: string;
  section: string;
}

export const WORDS: Word[] = raw as Word[];

export const DECKS: string[] = Array.from(new Set(WORDS.map((w) => w.deck)));

export function wordsForDeck(deck: string | "all"): Word[] {
  return deck === "all" ? WORDS : WORDS.filter((w) => w.deck === deck);
}
