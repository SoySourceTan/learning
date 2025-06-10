import { quizState, saveGameState } from './gameState.js';
import { config } from './config.js';
import { typeMessage, showQuizOptions } from './quiz.js';
import { updateUI, showFieldScreen, showReviveScreen, showEscapeScreen } from './ui.js';
import { playSpellEffect } from './effects.js';

// デバッグログ：quizState のインポート確認
console.log('quizState imported:', quizState);

export const jobs = {
    thief: { name: 'とうぞく', quizPref: 'nouns' },
    warrior: { name: 'せんし', quizPref: 'nouns' },
    mage: { name: 'まほうつかい', quizPref: 'verbs' },
    priest: { name: 'そうりょ', quizPref: 'verbs' },
    hero: { name: 'ゆうしゃ', quizPref: 'nouns' },
    merchant: { name: 'しょうにん', quizPref: 'nouns' },
    jester: { name: 'あそびにん', quizPref: 'adjectives' },
    sage: { name: 'けんじゃ', quizPref: 'verbs' }
};

export const soundEffects = {
    click: new Howl({ src: ['./sounds/click.mp3'], volume: 0.5 }),
    cursole: new Howl({ src: ['./sounds/cursole.mp3'], volume: 0.5 }),
    buttonClick: new Howl({ src: ['./sounds/cursole.mp3'], volume: 0.5 }),
    miss: new Howl({ src: ['./sounds/miss.mp3'], volume: 0.5 }),
    attack: new Howl({ src: ['./sounds/attack.mp3'], volume: 0.5 }),
    eneattack: new Howl({ src: ['./sounds/eneattack.mp3'], volume: 0.5 }),
    lvup: new Howl({ src: ['./sounds/lvup.mp3'], volume: 0.5 }),
    pattack: new Howl({ src: ['./sounds/attack.mp3'], volume: 0.5 }),
    spell: new Howl({ src: ['./sounds/spell.mp3'], volume: 0.5 }),
    recover: new Howl({ src: ['./sounds/recover.mp3'], volume: 0.5 }),
    win: new Howl({ src: ['./sounds/win.mp3'], volume: 0.5 }),
    escape: new Howl({ src: ['./sounds/escape.mp3'], volume: 0.5 }),
    yesno: new Howl({ src: ['./sounds/yesno.mp3'], volume: 0.5 }),
    incorrect: new Howl({ src: ['./sounds/incorrect.mp3'], volume: 0.5 }),
    battleBgm: null
};

// 重み付きランダム選択関数
function weightedRandom(items, weights) {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const rand = Math.random() * totalWeight;
    let currentWeight = 0;
    for (let i = 0; i < items.length; i++) {
        currentWeight += weights[i] || 1;
        if (rand <= currentWeight) {
            return items[i];
        }
    }
    return items[items.length - 1];
}

