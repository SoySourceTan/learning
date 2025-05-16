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
    data: {},
    hp: CONFIG.INITIAL_HP,
    maxHp: CONFIG.MAX_INITIAL_HP,
    exp: CONFIG.INITIAL_EXP,
    level: CONFIG.INITIAL_LEVEL,
    gold: CONFIG.INITIAL_GOLD,
    timeLeft: CONFIG.INITIAL_TIME,
    baseTime: CONFIG.INITIAL_TIME,
    damage: CONFIG.INITIAL_DAMAGE.medium,
    timerInterval: null,
    currentQuestion: null,
    selectedOption: null,
    currentCategory: null,
    quizData: [],
    difficulty: 'medium',
    currentMonster: null,
    questionCount: 0,
    correctCount: 0,
    hearts: [],
    hints: 0,
    stage: 1,
    maxQuestions: CONFIG.MAX_QUESTIONS,
    maxLevel: CONFIG.MAX_LEVEL
};

const correctSound = new Howl({ src: ['correct.mp3'], volume: 0.6 });
const wrongSound = new Howl({ src: ['incorrect.mp3'], volume: 0.6 });
const levelUpSound = new Howl({ src: ['levelup.mp3'], volume: 0.5 });

const monsters = [
    { name: 'フロギー', hp: 50 },
    { name: 'テミー', hp: 40 },
    { name: 'モルデン', hp: 60 },
    { name: 'ナプスタブルーク', hp: 75 },
    { name: 'ボス・アスゴア', hp: 100 }
];

const categories = ['civics', 'geography', 'history', 'regions'];
const categoryDisplayNames = {
    'civics': '公民',
    'geography': '地理',
    'history': '歴史',
    'regions': '地域'
};
const displayNameToCategory = Object.fromEntries(
    Object.entries(categoryDisplayNames).map(([key, value]) => [value, key])
);

function loadPlayerData() {
    const saved = localStorage.getItem('playerData');
    console.log('Loading player data:', saved);
    if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(state, parsed);
        state.maxHp = Math.min(CONFIG.MAX_INITIAL_HP + (state.level - CONFIG.INITIAL_LEVEL) * 10, 200);
        state.hp = Math.min(state.hp, state.maxHp);
        console.log('Loaded state:', state);
    } else {
        state.hp = CONFIG.INITIAL_HP;
        state.maxHp = CONFIG.MAX_INITIAL_HP;
        state.exp = CONFIG.INITIAL_EXP;
        state.level = CONFIG.INITIAL_LEVEL;
        state.gold = CONFIG.INITIAL_GOLD;
        state.hints = 0;
        state.stage = 1;
        console.log('Initialized state:', state);
    }
    updateStatus();
}

function savePlayerData() {
    localStorage.setItem('playerData', JSON.stringify({
        hp: state.hp,
        maxHp: state.maxHp,
        exp: state.exp,
        level: state.level,
        gold: state.gold,
        hints: state.hints,
        stage: state.stage
    }));
}

async function loadData() {
    document.getElementById('loadingModal').classList.add('active');
    try {
        const dataPromises = categories.map(cat =>
            fetch(`${cat}.json`).then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json().then(json => ({ [cat]: json }));
            })
        );
        const results = await Promise.all(dataPromises);
        state.data = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        populateCategories();
        document.getElementById('loadingModal').classList.remove('active');
    } catch (e) {
        document.getElementById('loadingModal').innerHTML = `<p>おっと、データが読み込めねえ！エラー: ${e.message} サーバーを確認してね！</p>`;
        console.error('Error loading data:', e);
    }
}

