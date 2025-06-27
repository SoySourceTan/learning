if (!window.words) {
    window.words = [];
}
window.audioContext = null;
window.voicesLoaded = false;
window.speechEnabled = true;

const defaultIcons = {
    color: 'fas fa-circle',
    vegetable: 'fas fa-seedling',
    fruit: 'fas fa-apple-alt',
    shape: 'fas fa-shapes',
    body: 'fas fa-user',
    object: 'fas fa-cube',
    animal: 'fas fa-paw',
    weather: 'fas fa-cloud',
    number: 'fas fa-sort-numeric-up',
    place: 'fas fa-map-marker-alt',
    action: 'fas fa-running',
    time: 'fas fa-clock',
    school: 'fas fa-school',
    emotion: 'fas fa-smile',
    fish: 'fas fa-fish',
    meat: 'fas fa-drumstick-bite',
    soy: 'fas fa-seedling',
    society: 'fas fa-users',
    culture: 'fas fa-flag'
};
const fallbackWords = [
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
        showToast('正解音の再生に失敗しました。', 'error');
    });
}

function playIncorrectSound() {
    if (!window.audioContext) initAudioContext();
    console.log('不正解音を再生');
    soundEffects.incorrect.currentTime = 0; // 再生位置を最初に戻す
    soundEffects.incorrect.play().catch(err => {
        console.error('不正解音再生エラー:', err);
        showToast('不正解音の再生に失敗しました。', 'error');
    });
}

function speakWord(word, caller = 'unknown', lang = 'en-GB') {
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 100;

    function attemptToSpeak(attempt = 1) {
        if (!window.speechEnabled || !window.speechSynthesis) {
            console.warn('Speech synthesis is disabled or not supported.');
            return;
        }

        const voices = speechSynthesis.getVoices();

        // Chromeで拡張機能などにより音声リストの読み込みが遅れる問題への対策
        // リストが空の場合、少し待ってからリトライする
        if (voices.length === 0 && attempt <= MAX_ATTEMPTS) {
            console.warn(`Voice list is empty. Retrying in ${RETRY_DELAY_MS}ms... (Attempt ${attempt}/${MAX_ATTEMPTS})`);
            setTimeout(() => attemptToSpeak(attempt + 1), RETRY_DELAY_MS);
            return;
        }

        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = lang;

        if (voices.length > 0) {
            const selectedVoice = voices.find(voice => voice.lang === lang && voice.name.includes('Google')) ||
                                 voices.find(voice => voice.lang === lang) ||
                                 voices.find(voice => voice.lang.startsWith('en'));
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        }

        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => {
            const voiceName = utterance.voice ? `${utterance.voice.name} (${utterance.voice.lang})` : 'default';
            console.log(`Speech started: "${word}", Voice: ${voiceName}, Caller: ${caller}`);
        };
        utterance.onend = () => {
            console.log(`Speech finished: "${word}"`);
        };
        utterance.onerror = (event) => {
            if (event.error !== 'interrupted') {
                console.error(`Speech error for "${word}": ${event.error}`);
                showToast('音声の再生に失敗しました。', 'error');
            }
        };
        speechSynthesis.speak(utterance);
    }

    attemptToSpeak();
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
        $(this).text(window.speechEnabled ? '音声オフ' : '音声オン');
        showToast(window.speechEnabled ? '音声をオンにしました' : '音声をオフにしました', 'info');
        if (!window.speechEnabled && window.speechSynthesis) {
            // 音声オフ時に再生中の音声を停止
            speechSynthesis.cancel();
        }
    });

    // 現在のページに基づいてナビゲーションリンクをアクティブにする
    try {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
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