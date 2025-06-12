// デフォルトの単語リスト
const fallbackWords = [
    {word: "red", meaning: "赤", category: "color", icon: "fas fa-circle", color: "red", background: "bg-color"},
    {word: "blue", meaning: "青", category: "color", icon: "fas fa-circle", color: "blue", background: "bg-color"},
    {word: "apple", meaning: "りんご", category: "fruit", icon: "fas fa-apple-alt", background: "bg-fruit"},
    {word: "dog", meaning: "犬", category: "animal", icon: "fas fa-dog", background: "bg-animal"},
    {word: "run", meaning: "走る", category: "action", icon: "fas fa-running", background: "bg-action"},
    {word: "happy", meaning: "幸せ", category: "emotion", icon: "fas fa-smile", background: "bg-emotion"},
    {word: "school", meaning: "学校", category: "school", background: "bg-school"},
    {word: "sun", meaning: "太陽", category: "weather", icon: "fas fa-star", background: "bg-weather"},
    {word: "one", meaning: "一", category: "number", icon: "fas fa-1", background: "bg-number"},
    {word: "home", meaning: "家", category: "house", icon: "fas fa-home", background: "bg-home"},
    {word: "scissors", meaning: "はさみ", category: "tool", icon: "fas fa-cut"}
];

// カテゴリーごとのアイコン
const defaultIcons = {
    'color': 'fas fa-palette',
    'vegetable': 'fas fa-carrot',
    'fruit': 'fas fa-apple-alt',
    'shape': 'fas fa-square',
    'body': 'fas fa-user',
    'sound': 'fas fa-volume-up',
    'animal': 'fas fa-paw',
    'weather': 'fas fa-cloud',
    'number': 'fas fa-1',
    'house': 'fas fa-home',
    'action': 'fas fa-running',
    'time': 'fas fa-clock',
    'school': 'fas fa-school',
    'emotion': 'fas fa-smile',
    'fish': 'fas fa-fish',
    'meat': 'fas fa-drumstick-bite',
    'soy': 'fas fa-seedling',
    'tool': 'fas fa-tools'
};

let words = [];
let audioContext;
let voicesLoaded = false;
let speechEnabled = true;

// 通知メッセージ
function showToast(message, type = 'info') {
    const toastContainer = $('<div class="position-fixed bottom-0 end-0 p-3" style="z-index: 1050"></div>');
    const toast = $(`
        <div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-body ${type === 'error' ? 'bg-danger text-white' : type === 'success' ? 'bg-success text-white' : ''}">${message}</div>
        </div>
    `);
    toastContainer.append(toast);
    $('body').append(toastContainer);
    toast.toast({ delay: 4000 }).show();
    setTimeout(() => toastContainer.remove(), 4500);
}

// 音声コンテキスト初期化
function initAudioContext() {
    if (!window.AudioContext && !window.webkitAudioContext) {
        showToast('このブラウザでは音声再生がサポートされていません。', 'error');
        return false;
    }
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    return true;
}

// 正解音
function playCorrectSound() {
    console.log('正解音再生開始');
    const audio = new Audio('correct.mp3');
    audio.onerror = () => {
        console.error('正解音の再生に失敗しました: correct.mp3');
        showToast('正解音を再生できませんでした。', 'error');
    };
    audio.play().then(() => {
        console.log('正解音再生完了');
    }).catch(error => {
        console.error('正解音再生エラー:', error);
        showToast('正解音の再生に失敗しました。', 'error');
    });
}

// 不正解音
function playIncorrectSound() {
    console.log('不正解音再生開始');
    const audio = new Audio('wrong.mp3');
    audio.onerror = () => {
        console.error('不正解音の再生に失敗しました: wrong.mp3');
        showToast('不正解音を再生できませんでした。', 'error');
    };
    audio.play().then(() => {
        console.log('不正解音再生完了');
    }).catch(error => {
        console.error('不正解音再生エラー:', error);
        showToast('不正解音の再生に失敗しました。', 'error');
    });
}

// 音声読み上げ
function speakWord(word, caller = 'unknown') {
    console.log(`speakWord 開始: word=${word}, caller=${caller}, speechEnabled=${speechEnabled}, speechSynthesis=${!!window.speechSynthesis}`);
    if (!speechEnabled || !window.speechSynthesis) {
        console.warn('音声無効または非対応');
        showToast('音声が無効またはブラウザでサポートされていません。', 'error');
        return;
    }
    if (!word || typeof word !== 'string') {
        console.warn('無効な単語:', word);
        showToast('単語の読み上げに失敗しました。', 'error');
        return;
    }
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-GB';
    const voices = speechSynthesis.getVoices();
    console.log('利用可能な音声:', voices.map(v => `${v.name} (${v.lang})`));
    const selectedVoice = voices.find(voice => voice.lang === 'en-GB') ||
                         voices.find(voice => voice.lang === 'en-US') ||
                         voices[0];
    if (!selectedVoice) {
        console.warn('利用可能な音声が見つかりません');
        showToast('音声が見つかりませんでした。ブラウザ設定を確認してください。', 'error');
        return;
    }
    utterance.voice = selectedVoice;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = () => {
        console.log(`音声再生完了: ${word}`);
    };
    console.log(`音声再生開始: ${word}, voice=${selectedVoice.name} (${selectedVoice.lang})`);
    speechSynthesis.cancel(); // キューをクリア
    speechSynthesis.speak(utterance);
}

// 音声データ準備
function waitForVoices() {
    console.log('音声ロード開始');
    return new Promise((resolve) => {
        const voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
            voicesLoaded = true;
            console.log('音声即時ロード完了:', voices.map(v => `${v.name} (${v.lang})`));
            resolve(voices);
        } else {
            console.log('音声ロード待機中');
            speechSynthesis.onvoiceschanged = () => {
                const voices = speechSynthesis.getVoices();
                voicesLoaded = true;
                console.log('音声ロード完了:', voices.map(v => `${v.name} (${v.lang})`));
                resolve(voices);
            };
        }
    });
}

// データ読み込み
function loadData(callback) {
    console.log('データ読み込み開始');
    fetch('./kidswords.json')
        .then(response => {
            console.log('読み込み結果:', response);
            if (!response.ok) {
                throw new Error(`データ読み込み失敗: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('データ取得:', data);
            if (!validateWords(data)) {
                throw new Error('データ形式が正しくありません');
            }
            words = data.sort(() => Math.random() - 0.5);
            console.log(`${words.length}語を読み込みました`);
            waitForVoices()
                .then(voices => {
                    console.log('音声準備完了:', voices.map(v => `${v.name} (${v.lang})`).join(', '));
                    callback();
                })
                .catch(error => {
                    console.error('音声エラー:', error);
                    showToast('音声の準備に失敗しました。ページを続けます。', 'error');
                    callback();
                });
        })
        .catch(error => {
            console.error('データ読み込みエラー:', error);
            showToast(`データの読み込みに失敗しました: ${error.message}。デフォルトデータを使います。`, 'error');
            words = fallbackWords.sort(() => Math.random() - 0.5);
            waitForVoices()
                .then(voices => {
                    console.log('音声準備完了:', voices.map(v => `${v.name} (${v.lang})`).join(', '));
                    callback();
                })
                .catch(error => {
                    console.error('音声エラー:', error);
                    showToast('音声の準備に失敗しました。ページを続けます。', 'error');
                    callback();
                });
        });
}

// 単語データのバリデーション
function validateWords(data) {
    return Array.isArray(data) && data.every(word => 
        word && typeof word.word === 'string' && typeof word.meaning === 'string'
    );
}