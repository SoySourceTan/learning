let wordData = {};
let quizState = { score: 0, total: 10, current: null, options: [], currentIndex: 0, results: [] };
let selectedVoice = null;
const correctSound = new Howl({ src: ['correct.mp3'], volume: 0.6 });
const wrongSound = new Howl({ src: ['incorrect.mp3'], volume: 0.6 });

// Load voices for text-to-speech
function loadVoices() {
    const voices = window.speechSynthesis.getVoices();
    const voiceRadios = document.getElementById('voiceRadios');
    voiceRadios.innerHTML = '';
    if (voices.length === 0) {
        console.warn('No voices loaded yet, waiting for onvoiceschanged');
        return;
    }

    // Find default voice (Google UK English Female or fallback)
    let defaultVoiceIndex = null;
    voices.forEach((voice, index) => {
        if (voice.name === 'Google UK English Female' && voice.lang === 'en-GB') {
            defaultVoiceIndex = index;
            selectedVoice = voice; // Set initial voice
        }
    });
    if (defaultVoiceIndex === null) {
        // Fallback to any en-GB voice
        voices.forEach((voice, index) => {
            if (voice.lang === 'en-GB' && defaultVoiceIndex === null) {
                defaultVoiceIndex = index;
                selectedVoice = voice;
            }
        });
    }
    console.log('Default voice set:', selectedVoice ? selectedVoice.name : 'None');

    // Generate radio buttons
    voices.forEach((voice, index) => {
        if (voice.lang.includes('en')) { // English voices only
            const div = document.createElement('div');
            div.className = 'form-check';
            div.innerHTML = `
                <input class="form-check-input" type="radio" name="voiceSelect" id="voice${index}" value="${index}" ${index === defaultVoiceIndex ? 'checked' : ''}>
                <label class="form-check-label" for="voice${index}">${voice.name} (${voice.lang})</label>
            `;
            voiceRadios.appendChild(div);
        }
    });
    console.log('Voices loaded:', voices.filter(v => v.lang.includes('en')));
}

// Set selected voice
function setVoice(event) {
    const index = event.target.value;
    const voices = window.speechSynthesis.getVoices();
    selectedVoice = index ? voices[parseInt(index)] : null;
    console.log('Selected voice:', selectedVoice ? selectedVoice.name : 'Default');
}

// Load words from words.json
async function loadData() {
    document.getElementById('loadingModal').classList.add('active');
    try {
        const response = await fetch('words.json');
        if (!response.ok) throw new Error('単語データの読み込みに失敗しました');
        wordData = await response.json();
        populateTables();
        document.getElementById('loadingModal').classList.remove('active');
    } catch (error) {
        console.error('Error loading words:', error);
        document.getElementById('loadingModal').innerHTML = `<p>単語データの読み込みに失敗しました。words.jsonを確認してください。エラー: ${error.message}</p>`;
    }
}

// Populate tables with word data
function populateTables(filter = '') {
    const categories = [
        { id: 'nouns-tables', data: wordData.nouns, key: 'word' },
        { id: 'verbs-tables', data: wordData.verbs, key: 'word' },
        { id: 'adjectives-tables', data: wordData.adjectives, key: 'word' },
        { id: 'adverbs-tables', data: wordData.adverbs, key: 'word' },
        { id: 'prepositions-tables', data: wordData.prepositions, key: 'word' },
        { id: 'phrases-tables', data: wordData.phrases, key: 'phrase' }
    ];

    categories.forEach(category => {
        const container = document.getElementById(category.id);
        container.innerHTML = '';
        const filteredData = category.data ? category.data.filter(item =>
            item[category.key].toLowerCase().includes(filter.toLowerCase()) ||
            item.meaning.toLowerCase().includes(filter.toLowerCase())
        ) : [];

        // Determine number of columns based on screen width
        let columns = 1;
        if (window.innerWidth >= 992) columns = 3;
        else if (window.innerWidth >= 768) columns = 2;

        // Split data into columns
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
                cell1.textContent = item[category.key];
                cell2.textContent = item.meaning;
                cell1.onclick = () => speak(item[category.key]);
            }
            container.appendChild(table);
        }
    });
}

// Text-to-speech
function speak(text) {
    try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-GB'; // Align with default voice
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        window.speechSynthesis.speak(utterance);
        console.log('Speaking with voice:', selectedVoice ? selectedVoice.name : 'Default', 'Text:', text);
    } catch (error) {
        console.error('Speech error:', error);
    }
}

// Search functionality
function searchWords() {
    const query = document.getElementById('search').value;
    populateTables(query);
}

