// ---------- ДОПОМІЖНІ ФУНКЦІЇ ДЛЯ МОДАЛЬНИХ ВІКОН ----------
function openHelp() {
    document.getElementById('helpModal').classList.add('active');
}

function closeHelp() {
    document.getElementById('helpModal').classList.remove('active');
}

// Закриття при кліку на фон поза вікном
window.addEventListener('click', function (event) {
    const modal = document.getElementById('helpModal');
    if (event.target == modal) {
        closeHelp();
    }
});

// ---------- КОНФІГУРАЦІЯ ГРИ ----------
let secretNumber = [];
let currentAttempts = 0;
let maxAttempts = 4;
let currentDigits = 4;
let gameActive = true;
let timerSeconds = 0;
let timerInterval = null;
let firstGuessMade = false;  // НОВА ЗМІННА - чи була перша спроба

const difficultyMap = {
    "4": 4,
    "5": 5,
    "6": 6
};

// ---------- ДОПОМІЖНІ ФУНКЦІЇ ----------
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.style.backgroundColor = isError ? '#c97a1a' : '#1a1a1a';
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        toast.style.backgroundColor = '#1a1a1a';
    }, 2800);
}

function updateUI() {
    const attemptsDisplay = document.getElementById('attempts-display');
    if (attemptsDisplay) {
        const remaining = maxAttempts - currentAttempts;
        attemptsDisplay.innerText = remaining;
    }
    
    const timerDisplay = document.getElementById('timer');
    if (timerDisplay) {
        const minutes = Math.floor(timerSeconds / 60);
        const seconds = timerSeconds % 60;
        timerDisplay.innerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

function updateAttempts() {
    const digitsSelect = document.getElementById('digits-select');
    const attemptsDisplay = document.getElementById('attempts-display');

    const selectedDigits = digitsSelect.value;
    const allowedAttempts = difficultyMap[selectedDigits];

    attemptsDisplay.innerText = allowedAttempts;
    maxAttempts = allowedAttempts;
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function startTimer() {
    if (timerInterval) stopTimer();
    
    timerInterval = setInterval(() => {
        if (gameActive) {
            timerSeconds++;
            updateUI();
        }
    }, 1000);
}

function resetTimer() {
    timerSeconds = 0;
    updateUI();
}

function showOverlay(isWin, secretNum = '') {
    const overlay = document.getElementById('overlay');
    const emojiEl = document.getElementById('overlay-emoji');
    const titleEl = document.getElementById('overlay-title');
    const messageEl = document.getElementById('overlay-message');
    
    if (!overlay) return;
    
    if (isWin) {
        const minutes = Math.floor(timerSeconds / 60);
        const seconds = timerSeconds % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        emojiEl.textContent = '🎉';
        titleEl.textContent = 'You won!';
        messageEl.innerHTML = `Great job! You guessed the number in ${currentAttempts} attempt${currentAttempts !== 1 ? 's' : ''}!<br>Time: ${timeString}`;
    } else {
        emojiEl.textContent = '😔';
        titleEl.textContent = 'Game Over!';
        messageEl.textContent = `The number was: ${secretNum}. Better luck next time!`;
    }
    
    overlay.classList.add('active');
}

function closeOverlay() {
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// ---------- ОСНОВНА ЛОГІКА ГРИ ----------
function generateSecretNumber(digits) {
    const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    // Перемішуємо масив (алгоритм Фішера-Єйтса)
    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    // Беремо перші 'digits' цифр
    return numbers.slice(0, digits);
}

function evaluateGuess(guess, secret) {
    const result = [];
    const secretCopy = [...secret];
    const guessArr = guess.split('');
    
    // Спочатку позначаємо точні збіги (зелений)
    for (let i = 0; i < guessArr.length; i++) {
        if (guessArr[i] === secretCopy[i]) {
            result[i] = 'correct';
            secretCopy[i] = null;
            guessArr[i] = null;
        }
    }
    
    // Потім шукаємо цифри, які є, але не на своєму місці (оранжевий)
    for (let i = 0; i < guessArr.length; i++) {
        if (guessArr[i] !== null) {
            const indexInSecret = secretCopy.indexOf(guessArr[i]);
            if (indexInSecret !== -1) {
                result[i] = 'close';
                secretCopy[indexInSecret] = null;
            } else if (!result[i]) {
                result[i] = 'wrong';
            }
        } else if (!result[i]) {
            result[i] = 'wrong';
        }
    }
    
    return result;
}

function addGuessToHistory(guess, evaluation) {
    const historyContainer = document.getElementById('guess-history');
    if (!historyContainer) return;
    
    const guessRow = document.createElement('div');
    guessRow.className = 'guess-row-tiles';
    
    for (let i = 0; i < guess.length; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        
        switch(evaluation[i]) {
            case 'correct':
                tile.classList.add('tile--correct');
                break;
            case 'close':
                tile.classList.add('tile--close');
                break;
            case 'wrong':
                tile.classList.add('tile--wrong');
                break;
        }
        
        tile.textContent = guess[i];
        guessRow.appendChild(tile);
    }
    
    historyContainer.appendChild(guessRow);
    historyContainer.scrollTop = historyContainer.scrollHeight;
}

async function submitGuess() {
    if (!gameActive) {
        showToast('Game is over! Press PLAY AGAIN to start new game.', true);
        return;
    }
    
    const input = document.getElementById('guess-input');
    const guess = input.value.trim();
    
    if (guess.length !== currentDigits) {
        showToast(`Please enter exactly ${currentDigits} digits!`, true);
        return;
    }
    
    if (!/^\d+$/.test(guess)) {
        showToast('Please enter only digits (0-9)!', true);
        return;
    }
    
    const uniqueDigits = new Set(guess.split(''));
    if (uniqueDigits.size !== currentDigits) {
        showToast('All digits must be different!', true);
        return;
    }
    
    if (!firstGuessMade) {
        firstGuessMade = true;
        startTimer();
    }
    
    currentAttempts++;
    updateUI();
    
    const evaluation = evaluateGuess(guess, secretNumber);
    addGuessToHistory(guess, evaluation);
    
    const isWin = evaluation.every(r => r === 'correct');
    
    if (isWin) {
        gameActive = false;
        stopTimer();
        
        // 💾 ЗБЕРІГАЄМО ПЕРЕМОГУ
        await saveGameToDatabase(true, secretNumber.join(''), timerSeconds, currentAttempts);
        
        showOverlay(true);
    } 
    else if (currentAttempts >= maxAttempts) {
        gameActive = false;
        stopTimer();
        
        // 💾 ЗБЕРІГАЄМО ПОРАЗКУ
        await saveGameToDatabase(false, secretNumber.join(''), timerSeconds, currentAttempts);
        
        showOverlay(false, secretNumber.join(''));
    }
    
    input.value = '';
    input.focus();
}

function startNewGame() {
    // Зупиняємо старий таймер
    stopTimer();
    
    // Отримуємо нову довжину числа
    const select = document.getElementById('digits-select');
    currentDigits = parseInt(select.value);
    
    // Оновлюємо maxAttempts відповідно до довжини
    maxAttempts = difficultyMap[currentDigits] || 4;
    
    // Генеруємо нове секретне число
    secretNumber = generateSecretNumber(currentDigits);
    
    // Скидаємо змінні стану
    currentAttempts = 0;
    gameActive = true;
    firstGuessMade = false;  // Скидаємо прапорець першої спроби
    
    // Очищаємо історію
    const historyContainer = document.getElementById('guess-history');
    if (historyContainer) {
        historyContainer.innerHTML = '';
    }
    
    // Очищаємо поле введення
    const input = document.getElementById('guess-input');
    if (input) {
        input.value = '';
        input.maxLength = currentDigits;
        input.placeholder = `Enter ${currentDigits} digits…`;
    }
    
    // Оновлюємо відображення спроб
    updateAttempts();
    
    // Закриваємо оверлей якщо він відкритий
    closeOverlay();
    
    // Скидаємо таймер, але НЕ ЗАПУСКАЄМО
    resetTimer();
    // Таймер стартує тільки при першій правильній спробі в submitGuess()
    
    // Оновлюємо UI
    updateUI();
    
    // Логування для розробника
    console.log('New game started! Secret number:', secretNumber.join(''));
    console.log(`Digits: ${currentDigits}, Max attempts: ${maxAttempts}`);
    console.log('Timer will start on first valid guess');
}

// ---------- ІНІЦІАЛІЗАЦІЯ ----------
function initGame() {
    if (!document.getElementById('guess-input')) return;
    // Встановлюємо обробники подій
    const tryBtn = document.getElementById('try-btn');
    if (tryBtn) {
        tryBtn.onclick = submitGuess;
    }
    
    const guessInput = document.getElementById('guess-input');
    if (guessInput) {
        guessInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitGuess();
            }
        });
    }
    
    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) {
        playAgainBtn.onclick = () => {
            closeOverlay();
            startNewGame();
        };
    }
    
    const digitsSelect = document.getElementById('digits-select');
    if (digitsSelect) {
        digitsSelect.addEventListener('change', () => {
            const newDigits = parseInt(digitsSelect.value);
            if (guessInput) {
                guessInput.maxLength = newDigits;
                guessInput.placeholder = `Enter ${newDigits} digits…`;
            }
            updateAttempts();
            startNewGame();
        });
    }
    
    // Запускаємо гру
    startNewGame();
}

