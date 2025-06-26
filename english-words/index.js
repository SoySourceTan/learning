$(document).ready(function() {
    // 依存関係の確認
    if (!window.jQuery) {
        console.error('jQueryがロードされていません');
        return;
    }
    if (typeof defaultIcons === 'undefined') {
        console.error('defaultIconsが定義されていません');
        return;
    }
    if (typeof fallbackWords === 'undefined') {
        console.error('fallbackWordsが定義されていません');
        return;
    }

    // 音声合成の初期化
    let voicesLoaded = false;
    function initializeSpeechSynthesis() {
        if (!window.speechSynthesis) {
            console.error('音声合成がサポートされていません。ブラウザがWeb Speech APIをサポートしているか確認してください。');
            return false;
        }
        const voices = speechSynthesis.getVoices();
        if (!voices.length) {
            console.warn('音声リストが空です。音声のロードを待機します。');
            speechSynthesis.onvoiceschanged = () => {
                voicesLoaded = true;
                console.log('音声リストがロードされました:', speechSynthesis.getVoices());
            };
        } else {
            voicesLoaded = true;
            console.log('利用可能な音声:', voices);
        }
        return true;
    }

    // 音声読み上げ関数
    function speakText(text) {
        if (!initializeSpeechSynthesis()) {
            return;
        }
        // 保留中の音声をキャンセル
        speechSynthesis.cancel();
        // 音声リストがロードされるまで待機
        if (!voicesLoaded) {
            console.warn('音声リストがまだロードされていません。');
            speechSynthesis.onvoiceschanged = () => {
                voicesLoaded = true;
                console.log('音声リストがロードされました:', speechSynthesis.getVoices());
                triggerSpeech(text);
            };
        } else {
            triggerSpeech(text);
        }
    }

    // 音声再生の内部関数
    function triggerSpeech(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        const voices = speechSynthesis.getVoices();
        const enVoice = voices.find(voice => voice.lang === 'en-US') || voices[0];
        if (enVoice) {
            utterance.voice = enVoice;
            console.log(`選択された音声: ${enVoice.name}`);
        } else {
            console.warn('en-USの音声が見つかりません。デフォルト音声を使用します。');
        }
        utterance.onstart = () => console.log(`音声開始: ${text}`);
        utterance.onend = () => console.log(`音声完了: ${text}`);
        utterance.onerror = (e) => console.error(`音声エラー: ${text} - ${e.error}, ${e.message}`);
        speechSynthesis.speak(utterance);
    }

    // カードイベント
    function bindCardEvents() {
        $('#cardContainer').on('click.sound touchstart.sound', '.sound-icon', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const word = $(this).data('word');
            if (!word) {
                console.error('単語データが見つかりません', this);
                return;
            }
            console.log(`音声アイコンクリック: ${word}`);
            const $vocabIcon = $(this).closest('.vocab-card').find('.vocab-icon');
            $vocabIcon.addClass('vocab-icon-spin');
            setTimeout(() => $vocabIcon.removeClass('vocab-icon-spin'), 500);
            speakText(word);
        });
    }

    // カード表示
    function renderCards(words) {
        const $cardContainer = $('#cardContainer');
        if (!$cardContainer.length) {
            console.error('カードコンテナが見つかりません');
            return;
        }
        $cardContainer.empty();
        words.forEach(word => {
            const icon = word.icon || defaultIcons[word.category] || 'fas fa-question';
            const iconStyle = word.color ? `style="color: ${word.color}"` : '';
            const card = `
                <div class="col">
                    <div class="card vocab-card shadow-sm p-0 ${word.background || 'bg-light'}" data-word="${word.word}">
                        <div class="card-body text-center p-0">
                            <i class="vocab-icon ${icon} my-4 fa-lg" ${iconStyle}></i>
                            <h6 class="card-title fw-bold mb-1">${word.word}</h6>
                            <p class="card-text p-0 m-0">${word.meaning}</p>
                            <span class="sound-icon ms-0" data-word="${word.word}">🔊</span>
                        </div>
                    </div>
                </div>`;
            $cardContainer.append(card);
        });
        bindCardEvents();
    }

    // データ読み込み
    fetch('./kidswords.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`JSON読み込み失敗: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('JSONデータ読み込み成功:', data);
            renderCards(data);
        })
        .catch(error => {
            console.error('データ読み込みエラー:', error);
            renderCards(fallbackWords);
        });

    // 音声合成の初期化をページ読み込み時に実行
    initializeSpeechSynthesis();
});