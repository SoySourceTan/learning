import { quizState } from './gameState.js';
import { config } from './config.js';
import { checkAnswer, soundEffects } from './battle.js';

export let wordData = { nouns: [], verbs: [], adjectives: [], adverbs: [], prepositions: [], phrases: [] };

export async function loadWordData() {
    try {
        const response = await fetch('./words.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch words.json: ${response.statusText}`);
        }
        const loadedData = await response.json();
        wordData = { ...wordData, ...loadedData };
        Object.keys(wordData).forEach(category => {
            wordData[category].forEach(item => {
                item.appearanceCount = item.appearanceCount || 0;
            });
        });
        const savedState = JSON.parse(localStorage.getItem('gameState') || '{}');
        if (savedState.wordDataAppearance) {
            Object.keys(savedState.wordDataAppearance).forEach(category => {
                if (wordData[category]) {
                    wordData[category].forEach(item => {
                        const savedItem = savedState.wordDataAppearance[category].find(saved => saved.word === item.word);
                        if (savedItem) {
                            item.appearanceCount = savedItem.appearanceCount || 0;
                        }
                    });
                }
            });
        }
        console.log('Word data loaded and merged:', wordData);
    } catch (error) {
        console.error('Error loading word data:', error);
        wordData.nouns = [
            { word: 'sword', meaning: '剣', difficulty: 'easy', questionTypes: ['meaning'], appearanceCount: 0 },
            { word: 'shield', meaning: '盾', difficulty: 'easy', questionTypes: ['meaning'], appearanceCount: 0 },
            { word: 'armor', meaning: '鎧', difficulty: 'medium', questionTypes: ['meaning'], appearanceCount: 0 },
            { word: 'potion', meaning: '薬', difficulty: 'easy', questionTypes: ['meaning'], appearanceCount: 0 }
        ];
        console.log('Using fallback wordData:', wordData);
    }
}

export function saveWordDataAppearance() {
    const state = JSON.parse(localStorage.getItem('gameState') || '{}');
    state.wordDataAppearance = {};
    Object.keys(wordData).forEach(category => {
        state.wordDataAppearance[category] = wordData[category].map(item => ({
            word: item.word,
            appearanceCount: item.appearanceCount || 0
        }));
    });
    localStorage.setItem('gameState', JSON.stringify(state));
    console.log('Word data appearance saved:', state.wordDataAppearance);
}

let isTyping = false;

export function typeMessage(text, element, callback, wait = false) {
    if (!element) return;
    console.log('Displaying message:', text);
    element.textContent = '';
    element.style.pointerEvents = 'auto';
    element.classList.remove('blinking-cursor');
    let i = 0;

    function type() {
        if (i < text.length) {
            element.textContent += text[i];
            i++;
            setTimeout(type, config.messageSpeed);
        } else if (wait) {
            element.textContent += '_';
            element.classList.add('blinking-cursor');
            const handleClick = () => {
                console.log('Message clicked');
                element.classList.remove('blinking-cursor');
                element.textContent = element.textContent.replace('_', '');
                element.removeEventListener('click', handleClick);
                element.style.pointerEvents = 'none';
                if (callback) callback();
            };
            element.addEventListener('click', handleClick, { once: true });
        } else if (callback) {
            setTimeout(() => {
                console.log('Message typing complete, executing callback');
                callback();
            }, 500);
        }
    }
    type();
}

