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
            speakWord(word, 'index-sound-icon');
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
                <div class="col-6 col-md-4 col-lg-3">
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
    loadData(function(data) {
        console.log('JSONデータ読み込み成功:', data);
        // ホームページでは単語をシャッフルしない
        renderCards(data);
    });
});