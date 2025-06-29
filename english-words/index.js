$(document).ready(function() {
    function bindCardEvents() {
        // カード全体をクリックまたはタップした時に音声を再生
        $('#cardContainer').on('click', '.vocab-card', function(e) {
            e.preventDefault();

            const $card = $(this);
            const $icon = $card.find('.vocab-icon');

            const word = $(this).data('word');
            if (!word) {
                console.error('単語データが見つかりません', this);
                return;
            }
            console.log(`音声アイコンクリック: ${word}`);

            $icon.addClass('speaking vocab-icon-spin');

            speakWord(word, {
                caller: 'index-sound-icon',
                onEnd: () => $icon.removeClass('speaking vocab-icon-spin'),
                onError: () => $icon.removeClass('speaking vocab-icon-spin')
            });
        });

    }

    function groupWordsByCategory(words) {
        return words.reduce((acc, word) => {
            const category = word.category || 'other';
            if (!acc[category]) acc[category] = [];
            acc[category].push(word);
            return acc;
        }, {});
    }

    function renderCategorizedCards(groupedByCategory) {
        const $cardContainer = $('#cardContainer');
        $cardContainer.empty();

        const sortedCategories = Object.keys(groupedByCategory).sort();

        for (const category of sortedCategories) {
            const wordsInCategory = groupedByCategory[category];
            const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
            const sectionHtml = `
            <section id="category-${category}" class="mb-4">
                <h2 class="category-title h4">${categoryTitle}</h2>
                    <div class="row row-cols-2 row-cols-sm-3 row-cols-lg-4 g-3">
                        ${wordsInCategory.map(word => {
                            const icon = word.icon || (window.defaultIcons && defaultIcons[word.category]) || 'mdi:help-circle-outline';
                        const iconStyle = word.color ? `color: ${word.color};` : '';
                            return `
                                <div class="col">
                                    <div class="card vocab-card h-100 ${word.background || 'bg-light'}" data-word="${word.word}">
                                    <div class="card-body text-center p-2 d-flex flex-column justify-content-center">
                                        <span class="vocab-icon iconify" data-icon="${icon}" style="${iconStyle}"></span>
                                        <h6 class="card-title fw-bold mt-2 mb-1">${word.word}</h6>
                                        <p class="card-text small mb-0">${word.ruby || word.meaning}</p>
                                        </div>
                                    </div>
                                </div>`;
                        }).join('')}
                    </div>
                </section>`;
            $cardContainer.append(sectionHtml);
        }
    }

    function renderCategoryNav(groupedByCategory) {
        const $navContainer = $('#categoryNavContainer');
        if (!$navContainer.length) return;

        const categories = Object.keys(groupedByCategory).sort();
        $navContainer.empty();
        for (const category of categories) {
            const icon = (window.defaultIcons && defaultIcons[category]) || 'mdi:help-circle-outline';
            const navLinkHtml = `
                <a href="#category-${category}" class="category-nav-link" title="${category}">
                    <span class="iconify" data-icon="${icon}"></span>
                </a>`;
            $navContainer.append(navLinkHtml);
        }
    }

    function bindNavEvents() {
        $('#categoryNavContainer').on('click', 'a.category-nav-link', function(e) {
            e.preventDefault();
            const targetId = $(this).attr('href');
            const $target = $(targetId);
            if ($target.length) {
                const navHeight = $('.navbar').outerHeight() || 0;
                $('html, body').animate({
                    scrollTop: $target.offset().top - navHeight - 15
                }, 300);
            }
        });
    }

    loadData(function(data) {
        console.log('JSONデータ読み込み成功:', data);
        const groupedData = groupWordsByCategory(data);
        renderCategorizedCards(groupedData);
        renderCategoryNav(groupedData);
        bindCardEvents();
        bindNavEvents();

        // ★★★ 重要 ★★★
        // 動的に追加されたすべてのアイコンをIconifyにスキャンさせる
        Iconify.scan();
    });
});