export function showQuizOptions() {
    const optionsDiv = document.getElementById('quiz-options');
    const message = document.getElementById('battle-message');
    const feedback = document.getElementById('battle-feedback');
    message.textContent = '';
    feedback.textContent = '';

    console.log('Current wordData:', wordData);

    const levelRanges = {
        easy: [1, 5],
        medium: [6, 15],
        hard: [16, Infinity]
    };
    let difficulty = 'easy';
    for (const [diff, [min, max]] of Object.entries(levelRanges)) {
        if (quizState.level >= min && quizState.level <= max) {
            difficulty = diff;
            break;
        }
    }

    // antonym を持つカテゴリを優先（50%の確率）
    const antonymCategories = Object.keys(wordData).filter(key => {
        const items = wordData[key];
        return Array.isArray(items) && items.some(item => item.antonym && item.questionTypes.includes('antonym'));
    });
    const allCategories = Object.keys(wordData).filter(key => {
        const items = wordData[key];
        return Array.isArray(items) && items.length > 0;
    });

    let selectedCategory;
    if (antonymCategories.length > 0 && Math.random() < 0.5) {
        selectedCategory = antonymCategories[Math.floor(Math.random() * antonymCategories.length)];
    } else {
        selectedCategory = allCategories[Math.floor(Math.random() * allCategories.length)];
    }

    if (!selectedCategory) {
        console.error('No valid categories found');
        typeMessage('単語が見つかりません！ 別のモンスターを試してください。', message, () => {
            setTimeout(() => document.dispatchEvent(new Event('nextBattle')), 1000);
        });
        return;
    }

    let items = wordData[selectedCategory];
    const difficultyFallbacks = [difficulty, 'medium', 'easy', 'hard', undefined];
    let filteredItems = [];
    for (const diff of difficultyFallbacks) {
        filteredItems = diff === undefined
            ? items
            : items.filter(item => item.difficulty === diff);
        if (filteredItems.length > 0) {
            difficulty = diff || 'any';
            break;
        }
    }

    if (filteredItems.length == 0) {
        console.error('No valid items found for any difficulty in category:', selectedCategory);
        typeMessage('単語が見つかりません！ 別のモンスターを試してください。', message, () => {
            setTimeout(() => document.dispatchEvent(new Event('nextBattle')), 1000);
        });
        return;
    }

    quizState.recentWords = quizState.recentWords || [];
    const maxRecent = 10;
    let correctItem;

    // antonym クイズを優先するため、antonym を持つ単語を高確率で選択
    const antonymItems = filteredItems.filter(item => item.antonym && item.questionTypes.includes('antonym'));
    const totalWeight = filteredItems.reduce((sum, item) => sum + 1 / (1 + item.appearanceCount), 0);
    let rand = Math.random();
    let weightSum = 0;

    if (antonymItems.length > 0 && rand < 0.5) {
        const antonymWeight = antonymItems.reduce((sum, item) => sum + 1 / (1 + item.appearanceCount), 0);
        rand = Math.random() * antonymWeight;
        weightSum = 0;
        for (const item of antonymItems) {
            if (!quizState.recentWords.includes(item.phrase || item.word)) {
                weightSum += 1 / (1 + item.appearanceCount);
                if (rand <= weightSum) {
                    correctItem = item;
                    break;
                }
            }
        }
    }

    if (!correctItem) {
        rand = Math.random() * totalWeight;
        weightSum = 0;
        for (const item of filteredItems) {
            if (!quizState.recentWords.includes(item.phrase || item.word)) {
                weightSum += 1 / (1 + item.appearanceCount);
                if (rand <= weightSum) {
                    correctItem = item;
                    break;
                }
            }
        }
    }

    if (!correctItem) {
        console.warn('No non-recent words available, selecting with weights');
        rand = Math.random() * totalWeight;
        weightSum = 0;
        for (const item of filteredItems) {
            weightSum += 1 / (1 + item.appearanceCount);
            if (rand <= weightSum) {
                correctItem = item;
                break;
            }
        }
    }

    correctItem.appearanceCount++;
    console.log(`Selected word: ${correctItem.word}, Appearance count: ${correctItem.appearanceCount}`);
    saveWordDataAppearance();

    quizState.recentWords.push(correctItem.phrase || correctItem.word);
    if (quizState.recentWords.length > maxRecent) {
        quizState.recentWords.shift();
    }
    console.log('Recent words:', quizState.recentWords);

    const questionTypes = correctItem.questionTypes || ['meaning'];
    let questionType;
    const prevType = quizState.current?.questionType;

    // antonym を最低33.33%の確率で選択
    const randType = Math.random();
    const antonymProb = 0.333;
    const relatedProb = quizState.level >= 6 ? 0.2 : 0.15;
    const availableTypes = questionTypes.filter(type => type !== prevType);

    if (questionTypes.includes('antonym') && randType < antonymProb) {
        questionType = 'antonym';
    } else if (availableTypes.length > 0 && Math.random() < 0.5) {
        questionType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    } else {
        if (questionTypes.includes('related') && randType < antonymProb + relatedProb) {
            questionType = 'related';
        } else {
            questionType = 'meaning';
        }
    }
    console.log('Selected questionType:', questionType, 'Available types:', questionTypes, 'Previous type:', prevType);

    let correctAnswer;
    let questionText;
    let correctAnswers = [];

    if (questionType == 'antonym' && correctItem.antonym) {
        const antonymItem = wordData[selectedCategory].find(item => (item.phrase || item.word) === correctItem.antonym);
        if (antonymItem) {
            correctAnswer = { word: antonymItem.phrase || antonymItem.word, meaning: antonymItem.meaning };
            correctAnswers = [correctAnswer];
            questionText = `「${correctItem.phrase || correctItem.word}」の反対語は どれ？`;
        } else {
            console.warn(`Antonym not found for ${correctItem.word}, falling back to meaning`);
            questionType = 'meaning';
        }
    }

    if (questionType == 'related' && correctItem.relatedWords) {
        const relatedItems = wordData[selectedCategory].filter(item => 
            correctItem.relatedWords.includes(item.phrase || item.word)
        );
        if (relatedItems.length > 0) {
            correctAnswer = relatedItems[Math.floor(Math.random() * relatedItems.length)];
            correctAnswers = relatedItems.map(item => ({
                word: item.phrase || item.word,
                meaning: item.meaning
            }));
            questionText = `「${correctItem.phrase || correctItem.word}」に近い意味は どれ？`;
        } else {
            console.warn(`Related words not found for ${correctItem.word}, falling back to meaning`);
            questionType = 'meaning';
        }
    }

    if (questionType == 'meaning') {
        correctAnswer = { word: correctItem.phrase || correctItem.word, meaning: correctItem.meaning };
        correctAnswers = [correctAnswer];
        questionText = `「${correctAnswer.meaning}」は どれ？`;
    }

    quizState.current = { item: correctAnswer, category: selectedCategory, questionType, correctAnswers };
    const optionsList = [...correctAnswers];

    let otherItems = items.filter(item => 
        !correctAnswers.some(ans => (item.phrase || item.word) === ans.word)
    );

    while (optionsList.length < 4 && otherItems.length > 0) {
        const randomIndex = Math.floor(Math.random() * otherItems.length);
        const otherItem = otherItems[randomIndex];
        let otherOption = { word: otherItem.phrase || otherItem.word, meaning: otherItem.meaning };

        if (otherItem.relatedWords && Math.random() < 0.5) {
            const relatedWord = otherItem.relatedWords[Math.floor(Math.random() * otherItem.relatedWords.length)];
            const relatedItem = wordData[selectedCategory].find(item => 
                (item.phrase || item.word) === relatedWord
            );
            if (relatedItem && !optionsList.some(opt => opt.word === (relatedItem.phrase || relatedItem.word))) {
                otherOption = { word: relatedItem.phrase || relatedItem.word, meaning: relatedItem.meaning };
                console.log(`Added related word: ${otherOption.word} for ${otherItem.word}`);
            }
        }

        if (!optionsList.some(opt => opt.word === otherOption.word)) {
            optionsList.push(otherOption);
        }
        otherItems.splice(otherItems.indexOf(otherItem), 1);
    }

    if (optionsList.length < 4) {
        const otherCategories = Object.keys(wordData).filter(key => key !== selectedCategory);
        let allOtherItems = [];
        for (const cat of otherCategories) {
            const catItems = difficulty === 'any'
                ? wordData[cat]
                : wordData[cat].filter(item => item.difficulty === difficulty);
            allOtherItems.push(...catItems.filter(item => 
                !optionsList.some(opt => (item.phrase || item.word) === opt.word)
            ));
        }

        while (optionsList.length < 4 && allOtherItems.length > 0) {
            const randomIndex = Math.floor(Math.random() * allOtherItems.length);
            const otherItem = allOtherItems[randomIndex];
            const otherOption = { word: otherItem.phrase || otherItem.word, meaning: otherItem.meaning };
            if (!optionsList.some(opt => opt.word === otherOption.word)) {
                optionsList.push(otherOption);
            }
            allOtherItems.splice(randomIndex, 1);
        }
    }

    if (optionsList.length < 4) {
        let allItems = [];
        for (const cat of Object.keys(wordData)) {
            allItems.push(...wordData[cat].filter(item => 
                !optionsList.some(opt => (item.phrase || item.word) === opt.word)
            ));
        }

        while (optionsList.length < 4 && allItems.length > 0) {
            const randomIndex = Math.floor(Math.random() * allItems.length);
            const otherItem = allItems[randomIndex];
            const otherOption = { word: otherItem.phrase || otherItem.word, meaning: otherItem.meaning };
            if (!optionsList.some(opt => opt.word === otherOption.word)) {
                optionsList.push(otherOption);
            }
            allItems.splice(randomIndex, 1);
        }
    }

    if (optionsList.length < 4) {
        console.error('Not enough words to fill options');
        typeMessage('おっと！ 単語の呪文が足りぬ！ 別のモンスターに挑戦だ！', message, () => {
            setTimeout(() => document.dispatchEvent(new Event('nextBattle')), 1000);
        });
        return;
    }

    optionsList.sort(() => Math.random() - 0.5);
    quizState.options = optionsList;

    optionsDiv.innerHTML = `
        <div class="row g-2">
            ${optionsList.map((option, index) => `
                <div class="col-6">
                    <button class="dq3-option btn w-100" data-index="${index}" data-is-correct="${correctAnswers.some(ans => ans.word === option.word)}">
                        <span class="option-text py-0 fs-5">${option.word}</span>
                    </button>
                </div>
            `).join('')}
        </div>
    `;

    optionsDiv.querySelectorAll('button').forEach((button, index) => {
        button.addEventListener('click', () => {
            console.log('Quiz option clicked:', index);
            if (!quizState.isSeMuted) {
                try {
                    soundEffects.cursole.play();
                    console.log('Playing click SE at', new Date().toISOString());
                } catch (err) {
                    console.error('Error playing click SE:', err);
                }
            } else {
                console.log('SE muted, skipping click sound');
            }
            checkAnswer(index);
        }, { once: true });
    });

    typeMessage(`${quizState.monster.name}の こうげき！！\n${questionText}`, message);
    console.log('Quiz options rendered, Category:', selectedCategory, 'Difficulty:', difficulty, 'Options:', optionsList);
}