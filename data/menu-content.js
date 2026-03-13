// 1. 把拆開的三個小檔案 import 進來
import { termsContent } from './terms.js';
import { dataSourceContent } from './data-source.js';
import { aboutContent } from './about.js';

// 2. 組合成原本的 menuContents 物件再 export 出去
export const menuContents = {
    '利用規約': termsContent,
    'データ元': dataSourceContent,
    'アバウト': aboutContent
};