function populateCategories() {
    const tabsDiv = document.getElementById('categoryTabs');
    const contentsDiv = document.getElementById('tabContents');
    const categoryOptionsDiv = document.getElementById('categoryOptions');
    
    tabsDiv.innerHTML = '';
    contentsDiv.innerHTML = '';
    categoryOptionsDiv.innerHTML = '';

    categories.forEach((cat, index) => {
        const displayName = categoryDisplayNames[cat];

        const tab = document.createElement('div');
        tab.className = `tab hvr-grow ${index === 0 ? 'active' : ''}`;
        tab.textContent = displayName;
        tab.setAttribute('onclick', `showTab('${cat}')`);
        tabsDiv.appendChild(tab);

        const content = document.createElement('div');
        content.className = `tab-content ${index === 0 ? 'active' : ''}`;
        content.id = `${cat}-tab`;
        content.innerHTML = `
            <h2>${displayName}の書</h2>
            <table id="${cat}-table"><tr><th>用語</th><th>説明</th></tr></table>
            <p>サンズ「この${displayName}、掘り起こしてみな！」</p>
            <p>注：中学受験頻出用語を収録。出典：文部科学省、中学受験テキスト。</p>
        `;
        contentsDiv.appendChild(content);

        const option = document.createElement('div');
        option.className = 'option hvr-grow';
        option.textContent = displayName;
        option.onclick = () => startQuest(cat);
        categoryOptionsDiv.appendChild(option);

        populateTable(cat, cat);
    });
}