export function nextBattle() {
    console.log('Starting nextBattle, godMode:', quizState.godMode, 'godModeBoss:', quizState.godModeBoss);
    let selectedMonster;

    if (quizState.godMode && quizState.godModeBoss) {
        for (const level in config.monsters) {
            const monster = config.monsters[level].find(m => m.name === quizState.godModeBoss);
            if (monster) {
                selectedMonster = monster;
                break;
            }
        }
    } else {
        const availableMonsters = [];
        const weights = [];
        for (let level = 1; level <= quizState.level; level++) {
            if (config.monsters[level]) {
                config.monsters[level].forEach(monster => {
                    availableMonsters.push(monster);
                    weights.push(monster.weight || 1);
                });
            }
        }
        if (availableMonsters.length === 0) {
            availableMonsters.push(...(config.monsters[1] || []));
            weights.push(...availableMonsters.map(() => 1));
        }
        selectedMonster = weightedRandom(availableMonsters, weights);
    }

    if (!selectedMonster) {
        console.error('No monster selected, falling back to default');
        selectedMonster = config.monsters[1][0];
    }

    const [minHp, maxHp] = selectedMonster.hpRange;
    quizState.monster = {
        name: selectedMonster.name,
        maxHp: Math.floor(Math.random() * (maxHp - minHp + 1)) + minHp,
        currentHp: Math.floor(Math.random() * (maxHp - minHp + 1)) + minHp,
        exp: selectedMonster.exp,
        attack: selectedMonster.attack,
        image: selectedMonster.image,
        bgm: selectedMonster.bgm
    };
    console.log('Monster initialized:', quizState.monster);

    // BGM処理
    if (soundEffects.battleBgm) {
        soundEffects.battleBgm.stop();
        soundEffects.battleBgm = null;
    }
    if (quizState.monster.bgm) {
        try {
            soundEffects.battleBgm = new Howl({
                src: [quizState.monster.bgm],
                volume: 0.1,
                loop: true
            });
            soundEffects.battleBgm.play();
            console.log('BGM playing:', quizState.monster.bgm);
        } catch (error) {
            console.error('Error loading BGM:', quizState.monster.bgm, error);
        }
    } else {
        console.log('No BGM for monster:', quizState.monster.name);
    }

    const monsterImage = document.getElementById('monster-sprite');
    if (monsterImage) {
        monsterImage.style.backgroundImage = `url(${quizState.monster.image})`;
        monsterImage.style.filter = 'none';
        monsterImage.style.opacity = '1';
    }
    document.getElementById('monster-name').textContent = quizState.monster.name;
    quizState.isCommandPhase = true;
    quizState.currentAction = null;
    quizState.isMonsterDefeated = false;
    quizState.sukaraCount = 0;
    quizState.current = null;
    quizState.options = [];
    const commandWindow = document.getElementById('command-window');
    commandWindow.classList.remove('spell-menu');
    document.getElementById('quiz-options').innerHTML = '';
    document.getElementById('battle-message').textContent = '';
    document.getElementById('battle-feedback').textContent = '';
    showCommandOptions();
    typeMessage(`${quizState.monster.name}が あらわれた`, document.getElementById('battle-message'));
    saveGameState();
}

export function initializeGodMode() {
    // 元の状態を保存
    quizState.originalState = { ...quizState };
    // LV100 の状態を設定
    quizState.level = 100;
    quizState.maxHp = config.hpPerLevel * 100;
    quizState.maxMp = config.mpPerLevel * 100;
    quizState.hp = quizState.maxHp;
    quizState.mp = quizState.maxMp;
    quizState.exp = 0;
    quizState.expToNextLevel = Infinity;
    quizState.title = config.titles[Math.max(...Object.keys(config.titles).map(Number))] || '伝説';
    quizState.spells = Object.keys(config.spells);
    quizState.items = ['やくそう', 'まほうのせいすい'];
    quizState.godMode = true;
    updateUI();
    saveGameState();
}

export function restoreNormalMode() {
    if (quizState.originalState) {
        Object.assign(quizState, quizState.originalState);
        quizState.godMode = false;
        quizState.godModeBoss = null;
        quizState.monster = null;
        quizState.originalState = null;
        updateUI();
        saveGameState();
    }
}

export function showCommandOptions() {
    const commandWindow = document.getElementById('command-window');
    commandWindow.classList.remove('spell-menu');
    console.log('Command options re-rendered');
    commandWindow.innerHTML = `
        <div class="d-grid gap-1" style="grid-template-columns: repeat(2, 1fr);">
            <button class="dq3-btn btn" data-action="fight">たたかう</button>
            <button class="dq3-btn btn" data-action="spell">じゅもん</button>
            <button class="dq3-btn btn" data-action="item">どうぐ</button>
            <button class="dq3-btn btn" data-action="run">にげる</button>
        </div>
    `;
}

export function showSpellOptions() {
    console.log('Showing spell options');
    const commandWindow = document.getElementById('command-window');
    commandWindow.classList.add('spell-menu');
    commandWindow.innerHTML = `
        <div class="d-grid gap-1" style="grid-template-columns: repeat(2, 1fr);">
            ${quizState.spells.map(spell => `<button class="dq3-btn btn" data-action="cast-${spell}">${spell}</button>`).join('')}
            <button class="dq3-btn btn" data-action="cancel-spell">キャンセル</button>
        </div>
    `;
}

export function showItemOptions() {
    console.log('Showing item options');
    const commandWindow = document.getElementById('command-window');
    commandWindow.classList.remove('spell-menu');
    commandWindow.innerHTML = `
        <div class="d-grid gap-1" style="grid-template-columns: repeat(2, 1fr);">
            ${quizState.items.map(item => `<button class="dq3-btn btn" data-action="use-${item}">${item}</button>`).join('')}
            <button class="dq3-btn btn" data-action="cancel-item">キャンセル</button>
        </div>
    `;
}

