if (!window.words) {
    window.words = [];
}
window.audioContext = null;
window.voicesLoaded = false;
window.speechEnabled = true;

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

function disableSpeech() {
    window.speechEnabled = false;
    $('#toggleSpeechButton').text('音声オン');
    console.log('音声をオフにしました');
    showToast('音声をオフにしました', 'info');
}

function playCorrectSound() {
    if (!window.audioContext) initAudioContext();
    console.log('正解音を再生');
    const audio = new Audio('./correct.mp3');
    audio.volume = 1.0;
    audio.play().catch(err => {
        console.error('正解音再生エラー:', err);
        showToast('正解音の再生に失敗しました。', 'error');
    });
}

function playIncorrectSound() {
    if (!window.audioContext) initAudioContext();
    console.log('不正解音を再生');
    const audio = new Audio('./wrong.mp3');
    audio.volume = 1.0;
    audio.play().catch(err => {
        console.error('不正解音再生エラー:', err);
        showToast('不正解音の再生に失敗しました。', 'error');
    });
}

function speakWord(word, caller = 'unknown', lang = 'en-GB') {
    console.log(`speakWord 開始: word=${word}, caller=${caller}, lang=${lang}, speechEnabled=${window.speechEnabled}, speechSynthesis=${!!window.speechSynthesis}`);
    if (!window.speechEnabled || !window.speechSynthesis) {
        console.warn('音声無効または非対応:', { speechEnabled: window.speechEnabled, speechSynthesis: !!window.speechSynthesis });
        showToast('音声が再生できませんでした。音声ボタンをオフにしてください。', 'warning');
        return;
    }
    speechSynthesis.cancel(); // キューをクリア
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = lang;
    const voices = speechSynthesis.getVoices();
    console.log('利用可能な音声:', voices.map(v => `${v.name} (${v.lang})`));
    const selectedVoice = voices.find(voice => voice.lang === 'en-GB' && voice.name.includes('Google')) ||
                         voices.find(voice => voice.lang === 'en-US' && voice.name.includes('Google')) ||
                         voices.find(voice => voice.lang === 'en-GB' && voice.name.includes('Microsoft')) ||
                         voices.find(voice => voice.lang === 'en-US' && voice.name.includes('Microsoft')) ||
                         voices[0];
    if (!selectedVoice) {
        console.warn('利用可能な音声が見つかりません');
        showToast('音声が再生できませんでした。音声ボタンをオフにしてください。', 'warning');
        return;
    }
    utterance.voice = selectedVoice;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => {
        console.log(`音声再生開始: ${word}, voice=${selectedVoice.name} (${selectedVoice.lang})`);
    };
    utterance.onend = () => {
        console.log(`音声再生完了: ${word}`);
    };
    utterance.onerror = (event) => {
        if (event.error !== 'interrupted') {
            console.error(`音声エラー: ${word} - ${event.error}`);
            showToast('音声が再生できませんでした。音声ボタンをオフにしてください。', 'warning');
        }
    };
    speechSynthesis.speak(utterance);
}

function waitForVoices() {
    console.log('音声ロード開始');
    return new Promise((resolve) => {
        const voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
            window.voicesLoaded = true;
            console.log('音声即時ロード完了:', voices.map(v => `${v.name} (${v.lang})`));
            resolve(voices);
        } else {
            console.log('音声ロード待機中');
            speechSynthesis.onvoiceschanged = () => {
                const voices = speechSynthesis.getVoices();
                window.voicesLoaded = true;
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