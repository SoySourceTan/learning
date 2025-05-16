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

const state = {
    player: {
        hp: CONFIG.INITIAL_HP,
        maxHp: CONFIG.MAX_INITIAL_HP,
        exp: CONFIG.INITIAL_EXP,
        level: CONFIG.INITIAL_LEVEL,
        gold: CONFIG.INITIAL_GOLD
    },
    time: {
        timeLeft: CONFIG.INITIAL_TIME,
        baseTime: CONFIG.INITIAL_TIME,
        timerInterval: null
    },
    quiz: {
        currentQuestion: null,
        selectedOption: null,
        currentCategory: null,
        quizData: [],
        questionCount: 0,
        correctCount: 0,
        maxQuestions: CONFIG.MAX_QUESTIONS
    },
    game: {
        difficulty: 'medium',
        currentMonster: null,
        hearts: [],
        hints: 0,
        stage: 1,
        maxLevel: CONFIG.MAX_LEVEL,
        isFleeing: false
    },
    damage: CONFIG.INITIAL_DAMAGE.medium,
    data: {},
    sound: {
        isSoundOn: true // 音声状態の初期化
    }
};

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
    fleeButton: document.querySelector('#quizModal .buttons .button:last-child'),
    soundToggle: document.getElementById('soundToggle'),
    soundIcon: document.getElementById('soundIcon')
};

// 音声ON/OFF切り替え関数
function toggleSound() {
    try {
        state.sound.isSoundOn = !state.sound.isSoundOn;
        Howler.mute(!state.sound.isSoundOn);
        elements.soundIcon.textContent = state.sound.isSoundOn ? '🔊' : '🔇';
        localStorage.setItem('soundState', state.sound.isSoundOn);
        console.log(`Sound toggled: isSoundOn = ${state.sound.isSoundOn}`);
    } catch (e) {
        console.error('Error in toggleSound:', e);
    }
}

const sounds = {
    correct: new Howl({ src: ['correct.mp3'], volume: 0.6 }),
    wrong: new Howl({ src: ['incorrect.mp3'], volume: 0.6 }),
    levelUp: new Howl({ src: ['levelup.mp3'], volume: 0.5 }),
    click: new Howl({ src: ['click.mp3'], volume: 0.5 }),
    shop: new Howl({ src: ['shop.mp3'], volume: 0.5 }),
    hint: new Howl({ src: ['hint.mp3'], volume: 0.5 }),
    bgm: new Howl({
        src: ['bgm.mp3'],
        volume: 0.2,
        loop: true,
        autoplay: false
    }),
    flee: new Howl({ src: ['flee.mp3'], volume: 0.5 }),
    torielAppear: new Howl({ src: ['toriel_appear.mp3'], volume: 0.6 }),
    torielGoodbye: new Howl({ src: ['toriel_goodbye.mp3'], volume: 0.6 })
};

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
    displayNameToCategory: {}
};

gameData.displayNameToCategory = Object.fromEntries(
    Object.entries(gameData.categoryDisplayNames).map(([key, value]) => [value, key])
);

function loadPlayerData() {
    const saved = localStorage.getItem('playerData');
    if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(state.player, parsed.player);
        Object.assign(state.game, parsed.game);
        state.player.maxHp = Math.min(CONFIG.MAX_INITIAL_HP + (state.player.level - CONFIG.INITIAL_LEVEL) * 10, 200);
        state.player.hp = Math.min(state.player.hp, state.player.maxHp);
    }
    updateStatus();
}

function savePlayerData() {
    localStorage.setItem('playerData', JSON.stringify({
        player: state.player,
        game: {
            hints: state.game.hints,
            stage: state.game.stage
        }
    }));
}

async function loadGameData() {
    elements.loadingModal.classList.add('active');
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
                    throw e;
                })
        );
        const results = await Promise.all(dataPromises);
        state.data = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        console.log("All JSON data loaded:", state.data);
        populateCategories();
        elements.loadingModal.classList.remove('active');
    } catch (e) {
        elements.loadingModal.innerHTML = `<p>おっと、データが読み込めねえ！エラー: ${e.message} サーバーとファイルを確認してね！</p>`;
        console.error('Error loading data:', e);
    }
}