// Запускаємо гру після завантаження DOM
document.addEventListener('DOMContentLoaded', initGame);


// ----------------------------------------------
// ЗАПУСК СЕРВЕРА
// -----------------------------------------------
const API_URL = 'https://guess-the-number-rt3e.onrender.com';

function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function setAuthData(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../html/login.html'; 
}

function isLoggedIn() {
    return !!getToken();
}

function getAllGuessesFromHistory() {
    const historyContainer = document.getElementById('guess-history');
    const rows = historyContainer.querySelectorAll('.guess-row-tiles');
    const allGuesses = [];
    
    rows.forEach(row => {
        const tiles = row.querySelectorAll('.tile');
        const guess = Array.from(tiles).map(t => t.textContent).join('');
        const evaluation = Array.from(tiles).map(t => {
            if (t.classList.contains('tile--correct')) return 'correct';
            if (t.classList.contains('tile--close')) return 'close';
            return 'wrong';
        });
        
        allGuesses.push({ guess, evaluation });
    });
    
    return allGuesses;
}

async function saveGameToDatabase(isWin, secretNum, timeSec, attemptsUsed) {
    const token = getToken();
    if (!token) {
        console.log('Користувач не залогінений, гру не збережено');
        return;
    }
    
    const allGuesses = getAllGuessesFromHistory();
    
    const gameData = {
        digits_count: currentDigits,
        max_attempts: maxAttempts,
        is_win: isWin,
        attempts_used: attemptsUsed,
        time_seconds: timeSec,
        secret_number: secretNum,
        attempts: allGuesses
    };
    
    try {
        const response = await fetch(`${API_URL}/game/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(gameData)
        });
        
        if (response.ok) {
            console.log('Гру збережено!');
        } else {
            console.log('Помилка збереження');
        }
    } catch (error) {
        console.error('Помилка:', error);
    }
}

async function register(username, email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            setAuthData(data.token, data.user);
            showToast(`Вітаємо, ${username}! 🎉`, false);
            return true;
        } else {
            showToast(data.error, true);
            return false;
        }
    } catch (error) {
        showToast('Помилка з\'єднання', true);
        return false;
    }
}

async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            setAuthData(data.token, data.user);
            showToast(`Ласкаво просимо, ${data.user.username}! `, false);
            return true;
        } else {
            showToast(data.error, true);
            return false;
        }
    } catch (error) {
        showToast('Помилка з\'єднання', true);
        return false;
    }
}
