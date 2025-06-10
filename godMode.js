import { config } from './config.js';
import { quizState, saveGameState } from './gameState.js';
import { nextBattle, initializeGodMode, restoreNormalMode } from './battle.js';
import { showFieldScreen, showReviveScreen, showEscapeScreen, updateUI } from './ui.js';
import { soundEffects } from './battle.js';
import { loadWordData } from './quiz.js';

async function startGodModeAdventure(bossName) {
    await loadWordData();
    quizState.godModeBoss = bossName;
    quizState.monster = null; // 現在のモンスターをクリア
    initializeGodMode();
    document.getElementById('god-mode-menu').classList.add('hidden');
    document.getElementById('start-screen')?.classList.add('hidden');
    document.getElementById('field-screen')?.classList.add('hidden');
    document.getElementById('battle-screen').classList.remove('hidden');
    nextBattle();
}

document.addEventListener('DOMContentLoaded', () => {
    const godModeMenu = document.getElementById('god-mode-menu');
    const bossSelect = document.getElementById('boss-select');
    const startGodBattleBtn = document.getElementById('start-god-battle');
    const playerJob = document.getElementById('player-job');

    // モンスター一覧をドロップダウンに追加
    const monsters = [];
    for (const level in config.monsters) {
        config.monsters[level].forEach(monster => {
            if (!monsters.some(m => m.name === monster.name)) {
                monsters.push(monster);
            }
        });
    }
    monsters.forEach(monster => {
        const option = document.createElement('option');
        option.value = monster.name;
        option.textContent = monster.name;
        bossSelect.appendChild(option);
    });

    // ヘッダーの player-job クリックで GOD モードメニューを表示
    playerJob.addEventListener('click', () => {
        soundEffects.buttonClick.play();
        godModeMenu.classList.toggle('hidden');
    });

    // ボス選択時の処理
    bossSelect.addEventListener('change', () => {
        startGodBattleBtn.disabled = !bossSelect.value;
    });

    // ボス戦開始
    startGodBattleBtn.addEventListener('click', async () => {
        if (bossSelect.value) {
            soundEffects.buttonClick.play();
            await startGodModeAdventure(bossSelect.value);
        }
    });

    // クエリパラメータで GOD モードを有効化
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('godMode') === 'true') {
        godModeMenu.classList.remove('hidden');
    }

    // 戦闘終了時に GOD モードを解除（クリックイベントで処理）
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.dq3-btn');
        if (btn && btn.dataset.action) {
            const action = btn.dataset.action;
            if (action === 'yes' || action === 'no') {
                const fieldMessage = document.getElementById('field-message')?.textContent || '';
                if (fieldMessage.includes('冒険をつづけますか？') || 
                    fieldMessage.includes('ゲームを おわりますか？') ||
                    fieldMessage.includes('ふっかつのいのりを ささげますか？')) {
                    if (quizState.godMode && action === 'no') {
                        restoreNormalMode();
                        godModeMenu.classList.add('hidden');
                    }
                }
            }
        }
    });
});