function populateCategories() {
    elements.categoryTabs.innerHTML = '';
    elements.tabContents.innerHTML = '';
    elements.categoryOptions.innerHTML = '';

    gameData.categories.forEach((cat, index) => {
        const displayName = gameData.categoryDisplayNames[cat];

        const tab = document.createElement('div');
        tab.className = `tab hvr-grow ${index === 0 ? 'active' : ''}`;
        tab.textContent = displayName;
        tab.setAttribute('onclick', `showTab('${cat}')`);
        elements.categoryTabs.appendChild(tab);

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

        const option = document.createElement('div');
        option.className = 'option hvr-grow';
        option.textContent = displayName;
        option.onclick = () => startQuest(cat);
        elements.categoryOptions.appendChild(option);

        populateTable(cat);
    });
}

function populateTable(cat) {
    const table = document.getElementById(`${cat}-table`);
    if (state.data[cat] && table) {
        state.data[cat].forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${item.term}</td><td>${item.description}</td>`;
            table.appendChild(row);
        });
    } else {
        console.warn(`No data available for ${cat} or table element not found.`);
    }
}

function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`.tab[onclick="showTab('${tabId}')"]`).classList.add('active');
    document.getElementById(`${tabId}-tab`).classList.add('active');
}

function generateQuizData(cat) {
    if (!state.data[cat]) return [];
    const categoryData = state.data[cat];
    if (categoryData.length === 0) return [];

    return categoryData.map(item => {
        const others = categoryData
            .filter(i => i.term !== item.term)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map(i => i.term);

        return {
            question: `${item.description}とは？`,
            options: [...others, item.term].sort(() => Math.random() - 0.5),
            answer: item.term
        };
    }).sort(() => Math.random() - 0.5)
      .slice(0, CONFIG.MAX_QUESTIONS);
}

function showDifficultyModal() {
    if (Object.keys(state.data).length === 0) {
        elements.loadingModal.innerHTML = '<p>データがまだだ、キッド。ちょっと待たな！</p>';
        return;
    }
    sounds.click.play();
    elements.difficultyModal.classList.add('active');
    document.body.classList.add('modal-open');
    updateDialog('difficultyDialog', 'どの難易度で旅立つ？選べよ！');
}

function setDifficulty(level) {
    sounds.click.play();
    const levelMap = {
        '初級': 'easy',
        '中級': 'medium',
        '上級': 'hard',
        'easy': 'easy',
        'medium': 'medium',
        'hard': 'hard'
    };
    const normalizedLevel = levelMap[level] || 'medium';

    state.game.difficulty = normalizedLevel;
    state.time.baseTime = CONFIG.BASE_TIME[normalizedLevel];
    state.time.timeLeft = CONFIG.BASE_TIME[normalizedLevel];
    state.damage = CONFIG.INITIAL_DAMAGE[normalizedLevel];
    closeModal('difficultyModal');
    showCategoryModal();

    console.log(`Difficulty set to ${normalizedLevel}, timeLeft: ${state.time.timeLeft}`);
}

function showCategoryModal() {
    if (Object.keys(state.data).length === 0) return;
    elements.categoryModal.classList.add('active');
    document.body.classList.add('modal-open');
    updateDialog('categoryDialog', 'どの書を開く？選べよ！');
}

function startQuest(cat) {
    sounds.click.play();
    if (!state.data[cat] || state.data[cat].length === 0) {
        updateDialog('sansDialog', 'この書はまだ開けねえか、データが空っぽだ！');
        return;
    }
    state.quiz.currentCategory = cat;
    state.quiz.quizData = generateQuizData(cat);
    if (state.quiz.quizData.length === 0) {
        updateDialog('sansDialog', 'このカテゴリでは問題が作れなかったみたいだ...');
        return;
    }

    state.quiz.questionCount = 0;
    state.quiz.correctCount = 0;
    state.game.hearts = [];
    state.player.exp += 5;
    checkLevelUp();
    savePlayerData();
    spawnMonster();
    elements.quizModal.classList.add('active');
    updateStatus();
    nextQuestion();
}

function spawnMonster() {
    const isBoss = state.game.stage % 4 === 0 && state.game.stage > 0;
    const monsterIndex = isBoss ? 4 : Math.floor(Math.random() * 4);
    state.game.currentMonster = { ...gameData.monsters[monsterIndex] };
    elements.monsterName.textContent = `${isBoss ? 'ボス ' : ''}${state.game.currentMonster.name}`;
    updateMonsterHP();
}

function updateMonsterHP() {
    const bar = elements.monsterHPBar;
    const monster = gameData.monsters.find(m => m.name === state.game.currentMonster.name);
    if (monster) {
        const maxMonsterHp = monster.hp;
        const currentMonsterHp = state.game.currentMonster.hp;
        const percentage = (currentMonsterHp / maxMonsterHp) * 100;
        bar.style.width = `${percentage}%`;
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
        clearInterval(state.time.timerInterval);
        state.time.timerInterval = null;
        state.game.hearts.forEach(h => h.remove());
        state.game.hearts = [];
        if (modalId === 'quizModal') {
            const buttons = document.querySelectorAll('#quizModal .button');
            buttons.forEach(button => button.removeAttribute('disabled'));
        }
    }
}

function startTimer() {
    if (isNaN(state.time.timeLeft) || state.time.timeLeft === undefined) {
        state.time.timeLeft = state.time.baseTime || CONFIG.INITIAL_TIME;
        console.warn(`Timer reset to ${state.time.timeLeft} due to invalid value`);
    }
    elements.timer.textContent = state.time.timeLeft;
    if (state.time.timerInterval) clearInterval(state.time.timerInterval);
    state.time.timerInterval = setInterval(() => {
        state.time.timeLeft--;
        elements.timer.textContent = state.time.timeLeft;
        if (state.time.timeLeft <= 0) {
            clearInterval(state.time.timerInterval);
            state.quiz.selectedOption = null;
            submitAnswer();
        }
    }, 1000);
}

function updateStatus() {
    elements.hp.textContent = `${state.player.hp}/${state.player.maxHp}`;
    elements.exp.textContent = state.player.exp;
    elements.level.textContent = state.player.level;
    elements.gold.textContent = state.player.gold;
}

function checkLevelUp() {
    const newLevel = Math.min(Math.floor(state.player.exp / 50) + 1, CONFIG.MAX_LEVEL);
    if (newLevel > state.player.level) {
        state.player.level = newLevel;
        state.player.maxHp = Math.min(CONFIG.MAX_INITIAL_HP + (state.player.level - CONFIG.INITIAL_LEVEL) * 10, 200);
        state.player.hp = state.player.maxHp;
        sounds.levelUp.play();
        updateDialog('sansDialog', `レベルアップ！${state.player.level}になったぜ！新たな力だ！`);
        updateStatus();
        savePlayerData();
    }
}

function updateDialog(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = `＊ ${text}`;
}

function addHeart() {
    const heart = document.createElement('div');
    heart.className = 'heart';
    heart.textContent = '💕';
    heart.style.left = `${Math.random() * 100}vw`;
    document.body.appendChild(heart);
    state.game.hearts.push(heart);

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
        translateY: -window.innerHeight * 2,
        opacity: [1, 0],
        duration: 6000,
        easing: 'easeOutQuad',
        complete: () => {
            heart.remove();
            state.game.hearts = state.game.hearts.filter(h => h !== heart);
        }
    });
}

function showEffect(type) {
    const overlay = elements.effectOverlay;
    overlay.textContent = type === 'correct' ? '〇' : '×';
    overlay.className = `${type} effect-overlay`;

    gsap.to(overlay, { scale: 2.5, opacity: 1, duration: 0.6, ease: "elastic.out(1, 0.3)", onStart: () => overlay.style.display = 'flex' });
    gsap.to(overlay, { scale: 3.5, opacity: 0, duration: 0.6, delay: 0.6, ease: "power2.in", onComplete: () => overlay.style.display = 'none' });

    (type === 'correct' ? sounds.correct : sounds.wrong).play();

    if (type === 'wrong') {
        const bone = document.createElement('div');
        bone.className = 'bone-attack';
        bone.textContent = '🦴';
        elements.quizModal.appendChild(bone);
        setTimeout(() => bone.remove(), 1000);
    }
    if (type === 'correct') {
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#0f0', '#ff0', '#fff']
        });
    }
}

function nextQuestion() {
    if (state.quiz.questionCount >= state.quiz.maxQuestions || (state.game.currentMonster && state.game.currentMonster.hp <= 0)) {
        stageClear();
        return;
    }

    state.time.timeLeft = state.time.baseTime;
    clearInterval(state.time.timerInterval);
    startTimer();

    state.quiz.currentQuestion = state.quiz.quizData[state.quiz.questionCount];
    state.quiz.questionCount++;

    elements.quizQuestion.textContent = state.quiz.currentQuestion.question;
    const optionsDiv = elements.quizOptions;
    optionsDiv.innerHTML = '';

    state.quiz.currentQuestion.options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'option hvr-grow';
        div.textContent = opt;
        div.onclick = () => {
            sounds.click.play();
            document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
            div.classList.add('selected');
            state.quiz.selectedOption = opt;
            submitAnswer();
        };
        optionsDiv.appendChild(div);
    });

    updateDialog('sansDialog', 'よお、勇者！この謎を解け！');
    state.quiz.selectedOption = null;
    elements.quizModal.classList.remove('correct', 'wrong');
    elements.effectOverlay.style.display = 'none';
}

function stageClear() {
    closeModal('quizModal');
    const stageClearModal = elements.stageClearModal;
    stageClearModal.innerHTML = `
        <h2>ステージクリア！</h2>
        <p>よくやったぜ、勇者！次のステージへ行くか？</p>
        <div><button class="button hvr-grow" onclick="nextStage()">次へ</button><button class="button hvr-grow" onclick="rest()">休む</button></div>
    `;
    stageClearModal.classList.add('active');
    document.body.classList.add('modal-open');

    state.player.exp += 20;
    state.player.gold += 50;
    checkLevelUp();
    savePlayerData();

    updateDialog('sansDialog', `ステージ${state.game.stage}クリア！${state.player.exp}EXPと${state.player.gold}Gを手に入れたぜ！`);
    confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#0f0', '#ff0', '#fff']
    });
}

function submitAnswer() {
    clearInterval(state.time.timerInterval);

    const optionButtons = document.querySelectorAll('#quizOptions .option');
    optionButtons.forEach(button => button.style.pointerEvents = 'none');

    const isCorrect = state.quiz.selectedOption === state.quiz.currentQuestion.answer;

    if (isCorrect) {
        state.quiz.correctCount++;
        addHeart();
        state.player.exp += 15;
        state.player.gold += 10;

        if (state.game.currentMonster) {
            state.game.currentMonster.hp -= 15;
            if (state.game.currentMonster.hp < 0) state.game.currentMonster.hp = 0;
            updateMonsterHP();
        }

        updateDialog('sansDialog', 'グサッ！正解だ！敵に大ダメージ！');
        showEffect('correct');
    } else {
        const baseDamage = state.damage;
        const levelAdjustedDamage = Math.round(baseDamage * (1 + Math.log10(state.player.level + 1)));
        let totalDamage = levelAdjustedDamage;
        let criticalMessage = '';

        const criticalChances = [1, 3, 5];
        const criticalCount = criticalChances[Math.floor(Math.random() * criticalChances.length)];

        for (let i = 0; i < criticalCount; i++) {
            if (Math.random() < 0.3) {
                const criticalDamage = Math.floor(Math.random() * (20 - 10 + 1)) + 10;
                totalDamage += criticalDamage;
                criticalMessage += `クリティカルヒット！${criticalDamage}ダメージ！`;
            }
        }

        state.player.hp -= totalDamage;
        updateDialog('sansDialog', state.quiz.selectedOption
            ? `ぶっぶー！外れた！敵の反撃だ！${criticalMessage || ''}合計${totalDamage}ダメージ！`
            : `時間切れ！敵の攻撃を受けた！${criticalMessage || ''}合計${totalDamage}ダメージ！`);
        showEffect('wrong');
    }

    updateStatus();

    if (state.player.hp <= 0) {
        showGameOver();
    } else {
        setTimeout(() => {
            optionButtons.forEach(button => button.style.pointerEvents = 'auto');
            nextQuestion();
        }, 1800);
    }
}

function useHint() {
    sounds.hint.play();
    if (state.game.hints <= 0) {
        updateDialog('sansDialog', 'ヒントがねえぞ！ショップで買え！');
        return;
    }
    state.game.hints--;
    updateDialog('sansDialog', `ヒント：正解は"${state.quiz.currentQuestion.answer}"だぜ！`);
    savePlayerData();
}

function openShop() {
    sounds.shop.play();
    elements.shopModal.classList.add('active');
    document.body.classList.add('modal-open');
    elements.shopGold.textContent = state.player.gold;
    updateDialog('shopDialog', `何を買う？ GOLD: ${state.player.gold}`);
}

function buyItem(item) {
    sounds.click.play();
    let msg = '';
    let bought = false;
    if (item === 'pie' && state.player.gold >= 30) {
        state.player.gold -= 30;
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 15);
        msg = 'パイでHP回復！';
        bought = true;
    } else if (item === 'coffee' && state.player.gold >= 15) {
        state.player.gold -= 15;
        state.time.baseTime += 10;
        state.time.timeLeft = state.time.baseTime;
        msg = 'コーヒーで時間延長！';
        bought = true;
    } else if (item === 'hint' && state.player.gold >= 20) {
        state.player.gold -= 20;
        state.game.hints++;
        msg = 'ヒント券ゲット！';
        bought = true;
    } else {
        msg = 'GOLDが足りねえ！';
    }

    if (bought) {
        updateStatus();
        elements.shopGold.textContent = state.player.gold;
        savePlayerData();
    }
    updateDialog('shopDialog', msg);
}

function closeShop() {
    sounds.click.play();
    closeModal('shopModal');
}

function endGame() {
    console.log('endGame function called');
    closeModal('gameOver');
    closeModal('quizModal');
    closeModal('stageClear');
    closeModal('difficultyModal');
    closeModal('categoryModal');
    closeModal('shopModal');

    Swal.fire({
        title: '<img src="undertale/tri.png" alt="Toriel" class="character-image">',
        text: 'ゆっくりお休みなさい、我が子よ',
        icon: 'info',
        confirmButtonText: 'さようなら',
        background: '#000',
        color: '#fff',
        confirmButtonColor: '#0f0',
        allowOutsideClick: false,
        allowEscapeKey: false,
        zIndex: 10000,
        willOpen: () => {
            sounds.torielAppear.play();
        }
    }).then(() => {
        sounds.torielGoodbye.play();
        console.log('SweetAlert closed, resetting game state.');
        state.player.hp = CONFIG.INITIAL_HP;
        state.player.maxHp = CONFIG.MAX_INITIAL_HP;
        state.player.exp = CONFIG.INITIAL_EXP;
        state.player.level = CONFIG.INITIAL_LEVEL;
        state.player.gold = CONFIG.INITIAL_GOLD;
        state.game.difficulty = state.game.difficulty || 'medium';
        state.time.baseTime = CONFIG.BASE_TIME[state.game.difficulty];
        state.time.timeLeft = CONFIG.BASE_TIME[state.game.difficulty];
        state.damage = CONFIG.INITIAL_DAMAGE[state.game.difficulty];
        state.game.currentMonster = null;
        state.quiz.quizData = [];
        state.quiz.currentQuestion = null;
        state.quiz.selectedOption = null;
        state.quiz.currentCategory = null;
        state.game.stage = 1;
        state.game.hints = 0;
        state.game.isFleeing = false;
        savePlayerData();
        updateStatus();
        updateDialog('sansDialog', 'また遊ぼうぜ、キッド。');
        console.log('Game state reset complete.');
    });
}

function flee() {
    console.log('flee function called');
    console.log('elements.quizModal.classList.contains("active"):', elements.quizModal.classList.contains('active'));
    console.log('state.game.isFleeing:', state.game.isFleeing);

    if (!elements.quizModal.classList.contains('active') || state.game.isFleeing) {
        if (!state.game.isFleeing) {
            updateDialog('sansDialog', '今は逃げられねえな...');
        }
        console.log('Flee condition met, returning.');
        return;
    }
    console.log('Flee condition not met, proceeding.');

    sounds.flee.play();
    state.game.isFleeing = true;

    const buttons = document.querySelectorAll('#quizModal .button');
    buttons.forEach(button => button.setAttribute('disabled', 'true'));

    state.player.hp -= state.damage * 2;
    updateStatus();

    updateDialog('sansDialog', '逃げおおせたが、ダメージだ！');
    closeModal('quizModal');
    endGame();

    console.log('Flee process initiated, calling endGame.');
}

function showGameOver() {
    closeModal('quizModal');
    elements.gameOverModal.classList.add('active');
    document.body.classList.add('modal-open');
    sounds.wrong.play();
    updateDialog('sansDialog', 'ゲームオーバー！骨折れちまったな...');

    elements.gameOverModal.innerHTML = `
        <h2>ゲームオーバー！</h2>
        <p>骨折れちまったな、勇者。もう一度挑むか？</p>
        <div>
            <button class="button hvr-grow" onclick="retryQuest()">再挑戦</button>
            <button class="button hvr-grow" onclick="endGame()">ゲームを終了する</button>
        </div>
    `;
}

function retryQuest() {
    sounds.click.play();
    state.player.hp = CONFIG.INITIAL_HP;
    state.player.maxHp = Math.min(CONFIG.MAX_INITIAL_HP + (state.player.level - CONFIG.INITIAL_LEVEL) * 10, 200);
    state.player.gold = Math.max(0, state.player.gold - 10);
    state.game.difficulty = state.game.difficulty || 'medium';
    state.time.baseTime = CONFIG.BASE_TIME[state.game.difficulty];
    state.time.timeLeft = CONFIG.BASE_TIME[state.game.difficulty];
    state.damage = CONFIG.INITIAL_DAMAGE[state.game.difficulty];
    state.quiz.correctCount = 0;
    state.game.hearts = [];
    updateStatus();
    if (state.quiz.currentCategory) {
        startQuest(state.quiz.currentCategory);
    } else {
        showDifficultyModal();
    }
    closeModal('gameOver');
}

function resetGame() {
    sounds.click.play();
    state.player.hp = CONFIG.INITIAL_HP;
    state.player.maxHp = CONFIG.MAX_INITIAL_HP;
    state.player.exp = CONFIG.INITIAL_EXP;
    state.player.level = CONFIG.INITIAL_LEVEL;
    state.player.gold = CONFIG.INITIAL_GOLD;
    state.game.difficulty = state.game.difficulty || 'medium';
    state.time.baseTime = CONFIG.BASE_TIME[state.game.difficulty];
    state.time.timeLeft = CONFIG.BASE_TIME[state.game.difficulty];
    state.damage = CONFIG.INITIAL_DAMAGE[state.game.difficulty];
    state.quiz.correctCount = 0;
    state.game.hearts = [];
    state.game.hints = 0;
    state.game.stage = 1;
    savePlayerData();
    updateStatus();
    closeModal('gameOver');
    closeModal('stageClear');
    closeModal('difficultyModal');
    showDifficultyModal();
}

function nextStage() {
    sounds.click.play();
    state.game.stage++;
    state.player.hp = state.player.maxHp;
    closeModal('stageClear');
    if (state.quiz.currentCategory) {
        startQuest(state.quiz.currentCategory);
    } else {
        showDifficultyModal();
    }
}

function rest() {
    sounds.click.play();
    Swal.fire({
        title: '<img src="undertale/tri.png" alt="Toriel" class="character-image">',
        text: 'ゆっくりお休みなさい、息子よ',
        icon: 'info',
        confirmButtonText: 'さようなら',
        background: '#000',
        color: '#fff',
        confirmButtonColor: '#0f0',
        allowOutsideClick: false,
        allowEscapeKey: false,
        willOpen: () => {
            sounds.torielAppear.play();
        }
    }).then(() => {
        sounds.torielGoodbye.play();
        closeModal('stageClear');
        endGame();
    });
}

function handleKeydown(e) {
    const quiz = elements.quizModal;
    const cat = elements.categoryModal;
    const diff = elements.difficultyModal;
    const shop = elements.shopModal;

    const navigateOptions = (opts, currentIndex) => {
        let newIndex = currentIndex;
        const numOptions = opts.length;

        if (e.key === 'ArrowUp') {
            newIndex = currentIndex - 2;
            if (newIndex < 0) newIndex += numOptions;
        } else if (e.key === 'ArrowDown') {
            newIndex = currentIndex + 2;
            if (newIndex >= numOptions) newIndex -= numOptions;
        } else if (e.key === 'ArrowLeft') {
            newIndex = currentIndex - 1;
            if (newIndex < 0) newIndex += numOptions;
        } else if (e.key === 'ArrowRight') {
            newIndex = currentIndex + 1;
            if (newIndex >= numOptions) newIndex -= numOptions;
        }

        if (newIndex >= 0 && newIndex < numOptions) {
            if (currentIndex >= 0 && currentIndex < numOptions) {
                opts[currentIndex].classList.remove('selected');
            }
            opts[newIndex].classList.add('selected');
            return newIndex;
        }
        return currentIndex;
    };

    if (quiz.classList.contains('active')) {
        e.stopPropagation();
        const opts = document.querySelectorAll('#quizOptions .option');
        if (opts.length === 0) return;

        let idx = Array.from(opts).findIndex(o => o.classList.contains('selected'));
        if (idx === -1) {
            idx = 0;
            opts[idx].classList.add('selected');
        } else {
            idx = navigateOptions(opts, idx);
        }

        state.quiz.selectedOption = opts[idx]?.textContent;

        if (e.key === 'z' || e.key === 'Enter') {
            sounds.click.play();
            submitAnswer();
        } else if (e.key === 'h') {
            sounds.hint.play();
            useHint();
        } else if (e.key === 's') {
            sounds.shop.play();
            openShop();
        } else if (e.key === 'f') {
            sounds.flee.play();
            flee();
        }
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
                sounds.click.play();
                const displayName = sel.textContent;
                const catId = gameData.displayNameToCategory[displayName];
                startQuest(catId);
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
                sounds.click.play();
                const levelText = sel.textContent.split('（')[0].toLowerCase();
                setDifficulty(levelText);
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
                sounds.click.play();
                const itemName = sel.textContent.split('（')[0].toLowerCase();
                buyItem(itemName);
            }
        }
    }
}

// ページ読み込み時の初期化（DOMContentLoadedリスナーを統合）
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded: Initializing game...');
    loadPlayerData();
    loadGameData();
    document.addEventListener('keydown', handleKeydown);

    // 音声状態の復元
    try {
        const savedSoundState = localStorage.getItem('soundState');
        if (savedSoundState !== null) {
            state.sound.isSoundOn = savedSoundState === 'true';
            Howler.mute(!state.sound.isSoundOn);
            elements.soundIcon.textContent = state.sound.isSoundOn ? '🔊' : '🔇';
            console.log(`Sound state restored: isSoundOn = ${state.sound.isSoundOn}`);
        }
        // 音声トグルのイベントリスナー
        if (elements.soundToggle) {
            elements.soundToggle.addEventListener('click', toggleSound);
            console.log('Sound toggle event listener added');
        } else {
            console.error('soundToggle element not found');
        }
    } catch (e) {
        console.error('Error in sound initialization:', e);
    }
});