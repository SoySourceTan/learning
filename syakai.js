// ゲーム設定の定数
const CONFIG = {
    INITIAL_HP: 20,
    MAX_INITIAL_HP: 20,
    INITIAL_EXP: 0,
    INITIAL_LEVEL: 1,
    INITIAL_GOLD: 0,
    INITIAL_TIME: 30,
    BASE_TIME: { easy: 40, medium: 30, hard: 20 },
    INITIAL_DAMAGE: { easy: 3, medium: 5, hard: 7 },
    MAX_QUESTIONS: 10,
    MAX_LEVEL: 40
};

// ゲームの状態管理
const state = {
    player: { // プレイヤーの状態
        hp: CONFIG.INITIAL_HP,
        maxHp: CONFIG.MAX_INITIAL_HP,
        exp: CONFIG.INITIAL_EXP,
        level: CONFIG.INITIAL_LEVEL,
        gold: CONFIG.INITIAL_GOLD
    },
    time: { // 時間管理
        timeLeft: CONFIG.INITIAL_TIME,
        baseTime: CONFIG.INITIAL_TIME,
        timerInterval: null
    },
    quiz: { // クイズの状態
        currentQuestion: null,
        selectedOption: null,
        currentCategory: null,
        quizData: [],
        questionCount: 0,
        correctCount: 0,
        maxQuestions: CONFIG.MAX_QUESTIONS
    },
    game: { // ゲーム全体の進行状態
        difficulty: 'medium',
        currentMonster: null,
        hearts: [], // 画面上のハート要素
        hints: 0,
        stage: 1,
        maxLevel: CONFIG.MAX_LEVEL,
        isFleeing: false // 逃げる処理中のフラグ
    },
    damage: CONFIG.INITIAL_DAMAGE.medium, // 現在の難易度に応じたダメージ量
    data: {} // 読み込まれたクイズデータ
};

// よく使うDOM要素への参照をキャッシュ
const elements = {
    hp: document.getElementById('hp'),
    exp: document.getElementById('exp'),
    level: document.getElementById('level'),
    gold: document.getElementById('gold'),
    timer: document.getElementById('timer'),
    monsterName: document.getElementById('monsterName'),
    monsterHPBar: document.getElementById('monsterHPBar'),
    quizQuestion: document.getElementById('quizQuestion'),
    quizOptions: document.getElementById('quizOptions'),
    sansDialog: document.getElementById('sansDialog'),
    effectOverlay: document.getElementById('effectOverlay'),
    loadingModal: document.getElementById('loadingModal'),
    difficultyModal: document.getElementById('difficultyModal'),
    categoryModal: document.getElementById('categoryModal'),
    quizModal: document.getElementById('quizModal'),
    shopModal: document.getElementById('shopModal'),
    gameOverModal: document.getElementById('gameOver'),
    stageClearModal: document.getElementById('stageClear'),
    categoryTabs: document.getElementById('categoryTabs'),
    tabContents: document.getElementById('tabContents'),
    categoryOptions: document.getElementById('categoryOptions'),
    difficultyOptions: document.getElementById('difficultyOptions'),
    shopOptions: document.getElementById('shopOptions'),
    shopGold: document.getElementById('shopGold'),
    difficultyDialog: document.getElementById('difficultyDialog'),
    categoryDialog: document.getElementById('categoryDialog'),
    shopDialog: document.getElementById('shopDialog'),
    // 逃げるボタンへの参照を追加 (sans.htmlでonclickが設定されているため、ここでは参照のみ)
    fleeButton: document.querySelector('#quizModal .buttons .button:last-child')
};

// サウンドオブジェクト
const sounds = {
    correct: new Howl({ src: ['correct.mp3'], volume: 0.6 }),
    wrong: new Howl({ src: ['incorrect.mp3'], volume: 0.6 }),
    levelUp: new Howl({ src: ['levelup.mp3'], volume: 0.5 })
};

// ゲームの静的データ（モンスター、カテゴリなど）
const gameData = {
    monsters: [
        { name: 'フロギー', hp: 50 },
        { name: 'テミー', hp: 40 },
        { name: 'モルデン', hp: 60 },
        { name: 'ナプスタブルーク', hp: 75 },
        { name: 'ボス・アスゴア', hp: 100 }
    ],
    categories: ['civics', 'geography', 'history', 'regions'],
    categoryDisplayNames: {
        'civics': '公民',
        'geography': '地理',
        'history': '歴史',
        'regions': '地域'
    },
    // displayNameToCategory プロパティは、オブジェクト定義後に設定します
    displayNameToCategory: {} // 初期化
};

// gameData オブジェクト定義後に displayNameToCategory を設定
gameData.displayNameToCategory = Object.fromEntries(
    Object.entries(gameData.categoryDisplayNames).map(([key, value]) => [value, key])
);