export function executeAction(action) {
    const message = document.getElementById('battle-message');
    quizState.currentAction = action;
    console.log('Executing action:', action);

    if (action === 'fight') {
        quizState.isCommandPhase = false;
        if (quizState.current) {
            typeMessage(`${quizState.monster.name}の こうげき！！\n「${quizState.current.item.meaning}」は どれ？`, message);
        } else {
            showQuizOptions();
        }
    } else if (action === 'spell') {
        showSpellOptions();
    } else if (action === 'item') {
        showItemOptions();
    } else if (action === 'run') {
        soundEffects.escape.play();
        // BGM停止
        if (soundEffects.battleBgm) {
            soundEffects.battleBgm.stop();
            soundEffects.battleBgm = null;
            console.log('BGM stopped due to escape');
        }
        typeMessage(`${quizState.name}は にげだした_`, message, showFieldScreen, false);
    }
}

function restoreQuizState() {
    const message = document.getElementById('battle-message');
    if (quizState.current) {
        typeMessage(`${quizState.monster.name}の こうげき！！\n「${quizState.current.item.meaning}」は どれ？`, message);
        const quizOptions = document.getElementById('quiz-options');
        quizOptions.innerHTML = quizState.options.map((option, index) => `
            <div class="col-6">
                <button class="dq3-option btn w-100 ${option.disabled ? 'disabled' : ''}" 
                        data-index="${index}" 
                        data-is-correct="${option.word === quizState.current.item.word}" 
                        ${option.disabled ? 'disabled' : ''}>
                    <span class="option-text fs-4 py-0">${option.word}</span>
                </button>
            </div>
        `).join('');
    }
}

export function cancelAction(action) {
    quizState.isCommandPhase = true;
    const commandWindow = document.getElementById('command-window');
    commandWindow.classList.remove('spell-menu');
    commandWindow.style.pointerEvents = 'auto';
    showCommandOptions();
    restoreQuizState();
    console.log('Action cancelled:', action);
}

