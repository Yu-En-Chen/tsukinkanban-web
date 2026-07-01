const { minify } = require("terser");
const fs = require("fs");
const path = require("path");

const distDir = "dist";
// 不要處理這些東西（避免把自己也複製進去）
const ignoreList = ["node_modules", "dist", "package.json", "package-lock.json", "build.js", ".git"];

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir);

async function processDir(dir, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const items = fs.readdirSync(dir);

  for (const item of items) {
    if (ignoreList.includes(item)) continue;

    const fullPath = path.join(dir, item);
    const outPath = path.join(outDir, item);

    if (fs.statSync(fullPath).isDirectory()) {
      await processDir(fullPath, outPath); // 遇到資料夾就自動鑽進去，不用手動列名稱
    } else if (item.endsWith(".js")) {
      const code = fs.readFileSync(fullPath, "utf8");
      const result = await minify(code, { compress: true, mangle: false });
      fs.writeFileSync(outPath, result.code);
      console.log(`✅ 已清除註解: ${fullPath}`);
    } else {
      fs.copyFileSync(fullPath, outPath); // html/css/json/圖片原樣複製
    }
  }
}

processDir(".", distDir).then(() => {
  console.log("🎉 建置完成！");
});