// プレイヤーデータの読み込み (localStorageから)
function loadPlayerData() {
    const saved = localStorage.getItem('playerData');
    if (saved) {
        const parsed = JSON.parse(saved);
        // 保存されたデータをstateにマージ
        Object.assign(state.player, parsed.player);
        Object.assign(state.game, parsed.game);
        // 最大HPはレベルに応じて再計算
        state.player.maxHp = Math.min(CONFIG.MAX_INITIAL_HP + (state.player.level - CONFIG.INITIAL_LEVEL) * 10, 200);
        state.player.hp = Math.min(state.player.hp, state.player.maxHp); // 現在HPが最大HPを超えないように調整
    }
    updateStatus(); // ステータス表示を更新
}

// プレイヤーデータの保存 (localStorageへ)
function savePlayerData() {
    localStorage.setItem('playerData', JSON.stringify({
        player: state.player, // プレイヤーデータ全体を保存
        game: { // ゲーム進行に関する一部データのみ保存
            hints: state.game.hints,
            stage: state.game.stage
        }
    }));
}

// ゲームデータの読み込み (JSONファイルから)
async function loadGameData() {
    elements.loadingModal.classList.add('active'); // ローディング表示
    try {
        const dataPromises = gameData.categories.map(cat =>
            fetch(`${cat}.json`)
                .then(res => {
                    if (!res.ok) {
                        console.error(`Error loading ${cat}.json: HTTP status ${res.status}`);
                        throw new Error(`HTTP error! status: ${res.status} for ${cat}.json`);
                    }
                    return res.json();
                })
                .then(json => {
                    console.log(`${cat}.json loaded successfully:`, json);
                    return { [cat]: json };
                })
                .catch(e => {
                    console.error(`Fetch or JSON parsing error for ${cat}.json:`, e);
                    throw e; // エラーを再スローしてPromise.allで捕捉させる
                })
        );
        const results = await Promise.all(dataPromises);
        state.data = results.reduce((acc, curr) => ({ ...acc, ...curr }), {}); // データをstate.dataに格納
        console.log("All JSON data loaded:", state.data);
        populateCategories(); // カテゴリUIを生成
        elements.loadingModal.classList.remove('active'); // ローディング非表示
    } catch (e) {
        // エラー表示
        elements.loadingModal.innerHTML = `<p>おっと、データが読み込めねえ！エラー: ${e.message} サーバーとファイルを確認してね！</p>`;
        console.error('Error loading data:', e);
    }
}

// カテゴリタブ、コンテンツ、選択肢の生成
function populateCategories() {
    // 既存の要素をクリア
    elements.categoryTabs.innerHTML = '';
    elements.tabContents.innerHTML = '';
    elements.categoryOptions.innerHTML = '';

    gameData.categories.forEach((cat, index) => {
        const displayName = gameData.categoryDisplayNames[cat];

        // カテゴリタブの作成
        const tab = document.createElement('div');
        tab.className = `tab hvr-grow ${index === 0 ? 'active' : ''}`;
        tab.textContent = displayName;
        tab.setAttribute('onclick', `showTab('${cat}')`);
        elements.categoryTabs.appendChild(tab);

        // タブコンテンツの作成
        const content = document.createElement('div');
        content.className = `tab-content ${index === 0 ? 'active' : ''}`;
        content.id = `${cat}-tab`;
        content.innerHTML = `
            <h2>${displayName}の書</h2>
            <table id="${cat}-table"><tr><th>用語</th><th>説明</th></tr></table>
            <p>サンズ「この${displayName}、掘り起こしてみな！」</p>
            <p>注：中学受験頻出用語を収録。出典：文部科学省、中学受験テキスト。</p>
        `;
        elements.tabContents.appendChild(content);

        // カテゴリ選択肢の作成 (モーダル用)
        const option = document.createElement('div');
        option.className = 'option hvr-grow';
        option.textContent = displayName;
        option.onclick = () => startQuest(cat);
        elements.categoryOptions.appendChild(option);

        populateTable(cat); // テーブルにデータを表示
    });
}

