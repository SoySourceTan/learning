let wordData = {};
let quizState = { score: 0, total: 10, current: null, options: [], currentIndex: 0, results: [] };
let selectedVoice = null;
let voiceModal = null;
let quizModal = null;
const clickSound = new Howl({ src: ['click.mp3'], volume: 0.6 });
const correctSound = new Howl({ src: ['correct.mp3'], volume: 0.6 });
const wrongSound = new Howl({ src: ['incorrect.mp3'], volume: 0.6 });

// Load voices for text-to-speech
function loadVoices(target = 'inline') {
    const voices = window.speechSynthesis.getVoices();
    const voiceRadios = target === 'inline' ? document.getElementById('voiceRadios') : document.getElementById('voiceRadiosModal');
    voiceRadios.innerHTML = '';
    if (voices.length === 0) {
        console.warn('No voices loaded yet, waiting for onvoiceschanged');
        return;
    }

    let defaultVoiceIndex = null;
    voices.forEach((voice, index) => {
        if (voice.name === 'Google UK English Female' && voice.lang === 'en-GB') {
            defaultVoiceIndex = index;
            selectedVoice = voice;
        }
    });
    if (defaultVoiceIndex === null) {
        voices.forEach((voice, index) => {
            if (voice.lang === 'en-GB' && defaultVoiceIndex === null) {
                defaultVoiceIndex = index;
                selectedVoice = voice;
            }
        });
    }
    console.log('Default voice set:', selectedVoice ? selectedVoice.name : 'None');

    voices.forEach((voice, index) => {
        if (voice.lang.includes('en')) {
            const div = document.createElement('div');
            div.className = 'form-check';
            div.innerHTML = `
                <input class="form-check-input" type="radio" name="voiceSelect" id="voice${index}_${target}" value="${index}" ${index === defaultVoiceIndex ? 'checked' : ''}>
                <label class="form-check-label" for="voice${index}_${target}">${voice.name} (${voice.lang})</label>
            `;
            voiceRadios.appendChild(div);
        }
    });
    console.log('Voices loaded for', target, ':', voices.filter(v => v.lang.includes('en')));
}

// Set selected voice
function setVoice(event) {
    const index = event.target.value;
    const voices = window.speechSynthesis.getVoices();
    selectedVoice = index ? voices[parseInt(index)] : null;
    console.log('Selected voice:', selectedVoice ? selectedVoice.name : 'Default');
    const allRadios = document.querySelectorAll(`input[name="voiceSelect"][value="${index}"]`);
    allRadios.forEach(radio => radio.checked = true);
}

// Load words from words.json
async function loadData() {
    document.getElementById('loadingModal').classList.add('active');
    try {
        const response = await fetch('words.json');
        if (!response.ok) throw new Error(`単語データの読み込みに失敗しました: ${response.statusText}`);
        wordData = await response.json();
        // Validate wordData structure
        const validCategories = Object.keys(wordData).filter(key => Array.isArray(wordData[key]) && wordData[key].length > 0);
        if (validCategories.length === 0) {
            throw new Error('有効なカテゴリがありません');
        }
        // Ensure required properties
        validCategories.forEach(category => {
            wordData[category].forEach(item => {
                if (!item.meaning || (!item.word && !item.phrase)) {
                    console.warn(`Invalid item in ${category}:`, item);
                }
                item.appearanceCount = item.appearanceCount || 0;
            });
        });
        populateTables();
        updateCategoryCounts();
        document.getElementById('loadingModal').classList.remove('active');
    } catch (error) {
        console.error('Error loading words:', error);
        document.getElementById('loadingModal').innerHTML = `<p>単語データの読み込みに失敗しました。words.jsonを確認してください。エラー: ${error.message}</p>`;
    }
}

// Update category counts in UI
function updateCategoryCounts() {
    const categoryCounts = {
        nouns: wordData.nouns?.length || 0,
        verbs: wordData.verbs?.length || 0,
        adjectives: wordData.adjectives?.length || 0,
        adverbs: wordData.adverbs?.length || 0,
        prepositions: wordData.prepositions?.length || 0,
        phrases: wordData.phrases?.length || 0,
        conjunctions: wordData.conjunctions?.length || 0 // New category example
    };
    document.querySelectorAll('[data-category-count]').forEach(el => {
        const category = el.getAttribute('data-category-count');
        if (categoryCounts[category]) {
            el.textContent = `${categoryCounts[category]}語`;
        } else {
            el.textContent = '0語';
        }
    });
}

