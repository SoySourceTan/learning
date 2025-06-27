$(document).ready(function() {
    console.log('quiz.js ロード開始');
    let currentQuestion = 0;
    let score = 0;
    let totalQuestions = 0;
    let lastClickTime = 0;
    const DEBOUNCE_MS = 300;
    let currentLevel = 1;
    let currentSet = 1;
    let correctInCurrentSet = 0;
    const QUESTIONS_PER_SET = 5;

    // クイズ問題生成
    function generateQuestion() {
        console.log(`クイズ生成開始: currentQuestion=${currentQuestion}, words.length=${window.words.length}`);
        if (window.words.length === 0) {
            console.warn('データがありません。デフォルトデータを使用。');
            showToast('データがありません。デフォルトデータを使います。', 'error');
            window.words = fallbackWords.sort(() => Math.random() - 0.5);
        }
        if (currentQuestion >= window.words.length) {
            console.log('クイズ終了');
            $('#quizContainer').html(`<h3 class="text-center">クイズが終わりました！最終スコア: ${score}/${totalQuestions} (Level ${currentLevel})</h3>`);
            return;
        }

        const question = window.words[currentQuestion];
        console.log('現在の問題:', question);
        if (!question || !question.word) {
            console.error('無効な問題データ:', question);
            showToast('問題データの読み込みに失敗しました。次へ進みます。', 'error');
            currentQuestion++;
            generateQuestion();
            return;
        }

        const correctAnswer = question.meaning;
        const wrongAnswers = [];
        const usedMeanings = new Set([correctAnswer]);
        // 同じカテゴリから誤答を選択
        const sameCategoryWords = window.words.filter(w => w.category === question.category && w.meaning !== correctAnswer);
        while (wrongAnswers.length < 3 && sameCategoryWords.length > 0) {
            const randomIndex = Math.floor(Math.random() * sameCategoryWords.length);
            const randomWord = sameCategoryWords[randomIndex];
            if (!usedMeanings.has(randomWord.meaning)) {
                wrongAnswers.push(randomWord.meaning);
                usedMeanings.add(randomWord.meaning);
                sameCategoryWords.splice(randomIndex, 1);
            }
        }
        // カテゴリ内に十分な単語がない場合、ランダムに他の単語を選択
        while (wrongAnswers.length < 3 && window.words.length > 1) {
            const randomWord = window.words[Math.floor(Math.random() * window.words.length)];
            if (!usedMeanings.has(randomWord.meaning)) {
                wrongAnswers.push(randomWord.meaning);
                usedMeanings.add(randomWord.meaning);
            }
        }
        const answers = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);

        $('#quizContainer').empty();
        const icon = question.icon || defaultIcons[question.category] || 'fas fa-question';
        const iconStyle = question.color ? `style="color: ${question.color}"` : '';
        $('#quizContainer').append(`
            <div class="question-card" data-word="${question.word}">
                <div class="text-center">
                    <i class="vocab-icon ${icon}" ${iconStyle} data-word="${question.word}"></i>
                    <i class="fas fa-volume-up sound-icon ms-2" data-word="${question.word}"></i>
                    <h4>${question.word}</h4>
                </div>
            </div>
            <div class="answer-grid">
                ${answers.map(answer => `
                    <div class="answer-card" data-answer="${answer}">
                        ${answer}
                    </div>
                `).join('')}
            </div>
            <div class="text-center mt-3" id="nextQuestionContainer" style="display: none;">
                <button id="nextQuestionButton" class="btn btn-primary btn-lg">
                    <i class="fas fa-arrow-right me-2"></i>次へ！
                </button>
            </div>
        `);
        console.log('アイコン生成確認:', $('.vocab-icon').length, $('.vocab-icon').data('word'));
    }

    // イベント設定
    function bindEvents() {
        console.log('イベントバインド開始');
        $(document).off('click touchstart', '.answer-card');
        $(document).off('click touchstart', '.vocab-icon');
        $(document).off('click touchstart', '.sound-icon');
        $(document).off('click', '#testSpeechButton');
        $(document).off('click', '#nextQuestionButton');

        $(document).on('click touchstart', '.answer-card', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('回答選択:', $(this).data('answer'));
            if (!window.audioContext) initAudioContext();
            const selectedAnswer = $(this).data('answer');
            const correctAnswer = window.words[currentQuestion].meaning;
            const $card = $(this);

            $('.answer-card').off('click touchstart');

            if (selectedAnswer === correctAnswer) {
                score++;
                correctInCurrentSet++;
                $card.addClass('correct');
                playCorrectSound();
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                $('#feedbackModalLabel').text('素晴らしい！🎉');
                $('#feedbackModalBody').text(`"${window.words[currentQuestion].word}" は "${correctAnswer}" です！`);
                $('#feedbackModal').modal('show');
            } else {
                $card.addClass('incorrect');
                playIncorrectSound();
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                $('#feedbackModalLabel').text('おっと！もう一度挑戦！😉');
                $('#feedbackModalBody').text(`"${window.words[currentQuestion].word}" は "${correctAnswer}" です、"${selectedAnswer}" ではありません！`);
                $('#feedbackModal').modal('show');
                correctInCurrentSet = 0;
            }

            updateProgress();
        });

        $(document).on('click touchstart', '.vocab-icon', function(e) {
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
            console.log('タップされた単語:', word, 'speechEnabled:', speechEnabled, 'speechSynthesis:', !!window.speechSynthesis);
            $(this).addClass('vocab-icon-spin');
            setTimeout(() => $(this).removeClass('vocab-icon-spin'), 500);
            speakWord(word, 'vocab-icon', 'en-GB');
        });

        $(document).on('click touchstart', '.sound-icon', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('音声ボタンタップ');
            const now = Date.now();
            if (now - lastClickTime < DEBOUNCE_MS) {
                console.log('デバウンスによりブロック:', now - lastClickTime);
                return;
            }
            lastClickTime = now;
            const word = $(this).data('word');
            console.log('タップされた単語:', word, 'speechEnabled:', speechEnabled, 'speechSynthesis:', !!window.speechSynthesis);
            speakWord(word, 'sound-icon', 'en-GB');
        });

        $(document).on('click', '#testSpeechButton', function(e) {
            e.preventDefault();
            console.log('音声テストボタンクリック');
            speakWord('Hello, welcome to the quiz', 'test-button', 'en-GB');
            showToast('音声テストを実行中: en-GB', 'info');
        });

        $(document).on('click', '#nextQuestionButton', function(e) {
            e.preventDefault();
            console.log('次の問題へボタンクリック');
            $('#nextQuestionContainer').hide();
            handleNextQuestion();
        });

        // モーダル閉じ時に「次の問題へ」ボタンを表示
        $('#feedbackModal').on('hidden.bs.modal', function() {
            console.log('モーダル閉じ検知');
            $('#nextQuestionContainer').show();
        });
    }

    // モーダルのOKボタンで次に進む
    $('#feedbackModal .btn-primary').on('click', function() {
        console.log('モーダルOKクリック');
        $('#feedbackModal').modal('hide');
        $('#nextQuestionContainer').hide(); // OKボタンでは「次へ」ボタンを非表示
        handleNextQuestion();
    });

    // 次の問題へ
    function handleNextQuestion() {
        currentQuestion++;
        checkSetProgress();
        checkLevelUp();
        generateQuestion();
        bindEvents();
    }

    // セット進捗確認
    function checkSetProgress() {
        const setQuestionIndex = currentQuestion % QUESTIONS_PER_SET;
        if (setQuestionIndex === 0 && currentQuestion > 0) {
            if (correctInCurrentSet === QUESTIONS_PER_SET) {
                score += 2;
                showToast(`セット${currentSet} クリア！ボーナス +2点！`, 'success');
                $('#feedbackModalLabel').text(`セット${currentSet} クリア！🎉`);
                $('#feedbackModalBody').text(`5問連続正解！次のセット${currentSet + 1}へ進みます！`);
                $('#feedbackModal').modal('show');
                currentSet++;
                correctInCurrentSet = 0;
            } else {
                showToast(`セット${currentSet} 終了。${correctInCurrentSet}問正解でした。次のセットへ！`, 'info');
                correctInCurrentSet = 0;
                currentSet++;
            }
            updateProgress();
        }
    }

    // レベルアップ確認
    function checkLevelUp() {
        const newLevel = Math.floor(score / 5) + 1;
        if (newLevel > currentLevel) {
            currentLevel = newLevel;
            showToast(`レベルアップ！Level ${currentLevel} 達成！🎉`, 'success');
            $('#feedbackModalLabel').text(`Level Up! 🎉`);
            $('#feedbackModalBody').text(`おめでとう！Level ${currentLevel} に到達しました！次の挑戦へ！`);
            $('#feedbackModal').modal('show');
            const bgClasses = ['bg-color', 'bg-fruit', 'bg-animal', 'bg-weather', 'bg-number'];
            const bgClass = bgClasses[(currentLevel - 1) % bgClasses.length];
            $('body').removeClass(bgClasses.join(' ')).addClass(bgClass);
        }
        $('#scoreText').text(`正解: ${score}/${totalQuestions} (Level ${currentLevel}, セット${currentSet})`);
    }

    // 進捗更新
    function updateProgress() {
        totalQuestions = currentQuestion + 1;
        const progress = (totalQuestions / window.words.length) * 100;
        $('#progressBar').css('width', progress + '%').attr('aria-valuenow', progress);
        $('#scoreText').text(`正解: ${score}/${totalQuestions} (Level ${currentLevel}, セット${currentSet})`);
    }

    // リセットボタン
    $('#resetButton').on('click', function() {
        console.log('リセットボタンクリック');
        if (!window.audioContext) initAudioContext();
        currentQuestion = 0;
        score = 0;
        totalQuestions = 0;
        currentLevel = 1;
        currentSet = 1;
        correctInCurrentSet = 0;
        window.words.sort(() => Math.random() - 0.5);
        updateProgress();
        generateQuestion();
        bindEvents();
    });

    // 音声オン/オフ
    $('#toggleSpeechButton').on('click', function() {
        console.log('音声トグルクリック');
        speechEnabled = !speechEnabled;
        $(this).text(speechEnabled ? '音声オフ' : '音声オン');
        showToast(speechEnabled ? '音声をオンにしました' : '音声をオフにしました', 'info');
    });

    // ページ初期化
    function initializePage() {
        console.log('ページ初期化開始');
        $('#quizContainer').html('<div class="text-center"><p>クイズを読み込み中...</p></div>');
        $('#toggleSpeechButton').text(speechEnabled ? '音声オフ' : '音声オン');
        showToast('クイズを始めるには、画面をクリックしてください。', 'info');
        waitForVoices().then(() => {
            console.log('音声初期化完了');
            const selectedVoice = speechSynthesis.getVoices().find(v => v.lang === 'en-GB') || 
                                 speechSynthesis.getVoices().find(v => v.lang === 'en-US') || 
                                 speechSynthesis.getVoices()[0];
            console.log('選択された音声:', selectedVoice ? `${selectedVoice.name} (${selectedVoice.lang})` : 'なし');
            if (!selectedVoice) {
                showToast('音声が見つかりませんでした。デフォルト音声を使用します。', 'warning');
            } else if (selectedVoice.lang !== 'en-GB') {
                showToast('en-GB音声が見つかりませんでした。' + selectedVoice.lang + 'を使用します。', 'warning');
            }
            $(document).one('click touchstart', function() {
                console.log('初回クリック検知');
                if (!window.audioContext) initAudioContext();
                generateQuestion();
                bindEvents();
            });
        }).catch(err => {
            console.error('音声初期化エラー:', err);
            showToast('音声の初期化に失敗しました。', 'error');
            $(document).one('click touchstart', function() {
                console.log('初回クリック検知');
                if (!window.audioContext) initAudioContext();
                generateQuestion();
                bindEvents();
            });
        });
    }

    // 開始
    loadData(initializePage);
    console.log('quiz.js ロード完了');
});