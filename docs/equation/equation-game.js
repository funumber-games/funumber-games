const blockColors = [
    "#ea4d4d", "#ecbb46", "#f1efa8", "#6df16d", "#4fa9e3",
    "#d9d0f0", "#ed73e6", "#48e8a2", "#ef9224"
];
const wheelColors = [
    "#ed2d2d", "#eab127", "#838007", "#0ec50e", "#36abf6",
    "#7344ea", "#ec61e3", "#56eaa9", "#f1ab57", "#ed7d35"
];
const modes = {
    simple: { gridSize: 6, startingNumbers: 6, answerLimit: GameRules.getMathSpinAnswerLimit("simple"), rotationLimit: 6 },
    moderate: { gridSize: 9, startingNumbers: 6, answerLimit: GameRules.getMathSpinAnswerLimit("moderate"), rotationLimit: 10 },
    difficult: { gridSize: 9, startingNumbers: 9, answerLimit: GameRules.getMathSpinAnswerLimit("difficult"), rotationLimit: 10 }
};
const symbolNames = { "+": "+", "-": "−", "<": "<", ">": ">", "*": "×", "/": "÷" };

const table = document.getElementById("grid");
const game = document.getElementById("game");
const modePanel = document.getElementById("modePanel");
const startButton = document.getElementById("startButton");
const changeModeButton = document.getElementById("changeModeButton");
const operatorWheel = document.getElementById("operatorWheel");
const numberWheel = document.getElementById("numberWheel");
const operatorSpinButton = document.getElementById("operatorSpin");
const roundStatus = document.getElementById("roundStatus");
const equationResult = document.getElementById("equationResult");
const solutionButton = document.getElementById("solutionButton");
const equationHint = document.getElementById("equationHint");
const gameOverPopup = document.getElementById("gameOver");
const gameOverTitle = document.getElementById("gameOverTitle");
const gameOverCard = document.getElementById("gameOverCard");
const voiceInstruction = document.getElementById("voiceInstruction");
const replayVoiceButton = document.getElementById("replayVoiceButton");

let currentMode = null;
let currentOperations = [];
let currentOperator = null;
let currentOperands = null;
let answer = null;
let rawAnswer = null;
let digitReductionSteps = [];
let numberWheelValues = [];
let operatorRotation = 0;
let numberRotation = 0;
let roundsWithoutClear = 0;
let roundActive = false;
let operatorSpun = false;
let numbersSpun = false;
let pairComplete = false;
let operatorAnimating = false;
let numbersAnimating = false;
let clearingMatches = false;
let clearMatchesTimeout = null;
let currentVoiceInstruction = "";
let answerReminderTimeout = null;
let firstSpin = true;
let solutionReminderSpoken = false;
let matchesSinceLastSpin = 0;
let remainingChoiceGuidanceSpoken = false;
let gameVersion = 0;
const celebrationTimings = GameRules.getCelebrationTimings();

const spokenOperators = { "+":"plus", "-":"minus", "<":"smaller than", ">":"greater than", "*":"times", "/":"divided by" };

