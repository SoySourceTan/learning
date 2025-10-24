document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    // ★変更: ライブラリのコンテナを食事と運動で分ける
    const foodLibrary = document.getElementById('food-library');
    const exerciseLibrary = document.getElementById('exercise-library');
    
    const dropZones = document.querySelectorAll('.drop-zone');
    const searchBar = document.getElementById('search-bar');
    const userInputForm = document.getElementById('user-input-form');
    const addToSlotModalElement = document.getElementById('addToSlotModal');
    const addToSlotModal = new bootstrap.Modal(addToSlotModalElement);
    
    let menuData = [];
    let selectedItemIdForModal = null;
    const KcalPerKg = 7200;

    // --- 初期化処理 ---
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            menuData = data.items;
            renderLibrary(); // ★引数なしで呼び出すように変更
            setInitialPlan();
        });

    // --- イベントリスナーの設定 ---
    userInputForm.addEventListener('input', updateAllCalculations);
    searchBar.addEventListener('input', renderLibrary); // ★引数なしで呼び出すように変更
    
    // モーダルのボタンにクリックイベントを設定
    addToSlotModalElement.querySelectorAll('button[data-slot-id]').forEach(button => {
        button.addEventListener('click', (event) => {
            if (selectedItemIdForModal) {
                const targetSlot = document.getElementById(button.dataset.slotId);
                addCardToSlot(selectedItemIdForModal, targetSlot);
                event.target.blur();
                addToSlotModal.hide();
                selectedItemIdForModal = null;
            }
        });
    });

    // --- 関数定義 ---
    function setInitialPlan() {
        // ID: 3(食パン), 44(牛丼), 46(唐揚げ), 14(味噌汁), 26(ウォーキング30分)
        const initialPlan = { breakfast: [3], lunch: [44], dinner: [46, 14], exercise: [26] };
        for (const slotId in initialPlan) {
            const slotElement = document.getElementById(slotId);
            initialPlan[slotId].forEach(itemId => addCardToSlot(itemId, slotElement, false));
        }
        updateAllCalculations();
    }

    // ★★★ここからが変更箇所★★★
    function renderLibrary() {
        foodLibrary.innerHTML = '';
        exerciseLibrary.innerHTML = '';

        const searchTerm = searchBar.value.toLowerCase();
        
        // データをフィルタリング
        const filteredItems = menuData.filter(item => item.name.toLowerCase().includes(searchTerm));

        // 食事と運動に振り分けて描画
        filteredItems.forEach(item => {
            const card = createMenuCard(item);
            card.addEventListener('click', () => handleCardClick(item.id));
            card.addEventListener('dragstart', handleDragStart);

            if (item.type === 'food') {
                foodLibrary.appendChild(card);
            } else if (item.type === 'exercise') {
                exerciseLibrary.appendChild(card);
            }
        });
    }
    // ★★★ここまでが変更箇所★★★
    
    function handleCardClick(itemId) {
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            selectedItemIdForModal = itemId;
            const item = menuData.find(m => m.id === itemId);
            if (item.type === 'exercise') {
                const exerciseSlot = document.getElementById('exercise');
                addCardToSlot(itemId, exerciseSlot);
            } else {
                 addToSlotModal.show();
            }
        }
    }
    
    function addCardToSlot(itemId, slotElement, shouldUpdate = true) {
        const item = menuData.find(m => m.id === itemId);
        if (!item || !slotElement) return;

        const card = createMenuCard(item);
        card.classList.remove('menu-card');
        card.classList.add('planned-card');
        card.draggable = false;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = () => { card.remove(); updateAllCalculations(); };
        card.appendChild(removeBtn);

        slotElement.appendChild(card);
        if (shouldUpdate) {
            updateAllCalculations();
        }
    }

    function createMenuCard(item) {
        const card = document.createElement('div');
        const bgColor = item.type === 'food' ? 'bg-success-subtle' : 'bg-danger-subtle';
        card.className = `card p-2 menu-card ${bgColor}`;
        card.dataset.id = item.id;
        card.innerHTML = `<small class="fw-bold">${item.name}</small><div>${item.calories} kcal</div><small class="text-muted">${item.category}</small>`;
        return card;
    }

    // (これ以降の計算関連の関数は変更ありません)
    // ... updateAllCalculations, getUserInput, calculateMaintenanceCalories, updateDashboard, ...
    // ... updateDaysToGoal, animateCounter, handleDragStart, dropZone event listeners ...
    
    function updateAllCalculations() {
        const userData = getUserInput();
        const { maintenanceCalories } = calculateMaintenanceCalories(userData);
        updateDashboard(maintenanceCalories, userData);
    }
    
    function getUserInput() {
        return {
            currentWeight: parseFloat(document.getElementById('current-weight').value) || 0,
            goalWeight: parseFloat(document.getElementById('goal-weight').value) || 0,
            height: parseFloat(document.getElementById('height').value) || 0,
            age: parseInt(document.getElementById('age').value) || 0,
            activityLevel: parseFloat(document.getElementById('activity-level').value) || 1.2,
        };
    }

    function calculateMaintenanceCalories(data) {
        if (!data.height || !data.currentWeight || !data.age) return { maintenanceCalories: 0 };
        const bmr = 447.593 + (9.247 * data.currentWeight) + (3.098 * data.height) - (4.330 * data.age);
        const maintenanceCalories = bmr * data.activityLevel;
        return { maintenanceCalories };
    }

    function updateDashboard(maintenanceCalories, userData) {
        let totals = { intake: 0, burn: 0, protein: 0, fat: 0, carbs: 0 };
        document.querySelectorAll('.planned-card').forEach(card => {
            const item = menuData.find(m => m.id === parseInt(card.dataset.id));
            if (!item) return;
            if (item.type === 'food') {
                totals.intake += item.calories;
                totals.protein += item.protein || 0;
                totals.fat += item.fat || 0;
                totals.carbs += item.carbs || 0;
            } else {
                totals.burn += item.calories;
            }
        });
        const netCalories = totals.intake + totals.burn;
        const calorieDeficit = maintenanceCalories - netCalories;
        document.getElementById('total-intake').textContent = totals.intake;
        document.getElementById('total-burn').textContent = Math.abs(totals.burn);
        document.getElementById('net-calories').textContent = netCalories;
        document.getElementById('total-protein').textContent = totals.protein.toFixed(1);
        document.getElementById('total-fat').textContent = totals.fat.toFixed(1);
        document.getElementById('total-carbs').textContent = totals.carbs.toFixed(1);
        const calorieDiffEl = document.getElementById('calorie-deficit');
        calorieDiffEl.textContent = `${calorieDeficit.toFixed(0)} kcal`;
        calorieDiffEl.className = `fs-4 ${calorieDeficit >= 0 ? 'text-success' : 'text-danger'}`;
        updateDaysToGoal(userData, calorieDeficit);
    }
    
    function updateDaysToGoal(userData, calorieDeficit) {
        const weightToLose = userData.currentWeight - userData.goalWeight;
        const daysEl = document.getElementById('days-to-goal');
        if (weightToLose <= 0) {
            daysEl.textContent = '達成!';
            daysEl.classList.remove('text-danger', 'text-warning'); return;
        }
        if (calorieDeficit <= 0) {
            daysEl.textContent = '∞ 日';
            daysEl.classList.add('text-danger');
            daysEl.classList.remove('text-warning'); return;
        }
        const totalKcalToLose = weightToLose * KcalPerKg;
        const days = Math.ceil(totalKcalToLose / calorieDeficit);
        animateCounter(daysEl, days);
        daysEl.classList.remove('text-danger');
        daysEl.classList.toggle('text-warning', days > 365);
    }

    function animateCounter(element, targetValue) {
        const duration = 500;
        const startValue = parseInt(element.textContent.replace(/[^0-9]/g, '')) || 0;
        if (startValue === targetValue) return;
        let startTime = null;
        function animation(currentTime) {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const currentValue = Math.floor(progress * (targetValue - startValue) + startValue);
            element.textContent = `${currentValue} 日`;
            if (progress < 1) requestAnimationFrame(animation);
        }
        requestAnimationFrame(animation);
    }

    function handleDragStart(e) {
        e.dataTransfer.setData('text/plain', this.dataset.id);
    }
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const id = parseInt(e.dataTransfer.getData('text/plain'));
            addCardToSlot(id, zone);
        });
    });
});