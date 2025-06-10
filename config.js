export const config = {
    // メッセージ表示速度（ミリ秒/文字）
    messageSpeed: 28,
    // 敵への攻撃時の揺れ幅（ピクセル）
    enemyShakeMagnitude: 10,
    // プレイヤーがダメージを受けた時の揺れ幅（ピクセル）
    playerShakeMagnitude: 5,
    // モンスター設定（レベルごとの追加モンスター）
    monsters: {
        1: [
            { name: 'スライム', hpRange: [4, 14], exp: 22, attack: [5, 8], image: './images/slime.png', bgm: './sounds/dq3-battle.mp3', weight: 0.4 },
            { name: 'スライムベス', hpRange: [8, 14], exp: 22, attack: [4, 7], image: './images/DQVIII_-_She-slime.webp', bgm: './sounds/DQ1-battle.mp3', weight: 0.4 },
            { name: 'バブルスライム', hpRange: [8, 14], exp: 22, attack: [5, 7], image: './images/Bubble_slime.webp', bgm: './sounds/dq3-battle.mp3', weight: 0.4 },
            { name: 'ゴースト', hpRange: [20, 30], exp: 60, attack: [5, 10], image: './images/ghost.webp', bgm: './sounds/DQ2-battle.mp3', weight: 0.2 },
            { name: 'ドラキー', hpRange: [10, 14], exp: 22, attack: [3, 8], image: './images/DQVIII_-_Dracky.webp', bgm: './sounds/DQ2-battle.mp3', weight: 0.4 }
        ],
        2: [
            { name: 'はぐれメタル', hpRange: [8, 14], exp: 32, attack: [5, 12], image: './images/Liquid_metal_slime.webp', bgm: './sounds/battle-bgm.mp3', weight: 0.4 },
            { name: 'メタルスライム', hpRange: [8, 14], exp: 32, attack: [1, 5], image: './images/Metal_slime.webp', bgm: './sounds/04 Monsters.mp3', weight: 0.4 },
            { name: 'ベビーサタン', hpRange: [8, 14], exp: 32, attack: [1, 5], image: './images/DQVIII_-_Imp.webp', bgm: './sounds/04 Monsters.mp3', weight: 0.4 },
            { name: 'さまようよろい', hpRange: [8, 14], exp: 32, attack: [1, 5], image: './images/DQVIII_-_Restless_armour.webp', bgm: './sounds/04 Monsters.mp3', weight: 0.4 }
        ],
        3: [
            { name: 'スライムナイト', hpRange: [20, 30], exp: 60, attack: [5, 10], image: './images/Slime_knight.webp', bgm: './sounds/DQ2-lovesong.mp3', weight: 0.2 },
            { name: 'ベホマスライム', hpRange: [20, 30], exp: 60, attack: [5, 10], image: './images/DQVIII_-_Cureslime.webp', bgm: './sounds/04 Monsters.mp3', weight: 0.2 },
            { name: 'さまようよろい', hpRange: [20, 33], exp: 22, attack: [15, 20], image: './images/DQVIII_-_Restless_armour.webp', bgm: './sounds/40 Heros Challenge.mp3', weight: 0.4 },
            { name: 'キラーマシーン', hpRange: [20, 30], exp: 60, attack: [20, 30], image: './images/DQVIII_-_Killing_machine.webp', bgm: './sounds/dq3-battle.mp3', weight: 0.2 },
            { name: 'ボストロール', hpRange: [20, 30], exp: 60, attack: [20, 30], image: './images/DQVIII_-_Boss_troll.webp', bgm: './sounds/dq3-battle.mp3', weight: 0.2 },
            { name: 'ドラゴン', hpRange: [20, 30], exp: 60, attack: [22, 26], image: './images/Green_dragon.webp', bgm: './sounds/battle-bgm.mp3', weight: 0.2 },
            { name: 'メタルキング', hpRange: [20, 30], exp: 60, attack: [22, 30], image: './images/Metal_king_slime.webp', bgm: './sounds/04 Monsters.mp3', weight: 0.2 },
            { name: 'キングスライム', hpRange: [20, 30], exp: 60, attack: [20, 30], image: './images/king-slime.png', bgm: './sounds/25 Courageous Fight.mp3', weight: 0.2 }
        ],
        10: [
            { name: 'バラモス', hpRange: [20, 30], exp: 82, attack: [31, 50], image: './images/DQIII_-_Baramos_v.2.webp', bgm: './sounds/battle-bgm.mp3', weight: 0.4 },
            { name: 'エスターク', hpRange: [20, 30], exp: 80, attack: [35, 40], image: './images/DQIVDS_-_Estark.webp', bgm: './sounds/04 Monsters.mp3', weight: 0.2 },
            { name: 'ハーゴン', hpRange: [20, 30], exp: 80, attack: [35, 50], image: './images/DQII_-_Hargon.webp', bgm: './sounds/DQ2-boss.mp3', weight: 0.2 }
        ],
        20: [
            { name: 'ミルドラース', hpRange: [20, 30], exp: 80, attack: [33, 40], image: './images/DQMJ_-_Malroth.webp', bgm: './sounds/27 Monsters.mp3', weight: 0.2 },
            { name: 'ダークドレアム', hpRange: [20, 30], exp: 80, attack: [35, 40], image: './images/dark-dreum.webp', bgm: './sounds/27 Monsters.mp3', weight: 0.2 },
            { name: 'ハーゴン', hpRange: [20, 30], exp: 80, attack: [35, 50], image: './images/DQII_-_Hargon.webp', bgm: './sounds/DQ2-boss.mp3', weight: 0.2 },
            { name: 'ゾーマ', hpRange: [20, 70], exp: 100, attack: [30, 45], image: './images/DQIII_-_Zoma.webp', bgm: './sounds/40 Heros Challenge.mp3', weight: 0.2 }
        ]
    },
    // LVアップに必要なEXPの倍率
    expMultiplier: 1.5,
    // LVごとのHP増加量
    hpPerLevel: 20,
    // LVごとのMP増加量
    mpPerLevel: 20,
    // LVごとの称号
    titles: {
        1: '初心者',
        2: '脱初心者',
        3: 'みならい',
        4: '練習生',
        5: '候補生',
        6: '平社員',
        7: '部門担当',
        8: '部門長',
        9: '係長',
        10: '課長補佐',
        11: '課長',
        12: '部長補佐',
        13: '部長',
        14: '本部長',
        15: '常務補佐',
        16: '常務',
        17: '専務補佐',
        18: '専務',
        19: '副社長',
        20: '社長',
        21: '会長'
    },
    spells: {
        'ホイミ': { requiredLevel: 1, mpCost: 5 },
        'スカラ': { requiredLevel: 1, mpCost: 20 },
        'ギガデイン': { requiredLevel: 1, mpCost: 30 },
        'メラ': { requiredLevel: 1, mpCost: 5 },
        'ギラ': { requiredLevel: 1, mpCost: 5 },
        'バギ': { requiredLevel: 1, mpCost: 5 },
        'ヒャド': { requiredLevel: 1, mpCost: 5 },
        'レムオム': { requiredLevel: 1, mpCost: 5 },
        'ルーラ': { requiredLevel: 1, mpCost: 5 }
    }
};