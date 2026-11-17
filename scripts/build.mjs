// scripts/build.mjs
// 部署用：把網站複製到 dist/，並把 JS 與 CSS 最小化（去掉註解、空白）。
// repo 裡的原始碼不會被改動；本機開發照舊不需要建置，直接開 index.html 即可。
//
// 使用方式：npm run build（Cloudflare 部署時會自動執行）

import { transform } from 'esbuild';
import { mkdir, readdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');

// 要放上網站的檔案與資料夾（README、建置用的檔案等不上傳）
const INCLUDE = ['index.html', 'manifest.json', 'css', 'js', 'data', 'img', 'LICENSE', 'NOTICE.md'];

// 最小化的設定
// ・charset: 'utf8'：日文等非 ASCII 字元保持原樣（不設的話會被轉成 \uXXXX，檔案反而變大）
// ・不指定 format：一般 <script> 載入的檔案，最上層的名稱（給其他檔案使用的全域函式等）不會被改名。
//   ES 模組只縮短模組內部的名稱，export 出去的名稱不變
// ・不指定 target：不轉換語法，瀏覽器拿到的語法和原始碼相同
const JS_OPTIONS = { loader: 'js', minify: true, charset: 'utf8' };
const CSS_OPTIONS = { loader: 'css', minify: true, charset: 'utf8' };

const stats = { files: 0, minified: 0, before: 0, after: 0 };

async function minifyFile(src, dest, options) {
    const code = await readFile(src, 'utf8');
    const result = await transform(code, { ...options, sourcefile: path.relative(ROOT, src) });
    await writeFile(dest, result.code);
    stats.minified++;
    stats.before += Buffer.byteLength(code);
    stats.after += Buffer.byteLength(result.code);
}

// index.html：只把內嵌的 <script> 最小化，HTML 本身不動（避免影響排版）
async function buildHtml(src, dest) {
    let html = await readFile(src, 'utf8');
    const before = Buffer.byteLength(html);
    const blocks = [...html.matchAll(/(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/g)];
    for (const [whole, open, body, close] of blocks) {
        if (!body.trim()) continue;
        const result = await transform(body, { ...JS_OPTIONS, sourcefile: 'index.html (inline script)' });
        html = html.replace(whole, open + result.code.trim() + close);
    }
    await writeFile(dest, html);
    stats.minified++;
    stats.before += before;
    stats.after += Buffer.byteLength(html);
}

async function copyEntry(rel) {
    const src = path.join(ROOT, rel);
    const dest = path.join(OUT, rel);
    const entries = await readdir(src, { withFileTypes: true }).catch(() => null);

    if (entries) {
        await mkdir(dest, { recursive: true });
        for (const entry of entries) await copyEntry(path.join(rel, entry.name));
        return;
    }

    stats.files++;
    if (rel === 'index.html') return buildHtml(src, dest);
    if (rel.endsWith('.js')) return minifyFile(src, dest, JS_OPTIONS);
    if (rel.endsWith('.css')) return minifyFile(src, dest, CSS_OPTIONS);
    await copyFile(src, dest);
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const rel of INCLUDE) await copyEntry(rel);

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log(`dist/ に ${stats.files} ファイルを出力しました（最小化 ${stats.minified} 件：${kb(stats.before)} → ${kb(stats.after)}）`);
