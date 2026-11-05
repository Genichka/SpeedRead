#!/usr/bin/env python3
"""Генерує src/01_dict.js для SpeedRead з даних WordHunter (репозиторій Genichka/trainer).
Запуск: python3 tools/make_dict.py <шлях до trainer>
DICT: англійське слово → [переклад, рівень WordHunter або ""]; WH_TEXTS: англійські тексти рівнів і книги."""
import json, re, sys, os

def consts(path):
    out = {}
    for line in open(path, encoding="utf-8"):
        m = re.match(r"const (\w+) = (.*);\s*$", line)
        if m: out[m.group(1)] = json.loads(m.group(2))
    return out

root = sys.argv[1]
W = consts(os.path.join(root, "data", "words.js"))
T = consts(os.path.join(root, "data", "texts.js"))

dic = {}
for lv in W["LEVELS"]:
    for w in lv["words"]:
        en = w[0].strip().lower()
        if en and en not in dic: dic[en] = [w[1], lv["id"]]
for g in ("GLOSS", "BOOK_GLOSS"):
    for en, ua in T.get(g, {}).items():
        en = en.strip().lower()
        if en and en not in dic: dic[en] = [ua, ""]

# коротка назва рівня для SpeedRead: A1…B2 як є, тематичні рівні — словом (у WordHunter це емодзі)
codes = {lv["id"]: (lv["code"] if lv["code"].isalnum() else lv["name"]) for lv in W["LEVELS"]}
texts = []
for lid, arr in T["TEXTS"].items():
    for i, t in enumerate(arr):
        texts.append({"id": f"wh-{lid}-{i}", "lang": "en", "wh": True, "lvl": codes.get(lid, lid.upper()),
                      "title": f"{codes.get(lid, lid.upper())} · {t['title']}", "body": t["text"]})
for b in T.get("BOOKS", []):
    texts.append({"id": f"wh-book-{b['day']}", "lang": "en", "wh": True, "lvl": b["lvl"],
                  "title": f"{b['lvl']} · {b['en']}", "body": b["text"]})

js = ("/* ===== Словник і англійські тексти з WordHunter (згенеровано tools/make_dict.py — не редагувати вручну) ===== */\n"
      "const WH_LEVELS = " + json.dumps(codes, ensure_ascii=False, separators=(",", ":")) + ";\n"
      "const DICT = " + json.dumps(dic, ensure_ascii=False, separators=(",", ":")) + ";\n"
      "const WH_TEXTS = " + json.dumps(texts, ensure_ascii=False, separators=(",", ":")) + ";\n")
open(os.path.join(os.path.dirname(__file__), "..", "src", "01_dict.js"), "w", encoding="utf-8").write(js)
print(f"DICT {len(dic)} слів, WH_TEXTS {len(texts)} текстів, {len(js.encode())//1024} КБ")
