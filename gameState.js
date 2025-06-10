// gameState.js
export const quizState = {
    name: 'ゆうしゃ',
    job: 'warrior',
    level: 1,
    exp: 0,
    expToNextLevel: 100,
    hp: 30,
    maxHp: 30,
    mp: 50,
    maxMp: 50,
    score: 0,
    title: '初心者',
    monster: null,
    isCommandPhase: true,
    currentAction: null,
    items: ['やくそう', 'まほうのせいすい'],
    spells: ['ホイミ', 'スカラ', 'ギガデイン', 'メラ', 'ギラ', 'バギ', 'ヒャド', 'レムオム', 'ルーラ'],
    isMonsterDefeated: false,
    sukaraCount: 0,
    godMode: false,
    godModeBoss: null,
    originalState: null,
    isWaitingForClick: false,
    nextCallback: null,
    isBgmMuted: false,
    isSeMuted: false,
    recentWords: [], // 追加：直近の単語履歴
    current: null,   // 追加：現在のクイズ情報
    options: []      // 追加：クイズの選択肢
};

export function saveGameState() {
    const stateToSave = {
        name: quizState.name,
        job: quizState.job,
        level: quizState.level,
        hp: quizState.hp,
        maxHp: quizState.maxHp,
        mp: quizState.mp,
        maxMp: quizState.maxMp,
        exp: quizState.exp,
        expToNextLevel: quizState.expToNextLevel,
        title: quizState.title,
        items: quizState.items,
        spells: quizState.spells,
        score: quizState.score,
        sukaraCount: quizState.sukaraCount,
        godMode: quizState.godMode,
        godModeBoss: quizState.godModeBoss,
        isBgmMuted: quizState.isBgmMuted,
        isSeMuted: quizState.isSeMuted,
        recentWords: quizState.recentWords // 追加
    };
    localStorage.setItem('gameState', JSON.stringify(stateToSave));
    console.log('Game state saved:', stateToSave);
}

export function loadGameState() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        quizState.name = parsedState.name || 'ゆうしゃ';
        quizState.job = parsedState.job || 'warrior';
        quizState.level = parsedState.level || 1;
        quizState.hp = parsedState.hp || 30;
        quizState.maxHp = parsedState.maxHp || 30;
        quizState.mp = parsedState.mp || 50;
        quizState.maxMp = parsedState.maxMp || 50;
        quizState.exp = parsedState.exp || 0;
        quizState.expToNextLevel = parsedState.expToNextLevel || 100;
        quizState.title = parsedState.title || '初心者';
        quizState.items = parsedState.items || ['やくそう', 'まほうのせいすい'];
        quizState.spells = parsedState.spells || ['ホイミ', 'スカラ', 'ギガデイン', 'メラ', 'ギラ', 'バギ', 'ヒャド', 'レムオム', 'ルーラ'];
        quizState.score = parsedState.score || 0;
        quizState.sukaraCount = parsedState.sukaraCount || 0;
        quizState.godMode = parsedState.godMode || false;
        quizState.godModeBoss = parsedState.godModeBoss || null;
        quizState.isBgmMuted = parsedState.isBgmMuted || false;
        quizState.isSeMuted = parsedState.isSeMuted || false;
        quizState.recentWords = parsedState.recentWords || []; // 追加
        quizState.current = parsedState.current || null;       // 追加
        quizState.options = parsedState.options || [];         // 追加
        console.log('Game state loaded:', parsedState);
        return true;
    }
    return false;
}

export function resetGameState() {
    quizState.name = 'ゆうしゃ';
    quizState.job = 'warrior';
    quizState.level = 1;
    quizState.exp = 0;
    quizState.expToNextLevel = 100;
    quizState.hp = 30;
    quizState.maxHp = 30;
    quizState.mp = 50;
    quizState.maxMp = 50;
    quizState.score = 0;
    quizState.title = '初心者';
    quizState.monster = null;
    quizState.isCommandPhase = true;
    quizState.currentAction = null;
    quizState.items = ['やくそう', 'まほうのせいすい'];
    quizState.spells = ['ホイミ', 'スカラ', 'ギガデイン', 'メラ', 'ギラ', 'バギ', 'ヒャド', 'レムオム', 'ルーラ'];
    quizState.isMonsterDefeated = false;
    quizState.sukaraCount = 0;
    quizState.godMode = false;
    quizState.godModeBoss = null;
    quizState.isWaitingForClick = false;
    quizState.nextCallback = null;
    quizState.isBgmMuted = false;
    quizState.isSeMuted = false;
    quizState.recentWords = []; // 追加
    quizState.current = null;   // 追加
    quizState.options = [];     // 追加
    console.log('Game state reset to initial values');
}