function populateTable(cat, key) {
    const table = document.getElementById(`${cat}-table`);
    if (state.data[key]) {
        state.data[key].forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${item.term}</td><td>${item.description}</td>`;
            table.appendChild(row);
        });
    } else {
        console.warn(`No data available for ${key}`);
    }
}

function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`[onclick="showTab('${tabId}')"]`).classList.add('active');
    document.getElementById(`${tabId}-tab`).classList.add('active');
}

function generateQuizData(cat) {
    if (!state.data[cat]) return [];
    return state.data[cat].map(item => {
        const others = state.data[cat].filter(i => i.term !== item.term).sort(() => Math.random() - 0.5).slice(0, 3).map(i => i.term);
        return { question: `${item.description}とは？`, options: [...others, item.term].sort(() => Math.random() - 0.5), answer: item.term };
    }).sort(() => Math.random() - 0.5).slice(0, state.maxQuestions);
}

function showDifficultyModal() {
    if (Object.keys(state.data).length === 0) {
        document.getElementById('loadingModal').innerHTML = '<p>データがまだだ、キッド。ちょっと待たな！</p>';
        return;
    }
    document.getElementById('difficultyModal').classList.add('active');
    document.body.classList.add('modal-open');
    updateDialog('difficultyDialog', 'どの難易度で旅立つ？選べよ！');
}

function setDifficulty(level) {
    state.difficulty = level;
    state.baseTime = CONFIG.BASE_TIME[level];
    state.timeLeft = CONFIG.BASE_TIME[level];
    state.damage = CONFIG.INITIAL_DAMAGE[level];
    document.getElementById('difficultyModal').classList.remove('active');
    document.body.classList.remove('modal-open');
    showCategoryModal();
}

function showCategoryModal() {
    if (Object.keys(state.data).length === 0) return;
    document.getElementById('categoryModal').classList.add('active');
    document.body.classList.add('modal-open');
    updateDialog('categoryDialog', 'どの書を開く？選べよ！');
}

function startQuest(cat) {
    if (!state.data[cat]) {
        updateDialog('sansDialog', 'この書はまだ開けねえ！データを見直せ！');
        return;
    }
    state.currentCategory = cat;
    state.quizData = generateQuizData(cat);
    state.questionCount = 0;
    state.correctCount = 0;
    state.hearts = [];
    state.exp += 5;
    checkLevelUp();
    savePlayerData();
    spawnMonster();
    document.getElementById('categoryModal').classList.remove('active');
    document.getElementById('quizModal').classList.add('active');
    updateStatus();
    nextQuestion();
}

function spawnMonster() {
    const isBoss = state.stage % 4 === 0 && state.stage > 0;
    state.currentMonster = { ...monsters[isBoss ? 4 : Math.floor(Math.random() * 4)] };
    document.getElementById('monsterName').textContent = `${isBoss ? 'ボス ' : ''}${state.currentMonster.name}`;
    updateMonsterHP();
}

function updateMonsterHP() {
    const bar = document.getElementById('monsterHPBar');
    bar.style.width = `${(state.currentMonster.hp / (monsters.find(m => m.name === state.currentMonster.name).hp)) * 100}%`;
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.classList.remove('modal-open');
    clearInterval(state.timerInterval);
    state.hearts.forEach(h => h.remove());
}

function startTimer() {
    document.getElementById('timer').textContent = state.timeLeft;
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        document.getElementById('timer').textContent = state.timeLeft;
        if (state.timeLeft <= 0) {
            clearInterval(state.timerInterval);
            state.selectedOption = null;
            submitAnswer();
        }
    }, 1000);
}

function updateStatus() {
    document.getElementById('hp').textContent = `${state.hp}/${state.maxHp}`;
    document.getElementById('exp').textContent = state.exp;
    document.getElementById('level').textContent = state.level;
    document.getElementById('gold').textContent = state.gold;
}

function checkLevelUp() {
    const newLevel = Math.min(Math.floor(state.exp / 50) + 1, CONFIG.MAX_LEVEL);
    if (newLevel > state.level) {
        state.level = newLevel;
        state.maxHp = Math.min(CONFIG.MAX_INITIAL_HP + (state.level - CONFIG.INITIAL_LEVEL) * 10, 200);
        state.hp = state.maxHp;
        levelUpSound.play();
        updateDialog('sansDialog', `レベルアップ！${state.level}になったぜ！新たな力だ！`);
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
    state.hearts.push(heart);
    anime({
        targets: heart,
        translateX: [
            { value: 12 * (Math.random() - 0.5), duration: 600 },
            { value: -12 * (Math.random - 0.5), duration: 600 }
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
            state.hearts = state.hearts.filter(h => h !== heart);
        }
    });
}

function showEffect(type) {
    const overlay = document.getElementById('effectOverlay');
    overlay.textContent = type === 'correct' ? '〇' : '×';
    overlay.className = `${type} effect-overlay`;
    gsap.to(overlay, { scale: 2.5, opacity: 1, duration: 0.6, ease: "elastic.out(1, 0.3)", onStart: () => overlay.style.display = 'flex' });
    gsap.to(overlay, { scale: 3.5, opacity: 0, duration: 0.6, delay: 0.6, ease: "power2.in", onComplete: () => overlay.style.display = 'none' });
    (type === 'correct' ? correctSound : wrongSound).play();
    if (type === 'wrong') {
        const bone = document.createElement('div');
        bone.className = 'bone-attack';
        bone.textContent = '🦴';
        document.getElementById('quizModal').appendChild(bone);
        setTimeout(() => bone.remove(), 1000);
    }
    if (type === 'correct') confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#0f0', '#ff0', '#fff'] });
}

function nextQuestion() {
    if (state.questionCount >= state.maxQuestions || state.currentMonster.hp <= 0) {
        stageClear();
        return;
    }
    state.timeLeft = state.baseTime;
    clearInterval(state.timerInterval);
    startTimer();
    state.currentQuestion = state.quizData[state.questionCount];
    state.questionCount++;
    document.getElementById('quizQuestion').textContent = state.currentQuestion.question;
    const optionsDiv = document.getElementById('quizOptions');
    optionsDiv.innerHTML = '';
    state.currentQuestion.options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'option hvr-grow';
        div.textContent = opt;
        div.onclick = () => {
            document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
            div.classList.add('selected');
            state.selectedOption = opt;
            submitAnswer();
        };
        optionsDiv.appendChild(div);
    });
    updateDialog('sansDialog', 'よお、勇者！この謎を解け！');
    state.selectedOption = null;
    document.getElementById('quizModal').classList.remove('correct', 'wrong');
    document.getElementById('effectOverlay').style.display = 'none';
}

function stageClear() {
    closeModal('quizModal');
    const stageClearModal = document.getElementById('stageClear');
    stageClearModal.innerHTML = `
        <h2>ステージクリア！</h2>
        <p>よくやったぜ、勇者！次のステージへ行くか？</p>
        <div><button class="button hvr-grow" onclick="nextStage()">次へ</button><button class="button hvr-grow" onclick="rest()">休む</button></div>
    `;
    stageClearModal.classList.add('active');
    document.body.classList.add('modal-open');
    state.exp += 20;
    state.gold += 50;
    checkLevelUp();
    savePlayerData();
    updateDialog('sansDialog', `ステージ${state.stage}クリア！${state.exp}EXPと${state.gold}Gを手に入れたぜ！`);
    confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 }, colors: ['#0f0', '#ff0', '#fff'] });
}

function submitAnswer() {
    clearInterval(state.timerInterval);
    const isCorrect = state.selectedOption === state.currentQuestion.answer;
    if (isCorrect) {
        state.correctCount++;
        addHeart();
        state.exp += 15;
        state.gold += 10;
        state.currentMonster.hp -= 15;
        if (state.currentMonster.hp < 0) state.currentMonster.hp = 0;
        updateMonsterHP();
        updateDialog('sansDialog', 'グサッ！正解だ！敵に大ダメージ！');
        showEffect('correct');
    } else {
        state.hp -= state.damage;
        updateDialog('sansDialog', state.selectedOption ? 'ぶっぶー！外れた！敵の反撃だ！' : '時間切れ！敵の攻撃を受けた！');
        showEffect('wrong');
    }
    updateStatus();
    if (state.hp <= 0) {
        showGameOver();
    } else {
        setTimeout(nextQuestion, 1800);
    }
}

function useHint() {
    if (state.hints <= 0) {
        updateDialog('sansDialog', 'ヒントがねえぞ！ショップで買え！');
        return;
    }
    state.hints--;
    updateDialog('sansDialog', `ヒント：正解は"${state.currentQuestion.answer}"だぜ！`);
    savePlayerData();
}

function openShop() {
    document.getElementById('shopModal').classList.add('active');
    document.body.classList.add('modal-open');
    document.getElementById('shopGold').textContent = state.gold;
    updateDialog('shopDialog', `何を買う？ GOLD: ${state.gold}`);
}

function buyItem(item) {
    let msg = '';
    if (item === 'pie' && state.gold >= 30) {
        state.gold -= 30;
        state.hp = Math.min(state.maxHp, state.hp + 15);
        msg = 'パイでHP回復！';
    } else if (item === 'coffee' && state.gold >= 15) {
        state.gold -= 15;
        state.baseTime += 10;
        state.timeLeft = state.baseTime;
        msg = 'コーヒーで時間延長！';
    } else if (item === 'hint' && state.gold >= 20) {
        state.gold -= 20;
        state.hints++;
        msg = 'ヒント券ゲット！';
    } else {
        msg = 'GOLDが足りねえ！';
    }
    updateStatus();
    document.getElementById('shopGold').textContent = state.gold;
    updateDialog('shopDialog', msg);
    savePlayerData();
}

function closeShop() {
    closeModal('shopModal');
}

function flee() {
    state.hp -= state.damage * 2;
    updateStatus();
    if (state.hp <= 0) showGameOver();
    else {
        closeModal('quizModal');
        updateDialog('sansDialog', '逃げおおせたが、ダメージだ！');
    }
}

function showGameOver() {
    closeModal('quizModal');
    document.getElementById('gameOver').classList.add('active');
    document.body.classList.add('modal-open');
    wrongSound.play();
    updateDialog('sansDialog', 'ゲームオーバー！骨折れちまったな...');
    document.getElementById('gameOver').innerHTML = `
        <h2>ゲームオーバー！</h2>
        <p>骨折れちまったな、勇者。もう一度挑むか？</p>
        <div><button class="button hvr-grow" onclick="retryQuest()">再挑戦</button><button class="button hvr-grow" onclick="quit()">やめる</button></div>
    `;
}

function resetLevel() {
    state.hp = CONFIG.INITIAL_HP;
    state.maxHp = CONFIG.MAX_INITIAL_HP;
    state.exp = CONFIG.INITIAL_EXP;
    state.level = CONFIG.INITIAL_LEVEL;
    state.gold = CONFIG.INITIAL_GOLD;
    state.baseTime = CONFIG.BASE_TIME[state.difficulty];
    state.timeLeft = CONFIG.BASE_TIME[state.difficulty];
    state.damage = CONFIG.INITIAL_DAMAGE[state.difficulty];
    state.correctCount = 0;
    state.hearts = [];
    state.hints = 0;
    state.stage = 1;
    savePlayerData();
    updateStatus();
    closeModal('gameOver');
    closeModal('stageClear');
    closeModal('difficultyModal');
    showDifficultyModal();
}

function retryQuest() {
    state.hp = CONFIG.INITIAL_HP;
    state.maxHp = Math.min(CONFIG.MAX_INITIAL_HP + (state.level - CONFIG.INITIAL_LEVEL) * 10, 200);
    state.gold = Math.max(0, state.gold - 10);
    state.baseTime = CONFIG.BASE_TIME[state.difficulty];
    state.timeLeft = CONFIG.BASE_TIME[state.difficulty];
    state.damage = CONFIG.INITIAL_DAMAGE[state.difficulty];
    state.correctCount = 0;
    state.hearts = [];
    updateStatus();
    startQuest(state.currentCategory);
    document.getElementById('gameOver').classList.remove('active');
}

function quit() {
    closeModal('gameOver');
    state.hp = CONFIG.INITIAL_HP;
    state.maxHp = CONFIG.MAX_INITIAL_HP;
    state.gold = CONFIG.INITIAL_GOLD;
    state.baseTime = CONFIG.BASE_TIME[state.difficulty];
    state.timeLeft = CONFIG.BASE_TIME[state.difficulty];
    state.damage = CONFIG.INITIAL_DAMAGE[state.difficulty];
}

function nextStage() {
    state.stage++;
    state.hp = state.maxHp;
    closeModal('stageClear');
    startQuest(state.currentCategory);
}

function rest() {
    Swal.fire({
        title: 'トリエル',
        text: 'ゆっくりお休みなさい、息子よ',
        icon: 'info',
        confirmButtonText: 'さようなら',
        background: '#000',
        color: '#fff',
        confirmButtonColor: '#0f0'
    }).then(() => {
        closeModal('stageClear');
        quit();
    });
}

function handleKeydown(e) {
    const quiz = document.getElementById('quizModal');
    const cat = document.getElementById('categoryModal');
    const diff = document.getElementById('difficultyModal');
    const shop = document.getElementById('shopModal');

    const navigateOptions = (opts, idx) => {
        if (e.key === 'ArrowUp' && idx > 1) {
            opts[idx].classList.remove('selected');
            opts[idx - 2].classList.add('selected');
            return idx - 2;
        } else if (e.key === 'ArrowDown' && idx < opts.length - 2) {
            opts[idx].classList.remove('selected');
            opts[idx + 2].classList.add('selected');
            return idx + 2;
        } else if (e.key === 'ArrowLeft' && idx % 2 === 1) {
            opts[idx].classList.remove('selected');
            opts[idx - 1].classList.add('selected');
            return idx - 1;
        } else if (e.key === 'ArrowRight' && idx % 2 === 0 && idx < opts.length - 1) {
            opts[idx].classList.remove('selected');
            opts[idx + 1].classList.add('selected');
            return idx + 1;
        }
        return idx;
    };

    if (quiz.classList.contains('active')) {
        e.stopPropagation();
        const opts = document.querySelectorAll('#quizOptions .option');
        let idx = Array.from(opts).findIndex(o => o.classList.contains('selected'));
        idx = navigateOptions(opts, idx);
        state.selectedOption = opts[idx]?.textContent;
        if (e.key === 'z' || e.key === 'Enter') submitAnswer();
        else if (e.key === 'h') useHint();
        else if (e.key === 's') openShop();
        else if (e.key === 'f') flee();
    } else if (cat.classList.contains('active')) {
        e.stopPropagation();
        const opts = document.querySelectorAll('#categoryOptions .option');
        let idx = Array.from(opts).findIndex(o => o.classList.contains('selected'));
        idx = navigateOptions(opts, idx);
        if (e.key === 'z' || e.key === 'Enter') {
            const sel = opts[idx];
            if (sel) {
                const displayName = sel.textContent;
                const catId = displayNameToCategory[displayName];
                startQuest(catId);
            }
        }
    } else if (diff.classList.contains('active')) {
        e.stopPropagation();
        const opts = document.querySelectorAll('#difficultyOptions .option');
        let idx = Array.from(opts).findIndex(o => o.classList.contains('selected'));
        idx = navigateOptions(opts, idx);
        if (e.key === 'z' || e.key === 'Enter') {
            const sel = opts[idx];
            if (sel) setDifficulty(sel.textContent.toLowerCase().split('（')[0]);
        }
    } else if (shop.classList.contains('active')) {
        e.stopPropagation();
        const opts = document.querySelectorAll('#shopOptions .option');
        let idx = Array.from(opts).findIndex(o => o.classList.contains('selected'));
        idx = navigateOptions(opts, idx);
        if (e.key === 'z' || e.key === 'Enter') {
            const sel = opts[idx];
            if (sel) buyItem(sel.textContent.toLowerCase().split('（')[0]);
        }
    }
}

document.addEventListener('keydown', handleKeydown);
loadPlayerData();
loadData();