// Populate tables with word data
function populateTables(filter = '') {
    const categories = Object.keys(wordData).map(category => ({
        id: `${category}-tables`,
        data: wordData[category],
        key: category === 'phrases' ? 'phrase' : 'word'
    }));

    categories.forEach(category => {
        const container = document.getElementById(category.id);
        if (!container) {
            console.warn(`Container for ${category.id} not found`);
            return;
        }
        container.innerHTML = '';
        const filteredData = category.data ? category.data.filter(item =>
            (item[category.key] || '').toLowerCase().includes(filter.toLowerCase()) ||
            (item.meaning || '').toLowerCase().includes(filter.toLowerCase())
        ) : [];

        let columns = 1;
        if (window.innerWidth >= 992) columns = 3;
        else if (window.innerWidth >= 768) columns = 2;

        const itemsPerColumn = Math.ceil(filteredData.length / columns);
        for (let i = 0; i < columns; i++) {
            const table = document.createElement('table');
            table.innerHTML = '<tr><th>英単語</th><th>意味</th></tr>';
            const start = i * itemsPerColumn;
            const end = Math.min(start + itemsPerColumn, filteredData.length);
            for (let j = start; j < end; j++) {
                const item = filteredData[j];
                const row = table.insertRow();
                const cell1 = row.insertCell(0);
                const cell2 = row.insertCell(1);
                cell1.textContent = `🔉 ${item[category.key] || ''}`;
                cell2.textContent = item.meaning || '';
                cell1.onclick = () => speak(item[category.key] || '');
            }
            container.appendChild(table);
        }
    });
}

// Text-to-speech
function speak(text) {
    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-GB';
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        window.speechSynthesis.speak(utterance);
        console.log('Speaking with voice:', selectedVoice ? selectedVoice.name : 'Default', 'Text:', text);
    } catch (error) {
        console.error('Speech error:', error);
    }
}

// Speak quiz option
function speakOption(index, event) {
    if (event) {
        event.stopPropagation();
    }
    if (!quizState.options || !quizState.options[index] || !quizState.current) {
        console.error('Invalid quiz state for speakOption:', quizState);
        return;
    }
    const key = quizState.current.key;
    const text = quizState.options[index][key];
    speak(text);
}

// Handle speaker keydown
function handleSpeakerKeydown(index, event) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        speakOption(index);
    }
}

// Search functionality
function searchWords() {
    const query = document.getElementById('search').value;
    populateTables(query);
}

// Quiz functionality
function startQuiz() {
    if (!wordData || Object.keys(wordData).length === 0) {
        alert('単語データが読み込まれていません。ページをリロードしてください。');
        return;
    }
    quizState = { score: 0, total: 10, current: null, options: [], currentIndex: 0, results: [], recentWords: [] };
    document.getElementById('quiz-score').textContent = `スコア: ${quizState.score}/${quizState.total}`;
    document.getElementById('quiz-feedback').textContent = '';
    const optionButtons = document.querySelectorAll('.quiz-option');
    optionButtons.forEach(btn => {
        btn.disabled = true;
        btn.querySelector('.option-text').textContent = '';
    });
    quizModal.show();
    document.getElementById('quizLabel').focus();
    nextQuestion();
}

