// デフォルトの単語リスト
  const fallbackWords = [
      {word: "red", meaning: "赤", category: "color", icon: "fas fa-circle", color: "red", background: "bg-color"},
      {word: "blue", meaning: "青", category: "color", icon: "fas fa-circle", color: "blue", background: "bg-color"},
      {word: "apple", meaning: "りんご", category: "fruit", icon: "fas fa-apple-alt", background: "bg-fruit"},
      {word: "dog", meaning: "犬", category: "animal", icon: "fas fa-dog", background: "bg-animal"},
      {word: "run", meaning: "走る", category: "action", icon: "fas fa-running", background: "bg-action"},
      {word: "happy", meaning: "幸せ", category: "emotion", icon: "fas fa-smile", background: "bg-emotion"},
      {word: "school", meaning: "学校", category: "school", background: "bg-school"},
      {word: "sun", meaning: "太陽", category: "weather", icon: "fas fa-star", background: "bg-weather"},
      {word: "one", meaning: "一", category: "number", icon: "fas fa-1", background: "bg-number"},
      {word: "home", meaning: "家", category: "place", icon: "fas fa-home", background: "bg-place"},
      {word: "scissors", meaning: "はさみ", category: "tool", icon: "fas fa-cut"}
  ];

  // カテゴリーごとのアイコン
  const defaultIcons = {
      'color': 'fas fa-palette',
      'vegetable': 'fas fa-carrot',
      'fruit': 'fas fa-apple-alt',
      'shape': 'fas fa-shapes',
      'body': 'fas fa-user',
      'sound': 'fas fa-volume-up',
      'animal': 'fas fa-paw',
      'weather': 'fas fa-cloud',
      'number': 'fas fa-sort-numeric-up',
      'place': 'fas fa-map-marker-alt',
      'action': 'fas fa-running',
      'time': 'fas fa-clock',
      'school': 'fas fa-school',
      'emotion': 'fas fa-smile',
      'fish': 'fas fa-fish',
      'meat': 'fas fa-drumstick-bite',
      'soy': 'fas fa-seedling',
      'tool': 'fas fa-tools'
  };

  let words = [];
  let audioContext;
  let voicesLoaded = false;
  let speechEnabled = true;
  const DEBOUNCE_MS = 300;

  // 通知メッセージ
  function showToast(message, type = 'info') {
      const toastContainer = $('<div class="position-fixed bottom-0 end-0 p-3" style="z-index: 1050"></div>');
      const toast = $(`
          <div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
              <div class="toast-body ${type === 'error' ? 'bg-danger text-white' : ''}">${message}</div>
          </div>
      `);
      toastContainer.append(toast);
      $('body').append(toastContainer);
      toast.toast({ delay: 4000 }).show();
      setTimeout(() => toastContainer.remove(), 4500);
  }

  // 音声コンテキスト初期化
  function initAudioContext() {
      if (!window.AudioContext && !window.webkitAudioContext) {
          showToast('このブラウザでは音声再生がサポートされていません。', 'error');
          return false;
      }
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      return true;
  }

  // 音声設定
  function setupAudio() {
      if (!initAudioContext()) return;
      console.log('音声再生の準備ができました');
  }

  // 正解音（ピョンピョン）
  function playCorrectSound() {
      if (!audioContext) {
          showToast('正解音を再生できません。', 'error');
          return;
      }
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(523.25, now); // C5
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.05, now);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(523.25, now); // C5
      oscillator.frequency.setValueAtTime(659.25, now + 0.2); // E5
      oscillator.frequency.setValueAtTime(783.99, now + 0.4); // G5
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.linearRampToValueAtTime(0.05, now + 0.05);
      oscillator.start(now);
      oscillator.stop(now + 0.6);
  }

  // 不正解音（ブッブー）
  function playIncorrectSound() {
      if (!audioContext) {
          showToast('不正解音を再生できません。', 'error');
          return;
      }
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'square';
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.05, now);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(261.63, now); // C4
      oscillator.frequency.setValueAtTime(196.00, now + 0.3); // G3
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.linearRampToValueAtTime(0.05, now + 0.05);
      oscillator.start(now);
      oscillator.stop(now + 0.5);
  }

  // 音声読み上げ
  function speakWord(word, caller = 'unknown') {
      console.log(`speakWord 開始: word=${word}, caller=${caller}, speechEnabled=${speechEnabled}, voicesLoaded=${voicesLoaded}, speaking=${window.speechSynthesis.speaking}`);
      if (!speechEnabled || !window.speechSynthesis) {
          console.warn('音声無効または非対応');
          showToast('音声が無効またはブラウザでサポートされていません。', 'error');
          return;
      }
      if (!word || typeof word !== 'string') {
          console.warn('無効な単語:', word);
          showToast('単語の読み上げに失敗しました。', 'error');
          return;
      }
      if (!voicesLoaded) {
          console.warn('音声データがまだロードされていません:', word);
          showToast('音声データが準備中です。', 'error');
          return;
      }
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-GB';
      const voices = speechSynthesis.getVoices();
      console.log('利用可能な音声:', voices.map(v => `${v.name} (${v.lang})`));
      const selectedVoice = voices.find(voice => voice.lang === 'en-GB') ||
                           voices.find(voice => voice.lang === 'en-US') ||
                           voices[0];
      if (!selectedVoice) {
          console.warn('利用可能な音声が見つかりません。');
          showToast('音声が見つかりませんでした。', 'error');
          return;
      }
      utterance.voice = selectedVoice;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onerror = (e) => {
          if (e.error !== 'interrupted') {
              console.error(`音声エラー: ${word} - ${e.error}`);
              showToast(`音声の再生に失敗しました: ${word} (${e.error})`, 'error');
          } else {
              console.log(`音声中断: ${word} - ${e.error}`);
          }
      };
      utterance.onend = () => {
          console.log(`音声再生完了: ${word}`);
          showToast(`"${word}" を読み上げました！`, 'info');
      };
      console.log(`音声再生開始: ${word}, voice=${selectedVoice.name}`);
      window.speechSynthesis.speak(utterance);
  }

  // 単語データ検証
  function validateWords(data) {
      if (!Array.isArray(data) || data.length === 0) {
          console.error('データが正しくありません。');
          return false;
      }
      return data.every((word, index) => {
          if (!word || 
              typeof word.word !== 'string' || 
              typeof word.meaning !== 'string' || 
              typeof word.category !== 'string') {
              console.error(`データエラー at index ${index}:`, word);
              return false;
          }
          return true;
      });
  }

  // 音声データ準備
  function waitForVoices() {
      console.log('音声ロード開始');
      return new Promise((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 50;
          const checkVoices = () => {
              const voices = speechSynthesis.getVoices();
              console.log(`音声チェック: 試行${attempts}, 音声数=${voices.length}`);
              if (voices.length > 0) {
                  voicesLoaded = true;
                  console.log('音声ロード完了');
                  resolve(voices);
              } else if (attempts >= maxAttempts) {
                  console.warn('音声ロードタイムアウト');
                  reject('音声が見つかりませんでした。');
              } else {
                  attempts++;
                  setTimeout(checkVoices, 200);
              }
          };
          speechSynthesis.onvoiceschanged = checkVoices;
          checkVoices();
      });
  }

  // 音声アンロック（iOS対策）
  function unlockSpeech() {
      console.log('音声アンロック試行');
      if (window.speechSynthesis && !window.speechSynthesis.speaking) {
          const utterance = new SpeechSynthesisUtterance('');
          utterance.volume = 0;
          window.speechSynthesis.speak(utterance);
          console.log('音声アンロック完了');
      }
  }

  // データ読み込み
  function loadData(callback) {
      console.log('データ読み込み開始');
      fetch('./kidsWords.json')
          .then(response => {
              console.log('読み込み結果:', response);
              if (!response.ok) {
                  throw new Error(`データ読み込み失敗: ${response.status}`);
              }
              return response.json();
          })
          .then(data => {
              console.log('データ取得:', data);
              if (!validateWords(data)) {
                  throw new Error('データ形式が正しくありません');
              }
              words = data.sort(() => Math.random() - 0.5);
              console.log(`${words.length}語を読み込みました`);
              setupAudio();
              waitForVoices()
                  .then(voices => {
                      console.log('音声準備完了:', voices.map(v => `${v.name} (${v.lang})`).join(', '));
                      callback();
                  })
                  .catch(error => {
                      console.error('音声エラー:', error);
                      showToast('音声の準備に失敗しました。ページを続けます。', 'error');
                      callback();
                  });
          })
          .catch(error => {
              console.error('データ読み込みエラー:', error);
              showToast(`データの読み込みに失敗しました: ${error.message}。デフォルトデータを使います。`, 'error');
              words = fallbackWords.sort(() => Math.random() - 0.5);
              setupAudio();
              waitForVoices()
                  .then(voices => {
                      console.log('音声準備完了:', voices.map(v => `${v.name} (${v.lang})`).join(', '));
                      callback();
                  })
                  .catch(error => {
                      console.error('音声エラー:', error);
                      showToast('音声の準備に失敗しました。ページを続けます。', 'error');
                      callback();
                  });
          });
  }