function speakInstruction(message, speak = true, onFinish) {
    currentVoiceInstruction = message;
    voiceInstruction.textContent = message;
    if (!speak || !("speechSynthesis" in window)) {
        onFinish?.();
        return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.84;
    utterance.pitch = 1.08;
    if (onFinish) {
        const deadline = setTimeout(finish, 3500 + message.length * 100);
        function finish() {
            clearTimeout(deadline);
            utterance.onend = utterance.onerror = null;
            onFinish();
        }
        utterance.onend = utterance.onerror = finish;
    }
    window.speechSynthesis.speak(utterance);
}

function equationPrompt(operator, first, second) {
    if (operator === "<") return `Choose the smaller number from ${first} and ${second}.`;
    if (operator === ">") return `Choose the greater number from ${first} and ${second}.`;
    return `${first} ${spokenOperators[operator]} ${second}.`;
}

function reductionWorking(first, second, includeFinalResult=true) {
    const fragments=[`${first} ${symbolNames[currentOperator]} ${second} = ${Math.abs(rawAnswer)}`];
    digitReductionSteps.forEach((step,index)=>{
        const isLast=index===digitReductionSteps.length-1;
        fragments.push(`${step.digits.join(" + ")} = ${isLast&&!includeFinalResult?"":step.result}`.trimEnd());
    });
    return fragments.join(" → ");
}

function reductionSpeech() {
    return digitReductionSteps.length ? " If the answer is double digits, add those digits until you get a single digit." : "";
}

function clearAnswerReminder() {
    clearTimeout(answerReminderTimeout);
    answerReminderTimeout = null;
}

function scheduleAnswerReminder(getMessage = () => "Check out the solution.") {
    clearAnswerReminder();
    answerReminderTimeout=setTimeout(()=>{
        if (!pairComplete || operatorAnimating || numbersAnimating || clearingMatches || !gameOverPopup.classList.contains("hidden")) return;
        speakInstruction(getMessage());
    },5000);
}

replayVoiceButton.addEventListener("click", () => {
    if (clearingMatches) return;
    clearAnswerReminder();
    speakInstruction(currentVoiceInstruction);
});

startButton.addEventListener("click", () => {
    const selected = document.querySelector('input[name="mode"]:checked');
    startGame(currentMode || selected?.value || "simple");
});

changeModeButton.addEventListener("click", returnToModeSelection);
document.getElementById("restartButton").addEventListener("click", () => {
    if (currentMode) startGame(currentMode);
});

solutionButton.addEventListener("click", () => {
    if (solutionButton.disabled || clearingMatches) return;
    clearAnswerReminder();
    const reveal = equationResult.classList.contains("hidden");
    equationResult.classList.toggle("hidden", !reveal);
    solutionButton.textContent = reveal ? "Hide Solution" : "Show Solution";
    solutionButton.setAttribute("aria-expanded", String(reveal));
    if (reveal && answer !== null) {
        const working=digitReductionSteps.length?` ${reductionWorking(...currentOperands)}.`:"";
        speakInstruction(`The answer is ${answer}.${working} Find ${answer} in the table.`);
    }
});

function returnToModeSelection() {
    clearTimeout(clearMatchesTimeout);
    clearAnswerReminder();
    currentMode = null;
    resetRoundState();
    document.body.classList.remove("playing");
    table.replaceChildren();
    operatorWheel.replaceChildren();
    numberWheel.replaceChildren();
    gameOverPopup.classList.add("hidden");
    game.classList.add("hidden");
    modePanel.classList.remove("hidden");
    changeModeButton.classList.add("hidden");
    startButton.textContent = "Lets Go!!";
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function resetRoundState() {
    gameVersion++;
    document.querySelectorAll(".match-celebration, .block-confetti").forEach(effect => effect.remove());
    matchesSinceLastSpin = 0;
    remainingChoiceGuidanceSpoken = false;
    clearAnswerReminder();
    roundsWithoutClear = 0;
    currentOperations = [];
    currentOperator = null;
    currentOperands = null;
    answer = null;
    rawAnswer = null;
    digitReductionSteps = [];
    numberWheelValues = [];
    operatorRotation = 0;
    numberRotation = 0;
    roundActive = false;
    operatorSpun = false;
    numbersSpun = false;
    pairComplete = false;
    operatorAnimating = false;
    numbersAnimating = false;
    clearingMatches = false;
    operatorSpinButton.disabled = false;
}

function startGame(modeKey) {
    clearTimeout(clearMatchesTimeout);
    currentMode = modeKey;
    firstSpin = true;
    solutionReminderSpoken = false;
    resetRoundState();
    document.body.classList.add("playing");
    const config = modes[currentMode];
    currentOperations = GameRules.getMathSpinOperations(currentMode);
    roundStatus.textContent = `Spins used: 0/${config.rotationLimit}`;
    equationResult.textContent = "Spin both wheels to reveal the answer";
    equationResult.classList.add("hidden");
    solutionButton.textContent = "Show Solution";
    solutionButton.setAttribute("aria-expanded", "false");
    solutionButton.disabled = true;
    equationHint.textContent = "Spin once: the sign wheel spins first, then the number wheel.";
    gameOverPopup.classList.add("hidden");
    spinButtonReset();
    buildTable(config);
    populateRandomNumbers(config);
    modePanel.classList.add("hidden");
    game.classList.remove("hidden");
    buildWheel(operatorWheel, currentOperations, true, operatorRotation);
    buildWheel(numberWheel, Array(10).fill("?"), false, numberRotation);
    startButton.textContent = "Start / Reset";
    changeModeButton.classList.remove("hidden");
    requestAnimationFrame(() => speakInstruction("Welcome to Maths Spin! Solve the wheel’s maths puzzles to clear the board. Press Spin. The sign wheel spins first, then the number wheel. Work out the answer. Find that number on the board, then tap an empty square next to it."));
}

function spinButtonReset() {
    operatorSpinButton.textContent = "Spin";
    operatorSpinButton.disabled = false;
}

function buildTable(config) {
    table.replaceChildren();
    for (let row = 0; row < config.gridSize; row++) {
        const tr = table.insertRow();
        for (let col = 0; col < config.gridSize; col++) {
            const cell = tr.insertCell();
            const blockIndex = Math.floor(row / 3) * (config.gridSize / 3) + Math.floor(col / 3);
            cell.style.backgroundColor = blockColors[blockIndex % blockColors.length];
        }
    }
}

function populateRandomNumbers(config) {
    const blockCount = config.gridSize / 3;
    for (let blockRow = 0; blockRow < blockCount; blockRow++) {
        for (let blockCol = 0; blockCol < blockCount; blockCol++) {
            const positions = Array.from({ length: 9 }, (_, index) => index);
            for (let i = positions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [positions[i], positions[j]] = [positions[j], positions[i]];
            }
            for (const position of positions.slice(0, 4)) {
                const row = blockRow * 3 + Math.floor(position / 3);
                const col = blockCol * 3 + position % 3;
                table.rows[row].cells[col].textContent = Math.floor(Math.random() * config.startingNumbers) + 1;
            }
        }
    }
}

function buildWheel(wheel, labels, isOperator, currentRotation) {
    wheel.replaceChildren();
    wheel.style.transition = "none";
    wheel.style.transform = `rotate(${currentRotation}deg)`;
    const sectionAngle = 360 / labels.length;
    const stops = labels.map((_, index) =>
        `${wheelColors[index % wheelColors.length]} ${index * sectionAngle}deg ${(index + 1) * sectionAngle}deg`
    );
    wheel.style.background = `conic-gradient(${stops.join(", ")})`;
    const center = wheel.clientWidth / 2;
    const radius = center - (labels.length > 6 ? 31 : 38);
    const currentAngle = ((currentRotation % 360) + 360) % 360;
    labels.forEach((value, index) => {
        const label = document.createElement("span");
        label.className = `wheel-number ${isOperator ? "operator-label" : ""}`;
        label.dataset.index = index;
        label.textContent = isOperator ? symbolNames[value] : value;
        const angle = index * sectionAngle + sectionAngle / 2;
        const radians = angle * Math.PI / 180;
        label.style.left = `${center + radius * Math.sin(radians)}px`;
        label.style.top = `${center - radius * Math.cos(radians)}px`;
        label.style.setProperty("--counter-rotation", `${-currentAngle}deg`);
        wheel.appendChild(label);
    });
    requestAnimationFrame(() => { wheel.style.transition = "transform 850ms cubic-bezier(.12,.72,.18,1)"; });
}

function beginNextRound() {
    if (GameRules.hasReachedSpinLimit(roundsWithoutClear, modes[currentMode].rotationLimit)) {
        endGame("Try again!", "loss");
        return false;
    }
    roundActive = true;
    operatorSpun = false;
    numbersSpun = false;
    pairComplete = false;
    currentOperator = null;
    currentOperands = null;
    answer = null;
    rawAnswer = null;
    digitReductionSteps = [];
    numberWheelValues = [];
    equationResult.replaceChildren();
    equationResult.classList.add("hidden");
    solutionButton.textContent = "Show Solution";
    solutionButton.setAttribute("aria-expanded", "false");
    solutionButton.disabled = true;
    equationHint.textContent = "Spin once: the sign wheel spins first, then the number wheel.";
    operatorSpinButton.disabled = false;
    operatorWheel.querySelectorAll(".wheel-number").forEach(label => label.classList.remove("selected"));
    numberWheel.querySelectorAll(".wheel-number").forEach(label => label.classList.remove("selected"));
    return true;
}

operatorSpinButton.addEventListener("click", () => {
    if (!currentMode || operatorAnimating || clearingMatches || !gameOverPopup.classList.contains("hidden")) return;
    if (!roundActive || pairComplete) {
        if (!beginNextRound()) return;
    }
    if (operatorSpun) return;
    clearAnswerReminder();
    matchesSinceLastSpin = GameRules.updateMatchStreak(matchesSinceLastSpin, "spin").count;
    operatorAnimating = true;
    operatorSpinButton.disabled = true;
    operatorRotation += 360 * 5 + Math.random() * 360;
    operatorWheel.style.transform = `rotate(${operatorRotation}deg)`;
});

function spinNumberWheel() {
    if (!GameRules.canSpinMathNumberWheel(
        roundActive, Boolean(currentOperator), operatorAnimating, numbersAnimating, numbersSpun,
        clearingMatches, !gameOverPopup.classList.contains("hidden")
    )) return;
    numbersAnimating = true;
    const targetRotation = numberRotation + 360 * 5 + Math.random() * 360;
    const wheelData = GameRules.createNumberWheelValues(
        targetRotation, currentOperator, modes[currentMode].answerLimit
    );
    numberWheelValues = wheelData.values;
    buildWheel(numberWheel, numberWheelValues, false, numberRotation);
    numberRotation = targetRotation;
    requestAnimationFrame(() => { numberWheel.style.transform = `rotate(${numberRotation}deg)`; });
}

operatorWheel.addEventListener("transitionend", event => {
    if (event.target !== operatorWheel || event.propertyName !== "transform" || !operatorAnimating) return;
    operatorAnimating = false;
    operatorSpun = true;
    const index = GameRules.getWheelNumber(operatorRotation, currentOperations.length) - 1;
    currentOperator = currentOperations[index];
    operatorWheel.querySelectorAll(".wheel-number").forEach(label => {
        label.classList.toggle("selected", Number(label.dataset.index) === index);
        label.style.setProperty("--counter-rotation", `${-(((operatorRotation % 360) + 360) % 360)}deg`);
    });
    equationHint.textContent = `${symbolNames[currentOperator]} selected. The number wheel is spinning now.`;
    spinNumberWheel();
});

numberWheel.addEventListener("transitionend", event => {
    if (event.target !== numberWheel || event.propertyName !== "transform" || !numbersAnimating) return;
    numbersAnimating = false;
    numbersSpun = true;
    pairComplete = true;
    roundsWithoutClear++;
    const selectedIndices = GameRules.getOppositeSectorIndices(numberRotation, 10);
    const [firstIndex, secondIndex] = selectedIndices;
    const first = numberWheelValues[firstIndex];
    const second = numberWheelValues[secondIndex];
    currentOperands = [first, second];
    rawAnswer = GameRules.calculateRawOperationResult(currentOperator, first, second);
    digitReductionSteps = GameRules.getDigitReductionSteps(rawAnswer);
    answer = GameRules.calculateOperationResult(currentOperator, first, second);
    numberWheel.querySelectorAll(".wheel-number").forEach(label => {
        const index = Number(label.dataset.index);
        label.classList.toggle("selected", selectedIndices.includes(index));
        label.style.setProperty("--counter-rotation", `${-(((numberRotation % 360) + 360) % 360)}deg`);
    });
    const limit = modes[currentMode].rotationLimit;
    roundStatus.textContent = `Spins used: ${roundsWithoutClear}/${limit}`;
    operatorSpinButton.disabled = false;
    equationResult.replaceChildren(document.createTextNode(digitReductionSteps.length?`${reductionWorking(first,second,false)} `:`${first} ${symbolNames[currentOperator]} ${second} = `));
    const answerBadge = document.createElement("strong");
    answerBadge.textContent = String(answer);
    equationResult.appendChild(answerBadge);
    solutionButton.disabled = false;

    const board = getBoard();
    const hasPlaceableCell = board.some((row, rowIndex) => row.some((_, colIndex) =>
        GameRules.canPlaceNumber(board, rowIndex, colIndex, answer)
    ));
    equationHint.textContent = hasPlaceableCell
        ? "Click a matching empty cell. The game will fill connected spaces to complete the match."
        : "Work out the answer and look for it on the board.";
    const remainingSpins=Math.max(0,limit-roundsWithoutClear);
    const initialGuidance = firstSpin;
    firstSpin = false;
    if (hasPlaceableCell) {
        speakInstruction(`${equationPrompt(currentOperator, first, second)}${reductionSpeech()}${initialGuidance?" Work out the answer, or check the solution.":""}`);
        if (!initialGuidance && !solutionReminderSpoken) {
            scheduleAnswerReminder(() => {
                solutionReminderSpoken = true;
                return "Check out the solution.";
            });
        }
    } else {
        speakInstruction(`${equationPrompt(currentOperator, first, second)}${reductionSpeech()}`);
        scheduleAnswerReminder(() => {
            equationHint.textContent = "No matching empty cell. Spin again.";
            return missedSpinMessage(board, remainingSpins);
        });
    }
});

function missedSpinMessage(board, remainingSpins) {
    if (remainingSpins === 2) return "2 spins left. Good luck!";
    const numbers = [...new Set(board.flat().filter(value => value !== null).map(Number))].sort((a, b) => a - b);
    if (!remainingChoiceGuidanceSpoken && numbers.length > 0 && numbers.length <= 3) {
        remainingChoiceGuidanceSpoken = true;
        if (numbers.length === 1) return `The number you need is ${numbers[0]}. Good luck!`;
        return `You need one of these numbers: ${numbers.slice(0, -1).join(", ")} or ${numbers.at(-1)}. Spin again.`;
    }
    return "Spin Again";
}

function showMatchCelebration(message) {
    document.querySelector(".match-celebration")?.remove();
    const celebration=document.createElement("div");
    celebration.className="match-celebration";
    celebration.setAttribute("aria-hidden","true");
    celebration.textContent=`✨ ${message} ✨`;
    document.body.appendChild(celebration);
    window.setTimeout(()=>celebration.remove(),celebrationTimings.niceJobMs);
}

function blockEmptiedBy(matches) {
    if(!matches.length)return null;
    const first=matches[0];
    const startRow=Math.floor(first.parentElement.rowIndex/3)*3;
    const startColumn=Math.floor(first.cellIndex/3)*3;
    const matched=new Set(matches);
    const blockCells=[];
    for(let row=startRow;row<startRow+3;row++){
        for(let column=startColumn;column<startColumn+3;column++)blockCells.push(table.rows[row].cells[column]);
    }
    return blockCells.every(cell=>matched.has(cell)||cell.textContent.trim()==="")
        ? {anchor:table.rows[startRow+1].cells[startColumn+1],color:first.style.backgroundColor}
        : null;
}

function showBlockConfetti(anchor,color) {
    const bounds=anchor.getBoundingClientRect();
    const originX=bounds.left+bounds.width/2;
    const originY=bounds.top+bounds.height/2;
    for(let index=0;index<28;index++){
        const particle=document.createElement("span");
        const angle=(Math.PI*2*index/28)+(Math.random()*.22-.11);
        const distance=55+Math.random()*85;
        particle.className="block-confetti";
        particle.style.setProperty("--origin-x",`${originX}px`);
        particle.style.setProperty("--origin-y",`${originY}px`);
        particle.style.setProperty("--burst-x",`${Math.cos(angle)*distance}px`);
        particle.style.setProperty("--burst-y",`${Math.sin(angle)*distance-24}px`);
        particle.style.setProperty("--confetti-color",GameRules.getBlockConfettiColor(color));
        particle.style.setProperty("--confetti-rotation",`${Math.random()*540-270}deg`);
        document.body.appendChild(particle);
        window.setTimeout(()=>particle.remove(),1000);
    }
}

table.addEventListener("click", event => {
    clearAnswerReminder();
    const cell = event.target.closest("td");
    if (!cell || !currentMode || !GameRules.canPlaceFromCurrentSpin(
        pairComplete, operatorAnimating || numbersAnimating, clearingMatches,
        !gameOverPopup.classList.contains("hidden")
    )) return;
    if (cell.textContent.trim() !== "") return;
    const row = cell.parentElement.rowIndex;
    const column = cell.cellIndex;
    const board = getBoard();
    if (!GameRules.canPlaceNumber(board, row, column, answer)) {
        speakInstruction(`Choose an empty square beside another ${answer}.`);
        return;
    }

    cell.textContent = String(answer);
    board[row][column] = answer;
    const autoFillCells = GameRules.getAutoFillCells(board, row, column, answer);
    if (autoFillCells) {
        autoFillCells.forEach(({ row: fillRow, column: fillColumn }) => {
            board[fillRow][fillColumn] = answer;
            table.rows[fillRow].cells[fillColumn].textContent = String(answer);
        });
    }
    const matches = GameRules.findConnectedGroup(board, row, column, answer)
        .map(({ row: matchRow, column: matchColumn }) => table.rows[matchRow].cells[matchColumn]);

    if (GameRules.shouldClearGroup(matches.length, answer)) {
        clearingMatches = true;
        operatorSpinButton.disabled = true;
        remainingChoiceGuidanceSpoken = false;
        const emptiedBlock = blockEmptiedBy(matches);
        const streak = GameRules.updateMatchStreak(matchesSinceLastSpin, "match");
        matchesSinceLastSpin = streak.count;
        clearMatchesTimeout = setTimeout(() => {
            matches.forEach(match => { match.textContent = ""; });
            roundsWithoutClear = GameRules.getNextSpinStreak(roundsWithoutClear, matches.length);
            const limit = modes[currentMode].rotationLimit;
            roundStatus.textContent = `Spins used: ${roundsWithoutClear}/${limit}`;
            const announcement = GameRules.getCombinedMatchAnnouncement(streak.announcement, Boolean(emptiedBlock));
            if (announcement) showMatchCelebration(emptiedBlock ? "Nice Job!" : announcement);
            if (emptiedBlock) showBlockConfetti(emptiedBlock.anchor, emptiedBlock.color);

            if (getBoard().every(row => row.every(value => value === null))) {
                const version = gameVersion;
                const bannerFinished = new Promise(resolve => setTimeout(resolve, celebrationTimings.finalDelayMs));
                const speechFinished = new Promise(resolve => speakInstruction(announcement, true, resolve));
                Promise.all([bannerFinished, speechFinished]).then(() => {
                    if (version !== gameVersion) return;
                    clearingMatches = false;
                    endGame("Congratulations!", "win");
                });
                return;
            }
            if (announcement) speakInstruction(announcement);
            clearingMatches = false;
            operatorSpinButton.disabled = false;
        }, 500);
    }
});

function getBoard() {
    return [...table.rows].map(row => [...row.cells].map(cell => cell.textContent.trim() || null));
}

function endGame(message, outcome) {
    clearAnswerReminder();
    gameOverTitle.textContent = message;
    gameOverCard.classList.toggle("win-banner", outcome === "win");
    gameOverCard.classList.toggle("loss-banner", outcome === "loss");
    gameOverPopup.classList.remove("hidden");
    operatorSpinButton.disabled = true;
    speakInstruction(outcome === "win" ? "Congratulations! You completed Maths Spin." : "Try again. Start a new game when you are ready.");
}
