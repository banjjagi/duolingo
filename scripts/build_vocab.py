#!/usr/bin/env python3
"""Parse the DET markdown vocab tables into a unified vocab.json for the web app.

Schemas handled:
  det_vocab.md           : | word | ipa | meaning | example | synonyms |
  det_80_to_130.md
    §1 upgrades          : | basic | upgrade | ipa | meaning | example |
    §2 connectors        : | connector | ipa | function | example |
    §3-5 verbs/adj/nouns : | word | ipa | meaning | example | synonyms |
    §6 collocations      : | collocation | meaning | example |
Output fields: id, word, ipa, meaning, example, synonyms, deck, section
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "vocab.json"
sys.path.insert(0, str(Path(__file__).resolve().parent))

# --- IPA generation from the CMU Pronouncing Dictionary (ARPAbet -> IPA) ---
try:
    import cmudict
    _CMU = cmudict.dict()
except Exception:
    _CMU = {}

_ARPA_CONS = {
    "B": "b", "CH": "tʃ", "D": "d", "DH": "ð", "F": "f", "G": "ɡ", "HH": "h",
    "JH": "dʒ", "K": "k", "L": "l", "M": "m", "N": "n", "NG": "ŋ", "P": "p",
    "R": "r", "S": "s", "SH": "ʃ", "T": "t", "TH": "θ", "V": "v", "W": "w",
    "Y": "j", "Z": "z", "ZH": "ʒ",
}
_ARPA_VOWEL = {
    "AA": "ɑ", "AE": "æ", "AO": "ɔ", "AW": "aʊ", "AY": "aɪ", "EH": "ɛ",
    "EY": "eɪ", "IH": "ɪ", "IY": "iː", "OW": "oʊ", "OY": "ɔɪ", "UH": "ʊ",
    "UW": "uː",
}


# Legal English onset clusters (in IPA), used to place stress at the syllable
# boundary rather than mid-cluster.
_ONSETS = {
    "pl", "pr", "bl", "br", "kl", "kr", "ɡl", "ɡr", "tr", "dr", "tw", "kw",
    "dw", "θr", "θw", "fl", "fr", "ʃr", "sl", "sw", "sp", "st", "sk", "sm",
    "sn", "sf", "pj", "bj", "kj", "ɡj", "mj", "vj", "hj", "fj",
    "spl", "spr", "str", "skr", "skw",
}


def _arpabet_to_ipa(phones):
    # Build segments: (ipa, is_vowel, stress)
    segs = []
    for p in phones:
        m = re.match(r"^([A-Z]+)([0-2]?)$", p)
        if not m:
            continue
        sym, stress = m.group(1), m.group(2)
        if sym in _ARPA_CONS:
            segs.append((_ARPA_CONS[sym], False, ""))
            continue
        if sym == "AH":
            ipa = "ʌ" if stress in ("1", "2") else "ə"
        elif sym == "ER":
            ipa = "ɜːr" if stress in ("1", "2") else "ər"
        else:
            ipa = _ARPA_VOWEL.get(sym, "")
        segs.append((ipa, True, stress))

    parts = [s[0] for s in segs]
    # place stress marks at the onset of each stressed syllable, right-to-left
    for i in range(len(segs) - 1, -1, -1):
        ipa, is_vowel, stress = segs[i]
        if not is_vowel or stress not in ("1", "2"):
            continue
        # count preceding consonant run
        r = 0
        while i - r - 1 >= 0 and not segs[i - r - 1][1]:
            r += 1
        onset = 1 if r >= 1 else 0
        for k in (3, 2):
            if r >= k and "".join(parts[i - k:i]) in _ONSETS:
                onset = k
                break
        mark = "ˈ" if stress == "1" else "ˌ"
        parts.insert(i - onset, mark)
    return "".join(parts)


def ipa_for(word: str) -> str:
    key = word.strip().lower()
    phones = _CMU.get(key)
    if not phones and " " in key:  # multiword: use first token
        phones = _CMU.get(key.split()[0])
    if not phones:
        return ""
    return "/" + _arpabet_to_ipa(phones[0]) + "/"


def cells(line: str):
    parts = [c.strip() for c in line.strip().strip("|").split("|")]
    return parts


def is_sep(line: str) -> bool:
    return bool(re.match(r"^\s*\|[\s:|-]+\|\s*$", line))


def slugify(word: str, i: int) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", word.lower()).strip("-")
    return f"{base or 'w'}-{i}"


def parse_core(path: Path):
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|") or is_sep(line):
            continue
        c = cells(line)
        if len(c) != 5 or c[0] in ("단어", "Word"):
            continue
        if "/" not in c[1]:  # ipa column must contain a slash
            continue
        rows.append({
            "word": c[0], "ipa": c[1], "meaning": c[2],
            "example": c[3], "synonyms": c[4],
            "deck": "Core 125", "section": "core",
        })
    return rows


def parse_booster(path: Path):
    rows = []
    section = None
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            h = re.match(r"^##\s+(\d+)\.", line)
            section = int(h.group(1)) if h else None
            continue
        if not line.startswith("|") or is_sep(line):
            continue
        c = cells(line)
        # skip header rows
        first = c[0].lower()
        if first in ("basic word", "connector", "word", "collocation"):
            continue
        item = None
        if section == 1 and len(c) == 5:
            item = {"word": c[1], "ipa": c[2], "meaning": c[3],
                    "example": c[4], "synonyms": f"basic: {c[0]}"}
        elif section == 2 and len(c) == 4:
            item = {"word": c[0], "ipa": c[1], "meaning": c[2],
                    "example": c[3], "synonyms": ""}
        elif section in (3, 4, 5) and len(c) == 5:
            item = {"word": c[0], "ipa": c[1], "meaning": c[2],
                    "example": c[3], "synonyms": c[4]}
        elif section == 6 and len(c) == 3:
            item = {"word": c[0], "ipa": "", "meaning": c[1],
                    "example": c[2], "synonyms": ""}
        if item:
            item["deck"] = "80 to 130 Booster"
            item["section"] = f"booster-{section}"
            rows.append(item)
    return rows


def parse_awl():
    try:
        from awl_data import AWL
    except Exception as e:  # noqa: BLE001
        print(f"  (awl_data not loaded: {e})")
        return []
    rows = []
    seen = set()
    for entry in AWL:
        word, meaning, example, syn = entry
        w = word.strip()
        if w.lower() in seen:
            continue
        seen.add(w.lower())
        rows.append({
            "word": w, "ipa": ipa_for(w), "meaning": meaning.strip(),
            "example": example.strip(), "synonyms": syn.strip(),
            "deck": "AWL 570", "section": "awl",
        })
    return rows


def main():
    rows = []
    core = ROOT / "det_vocab.md"
    booster = ROOT / "det_80_to_130.md"
    if core.exists():
        rows += parse_core(core)
    if booster.exists():
        rows += parse_booster(booster)
    rows += parse_awl()

    # strip markdown emphasis from examples, assign ids
    for i, r in enumerate(rows):
        r["example"] = r["example"].replace("*", "")
        r["id"] = slugify(r["word"], i)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    by_deck = {}
    for r in rows:
        by_deck[r["deck"]] = by_deck.get(r["deck"], 0) + 1
    print(f"wrote {len(rows)} words -> {OUT}")
    for k, v in by_deck.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
