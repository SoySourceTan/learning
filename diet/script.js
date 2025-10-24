document.addEventListener('DOMContentLoaded', () => {
    // --- グローバル変数と定数 ---
    const IS_TOUCH_DEVICE = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const USER_NAME_KEY = 'dietPlanUserName';
    const SAVED_PLAN_KEY = 'dietPlanSavedPlan';
    const KcalPerKg = 7200;
    let menuData = [];
    let selectedItemIdForModal = null;
    let addToSlotModal;

    // --- DOM要素の取得 ---
    const foodLibrary = document.getElementById('food-library');
    const exerciseLibrary = document.getElementById('exercise-library');
    const dropZones = document.querySelectorAll('.drop-zone');
    const searchBar = document.getElementById('search-bar');
    const userInputForm = document.getElementById('user-input-form');
    const userNameInput = document.getElementById('user-name-input');
    const resetPlanButton = document.getElementById('reset-plan-button');
    const exportPlanButton = document.getElementById('export-plan-button');
    const printPlanButton = document.getElementById('print-plan-button');
    const addToSlotModalElement = document.getElementById('addToSlotModal');
    if (addToSlotModalElement) {
        addToSlotModal = new bootstrap.Modal(addToSlotModalElement);
    }
    
    // --- 初期化処理 ---
    const init = async () => {
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error('data.jsonの読み込みに失敗しました。');
            const data = await response.json();
            menuData = data.items;
            setupEventListeners();
            renderLibrary();
            loadName();
            loadPlan();
        } catch (error) {
            console.error("初期化に失敗しました:", error);
            alert("メニューデータの読み込みに失敗しました。ページをリロードしてください。");
        }
    };

    // --- イベントリスナーの一括設定 ---
    const setupEventListeners = () => {
        userInputForm.addEventListener('input', updateAllCalculations);
        searchBar.addEventListener('input', renderLibrary);
        userNameInput.addEventListener('input', saveName);
        resetPlanButton.addEventListener('click', handleResetPlan);
        exportPlanButton.addEventListener('click', exportPlan);
        printPlanButton.addEventListener('click', prepareAndPrint);

        if (addToSlotModalElement) {
            addToSlotModalElement.querySelectorAll('button[data-slot-id]').forEach(button => {
                button.addEventListener('click', handleModalSlotSelection);
            });
        }
        
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('dragleave', handleDragLeave);
            zone.addEventListener('drop', handleDrop);
        });
    };
    
    // --- ★★★ここからが変更箇所★★★ ---
    // ドロップ時のイベントハンドラにルール検証を追加
    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const id = parseInt(e.dataTransfer.getData('text/plain'));
        const item = menuData.find(m => m.id === id);
        const zoneId = e.currentTarget.id;

        if (!item) return; // アイテムが見つからない場合は何もしない

        // ルール検証
        if (item.type === 'exercise' && zoneId !== 'exercise') {
            alert('運動メニューは「運動」の枠にのみ追加できます。');
            return; // 操作をキャンセル
        }
        if (item.type === 'food' && zoneId === 'exercise') {
            alert('食事メニューは「運動」の枠に追加できません。');
            return; // 操作をキャンセル
        }
        
        // 検証をパスした場合のみカードを追加
        addCardToSlot(id, e.currentTarget);
    };
    // ★★★ここまでが変更箇所★★★

    // --- その他のイベントハンドラ ---
    const handleResetPlan = () => { if (confirm('現在のプランをリセットして、サンプルプランに戻しますか？')) { clearPlan(); setInitialPlan(); } };
    const handleModalSlotSelection = (event) => { if (selectedItemIdForModal && addToSlotModal) { const targetSlot = document.getElementById(event.target.dataset.slotId); addCardToSlot(selectedItemIdForModal, targetSlot); event.target.blur(); addToSlotModal.hide(); selectedItemIdForModal = null; } };
    const handleDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); };
    const handleDragLeave = (e) => { e.currentTarget.classList.remove('drag-over'); };
    const handleDragStart = (e) => { e.dataTransfer.setData('text/plain', e.currentTarget.dataset.id); };

    // --- UI操作 / 描画 ---
    const renderLibrary = () => {
        foodLibrary.innerHTML = '';
        exerciseLibrary.innerHTML = '';
        const searchTerm = searchBar.value.toLowerCase();
        menuData.filter(item => item.name.toLowerCase().includes(searchTerm)).forEach(item => {
            const card = createMenuCard(item);
            if (item.type === 'food') foodLibrary.appendChild(card);
            else exerciseLibrary.appendChild(card);
        });
    };

    const createMenuCard = (item) => {
        const card = document.createElement('div');
        const bgColor = item.type === 'food' ? 'bg-success-subtle' : 'bg-danger-subtle';
        card.className = `card p-2 menu-card ${bgColor}`;
        card.dataset.id = item.id;
        card.innerHTML = `<small class="fw-bold">${item.name}</small><div>${item.calories} kcal</div><small class="text-muted">${item.category}</small>`;

        if (IS_TOUCH_DEVICE) {
            card.addEventListener('click', () => handleCardClick(item.id));
        }
        card.draggable = true;
        card.addEventListener('dragstart', handleDragStart);
        return card;
    };

    const addCardToSlot = (itemId, slotElement, shouldUpdate = true) => {
        const item = menuData.find(m => m.id === itemId);
        if (!item || !slotElement) return;
        const plannedCard = createMenuCard(item);
        plannedCard.classList.remove('menu-card');
        plannedCard.classList.add('planned-card');
        plannedCard.draggable = false;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = () => { plannedCard.remove(); updateAllCalculations(); };
        plannedCard.appendChild(removeBtn);
        slotElement.appendChild(plannedCard);
        if (shouldUpdate) updateAllCalculations();
    };
    
    const handleCardClick = (itemId) => {
        selectedItemIdForModal = itemId;
        const item = menuData.find(m => m.id === itemId);
        if (item.type === 'exercise') {
            const exerciseSlot = document.getElementById('exercise');
            addCardToSlot(itemId, exerciseSlot);
        } else if(addToSlotModal) {
            addToSlotModal.show();
        }
    };
    
    const clearPlan = () => dropZones.forEach(zone => (zone.innerHTML = ''));

    const setInitialPlan = () => {
        const initialPlan = { breakfast: [3], lunch: [44], dinner: [46, 14], exercise: [26] };
        clearPlan();
        Object.keys(initialPlan).forEach(slotId => {
            const slotElement = document.getElementById(slotId);
            initialPlan[slotId].forEach(itemId => addCardToSlot(itemId, slotElement, false));
        });
        updateAllCalculations();
    };

    // --- データ永続化 / エクスポート / 印刷 ---
    const saveName = () => localStorage.setItem(USER_NAME_KEY, userNameInput.value);
    const loadName = () => { const savedName = localStorage.getItem(USER_NAME_KEY); if (savedName) userNameInput.value = savedName; };
    const savePlan = () => localStorage.setItem(SAVED_PLAN_KEY, JSON.stringify(getCurrentPlanData()));
    const loadPlan = () => {
        const savedPlanJSON = localStorage.getItem(SAVED_PLAN_KEY);
        if (savedPlanJSON) {
            const savedPlan = JSON.parse(savedPlanJSON);
            clearPlan();
            Object.keys(savedPlan).forEach(slotId => {
                const slotElement = document.getElementById(slotId);
                savedPlan[slotId].forEach(itemId => addCardToSlot(parseInt(itemId), slotElement, false));
            });
            updateAllCalculations();
        } else {
            setInitialPlan();
        }
    };
    const getCurrentPlanData = () => {
        const plan = { breakfast: [], lunch: [], dinner: [], exercise: [] };
        dropZones.forEach(zone => {
            const slotId = zone.id;
            plan[slotId] = Array.from(zone.querySelectorAll('.planned-card')).map(card => parseInt(card.dataset.id));
        });
        return plan;
    };
    const exportPlan = () => {
        const planData = getCurrentPlanData();
        const userName = userNameInput.value || 'user';
        const date = new Date();
        const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        const dataToExport = { userName, savedDate: dateString, plan: planData };
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diet-plan-${userName}-${dateString}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    const prepareAndPrint = () => {
        const userName = userNameInput.value || '名無し';
        const date = new Date();
        const dateString = `${date.getFullYear()}年${(date.getMonth() + 1)}月${date.getDate()}日`;
        document.getElementById('print-title').textContent = `${userName}さんのダイエット計画レポート`;
        document.getElementById('print-date').textContent = `作成日: ${dateString}`;
        window.print();
    };

    // --- 計算ロジック ---
    const updateAllCalculations = () => { const userData = getUserInput(); const { maintenanceCalories } = calculateMaintenanceCalories(userData); updateDashboard(maintenanceCalories, userData); savePlan(); };
    const getUserInput = () => ({ currentWeight: parseFloat(document.getElementById('current-weight').value) || 0, goalWeight: parseFloat(document.getElementById('goal-weight').value) || 0, height: parseFloat(document.getElementById('height').value) || 0, age: parseInt(document.getElementById('age').value) || 0, activityLevel: parseFloat(document.getElementById('activity-level').value) || 1.2, });
    const calculateMaintenanceCalories = (data) => { if (!data.height || !data.currentWeight || !data.age) return { maintenanceCalories: 0 }; const bmr = 447.593 + (9.247 * data.currentWeight) + (3.098 * data.height) - (4.330 * data.age); return { maintenanceCalories: bmr * data.activityLevel }; };
    const updateDashboard = (maintenanceCalories, userData) => { const totals = { intake: 0, burn: 0, protein: 0, fat: 0, carbs: 0 }; document.querySelectorAll('.planned-card').forEach(card => { const item = menuData.find(m => m.id === parseInt(card.dataset.id)); if (!item) return; if (item.type === 'food') { totals.intake += item.calories; totals.protein += item.protein || 0; totals.fat += item.fat || 0; totals.carbs += item.carbs || 0; } else { totals.burn += item.calories; } }); const netCalories = totals.intake + totals.burn; const calorieDeficit = maintenanceCalories - netCalories; document.getElementById('total-intake').textContent = totals.intake; document.getElementById('total-burn').textContent = Math.abs(totals.burn); document.getElementById('net-calories').textContent = netCalories; document.getElementById('total-protein').textContent = totals.protein.toFixed(1); document.getElementById('total-fat').textContent = totals.fat.toFixed(1); document.getElementById('total-carbs').textContent = totals.carbs.toFixed(1); const calorieDiffEl = document.getElementById('calorie-deficit'); calorieDiffEl.textContent = `${calorieDeficit.toFixed(0)} kcal`; calorieDiffEl.className = `fs-4 ${calorieDeficit >= 0 ? 'text-success' : 'text-danger'}`; updateDaysToGoal(userData, calorieDeficit); };
    const updateDaysToGoal = (userData, calorieDeficit) => { const weightToLose = userData.currentWeight - userData.goalWeight; const daysEl = document.getElementById('days-to-goal'); if (weightToLose <= 0) { daysEl.textContent = '達成!'; daysEl.classList.remove('text-danger', 'text-warning'); return; } if (calorieDeficit <= 0) { daysEl.textContent = '∞ 日'; daysEl.classList.add('text-danger'); daysEl.classList.remove('text-warning'); return; } const totalKcalToLose = weightToLose * KcalPerKg; const days = Math.ceil(totalKcalToLose / calorieDeficit); animateCounter(daysEl, days); daysEl.classList.remove('text-danger'); daysEl.classList.toggle('text-warning', days > 365); };
    const animateCounter = (element, targetValue) => { const duration = 300; const startValue = parseInt(element.textContent.replace(/[^0-9]/g, '')) || 0; if (startValue === targetValue) return; let startTime = null; const animation = (currentTime) => { if (!startTime) startTime = currentTime; const progress = Math.min((currentTime - startTime) / duration, 1); const currentValue = Math.floor(progress * (targetValue - startValue) + startValue); element.textContent = `${currentValue} 日`; if (progress < 1) requestAnimationFrame(animation); }; requestAnimationFrame(animation); };

    // --- アプリケーションの開始 ---
    init();
});