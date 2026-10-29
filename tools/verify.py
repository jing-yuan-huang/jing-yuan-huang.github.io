# -*- coding: utf-8 -*-
"""比對既有履歷 PDF 與 facts.json。
只檢查數字本身，不檢查句型——同一個事實在不同版本可以有不同措辭
（「6% → 11.5%」與「6% 提升至 11.5%」都對），但數字不能跑掉。"""
import subprocess, glob, os, re, sys
sys.path.insert(0,'/tmp/rb')
from facts import _FACTS

# 每個事實該出現的數字片段（全部都要出現才算通過）
NUMS = {
  "search_ctr":        ["6%", "11.5%"],
  "search_position":   ["16.8", "4.1"],
  "components_web":    ["20", "48"],
  "sus":               ["85"],
  # 分數同時接受 2/5 與 "2 of 5" 兩種寫法
  "ai_translation":    [("2/5","2of5"), ("5/5","5of5")],
  "capture":           [("3/5","3of5"), ("4/5","4of5")],
  "validations":       ["3"],
  "citations":         ["110"],
}
# 只在有提到該主題時才檢查，避免對沒收錄該段的版本誤報
TOPIC = {
  "search_ctr":      ["CTR"],
  "search_position": ["16.8", "position", "排名"],
  "components_web":  ["48"],
  "sus":             ["SUS 85", "SUS85"],
  "ai_translation":  ["2/5", "2of5"],
  "capture":         ["3/5", "3of5"],
  "citations":       ["110"],
}

OUT = "/sessions/adoring-festive-allen/mnt/outputs"
bad = 0
for pdf in sorted(glob.glob(OUT + "/*.pdf")):
    name = os.path.basename(pdf)
    if "_claude" in name: continue
    raw = subprocess.run(["pdftotext", pdf, "-"], capture_output=True).stdout.decode("utf-8","replace")
    t = re.sub(r"\s+", "", raw)
    present, broken = [], []
    for key, nums in NUMS.items():
        topics = TOPIC.get(key)
        if topics and not any(re.sub(r"\s+","",x) in t for x in topics):
            continue                      # 這版沒收錄這段，跳過
        present.append(key)
        def hit(n):
            alts = n if isinstance(n, tuple) else (n,)
            return any(a.replace(" ","") in t for a in alts)
        if not all(hit(n) for n in nums):
            broken.append(key)
    flag = "✗ 不一致" if broken else "✓"
    if broken: bad += 1
    print(f"{flag} {name[:50]:52} 收錄 {len(present)} 項" + (f" → 問題：{broken}" if broken else ""))
print(f"\n{'全部一致' if not bad else str(bad)+' 份有問題'}")