export function selectItemOrSpell(action) {
    console.log('Selecting item or spell:', action);
    const message = document.getElementById('battle-message');
    const battleScreen = $('#battle-screen');
    const effectLayer = document.getElementById('effect-layer');
    const commandWindow = document.getElementById('command-window');

    if (action.startsWith('use-')) {
        const item = action.replace('use-', '');
        console.log('Checking item:', item, 'Available items:', quizState.items);
        if (quizState.items.includes(item)) {
            if (item === 'やくそう') {
                const healAmount = Math.floor(Math.random() * (18 - 8 + 1)) + 8;
                quizState.hp = Math.min(quizState.hp + healAmount, quizState.maxHp);
                soundEffects.recover.play();
                typeMessage(`${quizState.name}は ${item}を つかった！\nHPが ${healAmount} かいふくした！`, message, () => {
                    updateUI();
                    quizState.isCommandPhase = true;
                    commandWindow.style.pointerEvents = 'auto';
                    restoreQuizState();
                    showCommandOptions();
                });
            } else if (item === 'まほうのせいすい') {
                const recoverAmount = Math.floor(Math.random() * (30 - 20 + 1)) + 20;
                quizState.mp = Math.min(quizState.mp + recoverAmount, quizState.maxMp);
                soundEffects.recover.play();
                typeMessage(`${quizState.name}は ${item}を つかった！\nMPが ${recoverAmount} かいふくした！`, message, () => {
                    updateUI();
                    quizState.isCommandPhase = true;
                    commandWindow.style.pointerEvents = 'auto';
                    restoreQuizState();
                    showCommandOptions();
                });
            }
        } else {
            console.log('Item not found:', item);
        }
    } else if (action.startsWith('cast-')) {
        const spell = action.replace('cast-', '');
        console.log('Checking spell:', spell, 'Available spells:', quizState.spells);
        // 修正：メニューを即座に閉じる
        commandWindow.classList.remove('spell-menu');
        commandWindow.innerHTML = '';
        console.log('Spell menu closed:', !commandWindow.classList.contains('spell-menu'), 'Content:', commandWindow.innerHTML);

        if (quizState.spells.includes(spell)) {
            const spellConfig = config.spells[spell];
            const requiredLevel = spellConfig.requiredLevel;
            let mpCost = spellConfig.mpCost;

            if (quizState.level < requiredLevel) {
                typeMessage(`${quizState.name}のレベルが足りません！（必要レベル: ${requiredLevel}）`, message, () => {
                    quizState.isCommandPhase = true;
                    commandWindow.style.pointerEvents = 'auto';
                    showCommandOptions();
                });
                return;
            }

            if (spell === 'スカラ') {
                mpCost = 20 + quizState.sukaraCount * 10;
            }

            if (quizState.mp < mpCost) {
                typeMessage(`${quizState.name}のMPが足りません！`, message, () => {
                    quizState.isCommandPhase = true;
                    commandWindow.style.pointerEvents = 'auto';
                    showCommandOptions();
                });
                return;
            }

            quizState.mp -= mpCost;
            const feedback = mpCost > 0 ? `\nMPが ${mpCost} 消費された！` : '';

            // 修正：サウンドとエフェクトを非同期で実行
            soundEffects.spell.play();
            playSpellEffect(spell, effectLayer, battleScreen); // await を外す

            if (spell === 'ホイミ') {
                const healAmount = Math.floor(Math.random() * (18 - 8 + 1)) + 8;
                quizState.hp = Math.min(quizState.hp + healAmount, quizState.maxHp);
                soundEffects.recover.play();
                typeMessage(`${quizState.name}は ${spell}を となえた！${feedback}\nHPが ${healAmount} かいふくした！`, message, () => {
                    updateUI();
                    quizState.isCommandPhase = true;
                    commandWindow.style.pointerEvents = 'auto';
                    restoreQuizState();
                    setTimeout(() => showCommandOptions(), 2000); // エフェクト終了後に表示
                });
            } else if (spell === 'スカラ') {
                const options = document.querySelectorAll('.dq3-option');
                const incorrectOptions = Array.from(options).filter(opt => opt.dataset.isCorrect === 'false' && !opt.disabled);
                if (incorrectOptions.length > 0 && quizState.sukaraCount < 3) {
                    const randomIndex = Math.floor(Math.random() * incorrectOptions.length);
                    incorrectOptions[randomIndex].disabled = true;
                    incorrectOptions[randomIndex].style.opacity = '0.5';
                    const optionIndex = parseInt(incorrectOptions[randomIndex].dataset.index, 10);
                    quizState.options[optionIndex].disabled = true;
                    quizState.sukaraCount++;
                    const currentMessage = `${quizState.monster.name}の こうげき！！\n「${quizState.current?.item.meaning || ''}」は どれ？`;
                    const remainingOptions = Array.from(options).filter(opt => !opt.disabled).length;
                    let scalaMessage = `選択肢がひとつ消えた！`;
                    if (remainingOptions === 1) {
                        scalaMessage = `選択肢がひとつだけになった！`;
                        const correctOption = Array.from(options).find(opt => opt.dataset.isCorrect === 'true');
                        if (correctOption) {
                            const index = parseInt(correctOption.dataset.index, 10);
                            setTimeout(() => checkAnswer(index), 1000);
                        }
                    }
                    typeMessage(`${currentMessage}\n${quizState.name}は ${spell}を となえた！${feedback}\n${scalaMessage}`, message, () => {
                        updateUI();
                        quizState.isCommandPhase = false;
                        setTimeout(() => showCommandOptions(), 2000); // エフェクト終了後に表示
                    });
                } else {
                    typeMessage(`${quizState.name}は ${spell}を となえた！${feedback}\nこれ以上選択肢を減らせない！`, message, () => {
                        updateUI();
                        quizState.isCommandPhase = true;
                        commandWindow.style.pointerEvents = 'auto';
                        restoreQuizState();
                        setTimeout(() => showCommandOptions(), 2000); // エフェクト終了後に表示
                    });
                }
            } else {
                let effectFeedback = '';
                switch (spell) {
                    case 'ギガデイン':
                        effectFeedback = `\n${quizState.monster.name}は 感電した！`;
                        break;
                    case 'メラ':
                        effectFeedback = `\n${quizState.monster.name}は 燃え上がった！`;
                        break;
                    case 'ギラ':
                        effectFeedback = `\n${quizState.monster.name}は ビクッとした！`;
                        break;
                    case 'バギ':
                        effectFeedback = `\n${quizState.monster.name}は 吹き飛ばされそうになった！`;
                        break;
                    case 'ヒャド':
                        effectFeedback = `\n${quizState.monster.name}は 凍りついた！`;
                        break;
                    case 'レムオム':
                        effectFeedback = `\n${quizState.monster.name}は 眠気を誘われた！`;
                        break;
                    case 'ルーラ':
                        effectFeedback = `\n${quizState.monster.name}は 混乱した！`;
                        break;
                }
                typeMessage(`${quizState.name}は ${spell}を となえた！${feedback}${effectFeedback}`, message, () => {
                    updateUI();
                    quizState.isCommandPhase = true;
                    commandWindow.style.pointerEvents = 'auto';
                    restoreQuizState();
                    if (spell === 'ルーラ') {
                        showFieldScreen();
                    } else {
                        setTimeout(() => showCommandOptions(), 2000); // エフェクト終了後に表示
                    }
                });
            }
        } else {
            console.log('Spell not found:', spell);
            showCommandOptions();
        }
    } else if (action === 'cancel-spell' || action === 'cancel-item') {
        cancelAction(action);
    }
}

