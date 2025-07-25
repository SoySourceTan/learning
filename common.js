if (!window.words) {
    window.words = [];
}
window.audioContext = null;
window.voicesLoaded = false;
window.speechEnabled = true;

window.defaultIcons = {
    action: 'icon-park-solid:running',
    animal: 'fluent-emoji:paw-prints',
    asking: 'twemoji:speech-balloon',
    banking: 'twemoji:money-bag',
    body: 'twemoji:person-gesturing-ok',
    color: 'fluent-emoji:artist-palette',
    culture: 'twemoji:globe-with-meridians',
    daily_life: 'twemoji:sunrise-over-mountains',
    emotion: 'twemoji:smiling-face-with-smiling-eyes',
    fish: 'twemoji:fish',
    fruit: 'twemoji:cherries',
    household: 'twemoji:house',
    meat: 'twemoji:cut-of-meat',
    number: 'twemoji:input-numbers',
    object: 'twemoji:package',
    other: 'twemoji:gear',
    place: 'twemoji:world-map',
    roads: 'twemoji:motorway',
    school: 'twemoji:school',
    shape: 'twemoji:red-square',
    shopping: 'twemoji:shopping-cart',
    society: 'twemoji:cityscape',
    soy: 'twemoji:beans',
    time: 'twemoji:watch',
    transport: 'twemoji:bus',
    utilities: 'twemoji:wrench',
    vegetable: 'twemoji:carrot',
    weather: 'twemoji:sun-behind-cloud',
};
window.fallbackWords = [
    {"word": "unknown", "meaning": "不明", "category": "unknown", "icon": "fas fa-question", "background": "bg-light"}
];

// 効果音を事前に読み込む
const soundEffects = {
    correct: new Audio('./correct.mp3'),
    incorrect: new Audio('./wrong.mp3')
};
Object.values(soundEffects).forEach(sound => {
    sound.load(); // ファイルのプリロードを開始
    sound.volume = 1.0;
});

function initAudioContext() {
    if (!window.AudioContext && !window.webkitAudioContext) {
        console.error('このブラウザでは音声再生がサポートされていません。');
        return false;
    }
    window.audioContext = window.audioContext || new (window.AudioContext || window.webkitAudioContext)();
    return true;
}

function showToast(message, type = 'info') {
    console.log(`Toast: ${message} (${type})`);
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.innerHTML = `
        <div class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'warning'} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    document.body.appendChild(toastContainer);
    const toast = new bootstrap.Toast(toastContainer.querySelector('.toast'), { delay: 1500 });
    toast.show();
    toastContainer.querySelector('.toast').addEventListener('hidden.bs.toast', () => {
        toastContainer.remove();
    });
}

function playCorrectSound() {
    if (!window.audioContext) initAudioContext();
    console.log('正解音を再生');
    soundEffects.correct.currentTime = 0; // 再生位置を最初に戻す
    soundEffects.correct.play().catch(err => {
        console.error('正解音再生エラー:', err);
        // showToast('正解音の再生に失敗しました。', 'error');
    });
}

function playIncorrectSound() {
    if (!window.audioContext) initAudioContext();
    console.log('不正解音を再生');
    soundEffects.incorrect.currentTime = 0; // 再生位置を最初に戻す
    soundEffects.incorrect.play().catch(err => {
        console.error('不正解音再生エラー:', err);
        // showToast('不正解音の再生に失敗しました。', 'error');
    });
}

function speakWord(word, options = {}) {
    const {
        caller = 'unknown',
        lang = 'en-GB',
        onStart,
        onEnd,
        onError
    } = options;

    if (!window.speechEnabled || !window.speechSynthesis) {
        console.warn('Speech synthesis is disabled or not supported.');
        if (onError) onError();
        return;
    }

    // 常に前の発話をキャンセルしてから新しい発話を開始する
    speechSynthesis.cancel();

    function startSpeech() {
        const voices = speechSynthesis.getVoices();

        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = lang;

        if (voices.length > 0) {
            const selectedVoice = voices.find(voice => voice.lang === lang && voice.name.includes('Google')) ||
                                 voices.find(voice => voice.lang === lang) ||
                                 voices.find(voice => voice.lang.startsWith('en'));
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        } else {
            console.warn('Voice list is empty. Using browser default for the language.');
        }

        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => {
            const voiceName = utterance.voice ? `${utterance.voice.name} (${utterance.voice.lang})` : 'default';
            console.log(`Speech started: "${word}", Voice: ${voiceName}, Caller: ${caller}`);
            if (onStart) onStart();
        };
        utterance.onend = () => {
            console.log(`Speech finished: "${word}"`);
            if (onEnd) onEnd();
        };
        utterance.onerror = (event) => {
            if (event.error !== 'interrupted') {
                console.error(`Speech error for "${word}": ${event.error}`);
                // showToast('音声の再生に失敗しました。', 'error');
            }
            // 中断を含むすべてのエラーでUIクリーンアップ用のコールバックを呼ぶ
            if (onError) onError();
        };
        speechSynthesis.speak(utterance);
    }
    startSpeech();
}

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
            callback(data);
        })
        .catch(error => {
            console.error('データ読み込みエラー:', error);
            callback(fallbackWords);
        });
}

function validateWords(data) {
    return Array.isArray(data) && data.every(word => 
        word && typeof word.word === 'string' && typeof word.meaning === 'string'
    );
}

// サイト全体で共通のUIイベントをバインドします
$(document).ready(function() {
    // 音声切り替えボタンのイベントハンドラ
    $('#toggleSpeechButton').on('click', function() {
        window.speechEnabled = !window.speechEnabled;
        $(this).find('.button-text').text(window.speechEnabled ? '音声オフ' : '音声オン');
        showToast(window.speechEnabled ? '音声をオンにしました' : '音声をオフにしました', 'info');
        if (!window.speechEnabled && window.speechSynthesis) {
            // 音声オフ時に再生中の音声を停止
            speechSynthesis.cancel();
        }
    });

    // 音声合成エンジンを早期に準備させるための「ウォームアップ」
    if (window.speechSynthesis) {
        speechSynthesis.getVoices();
    }

    // 現在のページに基づいてナビゲーションリンクをアクティブにする
    try {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        $('.navbar-nav .nav-link').removeClass('active').removeAttr('aria-current');
        $('.navbar-nav .nav-link').each(function() {
            const linkPage = $(this).attr('href').split('/').pop();
            if (linkPage === currentPage) {
                $(this).addClass('active');
                $(this).attr('aria-current', 'page');
            }
        });
    } catch (e) {
        console.error("ナビゲーションのアクティブ化に失敗:", e);
    }
});