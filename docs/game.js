const blockColors = [
    "#ea4d4d", "#ecbb46", "#f1efa8",
    "#6df16d", "#4fa9e3", "#d9d0f0",
    "#ed73e6", "#48e8a2", "#ef9224"
];
const wheelColors = [
    "#ed2d2d", "#eab127", "#838007", "#0ec50e", "#36abf6",
    "#7344ea", "#ec61e3", "#56eaa9", "#f1ab57"
];
const modes = {
    simple: { name: "Simple", gridSize: 6, wheelNumbers: 6, rotationLimit: 6 },
    moderate: { name: "Moderate", gridSize: 9, wheelNumbers: 6, rotationLimit: 10 },
    difficult: { name: "Difficult", gridSize: 9, wheelNumbers: 9, rotationLimit: 10 }
};

const table = document.getElementById("grid");
const wheel = document.getElementById("wheel");
const game = document.getElementById("game");
const modePanel = document.getElementById("modePanel");
const startButton = document.getElementById("startButton");
const spinButton = document.getElementById("spinButton");
const spinsUsedDisplay = document.getElementById("spinsUsed");
const gameOverPopup = document.getElementById("gameOver");
const gameOverTitle = document.getElementById("gameOverTitle");
const gameOverCard = document.getElementById("gameOverCard");

let currentMode = null;
let rotation = 0;
let rotationsWithoutClick = 0;
let clearMatchesTimeout = null;
let isClearingMatches = false;
let isSpinning = false;

startButton.addEventListener("click", () => {
    const selected = document.querySelector('input[name="mode"]:checked');
    const modeToStart = currentMode || selected?.value || "simple";
    startGame(modeToStart);
});

document.getElementById("restartButton").addEventListener("click", () => {
    if (currentMode) startGame(currentMode);
});

const changeModeButton = document.getElementById("changeModeButton");
changeModeButton.addEventListener("click", returnToModeSelection);

function returnToModeSelection() {
    clearTimeout(clearMatchesTimeout);
    isClearingMatches = false;
    isSpinning = false;
    currentMode = null;
    document.body.classList.remove("playing");
    rotation = 0;
    rotationsWithoutClick = 0;
    table.replaceChildren();
    wheel.replaceChildren();
    gameOverPopup.classList.add("hidden");
    game.classList.add("hidden");
    modePanel.classList.remove("hidden");
    changeModeButton.classList.add("hidden");
    startButton.textContent = "Lets Go!!";
}

function startGame(modeKey) {
    currentMode = modeKey;
    document.body.classList.add("playing");
    const config = modes[currentMode];
    rotation = 0;
    rotationsWithoutClick = 0;
    isClearingMatches = false;
    isSpinning = false;
    clearTimeout(clearMatchesTimeout);

    spinButton.textContent = "Spin";
    spinsUsedDisplay.textContent = `Spins used: 0/${config.rotationLimit}`;
    spinButton.disabled = false;
    gameOverPopup.classList.add("hidden");

    buildTable(config);
    populateRandomNumbers(config);
    modePanel.classList.add("hidden");
    game.classList.remove("hidden");
    buildWheel(config);

    startButton.textContent = "Start / Reset";
    changeModeButton.classList.remove("hidden");
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
                table.rows[row].cells[col].textContent =
                    Math.floor(Math.random() * config.wheelNumbers) + 1;
            }
        }
    }
}

function buildWheel(config) {
    wheel.replaceChildren();
    wheel.style.transition = "none";
    wheel.style.transform = "rotate(0deg)";

    const sectionAngle = 360 / config.wheelNumbers;
    const stops = wheelColors.slice(0, config.wheelNumbers).map((color, index) =>
        `${color} ${index * sectionAngle}deg ${(index + 1) * sectionAngle}deg`
    );
    wheel.style.background = `conic-gradient(${stops.join(", ")})`;

    for (let number = 1; number <= config.wheelNumbers; number++) {
        const label = document.createElement("span");
        label.className = "wheel-number";
        label.textContent = number;

        const angle = (number - 1) * sectionAngle + sectionAngle / 2;
        const radians = angle * Math.PI / 180;
        // Absolute positions start inside the wheel's border, so use the
        // inner box center rather than the 300px outer diameter center.
        const center = wheel.clientWidth / 2;
        const radius = center - 30;
        label.style.left = `${center + radius * Math.sin(radians)}px`;
        label.style.top = `${center - radius * Math.cos(radians)}px`;
        wheel.appendChild(label);
    }

    requestAnimationFrame(() => {
        wheel.style.transition = "transform 700ms ease";
    });
}

