// data.js - 獨立的資料模組

export const bottomCardConfig = {
    hex: '#D3D3D3',       
    hue: 50,             
    title: '運行情報',     
    status: 'Info',       
    description: '運行状況に関する詳細な情報は、各カードをタップして確認してください。', 
    borderColorOpacity: 0.15, 
    tagBgOpacity: 0.25        
};

export const railwayData = [
    { id: 'tokyo', name: '東京都', kana: 'toukyouto toukyouto', status: '正常運転', hex: '#009100', desc: '現在、全線で概ね正常通り運行しています。', detail: ['標誌: 銀杏綠', '主要站: 東京、新宿'] },
    { id: 'kanagawa', name: '神奈川県', kana: 'kanagawa kanagawa', status: '正常運転', hex: '#007979', desc: '港灣部を含め、順調に運行されています。', detail: ['標誌: 海洋藍', '主要站: 橫濱、川崎'] },
    { id: 'saitama', name: '埼玉県', kana: 'saitama saitama', status: '正常運転', hex: '#BB3D00', desc: '內陸各線、大きな混雜は見られません。', detail: ['標誌: 勾玉紅', '主要站: 大宮、浦和'] },
    { id: 'chiba', name: '千葉県', kana: 'chiba chiba', status: '一部遅延', hex: '#D9B300', desc: '強風の影響により、一部路線で速度を落として運轉しています。', detail: ['代表色: 菜花黃', '主要站: 千葉、柏'] },
    { id: 'toei-oedo', name: '都營 大江戸線', kana: 'おおえどせん oedo', status: '正常運転', hex: '#EA0000', desc: '大江戸線は全線で正常通り運轉しています。', detail: ['次發: 2分', '代表色: 洋紅'] }
];