// Quiz functionality
function startQuiz() {
    if (!wordData.nouns) {
        alert('単語データが読み込まれていません。ページをリロードしてください。');
        return;
    }
    quizState = { score: 0, total: 10, current: null, options: [], currentIndex: 0, results: [] };
    document.getElementById('quiz-score').textContent = `スコア: ${quizState.score}/${quizState.total}`;
    document.getElementById('quiz-feedback').textContent = '';
    document.getElementById('quiz').classList.add('active');
    nextQuestion();
}

function nextQuestion() {
    // Reset previous option styles
    const optionButtons = document.querySelectorAll('.quiz-option');
    optionButtons.forEach(btn => {
        btn.classList.remove('correct', 'incorrect', 'selected');
        btn.disabled = false;
    });
    document.getElementById('effectOverlay').style.display = 'none';
    document.getElementById('quiz-feedback').textContent = '';

    if (quizState.currentIndex >= quizState.total) {
        closeQuiz();
        showResults();
        return;
    }

    const categories = ['nouns', 'verbs', 'adjectives', 'adverbs', 'prepositions', 'phrases'];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const key = category === 'phrases' ? 'phrase' : 'word';
    const items = wordData[category];
    if (!items || items.length < 4) {
        alert('選択したカテゴリのデータが不足しています。');
        closeQuiz();
        return;
    }

    // Select correct answer
    const correctItem = items[Math.floor(Math.random() * items.length)];
    quizState.current = { category, item: correctItem, key, index: (quizState.currentIndex || 0) + 1 };
    quizState.currentIndex = quizState.current.index;

    // Generate 3 incorrect options
    const options = [correctItem];
    const otherItems = items.filter(item => item[key] !== correctItem[key]);
    while (options.length < 4 && otherItems.length > 0) {
        const randomIndex = Math.floor(Math.random() * otherItems.length);
        options.push(otherItems.splice(randomIndex, 1)[0]);
    }

    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }
    quizState.options = options;

    // Update UI
    document.getElementById('quiz-question').textContent = `${correctItem.meaning} の英語は？`;
    optionButtons.forEach((btn, index) => {
        btn.textContent = options[index][key];
    });
}

function checkAnswer(index) {
    const selectedOption = quizState.options[index];
    const correctAnswer = quizState.current.item[quizState.current.key];
    const optionButtons = document.querySelectorAll('.quiz-option');

    // Disable all buttons after selection
    optionButtons.forEach(btn => btn.disabled = true);

    // Highlight correct and incorrect answers
    optionButtons.forEach((btn, i) => {
        if (quizState.options[i][quizState.current.key] === correctAnswer) {
            btn.classList.add('correct');
        } else if (i === index) {
            btn.classList.add('incorrect');
        }
    });

    // Save result
    const isCorrect = selectedOption[quizState.current.key] === correctAnswer;
    quizState.results.push({
        question: quizState.current.item.meaning,
        correct: correctAnswer,
        selected: selectedOption[quizState.current.key],
        isCorrect: isCorrect
    });

    // Show feedback and effects
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

    // Brief delay before next question to show feedback
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
    const quiz = document.getElementById('quiz');
    if (!quiz.classList.contains('active')) return;

    const optionButtons = document.querySelectorAll('.quiz-option');
    let selectedIndex = Array.from(optionButtons).findIndex(btn => btn.classList.contains('selected'));

    // Navigate options with arrow keys
    if (e.key === 'ArrowUp' && selectedIndex > 1) {
        optionButtons[selectedIndex].classList.remove('selected');
        selectedIndex -= 2;
        optionButtons[selectedIndex].classList.add('selected');
    } else if (e.key === 'ArrowDown' && selectedIndex < 2) {
        optionButtons[selectedIndex].classList.remove('selected');
        selectedIndex += 2;
        optionButtons[selectedIndex].classList.add('selected');
    } else if (e.key === 'ArrowLeft' && selectedIndex % 2 === 1) {
        optionButtons[selectedIndex].classList.remove('selected');
        selectedIndex -= 1;
        optionButtons[selectedIndex].classList.add('selected');
    } else if (e.key === 'ArrowRight' && selectedIndex % 2 === 0 && selectedIndex < optionButtons.length - 1) {
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
    document.getElementById('quiz').classList.remove('active');
    document.querySelectorAll('.quiz-option').forEach(btn => btn.classList.remove('selected'));
    document.removeEventListener('keydown', handleKeydown);
}

// Initialize
document.addEventListener('keydown', handleKeydown);
window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
    console.log('onvoiceschanged triggered');
};
window.addEventListener('load', () => {
    loadVoices();
    // Fallback: retry loading voices after 1s if empty
    setTimeout(() => {
        if (document.querySelectorAll('#voiceRadios .form-check').length === 0) {
            console.log('Retrying voice load');
            loadVoices();
        }
    }, 1000);
    loadData();
    // Add event listener for voice selection
    document.getElementById('voiceRadios').addEventListener('change', setVoice);
});