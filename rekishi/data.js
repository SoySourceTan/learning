const eras = [
    {
        id: 'jomon',
        name: '縄文時代',
        western: '紀元前10,000年頃～紀元前300年頃',
        japanese: '縄文',
        events: [
            { year: '紀元前10,000年頃', description: '縄文土器の使用開始', keyword: '縄文土器' },
            { year: '紀元前5,000年頃', description: '集落の形成が進む', keyword: '集落' }
        ]
    },
    {
        id: 'yayoi',
        name: '弥生時代',
        western: '紀元前300年頃～300年頃',
        japanese: '弥生',
        events: [
            { year: '紀元前300年頃', description: '稲作文化の開始', keyword: '稲作' },
            { year: '100年頃', description: '邪馬台国の成立', keyword: '邪馬台国' }
        ]
    },
    {
        id: 'heian',
        name: '平安時代',
        western: '794年～1185年',
        japanese: '延暦13年～文治1年',
        events: [
            { year: '794年', description: '平安京への遷都', keyword: '平安京' },
            { year: '1051年', description: '前九年の役開始', keyword: '前九年の役' }
        ]
    },
    {
        id: 'kamakura',
        name: '鎌倉時代',
        western: '1185年～1333年',
        japanese: '文治1年～元弘3年',
        events: [
            { year: '1185年', description: '源頼朝が鎌倉幕府を開く', keyword: '鎌倉幕府' },
            { year: '1274年', description: '元寇（文永の役）', keyword: '元寇' }
        ]
    },
    {
        id: 'edo',
        name: '江戸時代',
        western: '1603年～1868年',
        japanese: '慶長8年～明治1年',
        events: [
            { year: '1603年', description: '徳川家康が江戸幕府を開く', keyword: '江戸幕府' },
            { year: '1635年', description: '鎖国政策の開始', keyword: '鎖国' }
        ]
    },
    {
        id: 'reiwa',
        name: '令和時代',
        western: '2019年～現在',
        japanese: '令和1年～現在',
        events: [
            { year: '2019年', description: '令和の開始', keyword: '令和' },
            { year: '2020年', description: '東京オリンピック開催', keyword: '東京オリンピック' }
        ]
    }
];