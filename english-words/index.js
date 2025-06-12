$(document).ready(function() {
    console.log('index.js ロード開始');
    let lastClickTime = 0;
    const DEBOUNCE_MS = 300;
    let isSpeechInitialized = false;

    // 音声初期化（オートプレイ制限回避）
    function initializeSpeech() {
        if (isSpeechInitialized || !window.speechSynthesis) return;
        console.log('音声初期化開始');
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        speechSynthesis.speak(utterance);
        isSpeechInitialized = true;
        console.log('音声初期化完了');
    }

    // 単語カード生成
   function generateCards() {
       console.log('単語カード生成開始');
       const $container = $('main .container-md');
       $container.empty();
       if (words.length === 0) {
           console.warn('データがありません。デフォルトデータを使用。');
           showToast('データがありません。デフォルトデータを使います。', 'error');
           words = fallbackWords;
       }
       words.forEach(word => {
           const icon = word.icon || defaultIcons[word.category] || 'fas fa-question';
           const iconStyle = word.color ? `style="color: ${word.color}"` : '';
           $container.append(`
               <div class="col-10 col-md-8 mb-3"> <!-- Bootstrapの列幅 -->
                   <div class="card" data-word="${word.word}">
                       <div class="card-body text-center">
                           <div class="d-flex justify-content-center align-items-center">
                               <i class="vocab-icon ${icon}" ${iconStyle} data-word="${word.word}"></i>
                               <i class="fas fa-volume-up sound-icon ms-2" data-word="${word.word}"></i>
                           </div>
                           <h5 class="card-title">${word.word}</h5>
                           <p class="card-text">${word.meaning}</p>
                       </div>
                   </div>
               </div>
           `);
       });
       console.log('カード生成完了:', $('.card').length, 'sound-icon数:', $('.sound-icon').length);
   }

    // イベント設定
    function bindEvents() {
        console.log('イベントバインド開始');
        // .cardのタッチ制限
        $(document).off('touchstart touchmove touchend click', '.card');
        $(document).on('touchstart touchmove touchend click', '.card', function(e) {
            if (!$(e.target).hasClass('sound-icon')) {
                e.stopPropagation();
                e.preventDefault();
                console.log('カードタッチ検知: sound-icon以外、イベント停止');
            }
        });

        // .sound-iconのイベント
        $(document).off('click', '.sound-icon');
        $(document).on('click', '.sound-icon', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('音声ボタンクリック検知 (click)');
            const now = Date.now();
            if (now - lastClickTime < DEBOUNCE_MS) {
                console.log('デバウンスによりブロック:', now - lastClickTime);
                return;
            }
            lastClickTime = now;
            initializeSpeech();
            const word = $(this).data('word');
            console.log('タップされた単語:', word);
            speakWord(word, 'sound-icon');
        });
    }

    // ページ初期化
    function initializePage() {
        console.log('ページ初期化開始');
        generateCards();
        bindEvents();
    }

    // 開始
    loadData(initializePage);
    console.log('index.js ロード完了');
});