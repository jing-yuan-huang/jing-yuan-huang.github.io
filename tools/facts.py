# -*- coding: utf-8 -*-
"""讀取 data/facts.json —— 履歷產生器的唯一事實來源。
數字要改，改那個檔案，不要改這裡，也不要寫死在履歷腳本裡。"""
import json, os

FACTS_PATH = os.environ.get(
    "FACTS_PATH",
    "/sessions/adoring-festive-allen/mnt/jing-yuan-huang.github.io/data/facts.json")

with open(FACTS_PATH, encoding="utf-8") as fh:
    _D = json.load(fh)

PROFILE    = _D["profile"]
EDUCATION  = _D["education"]
EMPLOYMENT = _D["employment"]
_FACTS     = _D["facts"]
PENDING    = {k: v for k, v in _D["pending"].items() if not k.startswith("_")}

def F(key, lang="zh", with_qualifier=False):
    """取事實值。lang='zh'|'en'。with_qualifier=True 時附上成立條件。"""
    if key not in _FACTS:
        raise KeyError(f"facts.json 沒有 '{key}'；現有：{sorted(_FACTS)}")
    f = _FACTS[key]
    v = f[f"value_{lang}"]
    if with_qualifier:
        v += f"（{f[f'qualifier_{lang}']}）" if lang == "zh" else f" ({f[f'qualifier_{lang}']})"
    return v

def rule(key):
    """取該事實的使用限制，沒有則回 None。"""
    return _FACTS.get(key, {}).get("rule")

def audit():
    """印出所有事實與其限制，產履歷前可先跑一次確認。"""
    print(f"來源：{FACTS_PATH}\n更新：{_D['_updated']}\n")
    for k, f in _FACTS.items():
        print(f"  {k}")
        print(f"    zh: {f['value_zh']}  ｜ {f['qualifier_zh']}")
        print(f"    en: {f['value_en']}  | {f['qualifier_en']}")
        if "rule" in f:
            print(f"    ⚠ {f['rule']}")
    if PENDING:
        print(f"\n待補 {len(PENDING)} 項（未查證前不要寫進履歷）：")
        for k, v in PENDING.items():
            print(f"  · {v}")

if __name__ == "__main__":
    audit()
