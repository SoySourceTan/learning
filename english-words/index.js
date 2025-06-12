$(document).ready(function() {
      console.log('index.js ロード開始');
      let lastClickTime = 0;
      const DEBOUNCE_MS = 300;

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
                  <div class="card mb-3" data-word="${word.word}">
                      <div class="card-body text-center">
                          <div class="d-flex justify-content-center align-items-center">
                              <i class="vocab-icon ${icon}" ${iconStyle} data-word="${word.word}"></i>
                              <i class="fas fa-volume-up sound-icon ms-2" data-word="${word.word}"></i>
                          </div>
                          <h5 class="card-title">${word.word}</h5>
                          <p class="card-text">${word.meaning}</p>
                      </div>
                  </div>
              `);
          });
          console.log('カード生成完了:', $('.card').length, 'sound-icon数:', $('.sound-icon').length);
      }

      // イベント設定
      function bindEvents() {
          console.log('イベントバインド開始');
          $(document).off('click touchend', '.vocab-icon').on('click touchend', '.vocab-icon', function(e) {
              e.preventDefault();
              e.stopPropagation();
              console.log('アイコンタップ検知');
              const now = Date.now();
              if (now - lastClickTime < DEBOUNCE_MS) {
                  console.log('デバウンスによりブロック:', now - lastClickTime);
                  return;
              }
              lastClickTime = now;
              const word = $(this).data('word');
              console.log('タップされた単語:', word);
              $(this).addClass('vocab-icon-spin');
              setTimeout(() => $(this).removeClass('vocab-icon-spin'), 500);
              unlockSpeech();
              speakWord(word, 'vocab-icon');
          });

          $(document).off('click touchend', '.sound-icon').on('click touchend', '.sound-icon', function(e) {
              e.preventDefault();
              e.stopPropagation();
              console.log('音声ボタンタップ');
              const now = Date.now();
              if (now - lastClickTime < DEBOUNCE_MS) {
                  console.log('デバウンスによりブロック:', now - lastClickTime);
                  return;
              }
              lastClickTime = now;
              unlockSpeech();
              const word = $(this).data('word');
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