function nextQuestion() {
    const optionButtons = document.querySelectorAll('.quiz-option');
    optionButtons.forEach(btn => {
        btn.classList.remove('correct', 'incorrect', 'selected');
        btn.disabled = true;
        btn.querySelector('.option-text').textContent = '';
    });
    document.getElementById('effectOverlay').style.display = 'none';
    document.getElementById('quiz-feedback').textContent = '';
    document.getElementById('quiz-question').textContent = '';

    if (quizState.currentIndex >= quizState.total) {
        closeQuiz();
        showResults();
        return;
    }

    const categories = Object.keys(wordData).filter(key => Array.isArray(wordData[key]) && wordData[key].length >= 4);
    if (categories.length === 0) {
        alert('クイズに必要なデータが不足しています。');
        closeQuiz();
        return;
    }

    const category = categories[Math.floor(Math.random() * categories.length)];
    const key = category === 'phrases' ? 'phrase' : 'word';
    const items = wordData[category];
    if (!items || items.length < 4) {
        alert('選択したカテゴリのデータが不足しています。');
        closeQuiz();
        return;
    }

    // Select correct answer (avoid recent words)
    let correctItem;
    const availableItems = items.filter(item => !quizState.recentWords.includes(item[key]));
    if (availableItems.length === 0) {
        quizState.recentWords = [];
        correctItem = items[Math.floor(Math.random() * items.length)];
    } else {
        correctItem = availableItems[Math.floor(Math.random() * availableItems.length)];
    }
    correctItem.appearanceCount = (correctItem.appearanceCount || 0) + 1;

    quizState.current = { category, item: correctItem, key, index: (quizState.currentIndex || 0) + 1, questionType: 'meaning' };
    quizState.recentWords.push(correctItem[key]);
    if (quizState.recentWords.length > 10) {
        quizState.recentWords.shift();
    }

    // Determine question type (33.33% chance for antonym if available)
    const questionTypes = correctItem.questionTypes || ['meaning'];
    const randType = Math.random();
    const antonymProb = 0.333;
    if (questionTypes.includes('antonym') && correctItem.antonym && randType < antonymProb) {
        quizState.current.questionType = 'antonym';
    }

    console.log('Next question set:', quizState.current, 'Question type:', quizState.current.questionType);

    // Generate options
    const options = [correctItem];
    const otherItems = items.filter(item => item[key] !== correctItem[key]);
    while (options.length < 4 && otherItems.length > 0) {
        const randomIndex = Math.floor(Math.random() * otherItems.length);
        const otherItem = otherItems[randomIndex];
        if (quizState.current.questionType === 'antonym' && options.length === 1 && otherItem.antonym) {
            // Prefer antonym for distractors in antonym questions
            options.push(otherItem);
        } else {
            options.push(otherItem);
        }
        otherItems.splice(randomIndex, 1);
    }

    // For antonym questions, ensure correct answer is the antonym
    if (quizState.current.questionType === 'antonym') {
        const antonymItem = items.find(item => item[key] === correctItem.antonym);
        if (antonymItem) {
            options[0] = antonymItem; // Replace correct answer with antonym
            quizState.current.item = antonymItem;
        } else {
            console.warn(`Antonym not found for ${correctItem[key]}, falling back to meaning`);
            quizState.current.questionType = 'meaning';
        }
    }

    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }
    quizState.options = options;

    // Update UI
    document.getElementById('quiz-question').textContent = quizState.current.questionType === 'antonym'
        ? `「${correctItem[key]}」の反対語は？`
        : `${correctItem.meaning} の英語は？`;
    optionButtons.forEach((btn, index) => {
        btn.querySelector('.option-text').textContent = options[index][key];
        btn.disabled = false;
    });
}

function checkAnswer(index) {
    if (!quizState.current || !quizState.current.item) {
        console.error('Quiz state is invalid:', quizState);
        alert('クイズの状態が無効です。もう一度開始してください。');
        closeQuiz();
        return;
    }

    const selectedOption = quizState.options[index];
    const correctAnswer = quizState.current.item[quizState.current.key];
    const optionButtons = document.querySelectorAll('.quiz-option');

    optionButtons.forEach(btn => btn.disabled = true);

    optionButtons.forEach((btn, i) => {
        if (quizState.options[i][quizState.current.key] === correctAnswer) {
            btn.classList.add('correct');
        } else if (i === index) {
            btn.classList.add('incorrect');
        }
    });

    const isCorrect = selectedOption[quizState.current.key] === correctAnswer;
    quizState.results.push({
        question: quizState.current.questionType === 'antonym' ? `「${quizState.current.item[quizState.current.key]}」の反対語` : quizState.current.item.meaning,
        correct: correctAnswer,
        selected: selectedOption[quizState.current.key],
        isCorrect: isCorrect
    });
    console.log('Answer checked:', { selected: selectedOption[quizState.current.key], correct: correctAnswer, isCorrect });

    if (isCorrect) {
        quizState.score++;
        document.getElementById('quiz-score').textContent = `スコア: ${quizState.score}/${quizState.total}`;
        document.getElementById('quiz-feedback').textContent = '正解！';
        correctSound.play();
        addHeart();
        showEffect('correct');
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#0f0', '#ff0', '#fff'] });
    } else {
        document.getElementById('quiz-feedback').textContent = '不正解！';
        wrongSound.play();
        showEffect('wrong');
        showBoneAttack();
    }

    setTimeout(nextQuestion, 1800);
}

