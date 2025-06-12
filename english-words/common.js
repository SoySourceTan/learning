// ...（上部のfallbackWords, defaultIconsは変更なし）
let words = [];
let audioContext;
let voicesLoaded = false;
let speechEnabled = true;
let isSpeaking = false; // 音声再生中フラグ

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

function initAudioContext() {
    if (!window.AudioContext && !window.webkitAudioContext) {
        showToast('このブラウザでは音声再生がサポートされていません。', 'error');
        return false;
    }
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    return true;
}

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

function speakWord(word, caller = 'unknown') {
    console.log(`speakWord 開始: word=${word}, caller=${caller}, speechEnabled=${speechEnabled}, isSpeaking=${isSpeaking}`);
    if (!speechEnabled || !window.speechSynthesis || isSpeaking) {
        console.warn('音声無効、非対応、または再生中:', { speechEnabled, speechSynthesis: !!window.speechSynthesis, isSpeaking });
        if (isSpeaking) console.log('音声キュー制限:', word);
        showToast('単語の読み上げに失敗しました。', 'error');
        return;
    }
    if (!word || typeof word !== 'string') {
        console.warn('無効な単語:', word);
        showToast('単語の読み上げに失敗しました。', 'error');
        return;
    }
    isSpeaking = true;
    speechSynthesis.cancel(); // キューをクリア
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
        showToast(`単語「${word}」の読み上げに失敗しました: ${event.error}`, 'error');
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

function validateWords(data) {
    return Array.isArray(data) && data.every(word => 
        word && typeof word.word === 'string' && typeof word.meaning === 'string'
    );
}