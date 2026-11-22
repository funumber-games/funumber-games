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
const voiceInstruction = document.getElementById("voiceInstruction");
const replayVoiceButton = document.getElementById("replayVoiceButton");

let currentMode = null;
let rotation = 0;
let rotationsWithoutClick = 0;
let clearMatchesTimeout = null;
let isClearingMatches = false;
let isSpinning = false;
let currentVoiceInstruction = "";
let remainingChoiceGuidanceSpoken = false;
let matchesSinceLastSpin = 0;
const celebrationTimings = GameRules.getCelebrationTimings();

function speakInstruction(message, speak = true) {
    currentVoiceInstruction = message;
    voiceInstruction.textContent = message;
    if (!speak || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.86;
    utterance.pitch = 1.08;
    window.speechSynthesis.speak(utterance);
}

replayVoiceButton.addEventListener("click", () => speakInstruction(currentVoiceInstruction));

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
    remainingChoiceGuidanceSpoken = false;
    matchesSinceLastSpin = GameRules.updateMatchStreak(matchesSinceLastSpin,"spin").count;
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
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function startGame(modeKey) {
    currentMode = modeKey;
    document.body.classList.add("playing");
    const config = modes[currentMode];
    rotation = 0;
    rotationsWithoutClick = 0;
    isClearingMatches = false;
    isSpinning = false;
    remainingChoiceGuidanceSpoken = false;
    matchesSinceLastSpin = GameRules.updateMatchStreak(matchesSinceLastSpin,"spin").count;
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
    requestAnimationFrame(() => speakInstruction("Press Spin. Listen for the number, then tap an empty square beside the same number in its three by three block."));
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

        // Percentages keep every label centred on the same circle when the
        // wheel shrinks for a phone screen. Pixel coordinates could be read
        // while the responsive layout was still changing, pulling labels
        // towards the hub on mobile devices.
        const position = GameRules.getWheelLabelPosition(number - 1, config.wheelNumbers);
        label.style.left = `${position.left}%`;
        label.style.top = `${position.top}%`;
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
    if (!currentMode || isSpinning || isClearingMatches || !gameOverPopup.classList.contains("hidden")) return;
    const config = modes[currentMode];
    if (GameRules.hasReachedSpinLimit(rotationsWithoutClick, config.rotationLimit)) {
        endGame("Try again!", "loss");
        return;
    }

    isSpinning = true;
    matchesSinceLastSpin = GameRules.updateMatchStreak(matchesSinceLastSpin,"spin").count;
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
    const selectedNumber = GameRules.getWheelNumber(rotation, modes[currentMode].wheelNumbers);
    const remainingNumbers=[...new Set([...table.querySelectorAll("td")]
        .map(cell=>cell.textContent.trim()).filter(Boolean).map(Number))].sort((a,b)=>a-b);
    const numberStillAvailable=remainingNumbers.includes(selectedNumber);
    const remainingSpins=Math.max(0,modes[currentMode].rotationLimit-rotationsWithoutClick);
    if(numberStillAvailable){
        speakInstruction(`Find ${selectedNumber} in the table.`);
    }else if(remainingNumbers.length<=3&&!remainingChoiceGuidanceSpoken){
        remainingChoiceGuidanceSpoken=true;
        if(remainingNumbers.length===1){
            speakInstruction(`The number you need is ${remainingNumbers[0]}. Good luck!`);
        }else{
            const choices=`${remainingNumbers.slice(0,-1).join(", ")} or ${remainingNumbers.at(-1)}`;
            speakInstruction(`You need one of these numbers: ${choices}. Spin again.`);
        }
    }else if(remainingSpins===2){
        speakInstruction("2 spins left. Good luck!");
    }else{
        speakInstruction("Spin Again");
    }
});

function showMatchCelebration() {
    document.querySelector(".match-celebration")?.remove();
    const celebration=document.createElement("div");
    celebration.className="match-celebration";
    celebration.setAttribute("aria-hidden","true");
    celebration.textContent="✨ Nice Job! ✨";
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
    const cell = event.target.closest("td");
    if (!cell || !currentMode || isClearingMatches || isSpinning || !gameOverPopup.classList.contains("hidden")) return;
    if (cell.textContent.trim() !== "") return;

    const config = modes[currentMode];
    const number = GameRules.getWheelNumber(rotation, config.wheelNumbers);
    const startRow = cell.parentElement.rowIndex;
    const startCol = cell.cellIndex;
    const board = [...table.rows].map(row => [...row.cells].map(td => td.textContent.trim() || null));
    if (!GameRules.canPlaceNumber(board, startRow, startCol, number)) {
        speakInstruction(`Choose an empty square beside another ${number}.`);
        return;
    }
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
        remainingChoiceGuidanceSpoken = false;
        const emptiedBlock=blockEmptiedBy(matches);
        const streakUpdate=GameRules.updateMatchStreak(matchesSinceLastSpin,"match");
        matchesSinceLastSpin=streakUpdate.count;
        const streakMessage=streakUpdate.announcement;
        if(streakMessage&&!emptiedBlock){
            showMatchCelebration();
            speakInstruction(streakMessage);
        }
        clearMatchesTimeout = setTimeout(() => {
            matches.forEach(matchedCell => { matchedCell.textContent = ""; });
            if(emptiedBlock){
                showMatchCelebration();
                showBlockConfetti(emptiedBlock.anchor,emptiedBlock.color);
                speakInstruction(GameRules.getCombinedMatchAnnouncement(streakMessage,true));
            }
            rotationsWithoutClick = GameRules.getNextSpinStreak(rotationsWithoutClick, matches.length);
            spinsUsedDisplay.textContent = `Spins used: 0/${config.rotationLimit}`;
            const gameComplete=[...table.querySelectorAll("td")].every(cell=>cell.textContent.trim()==="");
            if(gameComplete&&emptiedBlock){
                spinButton.disabled=true;
                clearMatchesTimeout=setTimeout(()=>{
                    isClearingMatches=false;
                    endGame("Congratulations!", "win");
                },celebrationTimings.finalDelayMs);
                return;
            }
            isClearingMatches=false;
            checkForLastNumber();
        }, 500);
    } else {
        checkForLastNumber();
        if (gameOverPopup.classList.contains("hidden")) speakInstruction(`Good placement. You can place another ${number}, or spin again.`);
    }
});

function checkForLastNumber() {
    const remainingCells = [...table.querySelectorAll("td")]
        .filter(cell => cell.textContent.trim() !== "");
    if (remainingCells.length === 0) {
        endGame("Congratulations!", "win");
    }
}

function endGame(message, outcome) {
    gameOverTitle.textContent = message;
    gameOverCard.classList.toggle("win-banner", outcome === "win");
    gameOverCard.classList.toggle("loss-banner", outcome === "loss");
    gameOverPopup.classList.remove("hidden");
    spinButton.disabled = true;
    speakInstruction(outcome === "win" ? "Congratulations! You completed Number Match." : "Try again. Start a new game when you are ready.");
}
