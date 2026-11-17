# NOTICE

## 著作権とライセンス

Copyright (C) 2026 YUEN CHEN（通勤看板 開発者）

このリポジトリのソースコードは、[GNU Affero General Public License v3.0](LICENSE)（AGPL-3.0）で公開しています。

- 利用・改変・再配布は自由です。
- 改変したものを再配布する場合、または Web サービスとして公開する場合は、改変後のソースコードを同じ AGPL-3.0 で公開してください。
- 著作権表示とこの NOTICE は残してください。
- 無保証です。

上の説明は要約です。正確な条件は [LICENSE](LICENSE) の本文が優先します。

## 公的機関向けの無償ライセンス

このソフトウェアは AGPL-3.0 で公開しています。これとは別に、次の機関と事業者には、申請に基づいて、AGPL-3.0 とは異なる個別のライセンスを原則として無償で発行します。個別ライセンスのもとでは、改変後のソースコードの公開など、AGPL-3.0 の義務を負わずに利用できます。

対象：

- 国の機関、地方公共団体（公営交通事業者を含みます）、独立行政法人、地方独立行政法人
- 上記の機関から委託を受けて開発・運用する事業者（その委託業務に限ります）

内容：

- 費用はかかりません。
- 署名（必要に応じて押印）した許諾書をお渡しします。書式の指定がある場合はご相談ください。
- 名称とロゴ、第三者の著作物・商標（下記）、運行情報などのデータ、`api.tsukinkanban.com` は含みません。
- 許諾は、作者が権利を有する範囲で行います。

申請：機関名、担当部署、利用目的（委託を受けた事業者の場合は、委託元と業務名）を書いて、info(at)tsukinkanban.com までメールでお送りください（(at) を @ に読み替えてください）。内容によってはお断りする場合があります。

この案内そのものはライセンスではありません。許諾は、発行した許諾書によってはじめて成立します。AGPL-3.0 で公開しているものは、これまでどおりどなたでも利用できます。

このライセンスを発行し続けられるよう、コードの権利は作者がすべて保有しています。そのため、外部からのコードの提供（プルリクエスト）は受け付けていません。

## ライセンスの対象外：名称とロゴ

次のものは、AGPL-3.0 による許諾の対象に含みません（AGPL-3.0 第 7 条 e 項）。

- 名称：「通勤看板」「tsukinkanban」
- ロゴ：`img/logo.png`（アプリのアイコン、ファビコン、PWA のアイコンとして使う場合を含みます）

このコードをもとに別のサービスを公開する場合は、ご自身の名称とロゴに差し替えてください。「通勤看板をもとにしている」と事実として記載することは問題ありません。コード内の識別子（データベース名や保存キーなど）は、そのままで構いません。

名称やロゴの利用を希望される場合は、ご相談に応じます。info(at)tsukinkanban.com までメールでご連絡ください（(at) を @ に読み替えてください）。

## ライセンスの対象外：API サーバー

`api.tsukinkanban.com` は通勤看板専用の API で、このライセンスによる許諾の対象ではありません。このコードをもとに別のサイトを公開する場合は、自分のバックエンドを用意してください。

## 第三者の著作物・商標

次のものは第三者に帰属し、作者のものではありません。上記のライセンスの対象ではないため、利用にあたっては、それぞれの権利者が定める条件に従ってください。

| 対象 | 場所 | 権利者・条件 |
|---|---|---|
| Google マップのロゴ | `js/script.js`（`iconMapPin`） | Google LLC の商標です。Google のブランドガイドラインに従ってください |
| GitHub のロゴ | `data/about.js` | GitHub, Inc. の商標です |
| X のロゴ | `data/about.js` | X Corp. の商標です |
| Lucide のアイコン（画面上の SVG アイコンの多く） | 各ファイルにインライン SVG として埋め込み | ISC License、Copyright (c) Lucide Icons and Contributors。一部は Feather 由来で、MIT License、Copyright (c) Cole Bemis。全文は末尾に掲載 |
| Noto Sans JP（フォント） | リポジトリには含まれません。Apple 以外の端末で Google Fonts から読み込みます | SIL Open Font License 1.1 |

このほか、アプリ内に表示される会社名・サービス名・路線名などは、各社の商標または登録商標です。

運行情報などのデータは、このリポジトリには含まれていません。データの出典と利用条件は、README の「データソース」をご覧ください。

---

## Third-party license texts

### Lucide (ISC License)

```
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

### Icons derived from Feather (MIT License)

Some Lucide icons are derived from the Feather project and are covered by the following license.

```
The MIT License (MIT)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
