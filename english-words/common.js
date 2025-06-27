if (!window.words) {
    window.words = [];
}
let audioContext;
let voicesLoaded = false;
let speechEnabled = true;
let isSpeaking = false;

// 仮のデフォルトデータ
const fallbackWords = [
    { word: 'apple', meaning: 'りんご', category: 'fruit', icon: 'fas fa-apple-alt', color: 'red' },
    { word: 'dog', meaning: '犬', category: 'animal', icon: 'fas fa-dog', color: 'brown' }
];
const defaultIcons = {
    fruit: 'fas fa-lemon',
    animal: 'fas fa-paw'
};

function initAudioContext() {
    if (!window.AudioContext && !window.webkitAudioContext) {
        console.error('このブラウザでは音声再生がサポートされていません。');
        return false;
    }
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    return true;
}

function showToast(message, type = 'info') {
    console.log(`Toast: ${message} (${type})`);
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.innerHTML = `
        <div class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    document.body.appendChild(toastContainer);
    const toast = new bootstrap.Toast(toastContainer.querySelector('.toast'), { delay: 3000 });
    toast.show();
    toastContainer.querySelector('.toast').addEventListener('hidden.bs.toast', () => {
        toastContainer.remove();
    });
}

function playCorrectSound() {
    if (!audioContext) initAudioContext();
    console.log('正解音を再生');
    const audio = new Audio('./correct.mp3');
    audio.play().catch(err => {
        console.error('正解音再生エラー:', err);
        showToast('正解音の再生に失敗しました。', 'error');
    });
}

function playIncorrectSound() {
    if (!audioContext) initAudioContext();
    console.log('不正解音を再生');
    const audio = new Audio('./wrong.mp3');
    audio.play().catch(err => {
        console.error('不正解音再生エラー:', err);
        showToast('不正解音の再生に失敗しました。', 'error');
    });
}

function speakWord(word, caller = 'unknown', lang = 'en-GB') {
    console.log(`speakWord 開始: word=${word}, caller=${caller}, lang=${lang}, speechEnabled=${speechEnabled}, isSpeaking=${isSpeaking}`);
    if (!speechEnabled || !window.speechSynthesis || isSpeaking) {
        console.warn('音声無効、非対応、または再生中:', { speechEnabled, speechSynthesis: !!window.speechSynthesis, isSpeaking });
        return;
    }
    isSpeaking = true;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = lang;
    const voices = speechSynthesis.getVoices();
    console.log('利用可能な音声:', voices.map(v => `${v.name} (${v.lang})`));
    const selectedVoice = voices.find(voice => voice.lang === 'en-GB') ||
                         voices.find(voice => voice.lang === 'en-US') ||
                         voices[0];
    if (!selectedVoice) {
        console.warn('利用可能な音声が見つかりません');
        showToast('音声が見つかりませんでした。', 'error');
        isSpeaking = false;
        return;
    }
    utterance.voice = selectedVoice;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = () => {
        console.log(`音声再生完了: ${word}`);
        isSpeaking = false;
    };
    utterance.onerror = (event) => {
        console.error(`音声エラー: ${word} - ${event.error}`);
        showToast(`音声エラー: ${word}`, 'error');
        isSpeaking = false;
    };
    console.log(`音声再生開始: ${word}, voice=${selectedVoice.name} (${selectedVoice.lang})`);
    speechSynthesis.speak(utterance);
}

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
            window.words = data.sort(() => Math.random() - 0.5);
            console.log(`${window.words.length}語を読み込みました`);
            waitForVoices().then(() => callback()).catch(() => callback());
        })
        .catch(error => {
            console.error('データ読み込みエラー:', error);
            window.words = fallbackWords.sort(() => Math.random() - 0.5);
            waitForVoices().then(() => callback()).catch(() => callback());
        });
}

function validateWords(data) {
    return Array.isArray(data) && data.every(word => 
        word && typeof word.word === 'string' && typeof word.meaning === 'string'
    );
}