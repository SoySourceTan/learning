import { quizState, saveGameState } from './gameState.js';
import { typeMessage } from './quiz.js';

export function updateUI() {
    const stats = document.getElementById('player-stats');
    if (stats) stats.textContent = `LV: ${quizState.level} EXP: ${quizState.exp}/${quizState.expToNextLevel} HP: ${quizState.hp}/${quizState.maxHp} MP: ${quizState.mp}/${quizState.maxMp}`;

    const playerName = document.getElementById('player-name');
    const playerJob = document.getElementById('player-job');
    if (playerName) playerName.textContent = quizState.name || 'ゆうしゃ';
    if (playerJob) playerJob.textContent = quizState.title || '初心者';

    const playerLevel = document.getElementById('player-level');
    const playerExp = document.getElementById('player-exp');
    const headerExpBar = document.getElementById('header-exp-bar');
    if (playerLevel) playerLevel.textContent = `LV: ${quizState.level}`;
    if (playerExp) playerExp.textContent = `EXP: ${quizState.exp}/${quizState.expToNextLevel}`;
    if (headerExpBar) {
        const expPercent = (quizState.exp / quizState.expToNextLevel) * 100;
        headerExpBar.style.width = `${expPercent}%`;
    }

    console.log('UI updated, EXP:', quizState.exp, 'Name:', quizState.name, 'Title:', quizState.title, 'MP:', quizState.mp);
}

export function showInitialScreen() {
    // 機能: 初期画面表示 - 開始
    const startScreen = document.getElementById('start-screen');
    startScreen.classList.remove('hidden');
    startScreen.innerHTML = `
        <h1 class="fs-2 mb-4">冒険をはじめる</h1>
        <div class="d-grid gap-2">
            <button id="newGame" class="dq3-btn btn">はじめから</button>
            <button id="loadGame" class="dq3-btn btn">ぼうけんのしょ</button>
        </div>
    `;
    // 機能: 初期画面表示 - 終了
}

export function showCharacterCreation() {
    // 機能: キャラクター作成画面表示 - 開始
    const startScreen = document.getElementById('start-screen');
    startScreen.innerHTML = `
        <h1 class="fs-2 mb-4">冒険をはじめる</h1>
        <div class="d-flex flex-column gap-3">
            <input id="nameInput" class="dq3-input form-control" type="text" placeholder="名前を入力" aria-label="名前" value="ゆうしゃ">
            <select id="jobSelect" class="dq3-input form-select">
                <option value="thief">とうぞく</option>
                <option value="warrior" selected>せんし</option>
                <option value="mage">まほうつかい</option>
                <option value="priest">そうりょ</option>
                <option value="hero">ゆうしゃ</option>
                <option value="merchant">しょうにん</option>
                <option value="jester">あそびにん</option>
                <option value="sage">けんじゃ</option>
            </select>
            <button id="startAdventure" class="dq3-btn btn">冒険開始！</button>
        </div>
    `;
    // 機能: キャラクター作成画面表示 - 終了
}

export function showFieldScreen() {
    // 機能: 戦闘終了画面表示 - 開始
    console.log('Showing field screen');
    document.getElementById('battle-screen').classList.add('hidden');
    const fieldScreen = document.getElementById('field-screen');
    fieldScreen.classList.remove('hidden');
    const commandWindow = document.getElementById('command-window');
    commandWindow.innerHTML = '';
    const fieldMessage = document.getElementById('field-message');
    const fieldOptions = document.getElementById('field-options');
    fieldMessage.textContent = '';
    fieldOptions.textContent = ''; // 選択肢をクリア
    fieldOptions.classList.remove('hidden'); // 非表示解除
    typeMessage('冒険をつづけますか？', fieldMessage, () => {
        console.log('Rendering field options');
        fieldOptions.innerHTML = `
            <button class="dq3-btn btn w-100 text-center" data-action="yes">はい</button>
            <button class="dq3-btn btn w-100 text-center" data-action="no">いいえ</button>
        `;
        console.log('Field options HTML:', fieldOptions.innerHTML);
    });
    // 機能: 戦闘終了画面表示 - 終了
}

export function showEscapeScreen() {
    // 機能: 逃走画面表示 - 開始
    document.getElementById('battle-screen').classList.add('hidden');
    const fieldScreen = document.getElementById('field-screen');
    fieldScreen.classList.remove('hidden');
    const fieldMessage = document.getElementById('field-message');
    const fieldOptions = document.getElementById('field-options');
    fieldMessage.textContent = '';
    fieldOptions.textContent = ''; // 選択肢をクリア
    fieldOptions.classList.remove('hidden'); // 非表示解除
    // メッセージを削除し、直接 showFieldScreen を呼び出す
    showFieldScreen(); // 戦闘終了画面に戻る
    // 機能: 逃走画面表示 - 終了
}

export function showReviveScreen() {
    // 機能: 復活画面表示 - 開始
    document.getElementById('battle-screen').classList.add('hidden');
    const fieldScreen = document.getElementById('field-screen');
    fieldScreen.classList.remove('hidden');
    const fieldMessage = document.getElementById('field-message');
    const fieldOptions = document.getElementById('field-options');
    fieldMessage.textContent = '';
    fieldOptions.textContent = ''; // 選択肢をクリア
    fieldOptions.classList.remove('hidden'); // 非表示解除
    typeMessage('ふっかつのいのりを ささげますか？', fieldMessage, () => {
        fieldOptions.innerHTML = `
            <button class="dq3-btn btn w-100 text-center" data-action="yes">はい</button>
            <button class="dq3-btn btn w-100 text-center" data-action="no">いいえ</button>
        `;
    });
    // 機能: 復活画面表示 - 終了
}