function handleMonsterDefeat() {
    const feedback = document.getElementById('battle-feedback');
    const monsterImage = document.getElementById('monster-sprite');
    soundEffects.win.play();
    // BGM停止
    if (soundEffects.battleBgm) {
        soundEffects.battleBgm.stop();
        soundEffects.battleBgm = null;
        console.log('BGM stopped due to monster defeat');
    }
    if (monsterImage) {
        monsterImage.style.filter = 'grayscale(100%)';
        monsterImage.style.opacity = '0.5';
    }
    console.log('Before EXP add:', quizState.exp, 'Monster EXP:', quizState.monster.exp);
    quizState.exp += quizState.monster.exp;
    console.log('After EXP add:', quizState.exp);
    quizState.isMonsterDefeated = true;
    quizState.current = null;
    quizState.options = [];
    quizState.sukaraCount = 0;
    const commandWindow = document.getElementById('command-window');
    commandWindow.classList.remove('spell-menu');
    document.getElementById('quiz-options').innerHTML = '';
    document.getElementById('battle-message').textContent = '';
    document.getElementById('battle-feedback').textContent = '';
    typeMessage(`${quizState.monster.name}を たおした！！！`, document.getElementById('battle-message'), () => {
        if (quizState.exp >= quizState.expToNextLevel) {
            quizState.level++;
            quizState.maxHp += config.hpPerLevel;
            quizState.maxMp += config.mpPerLevel;
            quizState.hp = quizState.maxHp;
            quizState.mp = quizState.maxMp;
            quizState.expToNextLevel = Math.round(quizState.expToNextLevel * config.expMultiplier);
            soundEffects.lvup.play();
            const title = Object.keys(config.titles).reduce((prev, curr) => 
                (curr <= quizState.level && curr > prev) ? curr : prev, 0);
            if (title) quizState.title = config.titles[title];
            typeMessage(`${quizState.name}はレベル${quizState.level}に上がった！${quizState.title || ''}\nHPとMPが最大まで回復！`, feedback, () => {
                feedback.textContent = '';
                updateUI();
                showFieldScreen();
                quizState.isCommandPhase = true;
                saveGameState();
            });
        } else {
            feedback.textContent = '';
            updateUI();
            showFieldScreen();
            quizState.isCommandPhase = true;
            saveGameState();
        }
    });
}

