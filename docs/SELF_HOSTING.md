# 通勤看板 前端：自行架設說明與後端 API 規格

[日本語](SELF_HOSTING.ja.md) | 繁體中文

這份文件寫給想用這個前端自己架站的人。

這個 repo 只有前端（靜態網頁），**不含後端**。所有即時資料都來自一台 API 伺服器，前端裡沒有任何金鑰。要讓網站動起來，你需要：

1. 把這個 repo 當靜態網站放上任何主機（不需要建置步驟）。
2. 自己準備一台後端，實作本文件第 4～9 節的 10 個端點。
3. 把前端裡寫死的 API 網址換成你的後端（第 2 節）。
4. 換掉站名、聯絡方式等品牌資訊（第 2 節）。

本文件的內容以前端程式碼為準（對照版本：`main` 的 `69d4ccc`）。前端讀不到的後端內部做法，集中列在第 13 節，標為「待後端補充」。

---

## 目錄

1. [整體架構](#1-整體架構)
2. [換成自己的後端：前端要改的地方](#2-換成自己的後端前端要改的地方)
3. [路線 ID 與卡片規則](#3-路線-id-與卡片規則)
4. [鐵道（兩種模式）](#4-鐵道兩種模式)
5. [航班](#5-航班)
6. [公車](#6-公車)
7. [船（東海汽船）與島嶼巴士連動](#7-船東海汽船與島嶼巴士連動)
8. [歷史紀錄](#8-歷史紀錄)
9. [資料來源狀態](#9-資料來源狀態)
10. [瀏覽器端儲存](#10-瀏覽器端儲存)
11. [上游資料與授權](#11-上游資料與授權)
12. [開源前檢查清單](#12-開源前檢查清單)
13. [待後端補充的內容](#13-待後端補充的內容)

---

## 1. 整體架構

### 1.1 前端

- 純 HTML / CSS / JavaScript（ES Modules），沒有框架、沒有外部模組、沒有建置步驟。
- 本機執行：在 repo 根目錄跑 `python3 -m http.server 8000`，開 `http://localhost:8000`。
- 正式站目前放在 GitHub Pages，任何靜態主機都可以。
- 使用者的卡片與設定只存在瀏覽器（IndexedDB，失敗時退回 localStorage），不會送到伺服器。

| 路徑 | 內容 |
|---|---|
| `index.html` | 唯一的頁面（App Shell） |
| `manifest.json` | PWA 設定 |
| `js/script.js` | 主程式：卡片、燈號、搜尋、鐵道狀態 |
| `js/flights.js` | 航班 |
| `js/buses.js`、`js/bus-timetable.js` | 公車、站牌時刻表 |
| `js/ship.js` | 船 |
| `js/history-daemon.js`、`js/menu.js` | 歷史紀錄的取得與顯示 |
| `js/data-sources.js` | 資料來源狀態（提供終了的說明） |
| `js/clock.js` | 左上角同步時鐘，也是每分鐘更新的觸發點 |
| `data/db.js`、`data/dictionary-db.js` | 瀏覽器端資料庫 |
| `data/data.js` | 預設的 5 張卡片 |
| `data/route-id-migration.js` | 路線 ID 更名對照表 |
| `data/about.js`、`terms.js`、`data-source.js`、`supporter.js` | 選單裡的說明頁內容 |

### 1.2 前端會呼叫的端點

全部是 `GET`，不帶任何認證資訊。目前的主機是 `https://api.tsukinkanban.com`。

| 端點 | 用途 | 什麼時候呼叫 |
|---|---|---|
| `/api/dictionary` | 鐵道路線字典 | 開啟網站時 1 次 |
| `/api/status` | 鐵道運行狀態 | 開啟時、之後每分鐘 1 次、從背景回到前景時 |
| `/api/flights` | 航班清單 | 開啟後 1.5 秒，之後與 `/api/status` 一起每分鐘 1 次 |
| `/api/bus/routes?q={關鍵字}` | 公車路線名搜尋 | 使用者搜尋 2 個字以上、停止輸入 250 毫秒後 |
| `/api/bus/stop/{站牌名}` | 站牌的到站資訊 | 搜尋時；站牌面板開著時每 55 秒 |
| `/api/bus/route/{路線名}` | 公車路線詳細 | 開啟路線時；卡片裡存有公車路線時每 55 秒 |
| `/api/bus/timetable/{站牌名}` | 站牌全日時刻表 | 打開時刻表頁時 1 次（同站牌 30 分鐘內不重抓） |
| `/api/ship/schedule?date=YYYY-MM-DD` | 船班與運航狀況 | 卡片裡有航路、打開船頁面、或搜尋到船的關鍵字時；今天的資料每 5 分鐘 |
| `/api/history/all` | 鐵道・航班・船的歷史 | 每 60 秒 |
| `/api/sources` | 資料來源狀態 | 開啟網站時 1 次 |

公車和船只在「使用者搜尋」或「卡片裡有存」時才會發請求，平常不會呼叫。

### 1.3 共同約定

- **格式**：回應一律是 UTF-8 的 JSON。
- **CORS**：前端從自己的網域直接呼叫 API，後端必須回 `Access-Control-Allow-Origin`（允許你的網站網域）。請求沒有自訂標頭，不會有 preflight。
- **錯誤**：後端還在初始化時，公車・船・時刻表端點回 HTTP 200 加 `{ "error": "訊息" }`，前端會顯示訊息或稍後重試。`/api/status` 的處理見第 4.5 節。
- **時間**：ISO 8601 帶 `+09:00`；`*_text` 結尾的欄位是可以直接顯示的 `HH:MM`。站牌時刻表與船頁面的日期、「下一班」計算一律用日本時間，不看裝置時區。
- **快取**：`/api/status`、`/api/flights`、`/api/bus/*`（時刻表除外）前端用 `cache: 'no-store'`。其餘端點用瀏覽器預設，可以放 CDN 快取；`/api/history/all` 刻意不帶參數，目前靠 CDN 快取 1 分鐘。
- **名稱就是 ID**：公車路線名、業者 ID、航路名、鐵道路線 ID 都會存進使用者的卡片。後端改名，使用者已存的卡片就會失效（鐵道有補救機制，見第 3.3 節）。

---

## 2. 換成自己的後端：前端要改的地方

### 2.1 API 網址

API 主機寫死在 6 個檔案、10 個地方。用這個指令可以全部列出來：

```bash
grep -rn "api.tsukinkanban.com" js data
```

| 檔案 | 常數或位置 | 端點 |
|---|---|---|
| `js/script.js` | `DICTIONARY_API_URL` | `/api/dictionary` |
| `js/script.js` | `STATUS_API_URL`（2 處） | `/api/status` |
| `js/script.js`、`js/flights.js` | `FLIGHTS_API_URL`（各 1 處） | `/api/flights` |
| `js/buses.js` | `BUS_API_BASE` | `/api/bus`（`bus-timetable.js` 也用這個） |
| `js/ship.js` | `SHIP_API_BASE` | `/api/ship` |
| `js/ship.js`、`js/history-daemon.js` | `HISTORY_ALL_URL`、直接寫在 `fetch` 裡 | `/api/history/all` |
| `js/data-sources.js` | `SOURCES_URL` | `/api/sources` |

`data/history-engine.js` 裡也有一處，但這個檔案目前沒有被任何地方載入。

### 2.2 品牌與聯絡資訊

| 內容 | 位置 |
|---|---|
| 站名「通勤看板」 | `index.html`（`<title>`、`apple-mobile-web-app-title`）、`manifest.json` |
| Logo | `img/logo.png` |
| 說明頁（關於、利用規約、資料來源、贊助） | `data/about.js`、`data/terms.js`、`data/data-source.js`、`data/supporter.js` |
| 聯絡信箱 | `data/about.js`、`data/data-source.js` 的 `data-eu`（帳號）與 `data-ed`（網域），由 `js/main-menu.js` 組合成信箱 |
| 作者的 GitHub、X、商店、表單連結 | `data/about.js`、`data/supporter.js` |
| 預設的 5 張卡片 | `data/data.js` 的 `railwayData` |
| 「資料來源」頁的對應路線清單 | `data/data-source.js`（手動維護，要配合你的後端實際提供的路線） |

`data/data.js` 的 5 張預設卡片 ID（`tokyo`、`kanagawa`、`saitama`、`chiba`、`personal`）被匯入功能當作固定位置使用（`data/db.js` 的 `FIXED_IDS`），改 ID 時兩邊要一起改。

### 2.3 前端寫死、與後端無關的對照表

這些不需要後端提供，但換資料範圍時要自己調整：

| 內容 | 位置 |
|---|---|
| 航空公司的代表色與官網（ANA、JAL、Skymark、Peach、Jetstar、AIRDO、Solaseed、StarFlyer） | `js/flights.js`、`js/header.js` |
| 羽田・成田機場官網 | `js/script.js`、`js/header.js` |
| 日本國內線機場代碼清單（判斷「NRT国内線」「HND国際線」） | `js/flights.js` 的 `domesticCodes` |
| 航班英文備註的日文對照 | `js/flights.js` 的 `translateFlightNote` |
| 公車業者代表色（`Toei`、`YokohamaMunicipal`、`SeibuBus`） | `js/buses.js` 的 `OPERATOR_COLORS` |
| 有巴士資料的島（大島 → `OshimaBus`、三宅島 → `MiyakeVill`） | `js/ship.js` 的 `ISLAND_BUS_OPERATORS` |
| 船的搜尋關鍵字（公司名、島名） | `js/ship.js` 的 `SHIP_COMPANY_WORDS`、`SHIP_PLACE_WORDS` |
| 東海汽船官網 | `js/ship.js` |

---

## 3. 路線 ID 與卡片規則

### 3.1 ID 格式決定卡片種類

前端只靠 ID 的字串樣式分辨種類，所以後端的 ID 必須符合下表。

| 種類 | ID 格式 | 例 |
|---|---|---|
| 鐵道 | 任意字串，**必須含 `.` 或 `:`**，且不以 `bus:`、`ship:` 開頭 | `odpt.Railway:JR-East.Yamanote` |
| 公車 | `bus:{業者 ID}:{路線名}`（路線名用半形） | `bus:Toei:都01` |
| 航路 | `ship:{航路名}` | `ship:東京～三宅島・御蔵島・八丈島航路` |
| 航班 | 便名，**不可含 `.` 或 `:`** | `JL123` |

卡片第一個 ID 不含 `.` 也不含 `:` 時，整張卡片會被當成航班卡片。

### 3.2 卡片的限制

- 畫面上最多 5 張卡片，另外最多隱藏 5 張。
- 一張卡片最多 6 條路線。鐵道、公車、航路可以混在同一張。
- 航班一張卡片只放一班，不能和其他種類混放。
- 匯出格式是陣列：`[{ "name": "卡片名", "hex": "#009100", "routes": ["ID", …] }]`。只匯出顏色時是 `["#009100", …]`。匯入時卡片名上限 40 字。

### 3.3 鐵道路線 ID 更名

`data/route-id-migration.js` 有一張「舊 ID → 新 ID」對照表。前端每次讀取設定時，只有在新 ID 已經出現在 `/api/dictionary` 或 `/api/status` 時，才把使用者卡片裡的舊 ID 換掉。所以前端可以先上線，後端之後再換 ID。自己架站時這張表可以清空。

### 3.4 七顆燈號

卡片右上角有 7 顆燈，程式裡是一個布林陣列：

| 索引 | 圖示 | 意思 |
|---|---|---|
| 0 | 地震 | 訊息裡有「地震」 |
| 1 | 雨風 | 訊息裡有「雨」或「台風」 |
| 2 | 雪 | 訊息裡有「雪」 |
| 3 | × | 嚴重延誤、停駛、欠航、錯誤、今天沒有班次 |
| 4 | △ | 延誤、條件付き運航等 |
| 5 | 〇 | 正常 |
| 6 | 吹き出し | 有公告、資料確認中、無法確認實際狀況 |

---

## 4. 鐵道（兩種模式）

鐵道用兩個端點：字典（有哪些路線）和狀態（現在怎麼樣）。

### 4.1 `GET /api/dictionary`

```jsonc
{
  "version": "c8080d4ba3bc",
  "routes": {
    "odpt.Railway:JR-East.Yamanote": {
      "name": "山手線",
      "company": "JR東日本",
      "kana": "やまのてせん",
      "en": "Yamanote",
      "hex": "#9acd32",
      "url": "https://www.jreast.co.jp/"
    }
  }
}
```

| 欄位 | 必要 | 說明 |
|---|---|---|
| `version` | 是 | 任意字串。前端把字典存在瀏覽器，**只有 `version` 和上次不同時才重新下載**。內容有變就一定要換版本號 |
| `routes` | 是 | 以路線 ID 為 key 的物件 |
| `name` | 是 | 路線名。搜尋結果用路線名去重，**不同路線請不要同名** |
| `company` | 是 | 業者名 |
| `kana`、`en` | 否 | 只用於搜尋比對 |
| `hex` | 否 | 路線色，用在搜尋預覽卡片；沒有時用深灰 |
| `url` | 否 | 業者官網，顯示在卡片右上角的外部連結選單 |

搜尋完全在前端做：比對 `name`、`company`、`kana`、`en`（轉小寫、去掉空白和 `-`）。

### 4.2 `GET /api/status`

以路線 ID 為 key，另外有一個 `_meta`。

```jsonc
{
  "_meta": { "server_time": "2026-10-21T10:00:00+09:00" },

  // 模式 A：只有運行情報（文字）
  "odpt.Railway:TokyoMetro.Ginza": {
    "status_type": "取得済",
    "status_text": "平常運転",
    "message": "平常どおり運転しています",
    "delay_minutes": 0,
    "update_time": "10:00"
  },

  // 模式 B：有遅延分数（由列車位置算出）
  "odpt.Railway:JR-East.Yamanote": {
    "status_type": "取得済",
    "status_text": "平常運転",
    "message": "平常どおり運転しています",
    "delay_minutes": 8,
    "update_time": "10:00",
    "advanced_details": [
      { "direction_name": "内回り", "max_delay": 8, "train_count": 3 },
      { "direction_name": "外回り", "max_delay": 2, "train_count": 0 }
    ]
  }
}
```

| 欄位 | 必要 | 說明 |
|---|---|---|
| `_meta.server_time` | 否 | 顯示在左上角同步時鐘。沒有時用裝置時間 |
| `status_type` | 是 | 狀態種類，見 4.4 |
| `status_text` | 是 | **必須是字串**（可以是空字串）。省略的話前端在訊息非正常時會出錯 |
| `message` | 是 | 顯示在路線卡片上的說明文，也用來判斷燈號（見 4.4） |
| `delay_minutes` | 否 | 這條路線目前的延誤分鐘數。沒有或 0 表示沒有分鐘資料 |
| `update_time` | 是 | `HH:MM`。`--:--` 或空字串顯示 `--:--`；`----` 或 `本日公式発表なし` 顯示「公式発表なし」 |
| `advanced_details` | 否 | 方向別的延誤，見 4.3 |
| `url` | 否 | 官網。狀態是「提供終了」時顯示成連結；沒有時用字典的 `url` |

### 4.3 兩種模式

前端不分業者，只看欄位有沒有值：

| | 模式 A：運行情報 | 模式 B：遅延分数 |
|---|---|---|
| 資料來源 | 業者發布的運行情報（文字） | 後端用列車位置資料算出的延誤 |
| 欄位 | `status_type`、`status_text`、`message` | 另外加 `delay_minutes`、`advanced_details` |
| 燈號依據 | 文字裡的關鍵字 | 分鐘數（優先於文字） |
| 目前對應 | 所有路線 | JR 東日本、東武鐵道、都營地下鐵、橫濱市營地下鐵 |

`advanced_details` 每筆是一個方向：

| 欄位 | 說明 |
|---|---|
| `direction_name` | 方向名，原樣顯示。建議用看得懂目的地的寫法（例：「大宮・上野・東京方面」） |
| `max_delay` | 這個方向最大的延誤分鐘數。5 以下顯示「平常」，6～15 黃色，16 以上紅色 |
| `train_count` | 列車數，大於 0 時顯示「(N列車)」 |

方向怎麼命名、直通列車怎麼歸類（湘南新宿線、上野東京線）都是後端的工作，前端只負責顯示。

### 4.4 前端怎麼決定燈號

每條路線依下列順序判斷，符合就停：

| 順序 | 條件 | 結果 |
|---|---|---|
| 1 | `status_type` 是 `通信エラー` | 吹き出し（不亮紅燈） |
| 2 | `status_type` 含「エラー」 | × |
| 3 | `status_type` 是 `非対応`、`対象外`、`提供終了`、`更新中...`，或 `status_text` 是 `公式発表なし`、`情報なし` | 只亮吹き出し，不亮綠燈 |
| 4 | `delay_minutes` 大於 0 | 5 以下 〇；6～15 △；16 以上 × |
| 5 | 訊息不是正常訊息，而且 `status_text` 含「異常」、或 `message` 含「遅延」、或 `status_type` 含「見合わせ」「運転変更」 | △ |
| 6 | 其他 | 〇 |

- **正常訊息**：`message` 含「ありません」「平常」「正常」「取得しています」其中之一。
- **吹き出し另外會亮的情況**：`message` 有內容但不是正常訊息，或 `status_type`、`message` 含「お知らせ」。
- **天候燈**：`message` 含「地震」「雨」「台風」「雪」。

卡片的燈號是卡片內所有路線的聯集。

### 4.5 特殊狀態

| `status_type` | 意思 | 前端顯示 |
|---|---|---|
| `取得済` | 正常取得 | 依 4.4 |
| `通信エラー` | 後端抓不到上游 | 吹き出し |
| `対象外` | 上游沒有提供這條路線的資料 | 吹き出し |
| `提供終了` | 資料提供期間結束 | 灰色 ℹ︎ 徽章，顯示 `message` 與 `url` 連結，不顯示 `advanced_details` |

`/api/status` 本身出問題時：

| 情況 | 前端的行為 |
|---|---|
| 開啟網站時連不上（非 2xx 或網路錯誤） | 所有鐵道路線顯示成「通信エラー」 |
| 每分鐘更新時連不上 | 保留原本的畫面 |
| 回應帶最上層的 `error` | 每分鐘的更新會跳過這次 |
| 回應是 `{}`（後端剛啟動） | 同步時鐘不更新，路線顯示成「更新中...」（吹き出し） |
| 回應裡沒有某條路線 | 那條路線顯示成「更新中...」（吹き出し） |

左上角的同步時鐘在距離上次成功同步 1 分鐘以上變黃、5 分鐘以上變紅。

---

## 5. 航班

### 5.1 `GET /api/flights`

回傳陣列，每筆是一個航班。

```jsonc
[
  {
    "fid": ["UO625", "CX5625"],
    "airline": "香港エクスプレス",
    "type": "Departure",
    "airport": "羽田（HND）",
    "location": "香港（HKG）",
    "scheduled": "06:35",
    "latest": "06:35",
    "status": "搭乗手続中",
    "terminal": "3",
    "gate": "105",
    "note": "",
    "system_updated": "05:48:06",
    "stale": false
  }
]
```

| 欄位 | 必要 | 說明 |
|---|---|---|
| `fid` | 是 | **陣列**。第一個是實際執飛的便名，後面是共同運航便名。使用者用其中任何一個都搜尋得到 |
| `airline` | 是 | 航空公司名，原樣顯示。前端用它比對代表色和官網 |
| `type` | 是 | `Departure` 或 `Arrival` |
| `airport` | 是 | 東京端的機場。`HND`、`NRT`，或 `羽田（HND）` 這種寫法都可以，前端會取出三碼 |
| `location` | 是 | 對方機場，例 `札幌（CTS）`。前端顯示成 `CTS（札幌）` |
| `scheduled` | 是 | 表定時刻 `HH:MM`，沒有時給 `--:--`。**必須是字串** |
| `latest` | 是 | 最新時刻，格式同上。和 `scheduled` 不同時顯示「変更」與差幾分鐘 |
| `status` | 是 | 狀態，見 5.2 |
| `terminal` | 否 | 航廈。沒有時給 `---` 或空字串 |
| `gate` | 否 | 登機口。沒有時給 `---` 或空字串 |
| `note` | 否 | 備註。有內容時亮吹き出し，並顯示在卡片下方 |
| `system_updated` | 否 | 這筆資料的更新時刻 `HH:MM:SS`，前端顯示前 5 碼 |
| `stale` | 否 | `true` 表示上游已經一段時間沒更新（目前後端的標準是 15 分鐘），前端顯示「⚠ 情報が古い可能性があります」 |

使用者存的航班 ID 是便名。航班從清單消失後（已結束或後端沒資料），卡片會顯示「フライト情報が終了したか、取得できません」。

### 5.2 `status` 的值

前端接受英文代碼（會轉成日文）或直接給日文：

| 英文代碼 | 顯示 | | 英文代碼 | 顯示 |
|---|---|---|---|---|
| `Normal` | 通常 | | `NowBoarding` | 搭乗中 |
| `Delayed` | 遅延 | | `FinalCall` | 最終案内 |
| `Cancelled` | 欠航 | | `GateClosed` | 搭乗終了 |
| `EstimatedDeparture` | 出発予定 | | `GoToGate` | 搭乗口へ |
| `EstimatedArrival` | 到着予定 | | `LeftGate` | 滑行中 |
| `Estimated` | 変更予定 | | `InAir` | 飛行中 |
| `CheckIn` | 搭乗手続中 | | `Takeoff`、`Departed` | 出発済 |
| `NewArrival` | 新規到着 | | `Landed` / `Arrived` | 着陸済 / 到着済 |

不在表裡的值會原樣顯示（黃色）。

燈號依序判斷：
1. 「欠航」→ ×。
2. 「出発済」「着陸済」「到着済」「飛行中」→ 〇。
3. `latest` 比 `scheduled` 晚超過 15 分鐘或早超過 20 分鐘 → △。
4. 狀態是「遅延」，而且時刻沒有變更 → △。
5. 其他 → 〇。

另外，`latest` 和 `scheduled` 差距超過 25 分鐘、而狀態還是「通常」「出発予定」「到着予定」時，前端會把顯示改成「遅延」（晚）或「変更予定」（早）。

### 5.3 航廈與登機口

- 直接顯示 `terminal` 和 `gate`，前端不做任何查詢或推算。
- 只顯示東京端機場的資料：出發便顯示在「出発」欄，到達便顯示在「到着」欄，另一邊顯示 `-`。
- 值是空字串或 `---` 時顯示 `-`。

### 5.4 Google Maps 連結

**用關鍵字搜尋的網址，不使用 Google Maps API，不需要金鑰。**

```
https://www.google.com/maps/search/?api=1&query={關鍵字}
```

關鍵字在前端組合：

| 條件 | 關鍵字 |
|---|---|
| `airport` 是 HND | `羽田空港` |
| `airport` 是 NRT | `成田空港` |
| 有 `terminal` | 後面加 ` {terminal}ターミナル`（值本身已含「ターミナル」時不重複加），例：`羽田空港 3ターミナル` |
| 其他機場 | 不提供連結 |

所以 `terminal` 請給「1」「2」「3」這種值，Google Maps 才找得到對應的航廈。

公車站牌也用同樣的方式：關鍵字是 `{站牌名} バス停`。

---

## 6. 公車

### 6.1 兩種業者

| | 有即時資料 | 只有時刻表 |
|---|---|---|
| 目前對應 | 都營巴士（`Toei`）、橫濱市營巴士（`YokohamaMunicipal`）、西武巴士（`SeibuBus`） | 大島巴士（`OshimaBus`）、三宅村營巴士（`MiyakeVill`） |
| 判斷方式 | 結果裡沒有 `realtime` 欄位 | 結果帶 `realtime: false` |
| 車輛位置、到站預測 | 有 | 沒有 |
| 時刻表頁 | 有 | 有 |
| 卡片燈號 | 依車輛延誤 | 今天還有班次 → 吹き出し；今天沒有班次 → × |

業者 ID 會成為使用者卡片 ID 的一部分（`bus:Toei:都01`），請保持固定。

路線名可能有全形字（「都０１」「Ａ 大島公園ライン」）。前端顯示和存檔時轉成半形，查詢時用後端給的原始寫法。後端的查詢請不分全形半形。

### 6.2 `GET /api/bus/routes?q={關鍵字}`

路線名搜尋，只回名稱，要輕量。

```jsonc
{
  "results": [
    { "operator": "Toei", "label": "都営バス", "routes": ["都０１", "都０１折返"] },
    { "operator": "OshimaBus", "label": "大島バス", "realtime": false, "routes": ["Ａ 大島公園ライン"] }
  ]
}
```

每個業者前端最多顯示 6 條。關鍵字符合業者名時（例：「大島」），目前的後端會列出該業者全部路線。

### 6.3 `GET /api/bus/route/{路線名}`

```jsonc
{
  "query": "都０１",
  "results": [
    {
      "operator": "Toei",
      "label": "都営バス",
      "url": "https://www.kotsu.metro.tokyo.jp/bus/",
      "source": "リアルタイム",
      "patterns": [
        {
          "id": "…",
          "title": "都０１ 新橋駅前行",
          "bus_count": 4,
          "stops": [
            {
              "name": "渋谷駅前",
              "eta": "2026-10-21T10:06:00+09:00",
              "eta_text": "あと6分",
              "next": "2026-10-21T10:05:00+09:00",
              "next_text": "10:05",
              "prev": "2026-10-21T09:55:00+09:00",
              "buses_approaching": [
                { "number": "D329", "occupancy": "空席あり", "delay_minutes": 3 }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

業者層：

| 欄位 | 說明 |
|---|---|
| `operator`、`label`、`url` | 業者 ID、顯示名、官網 |
| `source` | 資料種類的說明文字。含「リアルタイム」時，正常運行亮綠燈；不含時只亮吹き出し |
| `realtime` | 只有時刻表的業者給 `false` |
| `today`、`ship_link` | 只有時刻表的業者才有，見 6.6 與第 7 節 |
| `patterns` | 運行系統（方向）的陣列 |

`patterns[]`：

| 欄位 | 說明 |
|---|---|
| `title` | **格式是「路線名＋空白＋方向」**。前端用第一個空白前的字當路線名來分組（同一次查詢可能回多條路線，例：東42 → 東42-1、東42-2）；空白後的字當方向標籤。只有時刻表的業者路線名本身含空白，前端改用 `query` 分組 |
| `stops` | 依停靠順序的站牌陣列。空陣列的 pattern 會被忽略 |
| `bus_count` | 這個方向的車輛數。搜尋清單用它顯示「運行中 N台」；面板上的台數以 `buses_approaching` 的車輛為準 |
| `note`、`active_today` | 只有時刻表的業者才有，見 6.6 |

停靠站完全相同的 pattern 會被前端合併成一個。

`stops[]`：

| 欄位 | 說明 |
|---|---|
| `name` | 站牌名 |
| `eta` | 下一台車的預測到站時刻（ISO）。前端用它即時換算「まもなく」「あとN分」「HH:MM頃」 |
| `eta_text` | 沒有 `eta` 時直接顯示的文字 |
| `next`、`next_text` | 下一班的**表定**時刻（ISO 與 `HH:MM`） |
| `prev` | 上一班的表定時刻（ISO），用來推算延誤 |
| `scheduled` | 選填，表定時刻的陣列（ISO），用來推算延誤 |
| `buses_approaching` | 正在接近這一站的車輛 |

`buses_approaching[]`：

| 欄位 | 說明 |
|---|---|
| `number` | 車牌或車號。前端用它判斷是不是同一台車 |
| `occupancy` | 擁擠度文字，原樣顯示。含「満員」「混雑」「立席」「空」時各有顏色 |
| `delay_minutes` | 這台車的延誤分鐘數（負數是提早）。算不出來給 `null`（不是 0） |

### 6.4 `GET /api/bus/stop/{站牌名}`

```jsonc
{
  "results": [
    {
      "operator": "Toei", "label": "都営バス", "url": "…", "source": "リアルタイム",
      "stops": [
        {
          "name": "渋谷駅前",
          "poles": [
            {
              "pole_no": "1",
              "routes": [
                {
                  "route": "都０１",
                  "destination": "新橋駅前行",
                  "buses": [
                    { "number": "D329", "occupancy": "空席あり", "eta_text": "あと6分", "stops_away": 3 }
                  ],
                  "departures": ["2026-10-21T10:05:00+09:00"],
                  "departures_text": ["10:05"]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

| 欄位 | 說明 |
|---|---|
| `stops[].name` | 站牌名。部分符合時可以回多個站牌 |
| `poles[].routes[]` | 這個乘車處停靠的路線。前端不顯示乘車處編號，把所有乘車處的路線合併成一份清單 |
| `route`、`destination` | 路線名與行き先 |
| `buses[]` | 正往這一站來的車，前端只用第一台。`eta_text` 優先；沒有時用 `stops_away`（還有幾站，0 顯示「まもなく」） |
| `departures`、`departures_text` | 接下來的表定發車（ISO 與 `HH:MM`），一一對應 |
| `note`、`active_today` | 只有時刻表的業者才有 |

每一列的顯示優先順序：即時到站 → 車輛位置 → 表定下一班 → 運行終了。

### 6.5 `GET /api/bus/timetable/{站牌名}`

站牌的全日時刻表（平日・土曜・休日）。

```jsonc
{
  "query": "渋谷駅前",
  "today": "weekday",
  "results": [
    {
      "operator": "Toei", "label": "都営バス", "url": "…",
      "updated": { "data_date": "2026-10-02T03:00:00+09:00", "effective_from": "2026-10-01", "fetched_at": "2026-10-15T22:26:28+09:00" },
      "matched": 1,
      "stops": [
        {
          "name": "渋谷駅前",
          "poles": [
            {
              "pole_no": "1",
              "routes": [
                {
                  "route": "都０１",
                  "destination": "新橋駅前行",
                  "timetable": {
                    "weekday":  [ { "hour": 6, "minutes": ["05", "25"] }, { "hour": 24, "minutes": ["10"] } ],
                    "saturday": [ { "hour": 6, "minutes": ["05", "30"] } ],
                    "holiday":  []
                  },
                  "count": { "weekday": 3, "saturday": 2, "holiday": 0 }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

| 欄位 | 說明 |
|---|---|
| `today` | 今天的日別：`weekday`、`saturday`、`holiday`。前端預設開這個分頁。凌晨 4 點前算前一天 |
| `results[].today` | 選填，業者自己的日別（已判斷國定假日），有的話優先用 |
| `timetable.{日別}` | 依小時排序。`minutes` 是兩位數的字串。空陣列表示那天沒有班次 |
| `hour` | 4～27。24 以上是深夜班，前端直接顯示「24」「25」 |
| `count` | 各日別的班次數 |
| `pole_no` | 有值時顯示「N番のりば」 |
| `matched` | 符合的站牌數，大於 `stops` 的數量時前端提示「候補が多すぎます」 |
| `updated` | `effective_from`（改正日）、`data_date`、`fetched_at`、`valid_to`（有效期限）、`expired`。`expired: true` 時顯示有效期限已過的提示 |
| `note`、`active_today`、`ship_link` | 只有時刻表的業者才有 |

前端的處理：
- 逾時 60 秒（某站牌第一次被查詢時，目前的後端要現場下載資料）。
- 收到 `error` 時 5 秒後自動重試。
- 「下一班」由前端用日本時間計算，每分鐘重算，不重抓 API。

### 6.6 只有時刻表的業者

結果帶 `realtime: false` 時，前端的行為：

| 項目 | 行為 |
|---|---|
| 到站預測、車輛、延誤 | 不顯示（`eta`、`buses_approaching` 應為 `null` 與空陣列） |
| 各站的時間 | 顯示 `next_text`（表定）。已經過去、或屬於明天營業日的班次，前端自己濾掉 |
| 路線卡片燈號 | 今天還有班次 → 吹き出し＋「時刻表のみ・次発 HH:MM」；沒有 → ×＋「本日の運行はありません」 |
| 站牌卡片 | 顯示 `departures_text`，已過的班次由前端濾掉 |
| `note` | 班次註記，顯示成「※錆ヶ浜港着岸時」 |
| `active_today` | 見第 7.4 節 |

「營業日」以日本時間凌晨 4 點為界。

### 6.7 有即時資料的業者：延誤判定

延誤在前端計算，門檻寫在 `js/buses.js` 開頭：

- 每台車的延誤：優先用 `delay_minutes`；是 `null` 時，用該站的 `eta` 減去最接近的表定時刻（`scheduled`、`prev`、`next`）推算。
- 推算值超過 +30 分或早於 −5 分，視為班次對錯，不採用。`delay_minutes` 早於 −3 分也不顯示。
- 路線整體：單台 10 分以上、或 2 台以上平均 5 分以上 → ×；單台 6 分以上、或平均 4 分以上 → △。
- 沒有車在路上：有表定下一班 → 吹き出し＋「運行中の車両なし」；沒有 → 「本日の運行は終了しました」。

---

## 7. 船（東海汽船）與島嶼巴士連動

### 7.1 `GET /api/ship/schedule?date=YYYY-MM-DD`

某一天所有航路的船班與運航狀況。前端只用這一個船的端點。

```jsonc
{
  "date": "2026-10-16",
  "is_today": true,
  "updated": { "effective_from": "2026-10-01", "valid_to": "2026-12-31", "expired": false },
  "alerts_updated_at": "2026-10-16T11:30:33+09:00",
  "alerts_error": null,
  "routes": [
    {
      "route": "東京～三宅島・御蔵島・八丈島航路",
      "trips": [
        {
          "name": "2500便",
          "ship": "さるびあ丸",
          "departure": { "port": "八丈島", "text": "09:40" },
          "arrival":   { "port": "東京・竹芝", "text": "20:55" },
          "stops": [
            { "port": "八丈島", "skipped": false },
            { "port": "御蔵島", "skipped": true },
            { "port": "三宅島", "skipped": false },
            { "port": "東京・竹芝", "skipped": false }
          ],
          "status": {
            "level": "conditional",
            "label": "条件付き運航",
            "ports": { "三宅島": "錆ヶ浜（阿古）港", "八丈島": "底土港" },
            "changes": [ { "island": "三宅島", "from": "三池港", "to": "錆ヶ浜（阿古）港" } ],
            "messages": [ "（運航情報の原文）" ],
            "skipped": [],
            "url": "https://www.tokaikisen.co.jp/schedule/"
          },
          "history_key": "20261016_76043f4b03"
        }
      ]
    }
  ]
}
```

| 欄位 | 說明 |
|---|---|
| `date`、`is_today` | 這份資料的日期；是不是日本時間的今天。今天的頁面每 5 分鐘重抓 |
| `updated` | 時刻表的改正日、有效期限；`expired: true` 時顯示提示 |
| `alerts_updated_at` | 運航情報的更新時刻，顯示成「運航情報 11:30 更新」 |
| `alerts_error` | 運航情報抓取失敗時的訊息。不是 `null` 時，清單照常顯示，上方加提示 |
| `error` | 查不到這天的時刻表時才有（HTTP 狀態可以是 200 或 404）。前端顯示原文與官網連結 |
| `routes[].route` | 航路名。**使用者存的 ID 就是 `ship:` 加這個名字**，請保持固定 |
| `trips[]` | 這條航路當天的船班，依出發時刻排序 |
| `name`、`ship` | 便名（可以是 `null`）與船名 |
| `departure`、`arrival` | `port`（港名）與 `text`（`HH:MM`；跨日寫成 `翌 15:40`） |
| `stops[]` | 途中停靠的港。前端只用 `port` 和 `skipped`（今天不停靠），在一部欠航時顯示刪除線 |
| `status` | 運航狀況。**`null` 表示沒有運航情報，不等於停航**（未來的日期都是 `null`），前端不顯示徽章 |
| `history_key` | 這一班的歷史紀錄 key，對應 `/api/history/all` 的 `ship` |

`status`：

| 欄位 | 說明 |
|---|---|
| `level` | 等級，見 7.2 |
| `label` | 徽章文字 |
| `ports` | 各島今天的著岸港，`{ "島名": "港名" }`。港未定時值是 `未定` |
| `changes` | 改港，`[{ island, from, to }]`，顯示成「⚠ 三宅島：三池港 → 錆ヶ浜（阿古）港」 |
| `messages` | 運航情報原文（字串陣列），收合顯示 |
| `skipped` | 一部欠航時不走的區間或港，例 `["新島〜神津島"]`，顯示成「一部欠航（新島〜神津島間）」 |
| `url` | 官方運航情報的網址 |

### 7.2 `level` 與燈號

| `level` | 意思 | 徽章顏色 |
|---|---|---|
| `cancelled` | 欠航 | 紅 |
| `partial` | 一部欠航（一班船裡部分區間或港不走） | 黃 |
| `conditional` | 条件付き運航 | 黃 |
| `changed` | 出帆港変更 | 黃 |
| `pending` | 就航判断待ち | 橘 |
| `undecided` | 出帆港未定 | 灰 |
| `normal` | 運航予定 | 綠 |
| 其他值 | 前端當成「運航情報あり」，黃色，不會當成正常 | 黃 |

航路卡片的燈號由今天所有船班的 `level` 決定，依序判斷：

| 條件 | 燈號 | 徽章 |
|---|---|---|
| 今天這條航路沒有船班 | × | 運航なし |
| 全部欠航 | ×＋吹き出し | 全便欠航 |
| 有船班欠航 | ×＋吹き出し | 欠航あり |
| 有一部欠航 | △＋吹き出し | 一部欠航 |
| 有条件付き運航 | △＋吹き出し | 条件付き |
| 有出帆港変更 | △＋吹き出し | 出帆港変更 |
| 有不認得的等級 | △＋吹き出し | 運航情報あり |
| 有就航判断待ち | 吹き出し | 判断待ち |
| 有出帆港未定 | 吹き出し | 出帆港未定 |
| 所有船班的 `status` 都是 `null` | 吹き出し | 情報なし |
| 全部運航予定 | 〇 | 運航予定 |

### 7.3 前端自己算的部分

- **出航済み／到着済み**：官方公告在出航後仍然是「運航予定」。前端用時刻表的出發・到達時刻和現在時間比較，把已出航的船班顯示成「出航済み」、已到達的顯示成「到着済み」。只套用在確定會開的船班（`normal`、`conditional`、`changed`、`partial`）。這不是即時位置。
- **次の出航**：從今天的船班裡找出發時刻還沒到、而且沒有欠航的第一班。
- **搜尋**：航路清單取自今天的 `/api/ship/schedule`，另外比對寫死的公司名與島名關鍵字。

### 7.4 船與島嶼巴士的連動：誰負責什麼

三宅島的船每天靠的港不同，三宅村營巴士的部分班次只在船靠特定的港時才開。**「今天哪些班次會開」由後端判斷，前端只負責顯示。**

| 工作 | 負責 |
|---|---|
| 判斷港別班次今天開不開（`active_today`） | 後端 |
| 站牌「接下來的發車」（`departures`；今天不開的版本給空陣列） | 後端 |
| 整理今天靠這個島的船班與港（`ship_link`） | 後端 |
| 判斷國定假日（`today`） | 後端 |
| 顯示「本日運行」「本日運休」標籤，把不開的班次淡化 | 前端 |
| 不開的班次不列入燈號與下一班 | 前端 |
| 把已經過去的表定班次濾掉 | 前端 |
| 船頁面的著岸港 → 該港的巴士時刻表 | 前端 |
| 巴士卡片的「⛴ 本日の着岸港」→ 船頁面 | 前端 |

#### 後端要提供的欄位

出現在 `/api/bus/route` 的 `patterns[]`、`/api/bus/stop` 與 `/api/bus/timetable` 的 `routes[]`：

| 欄位 | 值 | 前端顯示 |
|---|---|---|
| `note` | 例：`錆ヶ浜港着岸時`、`三池港着岸時の船連絡バス`、`登校日のみ` | 路線名旁的「※…」 |
| `active_today` | `true` | 「本日運行」標籤 |
| | `false` | 整組淡化，標「本日運休（着岸港が異なるため）」，時間顯示「運休」 |
| | `null` | 港還沒公布，只顯示 `note` |
| | 沒有這個欄位 | 一般班次 |

出現在島嶼巴士業者的結果層：

```jsonc
"ship_link": {
  "island": "三宅島",
  "date": "2026-10-16",
  "sailings": [
    { "name": "3500便", "ship": "さるびあ丸", "from": "東京・竹芝", "arrival_text": "05:00", "port": "錆ヶ浜（阿古）港" }
  ]
}
```

`port` 是 `null` 時前端顯示「未発表」。`date` 用來開啟同一天的船頁面。

#### 後端的判斷方式（建議）

1. 巴士時刻表裡，港別班次各自帶有對應的港（例：三池港、伊ヶ谷港、錆ヶ浜港三個版本，時刻相同）。
2. 取得今天東海汽船運航情報裡，這個島的著岸港（就是 `/api/ship/schedule` 的 `status.ports["三宅島"]`）。
3. 對每個港別版本：港相同 → `true`；港已公布但不同 → `false`；港還沒公布 → `null`。
4. `active_today: false` 的版本，站牌的 `departures` 給空陣列。

#### 前端的港名 → 站牌名

船頁面的著岸港旁有巴士圖示，點了會開該港的巴士時刻表。對應方式寫在 `js/ship.js` 的 `busStopFor`：

- 只有大島（`OshimaBus`）和三宅島（`MiyakeVill`）有這個連結。
- 站牌名是港名去掉括弧內的字：`錆ヶ浜（阿古）港` → `錆ヶ浜港`。
- 用這個站牌名呼叫 `/api/bus/timetable/{站牌名}`，並只顯示該業者的結果。

所以巴士資料裡的站牌名要和「港名去掉括弧」對得上。

---

## 8. 歷史紀錄

### 8.1 `GET /api/history/all`

一次回傳全部歷史，前端每 60 秒抓一次，再從裡面挑出使用者卡片上的路線。

```jsonc
{
  "railway": {
    "odpt.Railway:JR-East.Yamanote": [
      { "status_text": "平常運転", "message": "平常運転", "update_time": "05:48", "delay_minutes": 2, "timestamp": 1792529352090 }
    ]
  },
  "flight": {
    "Departure_UO625": [
      { "fid": ["UO625", "CX5625"], "type": "Departure", "status": "搭乗手続中", "note": "", "system_updated": "05:48:06", "timestamp": 1792529352090 },
      { "fid": ["UO625", "CX5625"], "type": "Departure", "status": "搭乗中", "note": "【状況変更】", "system_updated": "05:53:16", "timestamp": 1792529654482 }
    ],
    "Arrival_BA007": [
      { "fid": ["BA007", "JL7082"], "type": "Arrival", "status": "遅延", "note": "到着便の履歴機能はサポートされていません。", "system_updated": "06:24:00", "timestamp": 1792531467770 }
    ]
  },
  "ship": {
    "20261016_76043f4b03": [
      {
        "timestamp": 1792110900000, "date": "2026-10-16",
        "name": "2000便", "ship": "さるびあ丸",
        "route": "東京・横浜～大島・利島・新島・式根島・神津島航路",
        "departure_text": "10:30", "arrival_time": "2026-10-16T19:00+09:00",
        "level": "normal", "label": "運航予定",
        "ports": { "大島": "岡田港" }, "changes": [],
        "tags": ["状況変更", "出帆港決定"]
      }
    ]
  }
}
```

每個陣列由舊到新。目前的後端每條最多保留 5 筆。航班的每筆紀錄是當時的航班物件（第 5.1 節的全部欄位）加上 `timestamp`，上面的例子只節錄了前端用到的欄位。

| 區塊 | key | 前端用到的欄位 |
|---|---|---|
| `railway` | 路線 ID | `status_text`、`message`、`update_time` |
| `flight` | `Departure_` 或 `Arrival_` 加上 `fid` 的第一個便名 | `fid`、`status`、`note`、`system_updated` |
| `ship` | 船班的 `history_key` | `timestamp`、`date`、`name`、`ship`、`route`、`departure_text`、`arrival_time`、`label`、`ports`、`changes`、`tags` |

### 8.2 各種類的規則

**鐵道**：`status_text` 含「平常」「通常」時顯示成一行；其他情況另外顯示 `message`。

**航班**：
- 前端找 key 的順序：用即時航班資料的 `type` 和 `fid[0]` 組 key → `Departure_{便名}` → `Arrival_{便名}` → 從每筆紀錄的 `fid` 反查（所以用共同運航便名存的卡片也找得到）。
- 紀錄的 `note` 全部含「履歴機能はサポートされていません」時，前端判定這班不支援歷史，顯示「到着便は履歴の対象外です」。目前的後端對到達便就是這樣回。
- 歷史已取得但沒有這班 → 「この便の履歴はありません」。

**船**：
- 某一班有沒有歷史，只看 `ship[history_key]` 是不是非空陣列，不看 `status`（出航後官方會撤下公告，但歷史還在）。
- 卡片上的航路，用每個 key 最後一筆紀錄的 `route` 和航路名比對。
- `tags` 的值：`状況変更`、`出帆港決定`、`出帆港変更`、`案内変更`。前端用來決定第二行的說明。

**公車**沒有歷史，前端顯示「バス路線は履歴の対象外です」。

---

## 9. 資料來源狀態

### 9.1 `GET /api/sources`

用來在資料提供期間結束前後顯示說明。開啟網站時抓一次，失敗不影響其他功能。

```jsonc
{
  "challenge_name": "公共交通オープンデータチャレンジ",
  "challenge_end": "2027-02-28",
  "sources": [
    { "id": "jr_info", "label": "JR東日本 運行情報", "challenge": true, "state": "ok" },
    { "id": "flights_nrt_hnd", "label": "成田・羽田", "challenge": true, "state": "ok" }
  ]
}
```

前端只用這些：

| 欄位 | 用途 |
|---|---|
| `sources[].challenge` 與 `state` | 有 `challenge: true` 且 `state` 是 `ended` 的來源時顯示說明 |
| `sources[].id` | `flights_nrt_hnd` 結束 → 航班的說明；其他來源結束 → 鐵道的說明 |
| `challenge_end`、`challenge_name` | 結束前 30 天起，在「通知・履歴」顯示倒數 |

說明文字寫死在 `js/data-sources.js`，裡面列了具體的業者名。你的後端資料範圍不同時要改這裡的文字。不需要這個功能的話，讓端點回 `{ "sources": [] }` 即可。

---

## 10. 瀏覽器端儲存

使用者資料不會送到伺服器。

**IndexedDB**

| 資料庫 | 內容 |
|---|---|
| `TsukinKanbanDB` | 卡片設定：名稱、顏色、路線清單、顯示順序 |
| `TsukinKanban_SandboxDB` | 「新增與管理卡片」畫面用的獨立副本（編輯完再寫回主資料庫） |
| `TsukinDictDB` | 鐵道路線字典與版本號 |
| `TsukinSettingsDB` | 顯示設定 |

IndexedDB 不能用時（例：部分瀏覽器的無痕模式）退回 localStorage 的 `TsukinKanban_Preferences_Fallback`、`TsukinKanban_Sandbox_Fallback`、`Tsukin_Dict_Data_Fallback`、`Tsukin_Dict_Version_Fallback`。

**localStorage**

| key | 內容 |
|---|---|
| `Tsukin_Cached_Dict`、`Tsukin_Cached_Status`、`Tsukin_Cached_Flights` | 上次的字典、鐵道狀態、航班，讓下次開啟時立刻有畫面 |
| `Tsukin_Cached_BusData` | 公車路線資料的快取 |
| `Tsukin_Cached_ShipData`、`Tsukin_Cached_ShipData_Prev` | 今天與前一天的船班 |
| `Tsukin_Bus_Prefs` | 每條公車路線的方向、預覽站牌（最多 2 個）、收合狀態 |
| `Tsukin_Bus_RouteNames` | 公車路線的原始寫法（全形） |
| `TsukinKanban_HiddenCards` | 隱藏中的卡片 |
| `tsukin_lite_mode` | 輕量顯示模式。非 Apple 裝置會強制開啟 |
| `tsukin_setting_*` | 顯示設定 |
| `tsukin_last_time`、`tsukin_last_sync_device_time` | 同步時鐘 |

---

## 11. 上游資料與授權

前端不直接接觸上游資料，但自己架後端時需要自己取得資料，並遵守各資料的利用條件。目前正式站使用的資料如下（依網站「資料來源」頁與 README）：

| 資料 | 來源 | 備註 |
|---|---|---|
| 鐵道運行情報、列車位置 | 公共交通オープンデータセンター（ODPT） | |
| JR 東日本・東武・西武・京急・京王・東急的運行情報，JR 東日本・東武的列車位置，成田・羽田的航班 | 公共交通オープンデータチャレンジ2026 的限定資料 | 預定提供到 2027 年 2 月底 |
| 都營・橫濱市營・西武的公車 | ODPT | |
| 東海汽船的時刻表與運航情報 | 東海汽船 | 時刻表是 GTFS |
| 大島巴士時刻表 | 大島旅客自動車 | GTFS |
| 三宅村營巴士時刻表 | 三宅村／ODPT | CC BY 4.0，必須標示出典 |

注意事項：

- 使用 ODPT 的資料需要自己向 ODPT 申請開發者帳號與金鑰。金鑰只能放在後端。
- 網站上的出典標示（「資料來源」頁、時刻表與船頁面頁尾的「公共交通オープンデータセンターのデータを利用しています」、三宅村營巴士的 CC BY 4.0 標示）是配合資料利用條件加的，改用其他資料時請依實際來源調整，不要直接刪掉。
- 各資料的利用條件請以提供者的最新規約為準，本文件不代替規約。

---

## 12. 開源前檢查清單

這一節和第 13 節是給作者的內部備忘，**公開 repo 前請刪除這兩節**（第 13 節補完後可以併入前面各節）。公開前逐項確認：

| 項目 | 現況 |
|---|---|
| 授權條款 | repo 裡沒有 `LICENSE` 檔。沒有授權條款的話，別人依法不能使用或修改 |
| API 是否開放 | 前端寫死 `api.tsukinkanban.com`。別人 fork 後不改就會直接打正式 API，要決定是否允許，並寫在 README |
| git 歷史 | 歷史裡的 `data/sponsors.js` 曾經有第三方服務的端點網址（一個試算表 API 的專案網址、一個個人的 Workers 網址）。公開 repo 時歷史也會公開，請確認這些端點已停用，或用全新的歷史公開。本文件製作時只檢查得到最近 87 筆 commit，更早的歷史沒有檢查 |
| 其他分支 | 遠端還有 `cloudflare/workers-autoconfig`、`cloudflare/workers-autoconfig-2`、`eqq1029-hub-patch-1` 三個舊分支，公開後也看得到 |
| 個人資訊 | `data/about.js` 有 GitHub 與 X 的連結；`data/supporter.js` 有商店與表單連結；聯絡信箱見第 2.2 節 |
| 第三方素材 | Lucide Icons（內嵌 SVG）；Google Maps 的標誌 SVG（`js/script.js` 的 `iconMapPin`，屬於 Google 的商標）；Noto Sans JP（非 Apple 裝置從 Google Fonts 載入） |
| 沒在用的程式 | `data/history-engine.js` 沒有被任何地方載入；`data/sponsors.js` 只剩空函式；`js/add-panel.js` 的 `selectDictionaryRoute` 有未完成的 TODO |
| 金鑰 | 目前的檔案裡沒有金鑰或 token |

---

## 13. 待後端補充的內容

下面這些從前端看不出來，需要後端那邊補上，別人才有辦法照著做出相同的後端：

- 各端點對應的上游 API、抓取頻率、快取時間。
- CDN 與 CORS 的設定。
- 遅延分数怎麼從列車位置算出來；方向名怎麼決定；直通列車（湘南新宿線、上野東京線）怎麼歸類。
- `internal.` 開頭的路線 ID 清單，以及這些路線的資料來源。
- `/api/dictionary` 的 `version` 怎麼產生。
- 航班：成田・羽田與 JAL・ANA 兩種來源怎麼合併；航廈與登機口的來源；`stale` 的判定。
- 公車：`source` 會出現哪些值；`delay_minutes` 的算法；`occupancy` 會出現哪些值。
- 東海汽船運航情報的取得方式與解析規則（`level` 怎麼判定）。
- GTFS 的來源網址與更新方式。
- 國定假日怎麼判斷。
- 歷史的保留規則（每條幾筆、何時清空、船的保留時間）。
- 後端的環境變數（例：測試用的資料結束日）。
- 後端是否也要開源。