function updateWheelSelection() {
    const config = modes[currentMode];
    if (!config) return;
    const selectedNumber = GameRules.getWheelNumber(rotation, config.wheelNumbers);

    wheel.querySelectorAll(".wheel-number").forEach(label => {
        label.classList.toggle("selected", Number(label.textContent) === selectedNumber);
    });
}

spinButton.addEventListener("click", () => {
    if (!currentMode || isSpinning || !gameOverPopup.classList.contains("hidden")) return;
    const config = modes[currentMode];
    if (GameRules.hasReachedSpinLimit(rotationsWithoutClick, config.rotationLimit)) {
        endGame("Try again!", "loss");
        return;
    }

    isSpinning = true;
    rotation += 360 * 5 + Math.random() * 360;
    rotationsWithoutClick++;
    spinsUsedDisplay.textContent = `Spins used: ${rotationsWithoutClick}/${config.rotationLimit}`;
    wheel.style.transform = `rotate(${rotation}deg)`;
});

wheel.addEventListener("transitionend", event => {
    if (event.target !== wheel || event.propertyName !== "transform" || !isSpinning) return;
    isSpinning = false;

    const finalAngle = ((rotation % 360) + 360) % 360;
    wheel.querySelectorAll(".wheel-number").forEach(label => {
        label.style.setProperty("--counter-rotation", `${-finalAngle}deg`);
    });
    updateWheelSelection();
});

table.addEventListener("click", event => {
    const cell = event.target.closest("td");
    if (!cell || !currentMode || isClearingMatches || isSpinning || !gameOverPopup.classList.contains("hidden")) return;
    if (cell.textContent.trim() !== "") return;

    const config = modes[currentMode];
    const number = GameRules.getWheelNumber(rotation, config.wheelNumbers);
    const startRow = cell.parentElement.rowIndex;
    const startCol = cell.cellIndex;
    const board = [...table.rows].map(row => [...row.cells].map(td => td.textContent.trim() || null));
    if (!GameRules.canPlaceNumber(board, startRow, startCol, number)) return;
    cell.textContent = number;
    board[startRow][startCol] = number;
    const autoFillCells = GameRules.getAutoFillCells(board, startRow, startCol, number);
    if (autoFillCells) {
        autoFillCells.forEach(({ row, column }) => {
            board[row][column] = number;
            table.rows[row].cells[column].textContent = number;
        });
    }
    const matches = GameRules.findConnectedGroup(board, startRow, startCol, number)
        .map(({ row, column }) => table.rows[row].cells[column]);

    if (GameRules.shouldClearGroup(matches.length, number)) {
        isClearingMatches = true;
        clearMatchesTimeout = setTimeout(() => {
            matches.forEach(matchedCell => { matchedCell.textContent = ""; });
            rotationsWithoutClick = GameRules.getNextSpinStreak(rotationsWithoutClick, matches.length);
            spinsUsedDisplay.textContent = `Spins used: 0/${config.rotationLimit}`;
            isClearingMatches = false;
            checkForLastNumber();
        }, 500);
    } else {
        checkForLastNumber();
    }
});

function checkForLastNumber() {
    const remainingCells = [...table.querySelectorAll("td")]
        .filter(cell => cell.textContent.trim() !== "");
    if (remainingCells.length <= 1) {
        endGame("Congratulations!", "win");
    }
}

function endGame(message, outcome) {
    gameOverTitle.textContent = message;
    gameOverCard.classList.toggle("win-banner", outcome === "win");
    gameOverCard.classList.toggle("loss-banner", outcome === "loss");
    gameOverPopup.classList.remove("hidden");
    spinButton.disabled = true;
}