function showEffect(type) {
    const overlay = document.getElementById('effectOverlay');
    overlay.textContent = type === 'correct' ? '〇' : '×';
    overlay.className = `effect-overlay ${type}`;
    gsap.to(overlay, { scale: 2.5, opacity: 1, duration: 0.6, ease: "elastic.out(1, 0.3)", onStart: () => overlay.style.display = 'flex' });
    gsap.to(overlay, { scale: 3.5, opacity: 0, duration: 0.6, delay: 0.6, ease: "power2.in", onComplete: () => overlay.style.display = 'none' });
}

function addHeart() {
    const heart = document.createElement('div');
    heart.className = 'heart';
    heart.textContent = '💕';
    heart.style.left = `${Math.random() * 100}vw`;
    document.body.appendChild(heart);
    gsap.to(heart, {
        y: -window.innerHeight * 2,
        opacity: 0,
        duration: 6,
        ease: "power1.out",
        onComplete: () => heart.remove()
    });
    gsap.to(heart, {
        x: 12 * (Math.random() - 0.5),
        duration: 0.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
    });
}

function showBoneAttack() {
    const bone = document.createElement('div');
    bone.className = 'bone-attack';
    bone.textContent = '🦴';
    document.getElementById('quiz').appendChild(bone);
    setTimeout(() => bone.remove(), 1000);
}

function showResults() {
    const table = document.querySelector('#results .results-table');
    while (table.rows.length > 1) table.deleteRow(1);
    quizState.results.forEach(result => {
        const row = table.insertRow();
        row.insertCell(0).textContent = result.question;
        row.insertCell(1).textContent = result.correct;
        row.insertCell(2).textContent = result.selected;
        row.insertCell(3).textContent = result.isCorrect ? '正解' : '不正解';
    });
    document.getElementById('results').classList.add('active');
}

function closeResults() {
    document.getElementById('results').classList.remove('active');
}

function handleKeydown(e) {
    if (!quizModal._isShown) return;

    const optionButtons = document.querySelectorAll('.quiz-option');
    let selectedIndex = Array.from(optionButtons).findIndex(btn => btn.classList.contains('selected'));

    if (e.key === 'ArrowUp' && selectedIndex > 0) {
        optionButtons[selectedIndex].classList.remove('selected');
        selectedIndex -= 1;
        optionButtons[selectedIndex].classList.add('selected');
    } else if (e.key === 'ArrowDown' && selectedIndex < optionButtons.length - 1) {
        optionButtons[selectedIndex].classList.remove('selected');
        selectedIndex += 1;
        optionButtons[selectedIndex].classList.add('selected');
    } else if (e.key === 'z' || e.key === 'Enter') {
        if (selectedIndex >= 0) {
            checkAnswer(selectedIndex);
        }
    }
}

function closeQuiz() {
    quizModal.hide();
    document.querySelectorAll('.quiz-option').forEach(btn => {
        btn.classList.remove('selected');
        btn.disabled = true;
        btn.querySelector('.option-text').textContent = '';
    });
    document.querySelector('.btn-primary[onclick="startQuiz()"]').focus();
    document.removeEventListener('keydown', handleKeydown);
}

// Initialize
document.addEventListener('keydown', handleKeydown);
window.speechSynthesis.onvoiceschanged = () => {
    loadVoices('inline');
    loadVoices('modal');
    console.log('onvoiceschanged triggered');
};
window.addEventListener('load', () => {
    voiceModal = new bootstrap.Modal(document.getElementById('voiceModal'), { keyboard: true });
    quizModal = new bootstrap.Modal(document.getElementById('quiz'), { keyboard: true });
    loadVoices('inline');
    loadVoices('modal');
    setTimeout(() => {
        if (document.querySelectorAll('#voiceRadios .form-check').length === 0) {
            console.log('Retrying voice load for inline');
            loadVoices('inline');
        }
        if (document.querySelectorAll('#voiceRadiosModal .form-check').length === 0) {
            console.log('Retrying voice load for modal');
            loadVoices('modal');
        }
    }, 1000);
    loadData();
    document.getElementById('voiceRadios').addEventListener('change', setVoice);
    document.getElementById('voiceRadiosModal').addEventListener('change', setVoice);
});