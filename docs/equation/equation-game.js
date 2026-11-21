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
let guidancePromptsShown = 0;

const spokenOperators = { "+":"plus", "-":"minus", "<":"smaller than", ">":"greater than", "*":"times", "/":"divided by" };

function speakInstruction(message, speak = true) {
    currentVoiceInstruction = message;
    voiceInstruction.textContent = message;
    if (!speak || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.84;
    utterance.pitch = 1.08;
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

function scheduleAnswerReminder() {
    clearAnswerReminder();
    answerReminderTimeout=setTimeout(()=>{
        if (!pairComplete || operatorAnimating || numbersAnimating || clearingMatches || !gameOverPopup.classList.contains("hidden")) return;
        speakInstruction("Work out the answer, or use Show Solution. Then tap an empty square beside the same answer.");
    },5000);
}

replayVoiceButton.addEventListener("click", () => {
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
    if (solutionButton.disabled) return;
    clearAnswerReminder();
    const reveal = equationResult.classList.contains("hidden");
    equationResult.classList.toggle("hidden", !reveal);
    solutionButton.textContent = reveal ? "Hide Solution" : "Show Solution";
    solutionButton.setAttribute("aria-expanded", String(reveal));
    if (reveal && answer !== null) {
        const working=digitReductionSteps.length?` ${reductionWorking(...currentOperands)}.`:"";
        speakInstruction(`The answer is ${answer}.${working} Tap an empty square beside the same answer.`);
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
    guidancePromptsShown = 0;
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
    requestAnimationFrame(() => speakInstruction("Press Spin. The sign wheel spins first, then the number wheel. Work out the answer and place it beside the same answer on the board."));
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
    speakInstruction(`${spokenOperators[currentOperator]} selected. Now spinning two numbers.`);
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
        : "No matching empty cell yet. Spin a new pair to try another answer.";
    const remainingSpins=Math.max(0,limit-roundsWithoutClear);
    const remainingMessage=`You have ${remainingSpins} spin${remainingSpins===1?"":"s"} remaining.`;
    if (hasPlaceableCell) {
        const initialGuidance=guidancePromptsShown<2;
        if(initialGuidance) guidancePromptsShown++;
        speakInstruction(`${equationPrompt(currentOperator, first, second)}${reductionSpeech()}${initialGuidance?" Work out the answer, or use Show Solution. Then tap an empty square beside the same answer.":""} ${remainingMessage}`);
        if(!initialGuidance) scheduleAnswerReminder();
    } else {
        speakInstruction(`${equationPrompt(currentOperator, first, second)}${reductionSpeech()} Oh oh! This number has already disappeared. Try again. ${remainingMessage}`);
    }
});

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
        clearMatchesTimeout = setTimeout(() => {
            matches.forEach(match => { match.textContent = ""; });
            roundsWithoutClear = GameRules.getNextSpinStreak(roundsWithoutClear, matches.length);
            const limit = modes[currentMode].rotationLimit;
            roundStatus.textContent = `Spins used: ${roundsWithoutClear}/${limit}`;
            clearingMatches = false;
            checkForLastNumber();
            if (gameOverPopup.classList.contains("hidden")) speakInstruction("Great match! The group cleared. Spin again.");
            if (gameOverPopup.classList.contains("hidden")) operatorSpinButton.disabled = false;
        }, 500);
    } else speakInstruction(`Good placement. You can use ${answer} again, or spin for a new equation.`);
});

function getBoard() {
    return [...table.rows].map(row => [...row.cells].map(cell => cell.textContent.trim() || null));
}

function checkForLastNumber() {
    const remaining = [...table.querySelectorAll("td")].filter(cell => cell.textContent.trim() !== "");
    if (remaining.length <= 1) {
        endGame("Congratulations!", "win");
    }
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
