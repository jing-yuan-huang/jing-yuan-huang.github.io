# jingyuanhuang.com — 專案說明

## 這個站在做什麼

黃敬媛（Jing-Yuan Huang）的作品集網站。**它現在的用途是求職**，不是一般的作品陳列。

讀者是特定幾家公司的用人主管，他們看完履歷之後才會點進來。所以網站要承載的是**履歷裝不下的推理過程**，不是更多作品縮圖。

## 定位

> Product designer working on multimodal and AI-assisted interfaces — most of the work is about what happens when input is imprecise or the system isn't certain.

中文：**為「不會精確照指令執行的系統」設計介面。** 感測器誤差、模型信心、連線中斷、輸入取得失敗——介面的工作是讓不確定性可讀、讓失敗可回復。

## 工作分工

| 檔案 | 誰負責 |
|---|---|
| `content/*.md` | 在 Cowork 的對話裡填寫（有完整的事實查核脈絡） |
| `*.html`、`styles/`、`app.js`、git | Claude Code（這裡） |
| `CLAUDE.md` | Cowork 維護，這裡只讀 |

**流程**：`content/*.md` 填好 → Claude Code 讀 md → 更新對應的 `.html`。

---

## 事實的單一來源：`data/facts.json`

**所有數字只寫在 `data/facts.json`，其他地方都去查它，不要各自抄一份。**

```
data/facts.json   ← 唯一來源。數字要改只改這裡
tools/facts.py    ← 讀取用。python3 tools/facts.py 會印出全部事實與限制
tools/verify.py   ← 比對既有履歷 PDF 與 facts.json，確認沒有走鐘
```

每個事實除了值，還記著 `qualifier`（成立條件）和 `rule`（使用限制）。**有 rule 的項目，引用時必須遵守。**

檔案底部的 `pending` 區是尚未查證的項目，**未補齊前不要寫進網站或履歷**。

下面是同一份資料的人類可讀版，方便快速查閱——但以 JSON 為準。

---

## 已驗證的事實（不要改動數字）

這些數字都經過反覆查核，每一個都有分母和出處。**不要美化、不要換算、不要四捨五入。**

| 項目 | 數值 | 條件 |
|---|---|---|
| 官網搜尋 CTR | 6% → 11.5% | GSC，2025/02 → 2026/02 |
| Google 平均排名 | 16.8 → 4.1 | 同上 |
| 官網 Design System | 20 種核心元件類型（48 個版面變體） | |
| J9 跨端共用元件 | 30 個核心元件 | 眼鏡 + 手機共用 |
| HJ1 共用元件 | 10 個 | |
| AI 翻譯任務完成 | 2/5 → 5/5 | 三輪迭代，**每輪 5 位全新受試者** |
| 跨裝置拍照任務 | 3/5 → 3/5 → 3/5 → 4/5 | 四輪，每輪 5 位全新受試者 |
| J9 整體 SUS | 85 | 8 人、每人 10 分鐘，**是整機不是單一功能** |
| 人因資料應用 | 3 件客戶產品設計驗證 | ENOVIS、AWEAR、KONA |
| 論文引用 | 110+ | CHI、SIGGRAPH、SIGGRAPH Asia（Runner-Up）、IEEE VR |

### 數字的硬規則

- **小樣本不換算百分比。** `2/5` 不可以寫成 `40%`——百分比暗示樣本大到值得換算。
- **SUS 85 一定要標「J9 整體」**，它不是任何單一功能的改版成效。
- **「多件國科會產學合作」不要寫成具體數字。** 實際是四件，但只有台大醫院和故宮適合對外提。
- 學歷是**國立臺灣大學 資訊網路與多媒體研究所**（Graduate Institute of Networking and Multimedia），**不是**資工系。這個欄位會被驗證。
- 實驗室全名是**影像與視覺處理實驗室（IMLab）**。

---

## 內容優先序

依目前投遞中的職缺排序：

1. **`humanfactors.md`** — 最優先。Zebra Technologies 的 Human Factors Engineer 職缺以此為決定性材料。目前「我的角色」「Hero 圖片說明」等欄位還沒填。
2. **`jorjin.md`**（官網重構）— 服務 QNAP、Super Micro、Ubiquiti 這類高密度 B2B 主控台的缺。材料最完整，最快能寫完。
3. **`j9.md`／`smartglasses.md`**（跨裝置與裝置邊界決策）— 服務 Garmin、Logitech。

每篇 case study 的骨架：**問題 → 分析 → 設計決策 → 驗證 → 成效**。重視思考與決策過程，不是只放最終畫面。

---

## 寫作規則

這幾條是反覆試出來的，請遵守：

**從處境開頭，不從成就開頭。**
- ✅ 「業務端反覆被客戶詢問配戴舒適度，而公司缺乏可對外說明的系統性依據。」
- ❌ 「主導建立人因資料庫，提升客戶溝通效率。」

**寫出取捨，不只寫勝利。** 有代價的判斷才可信。例：「功能選擇放手機端對使用者較輕鬆，但產品走 B2B，客戶評估的是裝置能獨立完成什麼。」

**不要宣告態度，用事實證明。** 「以測試驗證設計，而非憑感覺」這種句子要刪掉——後面的數據已經證明了，宣告反而弱。

**容許句子長短不一。** 完全平行的 bullet 結構是 AI 生成的指紋。

**失敗的過程要留著。** 眼動那個案子前三輪完成率都停在 3/5 —— 那不是該隱藏的失敗，相同的結果正是排除流程變因的證據。這是整個作品集最有價值的一段推理。

**不要用這些詞**：賦能、打造、極致、無縫、顛覆、一站式、proactive、self-starter、passionate。

---

## 技術現況

- 純靜態 GitHub Pages，無建置工具
- 自訂網域 `jingyuanhuang.com`（見 `CNAME`）
- 已有 Open Graph / Twitter 分享標籤
- Jorjin 案例頁有 side-nav scroll-spy

## 待辦

- [ ] 首頁要讓人三秒內看到三篇主要 case study，不要埋在選單裡
- [ ] 加一行接案狀態：`Available for product design and front-end build`
- [ ] `humanfactors.md` 的方法細節待補（樣本數、量測工具、實驗設計、具體結論）
