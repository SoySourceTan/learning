window.isInitialized = false;

$(document).ready(function() {
    if (window.isInitialized) {
        console.log('quiz.js 既に初期化済み、スキップ');
        return;
    }
    window.isInitialized = true;
    console.log('quiz.js ロード開始');
    let currentQuestion = 0;
    let score = 0;
    let totalQuestions = 0;
    let currentLevel = 1;
    let currentSet = 1;
    let correctInCurrentSet = 0;
    const QUESTIONS_PER_SET = 5;
    let questionTimer = null;
    let lastClick = 0;

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

        const correctAnswer = question.ruby || question.meaning;
        const wrongAnswers = [];
        const usedMeanings = new Set([question.meaning]);
        const sameCategoryWords = window.words.filter(w => w.category === question.category && w.meaning !== question.meaning);
        while (wrongAnswers.length < 3 && sameCategoryWords.length > 0) {
            const randomIndex = Math.floor(Math.random() * sameCategoryWords.length);
            const randomWord = sameCategoryWords[randomIndex];
            if (!usedMeanings.has(randomWord.meaning)) {
                wrongAnswers.push(randomWord.ruby || randomWord.meaning);
                usedMeanings.add(randomWord.meaning);
                sameCategoryWords.splice(randomIndex, 1);
            }
        }
        while (wrongAnswers.length < 3 && window.words.length > 1) {
            const randomWord = window.words[Math.floor(Math.random() * window.words.length)];
            if (!usedMeanings.has(randomWord.meaning)) {
                wrongAnswers.push(randomWord.ruby || randomWord.meaning);
                usedMeanings.add(randomWord.meaning);
            }
        }
        const answers = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);

        $('#quizContainer').empty();
        const icon = question.icon || defaultIcons[question.category] || 'fas fa-question';
        const iconStyle = question.color ? `style="color: ${question.color}"` : '';
        $('#quizContainer').append(`
            <div class="question-card" data-word="${question.word}">
                <div class="progress timer-container mb-3" style="height: 10px;">
                    <div id="timerBar" class="progress-bar bg-success" role="progressbar" style="width: 100%;" aria-valuenow="10" aria-valuemin="0" aria-valuemax="10"></div>
                </div>
                <div class="text-center">
                    <i class="vocab-icon ${icon}" ${iconStyle} data-word="${question.word}"></i>
                    <i class="fas fa-volume-up sound-icon ms-2" data-word="${question.word}"></i>
                    <h4 class="mt-2">${question.word}</h4>
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
        startTimer();
    }

    function startTimer() {
        if (questionTimer) {
            clearInterval(questionTimer);
        }
        let timeLeft = 10;
        const timerBar = $('#timerBar');
        // タイマーバーのスタイルをリセット
        timerBar.css('width', '100%').removeClass('bg-danger bg-warning').addClass('bg-success');

        questionTimer = setInterval(() => {
            timeLeft--;
            const percentage = (timeLeft / 10) * 100;
            timerBar.css('width', percentage + '%');

            // 残り時間に応じて色を変更
            if (timeLeft <= 3) {
                timerBar.removeClass('bg-success bg-warning').addClass('bg-danger');
            } else if (timeLeft <= 6) {
                timerBar.removeClass('bg-success').addClass('bg-warning');
            }

            if (timeLeft <= 0) {
                clearInterval(questionTimer);
                handleTimeout();
            }
        }, 1000);
    }

    function handleTimeout() {
        console.log('時間切れ');
        $('.answer-card').off('click touchstart').addClass('disabled');
        playIncorrectSound();
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        const correctAnswer = window.words[currentQuestion].ruby || window.words[currentQuestion].meaning;
        showFeedback('時間切れ！⏳', `正解は "${correctAnswer}" でした。`);
        correctInCurrentSet = 0;
        updateProgress();
    }

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
            clearInterval(questionTimer); // 回答時にタイマーを停止
            console.log('回答選択:', $(this).data('answer'));
            if (!window.audioContext) initAudioContext();
            const selectedAnswer = $(this).data('answer');
            const correctAnswer = window.words[currentQuestion].ruby || window.words[currentQuestion].meaning;
            const $card = $(this);

            $('.answer-card').off('click touchstart').addClass('disabled');

            if (selectedAnswer === correctAnswer) {
                score++;
                correctInCurrentSet++;
                $card.addClass('correct');
                playCorrectSound();
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                showToast('正解！', 'success');
                setTimeout(() => {
                    handleNextQuestion();
                }, 1500); // 1.5秒後に自動で次の問題へ
            } else {
                $card.addClass('incorrect');
                playIncorrectSound();
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                showFeedback('おっと！もう一度挑戦！😉', `"${window.words[currentQuestion].word}" は "${correctAnswer}" です、"${selectedAnswer}" ではありません！`);
                correctInCurrentSet = 0;
            }

            updateProgress();
        });

        $(document).on('click touchstart', '.vocab-icon', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (Date.now() - lastClick < 100) return;
            lastClick = Date.now();
            console.log('アイコンタップ検知');
            const word = $(this).data('word');
            console.log('タップされた単語:', word, 'speechEnabled:', window.speechEnabled, 'speechSynthesis:', !!window.speechSynthesis);
            $(this).addClass('vocab-icon-spin');
            setTimeout(() => $(this).removeClass('vocab-icon-spin'), 500);
            speakWord(word, 'vocab-icon', 'en-GB');
        });

        $(document).on('click touchstart', '.sound-icon', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (Date.now() - lastClick < 100) return;
            lastClick = Date.now();
            console.log('音声ボタンタップ');
            const word = $(this).data('word');
            console.log('タップされた単語:', word, 'speechEnabled:', window.speechEnabled, 'speechSynthesis:', !!window.speechSynthesis);
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

        $('#feedbackModal').on('hidden.bs.modal', function() {
            console.log('モーダル閉じ検知');
            $('#nextQuestionContainer').show();
            document.activeElement.blur();
        });
    }

    function showFeedback(title, body) {
        $('#feedbackModalLabel').text(title);
        $('#feedbackModalBody').html(body);
        // モーダルが既に表示されている場合は内容だけ更新
        if ($('#feedbackModal').hasClass('show')) return;
        $('#feedbackModal').modal('show');
    }

    $('#feedbackModal .btn-primary').on('click', function() {
        console.log('モーダルOKクリック');
        $('#feedbackModal').modal('hide');
    });

    function handleNextQuestion() {
        if (questionTimer) clearInterval(questionTimer);
        currentQuestion++;
        checkSetProgress();
        checkLevelUp();
        generateQuestion();
        bindEvents();
    }

    function checkSetProgress() {
        const setQuestionIndex = currentQuestion % QUESTIONS_PER_SET;
        if (setQuestionIndex === 0 && currentQuestion > 0) {
            if (correctInCurrentSet === QUESTIONS_PER_SET) {
                score += 2;
                showToast(`セット${currentSet} クリア！ボーナス +2点！`, 'success');
                showFeedback(`セット${currentSet} クリア！🎉`, `5問連続正解！次のセット${currentSet + 1}へ進みます！`);
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

    function checkLevelUp() {
        const newLevel = Math.floor(score / 5) + 1;
        if (newLevel > currentLevel) {
            currentLevel = newLevel;
            showToast(`レベルアップ！Level ${currentLevel} 達成！🎉`, 'success');
            showFeedback(`Level Up! 🎉`, `おめでとう！Level ${currentLevel} に到達しました！次の挑戦へ！`);
            const bgClasses = ['bg-color', 'bg-fruit', 'bg-animal', 'bg-weather', 'bg-number'];
            const bgClass = bgClasses[(currentLevel - 1) % bgClasses.length];
            $('body').removeClass(bgClasses.join(' ')).addClass(bgClass);
        }
        $('#scoreText').text(`正解: ${score}/${totalQuestions} (Level ${currentLevel}, セット${currentSet})`);
    }

    function updateProgress() {
        totalQuestions = currentQuestion + 1;
        const progress = (totalQuestions / window.words.length) * 100;
        $('#progressBar').css('width', progress + '%').attr('aria-valuenow', progress);
        $('#scoreText').text(`正解: ${score}/${totalQuestions} (Level ${currentLevel}, セット${currentSet})`);
    }

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

    function initializePage() {
        console.log('ページ初期化開始');
        $('#quizContainer').html('<div class="text-center"><p>クイズを読み込み中...</p></div>');
        $('#toggleSpeechButton').text(window.speechEnabled ? '音声オフ' : '音声オン');
        // AudioContextの初期化はユーザー操作を起点に行うのがベストプラクティスだが、
        // ここで呼んでおくことで、最初のクリック時の遅延を減らせる可能性がある。
        if (!window.audioContext) initAudioContext();
        generateQuestion();
        bindEvents();
    }

    loadData(initializePage);
    console.log('quiz.js ロード完了');
});