// 指定されたカテゴリのデータをテーブルに表示
function populateTable(cat) {
    const table = document.getElementById(`${cat}-table`);
    if (state.data[cat] && table) { // table要素の存在チェックを追加
        state.data[cat].forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${item.term}</td><td>${item.description}</td>`;
            table.appendChild(row);
        });
    } else {
        console.warn(`No data available for ${cat} or table element not found.`);
    }
}

// タブの表示/非表示を切り替え
function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`.tab[onclick="showTab('${tabId}')"]`).classList.add('active'); // セレクタを修正
    document.getElementById(`${tabId}-tab`).classList.add('active');
}

// クイズデータを生成 (指定カテゴリからランダムに)
function generateQuizData(cat) {
    if (!state.data[cat]) return [];
    const categoryData = state.data[cat];
    if (categoryData.length === 0) return []; // データがない場合は空配列を返す

    return categoryData.map(item => {
        // 正解以外の選択肢をランダムに3つ選ぶ
        const others = categoryData
            .filter(i => i.term !== item.term)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map(i => i.term);

        // 選択肢をシャッフルして返す
        return {
            question: `${item.description}とは？`,
            options: [...others, item.term].sort(() => Math.random() - 0.5),
            answer: item.term
        };
    }).sort(() => Math.random() - 0.5) // 問題自体もシャッフル
      .slice(0, CONFIG.MAX_QUESTIONS); // 最大問題数に制限
}


// 難易度選択モーダルを表示
function showDifficultyModal() {
    if (Object.keys(state.data).length === 0) {
        elements.loadingModal.innerHTML = '<p>データがまだだ、キッド。ちょっと待たな！</p>';
        return;
    }
    elements.difficultyModal.classList.add('active');
    document.body.classList.add('modal-open'); // 背景スクロール禁止
    updateDialog('difficultyDialog', 'どの難易度で旅立つ？選べよ！');
}

// 難易度を設定し、カテゴリ選択モーダルを表示
function setDifficulty(level) {
    state.game.difficulty = level;
    state.time.baseTime = CONFIG.BASE_TIME[level];
    state.time.timeLeft = CONFIG.BASE_TIME[level];
    state.damage = CONFIG.INITIAL_DAMAGE[level];
    closeModal('difficultyModal');
    showCategoryModal();
}

// カテゴリ選択モーダルの表示
function showCategoryModal() {
    if (Object.keys(state.data).length === 0) return;
    elements.categoryModal.classList.add('active');
    document.body.classList.add('modal-open'); // 背景スクロール禁止
    updateDialog('categoryDialog', 'どの書を開く？選べよ！');
}

// クエスト開始処理
function startQuest(cat) {
    if (!state.data[cat] || state.data[cat].length === 0) { // データがないか空の場合は開始しない
        updateDialog('sansDialog', 'この書はまだ開けねえか、データが空っぽだ！');
        return;
    }
    state.quiz.currentCategory = cat;
    state.quiz.quizData = generateQuizData(cat);
    if (state.quiz.quizData.length === 0) { // 生成されたクイズデータが0件の場合
         updateDialog('sansDialog', 'このカテゴリでは問題が作れなかったみたいだ...');
         return;
    }

    state.quiz.questionCount = 0;
    state.quiz.correctCount = 0;
    state.game.hearts = []; // ハートをリセット
    state.player.exp += 5; // クエスト開始で少し経験値獲得
    checkLevelUp(); // レベルアップ判定
    savePlayerData(); // プレイヤーデータを保存
    spawnMonster(); // モンスター出現
    elements.quizModal.classList.add('active'); // クイズモーダル表示
    updateStatus(); // ステータス更新
    nextQuestion(); // 次の問題へ
}

// モンスター出現処理
function spawnMonster() {
    const isBoss = state.game.stage % 4 === 0 && state.game.stage > 0; // 4ステージごとにボス
    const monsterIndex = isBoss ? 4 : Math.floor(Math.random() * 4);
    state.game.currentMonster = { ...gameData.monsters[monsterIndex] }; // モンスターをコピーしてHPを管理
    elements.monsterName.textContent = `${isBoss ? 'ボス ' : ''}${state.game.currentMonster.name}`;
    updateMonsterHP(); // モンスターHP表示更新
}

// モンスターHPバーの表示更新
function updateMonsterHP() {
    const bar = elements.monsterHPBar;
    const monster = gameData.monsters.find(m => m.name === state.game.currentMonster.name);
    if (monster) { // モンスターが見つかった場合のみ更新
        const maxMonsterHp = monster.hp;
        const currentMonsterHp = state.game.currentMonster.hp;
        const percentage = (currentMonsterHp / maxMonsterHp) * 100;
        bar.style.width = `${percentage}%`;
    }
}

// モーダルを閉じる汎用関数
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open'); // 背景スクロール許可
        clearInterval(state.time.timerInterval); // タイマー停止
        state.time.timerInterval = null;
        // ハート要素を全て削除
        state.game.hearts.forEach(h => h.remove());
        state.game.hearts = [];
        // クイズモーダル内のボタンのdisabledを解除
        if (modalId === 'quizModal') {
             const buttons = document.querySelectorAll('#quizModal .button');
             buttons.forEach(button => button.removeAttribute('disabled'));
        }
    }
}

// タイマーを開始
function startTimer() {
    elements.timer.textContent = state.time.timeLeft;
    if (state.time.timerInterval) clearInterval(state.time.timerInterval); // 既存タイマーがあればクリア
    state.time.timerInterval = setInterval(() => {
        state.time.timeLeft--;
        elements.timer.textContent = state.time.timeLeft;
        if (state.time.timeLeft <= 0) {
            clearInterval(state.time.timerInterval);
            state.quiz.selectedOption = null; // 時間切れの場合は選択肢なし
            submitAnswer(); // 回答判定へ
        }
    }, 1000);
}

// プレイヤーのステータス表示を更新
function updateStatus() {
    elements.hp.textContent = `${state.player.hp}/${state.player.maxHp}`;
    elements.exp.textContent = state.player.exp;
    elements.level.textContent = state.player.level;
    elements.gold.textContent = state.player.gold;
}

// レベルアップ判定と処理
function checkLevelUp() {
    // 経験値から新しいレベルを計算 (最大レベルで制限)
    const newLevel = Math.min(Math.floor(state.player.exp / 50) + 1, CONFIG.MAX_LEVEL);
    if (newLevel > state.player.level) {
        state.player.level = newLevel;
        // 最大HPをレベルに応じて増加 (最大値で制限)
        state.player.maxHp = Math.min(CONFIG.MAX_INITIAL_HP + (state.player.level - CONFIG.INITIAL_LEVEL) * 10, 200);
        state.player.hp = state.player.maxHp; // HP全回復
        sounds.levelUp.play(); // レベルアップ音
        updateDialog('sansDialog', `レベルアップ！${state.player.level}になったぜ！新たな力だ！`);
        updateStatus(); // ステータス更新
        savePlayerData(); // データ保存
    }
}

// ダイアログのテキストを更新
function updateDialog(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = `＊ ${text}`;
}

// 正解時のハートアニメーション追加
function addHeart() {
    const heart = document.createElement('div');
    heart.className = 'heart';
    heart.textContent = '💕';
    // 画面上のランダムな位置に配置
    heart.style.left = `${Math.random() * 100}vw`;
    document.body.appendChild(heart);
    state.game.hearts.push(heart); // stateで管理

    // アニメーション (animejs)
    anime({
        targets: heart,
        translateX: [
            { value: 12 * (Math.random() - 0.5), duration: 600 },
            { value: -12 * (Math.random() - 0.5), duration: 600 }
        ],
        loop: true,
        direction: 'alternate',
        easing: 'easeInOutSine'
    });
    anime({
        targets: heart,
        translateY: -window.innerHeight * 2, // 画面外へ移動
        opacity: [1, 0], // フェードアウト
        duration: 6000,
        easing: 'easeOutQuad',
        complete: () => {
            heart.remove(); // アニメーション完了後に要素削除
            state.game.hearts = state.game.hearts.filter(h => h !== heart); // stateからも削除
        }
    });
}

// 正誤判定時のエフェクト表示
function showEffect(type) {
    const overlay = elements.effectOverlay;
    overlay.textContent = type === 'correct' ? '〇' : '×';
    overlay.className = `${type} effect-overlay`; // クラスで色と表示を制御

    // アニメーション (gsap)
    gsap.to(overlay, { scale: 2.5, opacity: 1, duration: 0.6, ease: "elastic.out(1, 0.3)", onStart: () => overlay.style.display = 'flex' });
    gsap.to(overlay, { scale: 3.5, opacity: 0, duration: 0.6, delay: 0.6, ease: "power2.in", onComplete: () => overlay.style.display = 'none' });

    // サウンド再生
    (type === 'correct' ? sounds.correct : sounds.wrong).play();

    // 間違い時の骨攻撃アニメーション
    if (type === 'wrong') {
        const bone = document.createElement('div');
        bone.className = 'bone-attack';
        bone.textContent = '🦴';
        elements.quizModal.appendChild(bone);
        setTimeout(() => bone.remove(), 1000); // 1秒後に削除
    }
    // 正解時の紙吹雪
    if (type === 'correct') {
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#0f0', '#ff0', '#fff']
        });
    }
}

// 次の問題を表示またはステージクリア処理へ
function nextQuestion() {
    // 問題数上限またはモンスターHPが0以下の場合、ステージクリア
    if (state.quiz.questionCount >= state.quiz.maxQuestions || (state.game.currentMonster && state.game.currentMonster.hp <= 0)) {
        stageClear();
        return;
    }

    state.time.timeLeft = state.time.baseTime; // 残り時間をリセット
    clearInterval(state.time.timerInterval); // タイマーを停止
    startTimer(); // 新しいタイマーを開始

    state.quiz.currentQuestion = state.quiz.quizData[state.quiz.questionCount]; // 次の問題を取得
    state.quiz.questionCount++; // 問題数をカウントアップ

    elements.quizQuestion.textContent = state.quiz.currentQuestion.question; // 問題文を表示
    const optionsDiv = elements.quizOptions;
    optionsDiv.innerHTML = ''; // 選択肢をクリア

    // 選択肢を生成して表示
    state.quiz.currentQuestion.options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'option hvr-grow';
        div.textContent = opt;
        div.onclick = () => {
            // 選択されたオプションをハイライト
            document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
            div.classList.add('selected');
            state.quiz.selectedOption = opt; // 選択肢をstateに保存
            submitAnswer(); // 回答判定へ
        };
        optionsDiv.appendChild(div);
    });

    updateDialog('sansDialog', 'よお、勇者！この謎を解け！'); // サンズのセリフ更新
    state.quiz.selectedOption = null; // 選択肢をリセット
    // エフェクト表示をリセット
    elements.quizModal.classList.remove('correct', 'wrong');
    elements.effectOverlay.style.display = 'none';
}

// ステージクリア処理
function stageClear() {
    closeModal('quizModal'); // クイズモーダルを閉じる
    const stageClearModal = elements.stageClearModal;
    // ステージクリア表示とボタン
    stageClearModal.innerHTML = `
        <h2>ステージクリア！</h2>
        <p>よくやったぜ、勇者！次のステージへ行くか？</p>
        <div><button class="button hvr-grow" onclick="nextStage()">次へ</button><button class="button hvr-grow" onclick="rest()">休む</button></div>
    `;
    stageClearModal.classList.add('active'); // ステージクリアモーダル表示
    document.body.classList.add('modal-open'); // 背景スクロール禁止

    // 経験値、ゴールド獲得
    state.player.exp += 20;
    state.player.gold += 50;
    checkLevelUp(); // レベルアップ判定
    savePlayerData(); // データ保存

    updateDialog('sansDialog', `ステージ${state.game.stage}クリア！${state.player.exp}EXPと${state.player.gold}Gを手に入れたぜ！`); // サンズのセリフ更新
    confetti({ // 紙吹雪
        particleCount: 200,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#0f0', '#ff0', '#fff']
    });
}

// 回答判定処理
function submitAnswer() {
    clearInterval(state.time.timerInterval); // タイマー停止

    // オプションボタンを一時的に無効化して連打を防ぐ
    const optionButtons = document.querySelectorAll('#quizOptions .option');
    optionButtons.forEach(button => button.style.pointerEvents = 'none');

    const isCorrect = state.quiz.selectedOption === state.quiz.currentQuestion.answer; // 正誤判定

    if (isCorrect) {
        state.quiz.correctCount++; // 正解数カウントアップ
        addHeart(); // ハートアニメーション
        state.player.exp += 15; // 経験値獲得
        state.player.gold += 10; // ゴールド獲得

        // モンスターにダメージ
        if (state.game.currentMonster) { // モンスターが存在する場合のみダメージ
            state.game.currentMonster.hp -= 15;
            if (state.game.currentMonster.hp < 0) state.game.currentMonster.hp = 0;
            updateMonsterHP(); // モンスターHP表示更新
        }

        updateDialog('sansDialog', 'グサッ！正解だ！敵に大ダメージ！'); // サンズのセリフ
        showEffect('correct'); // 正解エフェクト
    } else {
        // 間違い時のプレイヤーへのダメージ計算
        const baseDamage = state.damage;
        // レベルによるダメージ補正 (単純な加算ではなく、少し複雑な計算に)
        // 例: レベル1でダメージ5、レベル10でダメージ約16、レベル20でダメージ約23
        const levelAdjustedDamage = Math.round(baseDamage * (1 + Math.log10(state.player.level + 1))); // log10を使用、レベル1でも1+log10(2)で1.3倍程度
        let totalDamage = levelAdjustedDamage;
        let criticalMessage = '';

        // クリティカルヒット判定 (複数回判定)
        const criticalChances = [1, 3, 5]; // クリティカル判定回数の候補
        const criticalCount = criticalChances[Math.floor(Math.random() * criticalChances.length)]; // 判定回数をランダムに決定

        for (let i = 0; i < criticalCount; i++) {
            if (Math.random() < 0.3) { // 30%の確率でクリティカル
                const criticalDamage = Math.floor(Math.random() * (20 - 10 + 1)) + 10; // クリティカルダメージは10～20
                totalDamage += criticalDamage;
                criticalMessage += `クリティカルヒット！${criticalDamage}ダメージ！`;
            }
        }

        state.player.hp -= totalDamage; // プレイヤーHP減少
        // サンズのセリフ (時間切れか選択ミスかで分岐)
        updateDialog('sansDialog', state.quiz.selectedOption
            ? `ぶっぶー！外れた！敵の反撃だ！${criticalMessage || ''}合計${totalDamage}ダメージ！`
            : `時間切れ！敵の攻撃を受けた！${criticalMessage || ''}合計${totalDamage}ダメージ！`);
        showEffect('wrong'); // 間違いエフェクト
    }

    updateStatus(); // ステータス更新

    // HPが0以下になったらゲームオーバー
    if (state.player.hp <= 0) {
        showGameOver();
    } else {
        // 次の問題へ (エフェクト表示後に少し待つ)
        setTimeout(() => {
             optionButtons.forEach(button => button.style.pointerEvents = 'auto'); // ボタンを再度有効化
             nextQuestion();
        }, 1800);
    }
}

// ヒント使用処理
function useHint() {
    if (state.game.hints <= 0) {
        updateDialog('sansDialog', 'ヒントがねえぞ！ショップで買え！');
        return;
    }
    state.game.hints--; // ヒント消費
    updateDialog('sansDialog', `ヒント：正解は"${state.quiz.currentQuestion.answer}"だぜ！`); // 正解を表示
    savePlayerData(); // データ保存
}

// ショップモーダルを開く
function openShop() {
    elements.shopModal.classList.add('active');
    document.body.classList.add('modal-open'); // 背景スクロール禁止
    elements.shopGold.textContent = state.player.gold; // 現在のゴールドを表示
    updateDialog('shopDialog', `何を買う？ GOLD: ${state.player.gold}`); // ショップのセリフ
}

// アイテム購入処理
function buyItem(item) {
    let msg = '';
    let bought = false;
    if (item === 'pie' && state.player.gold >= 30) {
        state.player.gold -= 30;
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 15); // HP回復 (最大HPまで)
        msg = 'パイでHP回復！';
        bought = true;
    } else if (item === 'coffee' && state.player.gold >= 15) {
        state.player.gold -= 15;
        state.time.baseTime += 10; // 制限時間延長
        state.time.timeLeft = state.time.baseTime; // 現在の残り時間も延長
        msg = 'コーヒーで時間延長！';
        bought = true;
    } else if (item === 'hint' && state.player.gold >= 20) {
        state.player.gold -= 20;
        state.game.hints++; // ヒント券獲得
        msg = 'ヒント券ゲット！';
        bought = true;
    } else {
        msg = 'GOLDが足りねえ！'; // ゴールド不足
    }

    if (bought) {
        updateStatus(); // ステータス更新
        elements.shopGold.textContent = state.player.gold; // ショップのゴールド表示更新
        savePlayerData(); // データ保存
    }
    updateDialog('shopDialog', msg); // ショップのセリフ更新
}

// ショップモーダルを閉じる
function closeShop() {
    closeModal('shopModal');
}

// ゲームを完全に終了し、タイトル画面のような状態に戻す（トリエルメッセージ表示付き）
function endGame() {
     console.log('endGame function called'); // endGame関数が呼ばれたか確認用ログ
     // 全てのモーダルを閉じる
    closeModal('gameOver');
    closeModal('quizModal');
    closeModal('stageClear');
    closeModal('difficultyModal');
    closeModal('categoryModal');
    closeModal('shopModal');


    // トリエルのおやすみモーダルを表示 (SweetAlert2)
    Swal.fire({
        title: '<img src="undertale/tri.png" alt="Toriel" class="character-image">', // 画像パスはsans.htmlからの相対パスか確認
        text: 'ゆっくりお休みなさい、息子よ',
        icon: 'info', // アイコンタイプ
        confirmButtonText: 'さようなら',
        background: '#000',
        color: '#fff',
        confirmButtonColor: '#0f0',
        allowOutsideClick: false, // モーダル外クリックで閉じない
        allowEscapeKey: false, // Escapeキーで閉じない
        zIndex: 10000 // 高いz-indexを設定
    }).then(() => {
        // モーダルが閉じられた後の処理：ゲーム状態のリセット
        console.log('SweetAlert closed, resetting game state.'); // リセット前のログ
        state.player.hp = CONFIG.INITIAL_HP;
        state.player.maxHp = CONFIG.MAX_INITIAL_HP;
        state.player.exp = CONFIG.INITIAL_EXP;
        state.player.level = CONFIG.INITIAL_LEVEL;
        state.player.gold = CONFIG.INITIAL_GOLD;
        // 難易度に応じた初期時間とダメージをデフォルト（medium）に戻す
        state.time.baseTime = CONFIG.BASE_TIME.medium;
        state.time.timeLeft = CONFIG.BASE_TIME.medium;
        state.damage = CONFIG.INITIAL_DAMAGE.medium;

        // クイズ関連の状態をリセット
        state.game.currentMonster = null;
        state.quiz.quizData = [];
        state.quiz.currentQuestion = null;
        state.quiz.selectedOption = null;
        state.quiz.currentCategory = null;

        // ゲーム進行関連の状態もリセット (ステージ、ヒントなど)
        state.game.stage = 1;
        state.game.hints = 0;
        state.game.isFleeing = false; // 逃げるフラグもリセット

        savePlayerData(); // データ保存
        updateStatus(); // ステータス更新

        // 必要に応じて、タイトル画面や最初の状態に戻るUIを表示する処理を追加
        // 例: document.getElementById('startScreen').style.display = 'block';
        updateDialog('sansDialog', 'また遊ぼうぜ、キッド。'); // サンズのセリフ
         console.log('Game state reset complete.'); // リセット後のログ
    });
}


// 逃げる処理
function flee() {
    console.log('flee function called'); // flee関数が呼ばれたか確認用ログ
    console.log('elements.quizModal.classList.contains("active"):', elements.quizModal.classList.contains('active'));
    console.log('state.game.isFleeing:', state.game.isFleeing);


    // クイズモーダルが表示されていない、または既に逃げる処理中の場合は無視
    // elements.quizModal が active クラスを持たない、または state.game.isFleeing が true
    if (!elements.quizModal.classList.contains('active') || state.game.isFleeing) {
        if (!state.game.isFleeing) { // 既に逃げる処理中の場合はメッセージを表示しない
             updateDialog('sansDialog', '今は逃げられねえな...');
        }
        console.log('Flee condition met, returning.'); // 条件が満たされたらログを出力してreturn
        return;
    }
    console.log('Flee condition not met, proceeding.'); // 条件が満たされなかったらログを出力して続行


    state.game.isFleeing = true; // 逃げる処理中フラグを立てる

    // ボタンを無効化して連打を防ぐ
    const buttons = document.querySelectorAll('#quizModal .button');
    buttons.forEach(button => button.setAttribute('disabled', 'true'));

    // 逃走失敗のダメージ (難易度に応じたダメージの2倍)
    state.player.hp -= state.damage * 2;
    updateStatus(); // ステータス更新

    // 逃走成功メッセージ表示
    updateDialog('sansDialog', '逃げおおせたが、ダメージだ！'); // サンズのセリフ

    // クイズモーダルを閉じる
    closeModal('quizModal');

    // ゲーム終了処理（トリエルメッセージとリセット）を呼び出す
    endGame();

    // SweetAlert2のthen()内でフラグとボタン状態をリセットするため、ここでは削除
    // state.game.isFleeing = false; // 逃げる処理中フラグを解除
    // buttons.forEach(button => button.removeAttribute('disabled')); // ボタンを再度有効化

     console.log('Flee process initiated, calling endGame.'); // endGame呼び出し前のログ
}


// ゲームオーバー表示
function showGameOver() {
    closeModal('quizModal'); // クイズモーダルを閉じる
    elements.gameOverModal.classList.add('active'); // ゲームオーバーモーダル表示
    document.body.classList.add('modal-open'); // 背景スクロール禁止
    sounds.wrong.play(); // ゲームオーバー音 (間違い音を流用)
    updateDialog('sansDialog', 'ゲームオーバー！骨折れちまったな...'); // サンズのセリフ

    // ゲームオーバー表示とボタン
    elements.gameOverModal.innerHTML = `
        <h2>ゲームオーバー！</h2>
        <p>骨折れちまったな、勇者。もう一度挑むか？</p>
        <div>
            <button class="button hvr-grow" onclick="retryQuest()">再挑戦</button>
            <button class="button hvr-grow" onclick="endGame()">ゲームを終了する</button> </div>
    `;
}

// ゲームを最初からやり直す（レベル、ゴールドなど全てリセット）
function resetGame() {
    state.player.hp = CONFIG.INITIAL_HP;
    state.player.maxHp = CONFIG.MAX_INITIAL_HP;
    state.player.exp = CONFIG.INITIAL_EXP;
    state.player.level = CONFIG.INITIAL_LEVEL;
    state.player.gold = CONFIG.INITIAL_GOLD;
    state.time.baseTime = CONFIG.BASE_TIME[state.game.difficulty]; // 難易度に応じた初期時間
    state.time.timeLeft = CONFIG.BASE_TIME[state.game.difficulty];
    state.damage = CONFIG.INITIAL_DAMAGE[state.game.difficulty]; // 難易度に応じた初期ダメージ
    state.quiz.correctCount = 0;
    state.game.hearts = [];
    state.game.hints = 0;
    state.game.stage = 1;
    savePlayerData(); // データ保存
    updateStatus(); // ステータス更新
    closeModal('gameOver');
    closeModal('stageClear');
    closeModal('difficultyModal'); // 難易度選択からやり直し
    showDifficultyModal();
}


// クエスト再挑戦（ゴールドを少し失うが、レベルや経験値は維持）
function retryQuest() {
    state.player.hp = CONFIG.INITIAL_HP; // HPを初期値に戻す
    // 最大HPは現在のレベルに応じて再計算
    state.player.maxHp = Math.min(CONFIG.MAX_INITIAL_HP + (state.player.level - CONFIG.INITIAL_LEVEL) * 10, 200);
    state.player.gold = Math.max(0, state.player.gold - 10); // ゴールドを10減らす (最低0)
    state.time.baseTime = CONFIG.BASE_TIME[state.game.difficulty]; // 難易度に応じた初期時間
    state.time.timeLeft = CONFIG.BASE_TIME[state.game.difficulty];
    state.damage = CONFIG.INITIAL_DAMAGE[state.game.difficulty]; // 難易度に応じた初期ダメージ
    state.quiz.correctCount = 0;
    state.game.hearts = [];
    updateStatus(); // ステータス更新
    // 現在のカテゴリでクエストを再開
    if (state.quiz.currentCategory) {
         startQuest(state.quiz.currentCategory);
    } else {
         // カテゴリが不明な場合は難易度選択からやり直し
         showDifficultyModal();
    }
    closeModal('gameOver'); // ゲームオーバーモーダルを閉じる
}


// 次のステージへ進む
function nextStage() {
    state.game.stage++; // ステージ進行
    state.player.hp = state.player.maxHp; // HP全回復
    closeModal('stageClear'); // ステージクリアモーダルを閉じる
    // 同じカテゴリで次のクエストを開始
    if (state.quiz.currentCategory) {
        startQuest(state.quiz.currentCategory);
    } else {
         // カテゴリが不明な場合は難易度選択からやり直し
         showDifficultyModal();
    }
}

// 休む（ゲーム終了）処理
function rest() {
    // トリエルのおやすみモーダルを表示 (SweetAlert2)
    Swal.fire({
        title: '<img src="undertale/tri.png" alt="Toriel" class="character-image">', // 画像パスはsans.htmlからの相対パスか確認
        text: 'ゆっくりお休みなさい、息子よ',
        icon: 'info',
        confirmButtonText: 'さようなら',
        background: '#000',
        color: '#fff',
        confirmButtonColor: '#0f0',
        allowOutsideClick: false, // モーダル外クリックで閉じない
        allowEscapeKey: false // Escapeキーで閉じない
    }).then(() => {
        closeModal('stageClear'); // ステージクリアモーダルを閉じる
        endGame(); // endGameを呼び出す
    });
}

// キーボード操作のハンドリング
function handleKeydown(e) {
    const quiz = elements.quizModal;
    const cat = elements.categoryModal;
    const diff = elements.difficultyModal;
    const shop = elements.shopModal;

    // オプション選択のナビゲーションヘルパー
    const navigateOptions = (opts, currentIndex) => {
        let newIndex = currentIndex;
        const numOptions = opts.length;

        if (e.key === 'ArrowUp') {
            newIndex = currentIndex - 2;
            if (newIndex < 0) newIndex += numOptions; // 上端で下へループ
        } else if (e.key === 'ArrowDown') {
            newIndex = currentIndex + 2;
             if (newIndex >= numOptions) newIndex -= numOptions; // 下端で上へループ
        } else if (e.key === 'ArrowLeft') {
            newIndex = currentIndex - 1;
            if (newIndex < 0) newIndex += numOptions; // 左端で右へループ
        } else if (e.key === 'ArrowRight') {
            newIndex = currentIndex + 1;
            if (newIndex >= numOptions) newIndex -= numOptions; // 右端で左へループ
        }

        // 新しいインデックスが有効範囲内か確認
        if (newIndex >= 0 && newIndex < numOptions) {
            if (currentIndex >= 0 && currentIndex < numOptions) {
                 opts[currentIndex].classList.remove('selected');
            }
            opts[newIndex].classList.add('selected');
            return newIndex;
        }
        return currentIndex; // 無効な移動の場合は変更なし
    };


    if (quiz.classList.contains('active')) {
        e.stopPropagation(); // イベント伝播を停止
        const opts = document.querySelectorAll('#quizOptions .option');
        if (opts.length === 0) return; // オプションがない場合は何もしない

        let idx = Array.from(opts).findIndex(o => o.classList.contains('selected'));
        if (idx === -1) { // 何も選択されていない場合は最初の要素を選択
            idx = 0;
            opts[idx].classList.add('selected');
        } else {
             idx = navigateOptions(opts, idx); // 選択肢をナビゲート
        }

        state.quiz.selectedOption = opts[idx]?.textContent; // 選択中のオプションを更新

        if (e.key === 'z' || e.key === 'Enter') submitAnswer(); // ZキーまたはEnterで回答
        else if (e.key === 'h') useHint(); // Hキーでヒント
        else if (e.key === 's') openShop(); // Sキーでショップ
        else if (e.key === 'f') flee(); // Fキーで逃げる

    } else if (cat.classList.contains('active')) {
        e.stopPropagation();
        const opts = document.querySelectorAll('#categoryOptions .option');
         if (opts.length === 0) return;

        let idx = Array.from(opts).findIndex(o => o.classList.contains('selected'));
         if (idx === -1) {
            idx = 0;
            opts[idx].classList.add('selected');
        } else {
             idx = navigateOptions(opts, idx);
        }

        if (e.key === 'z' || e.key === 'Enter') {
            const sel = opts[idx];
            if (sel) {
                const displayName = sel.textContent;
                const catId = gameData.displayNameToCategory[displayName];
                startQuest(catId); // 選択したカテゴリでクエスト開始
            }
        }
    } else if (diff.classList.contains('active')) {
        e.stopPropagation();
        const opts = document.querySelectorAll('#difficultyOptions .option');
         if (opts.length === 0) return;

        let idx = Array.from(opts).findIndex(o => o.classList.contains('selected'));
         if (idx === -1) {
            idx = 0;
            opts[idx].classList.add('selected');
        } else {
             idx = navigateOptions(opts, idx);
        }

        if (e.key === 'z' || e.key === 'Enter') {
            const sel = opts[idx];
            if (sel) {
                 // 難易度テキストからレベルを取得 (例: "初級（40秒、ダメージ-3）" -> "初級")
                const levelText = sel.textContent.split('（')[0].toLowerCase();
                setDifficulty(levelText); // 難易度を設定
            }
        }
    } else if (shop.classList.contains('active')) {
        e.stopPropagation();
        const opts = document.querySelectorAll('#shopOptions .option');
         if (opts.length === 0) return;

        let idx = Array.from(opts).findIndex(o => o.classList.contains('selected'));
         if (idx === -1) {
            idx = 0;
            opts[idx].classList.add('selected');
        } else {
             idx = navigateOptions(opts, idx);
        }

        if (e.key === 'z' || e.key === 'Enter') {
            const sel = opts[idx];
            if (sel) {
                 // アイテムテキストからアイテム名を取得 (例: "パイ（HP+15、30G）" -> "パイ")
                const itemName = sel.textContent.split('（')[0].toLowerCase();
                buyItem(itemName); // アイテム購入
            }
        }
    }
}

// ページ読み込み完了後に実行
document.addEventListener('DOMContentLoaded', () => {
    loadPlayerData(); // プレイヤーデータを読み込み
    loadGameData(); // ゲームデータを読み込み (JSONファイル)

    // 逃げるボタンにイベントリスナーを追加
    // onclick属性ではなく、ここでイベントリスナーを登録することで、
    // DOMが準備できた後に確実に処理が紐づくようにします。
    // ただし、sans.htmlでonclick属性が使われているため、ここでは追加せず、
    // flee関数内のチェックを修正することで対応します。
    // elements.fleeButton.addEventListener('click', flee); // この行は削除またはコメントアウト

    // キーボードイベントリスナーを登録
    document.addEventListener('keydown', handleKeydown);
});

