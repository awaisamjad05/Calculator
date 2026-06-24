/**
 * Aether Calc - Advanced Mathematical Engine & UI Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const displayInput = document.getElementById('display-input');
    const displayExpression = document.getElementById('display-expression');
    const toggleSciBtn = document.getElementById('toggle-sci-btn');
    const scientificPanel = document.getElementById('scientific-panel');
    const appContainer = document.getElementById('calculator-app');
    const angleIndicator = document.getElementById('angle-indicator');
    
    // Theme Dropdown Elements
    const themeMenuBtn = document.getElementById('theme-menu-btn');
    const themeDropdown = document.getElementById('theme-dropdown');
    
    // History Drawer Elements
    const toggleHistoryBtn = document.getElementById('toggle-history-btn');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const historyDrawer = document.getElementById('history-drawer');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // Calculator buttons
    const buttons = document.querySelectorAll('.btn');

    // --- State Variables ---
    let inputVal = '0';
    let exprVal = '';
    let isDegreeMode = true; // True = DEG, False = RAD
    let shouldResetInput = false; // Reset input after a calculation is done
    let calculationHistory = JSON.parse(localStorage.getItem('aether_calc_history')) || [];

    // --- Audio Feedback Configuration ---
    // Create an audio context for subtle haptic click sounds (sine wave pulse)
    let audioCtx = null;
    const playClickSound = () => {
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime); // Quick subtle pop
            
            gain.gain.setValueAtTime(0.015, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.04);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 0.05);
        } catch (e) {
            // Audio context not supported or blocked, ignore
        }
    };

    // --- Initialization ---
    initTheme();
    renderHistory();
    updateDisplay();

    // --- Theme Manager ---
    function initTheme() {
        const savedTheme = localStorage.getItem('aether_calc_theme') || 'theme-dark';
        document.body.className = savedTheme;
    }

    // Toggle theme menu
    themeMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        themeDropdown.classList.toggle('show');
    });

    // Select theme option
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const selectedTheme = item.getAttribute('data-theme');
            document.body.className = selectedTheme;
            localStorage.setItem('aether_calc_theme', selectedTheme);
            themeDropdown.classList.remove('show');
            playClickSound();
        });
    });

    // Close menus on outside click
    document.addEventListener('click', () => {
        themeDropdown.classList.remove('show');
    });

    // --- Scientific Mode Panel toggle ---
    toggleSciBtn.addEventListener('click', () => {
        scientificPanel.classList.toggle('show');
        appContainer.classList.toggle('scientific-expanded');
        toggleSciBtn.classList.toggle('active');
        playClickSound();
    });

    // --- History Drawer Toggles ---
    toggleHistoryBtn.addEventListener('click', () => {
        historyDrawer.classList.add('open');
        playClickSound();
    });

    closeHistoryBtn.addEventListener('click', () => {
        historyDrawer.classList.remove('open');
        playClickSound();
    });

    // --- Render and Manage History ---
    function renderHistory() {
        if (calculationHistory.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <p>No calculations yet</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = '';
        // Render from newest to oldest
        [...calculationHistory].reverse().forEach((item, index) => {
            const historyItem = document.createElement('div');
            historyItem.classList.add('history-item');
            historyItem.innerHTML = `
                <div class="history-expr">${item.expr}</div>
                <div class="history-res">${item.result}</div>
            `;
            historyItem.addEventListener('click', () => {
                exprVal = item.expr;
                inputVal = item.result;
                shouldResetInput = false;
                updateDisplay();
                historyDrawer.classList.remove('open');
                playClickSound();
            });
            historyList.appendChild(historyItem);
        });
    }

    clearHistoryBtn.addEventListener('click', () => {
        calculationHistory = [];
        localStorage.removeItem('aether_calc_history');
        renderHistory();
        playClickSound();
    });

    function saveToHistory(expr, result) {
        // Prevent duplicate consecutive entries
        if (calculationHistory.length > 0) {
            const lastEntry = calculationHistory[calculationHistory.length - 1];
            if (lastEntry.expr === expr && lastEntry.result === result) return;
        }
        
        calculationHistory.push({ expr, result });
        // Cap history at 50 entries
        if (calculationHistory.length > 50) {
            calculationHistory.shift();
        }
        localStorage.setItem('aether_calc_history', JSON.stringify(calculationHistory));
        renderHistory();
    }

    // --- Display Update Engine ---
    function updateDisplay() {
        displayInput.textContent = formatOutput(inputVal);
        displayExpression.textContent = exprVal;
        
        // Auto-scale input display font size based on length to prevent layout breakage
        const len = displayInput.textContent.length;
        if (len > 16) {
            displayInput.style.fontSize = '1.3rem';
        } else if (len > 12) {
            displayInput.style.fontSize = '1.6rem';
        } else if (len > 8) {
            displayInput.style.fontSize = '1.9rem';
        } else {
            displayInput.style.fontSize = '2.2rem';
        }

        // Scroll displays to the right so end of expression is always visible
        displayExpression.parentElement.scrollLeft = displayExpression.parentElement.scrollWidth;
        displayInput.parentElement.scrollLeft = displayInput.parentElement.scrollWidth;
    }

    function formatOutput(str) {
        if (str === 'Error' || str === 'Infinity' || str === '-Infinity' || str === 'NaN') {
            return str;
        }
        
        // Don't format unfinished input ending with operators or decimals
        if (str.endsWith('.') || /[+\−×÷(]$/.test(str)) {
            return str;
        }

        // If it's a number, apply local digit formatting for readability (commas)
        // Check if expression is numeric
        if (!isNaN(Number(str)) && str.indexOf('e') === -1) {
            const parts = str.split('.');
            parts[0] = Number(parts[0]).toLocaleString('en-US', { maximumFractionDigits: 0 });
            return parts.join('.');
        }

        return str;
    }

    // --- Action Engine ---
    function handleAction(action) {
        playClickSound();
        
        if (action === 'clear') {
            inputVal = '0';
            exprVal = '';
            shouldResetInput = false;
        } else if (action === 'backspace') {
            // Delete characters logic
            if (shouldResetInput) {
                exprVal = '';
                shouldResetInput = false;
            }
            inputVal = deleteLastCharacter(inputVal);
            if (inputVal === '' || inputVal === '-') inputVal = '0';
        } else if (action === 'deg-rad') {
            isDegreeMode = !isDegreeMode;
            angleIndicator.textContent = isDegreeMode ? 'DEG' : 'RAD';
            const degRadBtn = document.getElementById('btn-deg-rad');
            degRadBtn.textContent = isDegreeMode ? 'rad' : 'deg';
        } else if (action === 'percent') {
            if (shouldResetInput) {
                exprVal = '';
                shouldResetInput = false;
            }
            if (inputVal !== 'Error' && !isNaN(parseFloat(inputVal))) {
                inputVal = (parseFloat(inputVal) / 100).toString();
            }
        } else if (action === 'parentheses') {
            handleParentheses();
        } else if (action === 'fact') {
            calculateFactorial();
        } else if (action === 'calculate') {
            performCalculation();
        }

        updateDisplay();
    }

    function deleteLastCharacter(str) {
        const sciFunctions = ['sin(', 'cos(', 'tan(', 'log(', 'ln(', '√('];
        for (let fn of sciFunctions) {
            if (str.endsWith(fn)) {
                return str.slice(0, -fn.length);
            }
        }
        return str.slice(0, -1);
    }

    function handleParentheses() {
        if (shouldResetInput) {
            inputVal = '0';
            exprVal = '';
            shouldResetInput = false;
        }

        const openCount = (inputVal.match(/\(/g) || []).length;
        const closeCount = (inputVal.match(/\)/g) || []).length;
        const lastChar = inputVal.slice(-1);

        if (inputVal === '0') {
            inputVal = '(';
        } else if (openCount > closeCount && /[0-9)πe]/.test(lastChar)) {
            inputVal += ')';
        } else {
            // Auto multiplication e.g. 5( -> 5*(
            if (/[0-9)πe]/.test(lastChar)) {
                inputVal += '×(';
            } else {
                inputVal += '(';
            }
        }
    }

    function calculateFactorial() {
        if (shouldResetInput) {
            exprVal = '';
            shouldResetInput = false;
        }

        // Apply factorial directly to input number if it's evaluated, or wrap
        const val = parseFloat(inputVal);
        if (isNaN(val) || val < 0 || val % 1 !== 0 || val > 170) {
            inputVal = 'Error';
            return;
        }

        let result = 1;
        for (let i = 2; i <= val; i++) {
            result *= i;
        }
        
        exprVal = `${inputVal}!`;
        inputVal = result.toString();
        shouldResetInput = true;
    }

    // --- Input Key Collection ---
    function appendValue(val) {
        playClickSound();

        if (shouldResetInput) {
            // If starting a new expression right after a calculation
            if (/[+\−×÷^]/.test(val)) {
                // If appending operator, chain it to previous result
                exprVal = inputVal;
            } else {
                exprVal = '';
            }
            inputVal = '0';
            shouldResetInput = false;
        }

        const lastChar = inputVal.slice(-1);

        // Prevent multiple decimal points in a single number block
        if (val === '.') {
            const numberBlocks = inputVal.split(/[+\−×÷()^]/);
            const currentBlock = numberBlocks[numberBlocks.length - 1];
            if (currentBlock.includes('.')) return;
        }

        if (inputVal === '0' && val !== '.') {
            if (val.includes('(') || ['sin(', 'cos(', 'tan(', 'log(', 'ln(', '√(', 'π', 'e'].includes(val)) {
                inputVal = val;
            } else if (!/[+\−×÷^]/.test(val)) {
                inputVal = val;
            } else {
                inputVal += val; // e.g. 0 +
            }
        } else {
            // Insert auto-multiplication for scientific tokens e.g. 5π -> 5×π, 5sin( -> 5×sin(
            if (['π', 'e', 'sin(', 'cos(', 'tan(', 'log(', 'ln(', '√('].includes(val) && /[0-9)πe]/.test(lastChar)) {
                inputVal += '×' + val;
            } else {
                inputVal += val;
            }
        }

        updateDisplay();
    }

    // --- Safety Calculation Engine ---
    function performCalculation() {
        if (inputVal === '0' || inputVal === 'Error') return;

        // Auto close remaining open parentheses
        let openCount = (inputVal.match(/\(/g) || []).length;
        let closeCount = (inputVal.match(/\)/g) || []).length;
        let completeExpr = inputVal;
        while (openCount > closeCount) {
            completeExpr += ')';
            closeCount++;
        }

        try {
            const rawResult = parseAndEvaluate(completeExpr);
            let formattedRes;

            if (isNaN(rawResult) || !isFinite(rawResult)) {
                formattedRes = 'Error';
            } else {
                // Limit float length and remove trailing zeroes
                formattedRes = parseFloat(rawResult.toFixed(10)).toString();
            }

            exprVal = completeExpr;
            inputVal = formattedRes;
            shouldResetInput = true;

            if (formattedRes !== 'Error') {
                saveToHistory(exprVal, inputVal);
            }
        } catch (e) {
            exprVal = completeExpr;
            inputVal = 'Error';
            shouldResetInput = true;
        }
    }

    function parseAndEvaluate(expr) {
        // Convert input operators to JS engine equivalents
        let parsed = expr
            .replace(/÷/g, '/')
            .replace(/×/g, '*')
            .replace(/−/g, '-')
            .replace(/π/g, 'Math.PI')
            .replace(/e/g, 'Math.E')
            .replace(/\^/g, '**')
            .replace(/√\(/g, 'sqrt(');

        // Implicit multiplication insertion: e.g. 2(3+4) -> 2*(3+4), 3Math.PI -> 3*Math.PI
        parsed = parsed.replace(/(\d+)(?=[a-zA-Z(πe])/g, '$1*');
        parsed = parsed.replace(/(Math\.PI|Math\.E)(?=[a-zA-Z(])/g, '$1*');
        parsed = parsed.replace(/\)(?=\d|Math\.PI|Math\.E|[a-zA-Z(])/g, ')*');

        // Verify mathematical expression characters for safety
        const whitelistRegex = /^[0-9.+\-*/%()\s]|Math\.PI|Math\.E|sin|cos|tan|log|ln|sqrt$/;
        const invalidChars = parsed.replace(/[0-9.+\-*/%()\s]|Math\.PI|Math\.E|sin|cos|tan|log|ln|sqrt/g, '');
        if (invalidChars.length > 0) {
            throw new Error("Invalid characters");
        }

        // Angle factor for trig functions
        const radFactor = isDegreeMode ? Math.PI / 180 : 1;

        // Custom sandbox mathematical functions
        const sin = (x) => {
            const res = Math.sin(x * radFactor);
            return Math.abs(res) < 1e-15 ? 0 : res; // Fix float precision error (e.g. sin(180) => 0)
        };
        const cos = (x) => {
            const res = Math.cos(x * radFactor);
            return Math.abs(res) < 1e-15 ? 0 : res; // Fix cos(90) => 0
        };
        const tan = (x) => {
            const deg = x % 360;
            if (isDegreeMode && (Math.abs(deg) === 90 || Math.abs(deg) === 270)) {
                throw new Error("Infinity");
            }
            const res = Math.tan(x * radFactor);
            return Math.abs(res) < 1e-15 ? 0 : res;
        };
        const log = (x) => {
            if (x <= 0) throw new Error("Invalid Input");
            return Math.log10(x);
        };
        const ln = (x) => {
            if (x <= 0) throw new Error("Invalid Input");
            return Math.log(x);
        };
        const sqrt = (x) => {
            if (x < 0) throw new Error("Negative square root");
            return Math.sqrt(x);
        };

        // Sandbox evaluation using Function constructor (safe because input is strictly whitelisted above)
        const evaluator = new Function('sin', 'cos', 'tan', 'log', 'ln', 'sqrt', `return (${parsed});`);
        return evaluator(sin, cos, tan, log, ln, sqrt);
    }

    // --- Key Click Router ---
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-val');
            const action = btn.getAttribute('data-action');

            if (val) {
                appendValue(val);
            } else if (action) {
                handleAction(action);
            }
        });
    });

    // --- Full Keyboard Bindings ---
    const keyMap = {
        '0': 'btn-0', '1': 'btn-1', '2': 'btn-2', '3': 'btn-3', '4': 'btn-4',
        '5': 'btn-5', '6': 'btn-6', '7': 'btn-7', '8': 'btn-8', '9': 'btn-9',
        '.': 'btn-dot', '+': 'btn-add', '-': 'btn-sub', '*': 'btn-mul',
        '/': 'btn-div', '%': 'btn-percent', '(': 'btn-parentheses', ')': 'btn-parentheses',
        'Enter': 'btn-equals', '=': 'btn-equals', 'Backspace': 'btn-backspace',
        'Escape': 'btn-clear', 'c': 'btn-clear', 'C': 'btn-clear',
        // Scientific keyboard mapping
        's': 'btn-sin', 'o': 'btn-cos', 't': 'btn-tan', 'l': 'btn-log', 'n': 'btn-ln',
        'p': 'btn-pi', 'e': 'btn-e', '^': 'btn-pow', '!': 'btn-fact', 'r': 'btn-deg-rad'
    };

    document.addEventListener('keydown', (e) => {
        const btnId = keyMap[e.key];
        if (btnId) {
            e.preventDefault();
            const btnEl = document.getElementById(btnId);
            
            if (btnEl) {
                // Key highlight active state
                btnEl.classList.add('key-pressed');
                btnEl.click();
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        const btnId = keyMap[e.key];
        if (btnId) {
            const btnEl = document.getElementById(btnId);
            if (btnEl) {
                btnEl.classList.remove('key-pressed');
            }
        }
    });
});