export function checkAnswer(index) {
    if (index === -1) {
        return;
    }

    const selectedOption = quizState.options[index];
    const isCorrect = quizState.current.correctAnswers.some(ans => ans.word === selectedOption.word);
    const feedback = document.getElementById('battle-feedback');
    document.querySelectorAll('.dq3-option').forEach(btn => btn.disabled = true);

    if (isCorrect) {
        soundEffects.attack.play();
        typeMessage(`正解！！！${quizState.name}の攻撃！`, feedback, () => {
            const baseDamage = Math.floor(Math.random() * 10) + 1;
            const levelBonus = quizState.level * 2;
            const damage = baseDamage + levelBonus;
            quizState.monster.currentHp -= damage;
            console.log(`Damage calculation: Base=${baseDamage}, LevelBonus=${levelBonus}, Total=${damage}`);
            const monsterImage = document.getElementById('monster-sprite');
            if (monsterImage) {
                monsterImage.style.animation = 'none';
                monsterImage.classList.add('shake');
                monsterImage.style.setProperty('--shake-x', `-${config.enemyShakeMagnitude}px`);
                monsterImage.style.setProperty('--shake-y', `${config.enemyShakeMagnitude}px`);
                setTimeout(() => {
                    monsterImage.classList.remove('shake');
                    monsterImage.style.animation = 'monster-wiggle 1s infinite';
                }, 500);
            }
            const battleScreen = document.getElementById('battle-screen');
            if (battleScreen) {
                battleScreen.classList.add('shake');
                battleScreen.style.setProperty('--shake-x', `-${config.enemyShakeMagnitude}px`);
                battleScreen.style.setProperty('--shake-y', `${config.enemyShakeMagnitude}px`);
                setTimeout(() => battleScreen.classList.remove('shake'), 500);
            }
            typeMessage(`${quizState.monster.name}に ${damage} のダメージ！`, feedback, () => {
                if (quizState.monster.currentHp <= 0) {
                    handleMonsterDefeat();
                } else {
                    quizState.isCommandPhase = true;
                    quizState.current = null;
                    quizState.options = [];
                    quizState.sukaraCount = 0;
                    const commandWindow = document.getElementById('command-window');
                    commandWindow.style.pointerEvents = 'auto';
                    document.getElementById('quiz-options').innerHTML = '';
                    document.getElementById('battle-message').textContent = '';
                    document.getElementById('battle-feedback').textContent = '';
                    showCommandOptions();
                    showQuizOptions();
                }
            });
        });
    } else {
        soundEffects.incorrect.play();
        typeMessage(`ミス！！！`, feedback, () => {
            const [minAttack, maxAttack] = quizState.monster.attack;
            const damage = Math.floor(Math.random() * (maxAttack - minAttack + 1)) + minAttack;
            quizState.hp = Math.max(0, quizState.hp - damage);
            soundEffects.eneattack.play();
            const battleScreen = document.getElementById('battle-screen');
            if (battleScreen) {
                battleScreen.classList.add('shake');
                battleScreen.style.setProperty('--shake-x', `-${config.playerShakeMagnitude}px`);
                battleScreen.style.setProperty('--shake-y', `${config.playerShakeMagnitude}px`);
                setTimeout(() => battleScreen.classList.remove('shake'), 500);
            }
            typeMessage(`${quizState.name}は ${damage} のダメージを受けた`, feedback, () => {
                updateUI();
                if (quizState.hp <= 0) {
                    if (soundEffects.battleBgm) {
                        soundEffects.battleBgm.stop();
                        soundEffects.battleBgm = null;
                        console.log('BGM stopped due to game over');
                    }
                    showReviveScreen();
                } else {
                    const correctWords = quizState.current.correctAnswers.map(ans => ans.word).join(' または ');
                    const feedbackText = quizState.current.questionType === 'related'
                        ? `正解は「${correctWords}」。「${quizState.current.item.meaning}」に近い意味です`
                        : quizState.current.questionType === 'antonym'
                        ? `正解は「${correctWords}」。「${quizState.current.item.meaning}」の反対語です`
                        : `正解は「${correctWords}」`;
                    typeMessage(feedbackText, feedback, () => {
                        quizState.isCommandPhase = true;
                        quizState.current = null;
                        quizState.options = [];
                        quizState.sukaraCount = 0;
                        const commandWindow = document.getElementById('command-window');
                        commandWindow.style.pointerEvents = 'auto';
                        document.getElementById('quiz-options').innerHTML = '';
                        document.getElementById('battle-message').textContent = '';
                        document.getElementById('battle-feedback').textContent = '';
                        showCommandOptions();
                        showQuizOptions();
                    }, true); // wait: true でクリック待機
                }
            });
        });
    }
}