// data.js - 獨立的資料模組

export const bottomCardConfig = {
    hex: '#D3D3D3',       
    hue: 50,             
    title: '運行情報',     
    status: 'Info',       
    description: '', 
    borderColorOpacity: 0.15, 
    tagBgOpacity: 0.25        
};
//上方沒在用但不可刪除會異常

//實際預設牌組
export const railwayData = [
    { 
        id: 'tokyo', name: '遅れやすい通勤路線', kana: '', status: '正常運転', hex: '#009100', desc: '', detail: [''],
        
        targetLineIds: ['odpt.Railway:TokyoMetro.Tozai', 'odpt.Railway:TokyoMetro.Chiyoda', 'odpt.Railway:TokyoMetro.Fukutoshin', 'odpt.Railway:TokyoMetro.Hanzomon', 'odpt.Railway:Toei.Asakusa', 'odpt.Railway:Toei.Shinjuku']
    },
    { 
        id: 'kanagawa', name: '都心・お出かけ路線', kana: '', status: '正常運転', hex: '#007979', desc: '', detail: [''],
        
        targetLineIds: ['odpt.Railway:TokyoMetro.Ginza', 'odpt.Railway:TokyoMetro.Marunouchi', 'odpt.Railway:TokyoMetro.Hibiya', 'odpt.Railway:TokyoMetro.Yurakucho', 'odpt.Railway:Toei.Oedo', 'odpt.Railway:Toei.Mita']
    },
    { 
        id: 'saitama', name: '郊外・横浜方面の路線', kana: '', status: '正常運転', hex: '#BB3D00', desc: '', detail: [''],
        
        targetLineIds: ['odpt.Railway:MIR.TsukubaExpress', 'odpt.Railway:TokyoMetro.Namboku', 'odpt.Railway:TWR.Rinkai', 'odpt.Railway:YokohamaMunicipal.Blue', 'odpt.Railway:YokohamaMunicipal.Green']
    },
    { 
        id: 'chiba', name: 'モノレール・路面電車', kana: '', status: '正常運転', hex: '#FFD306', desc: '', detail: [''],
        
        targetLineIds: ['odpt.Railway:Toei.NipporiToneri', 'odpt.Railway:TamaMonorail.TamaMonorail', 'odpt.Railway:Toei.Arakawa']
    },
    { 
        id: 'personal', name: 'マイカード', kana: '', status: '正常運転', hex: '#C9CABD', desc: '', detail: [''],

        targetLineIds: []
    }
];
