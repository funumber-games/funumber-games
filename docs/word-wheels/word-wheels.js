(() => {
    const rules = globalThis.WordWheelsRules;
    const { ALPHABET, WORDS, REQUIRED_MATCHES, TOTAL_ROUNDS, DIFFICULTIES } = rules;
    const belts = [...document.querySelectorAll(".roller-belt")];
    const modePanel = document.getElementById("modePanel");
    const gamePanel = document.getElementById("gamePanel");
    const startButton = document.getElementById("startGameButton");
    const spinButton = document.getElementById("spinWordButton");
    const resetButton = document.getElementById("resetWordButton");
    const changeModeButton = document.getElementById("changeModeButton");
    const endOverlay = document.getElementById("wordEndOverlay");
    const endCard = document.getElementById("wordEndCard");
    const endTitle = document.getElementById("wordEndTitle");
    const endButton = document.getElementById("wordEndButton");
    const targetWord = document.getElementById("targetWord");
    const targetCaption = document.getElementById("targetCaption");
    const roundNumber = document.getElementById("roundNumber");
    const timeLeft = document.getElementById("timeLeft");
    const gameTotalText = document.getElementById("gameTotal");
    const wordsFoundText = document.getElementById("wordsFound");
    const roundTotalText = document.getElementById("roundTotal");
    const roundTotalLabel = document.getElementById("roundTotalLabel");
    const roundScoreList = document.getElementById("roundScoreList");
    const scoresEmpty = document.getElementById("scoresEmpty");
    const status = document.getElementById("wordStatus");
    const letterBoard = document.getElementById("letterBoard");
    const voiceInstruction = document.getElementById("voiceInstruction");
    const replayVoiceButton = document.getElementById("replayVoiceButton");

    let difficulty = "simple";
    let boardSize = DIFFICULTIES[difficulty].size;
    let round = 1;
    let gameTotal = 0;
    let roundScore = 0;
    let currentWord = "";
    let cells = [];
    let matches = [];
    let foundKeys = new Set();
    let selection = [];
    let phase = "selection";
    let startTime = 0;
    let timerInterval = null;
    let spinTimeout = null;
    let endDelayTimeout = null;
    let lastWord = "";
    let activePointerId = null;
    let pointerStartIndex = null;
    let pointerDidMove = false;
    let pointerFoundWord = false;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let currentVoiceInstruction = "";
    let guidanceRoundsShown = 0;

    function speakInstruction(message) {
        currentVoiceInstruction = message;
        voiceInstruction.textContent = message;
        if (!("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = .84;
        utterance.pitch = 1.08;
        window.speechSynthesis.speak(utterance);
    }

    function stopSpeech() {
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    }

    function buildBelt(belt) {
        belt.replaceChildren();
        belt.style.transition = "none";
        belt.style.transform = "translateY(0)";
        [...ALPHABET, ...ALPHABET, ...ALPHABET].forEach(letter => {
            const face = document.createElement("span");
            face.className = "roller-letter";
            face.textContent = letter;
            belt.appendChild(face);
        });
    }

    function clearBelt(belt, index) {
        belt.style.transition = "none";
        belt.style.transform = "translateY(0)";
        belt.replaceChildren();
        belt.parentElement?.parentElement?.setAttribute("aria-label", `Alphabet roller ${index + 1}, blank`);
    }

    function showStoppedLetter(belt, letter) {
        belt.style.transition = "none";
        belt.style.transform = "translateY(0)";
        const face = document.createElement("span");
        face.className = "roller-letter";
        face.textContent = letter;
        belt.replaceChildren(face);
    }

    function selectedDifficulty() {
        return document.querySelector('input[name="mode"]:checked')?.value || "simple";
    }

    function setStatus(message) {
        status.textContent = message;
    }

    function setSpinLabel(label, disabled) {
        spinButton.textContent = label;
        spinButton.disabled = disabled;
    }

    function renderBoard() {
        letterBoard.replaceChildren();
        letterBoard.style.setProperty("--board-size", String(boardSize));
        letterBoard.className = `letter-board board-${boardSize}`;
        const hintCells = new Set();
        if (DIFFICULTIES[difficulty].hint) matches.forEach(path => hintCells.add(path[0]));

        cells.forEach((cell, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "letter-tile";
            button.setAttribute("role", "gridcell");
            button.setAttribute("aria-label", `Row ${Math.floor(index / boardSize) + 1}, column ${index % boardSize + 1}, letter ${cell.letter}, number ${cell.value}`);
            button.dataset.index = String(index);
            if (hintCells.has(index)) button.classList.add("is-hint");
            button.addEventListener("click", event => {
                if (event.detail === 0) selectCellByClick(index);
            });

            const inner = document.createElement("span");
            inner.className = "tile-inner";
            const letterFace = document.createElement("span");
            letterFace.className = "tile-face tile-letter";
            letterFace.textContent = cell.letter;
            const numberFace = document.createElement("span");
            numberFace.className = "tile-face tile-number";
            numberFace.textContent = String(cell.value);
            inner.append(letterFace, numberFace);
            button.appendChild(inner);
            letterBoard.appendChild(button);
        });
        letterBoard.setAttribute("aria-label", `${boardSize} by ${boardSize} letter board for ${currentWord.split("").join(" ")}`);
    }

    function updateFoundCount() {
        wordsFoundText.textContent = `${foundKeys.size}/${REQUIRED_MATCHES}`;
    }

    function updateScoreDisplay() {
        roundTotalText.textContent = String(roundScore);
        gameTotalText.textContent = String(gameTotal + (phase === "active" ? roundScore : 0));
    }

    function currentElapsedSeconds() {
        return Math.floor((Date.now() - startTime) / 1000);
    }

    function updateCountdownValues(elapsedSeconds) {
        const value = rules.getCountdownValue(elapsedSeconds);
        cells.forEach((cell, index) => {
            if (cell.revealed) return;
            cell.value = value;
            const number = letterBoard.querySelector(`[data-index="${index}"] .tile-number`);
            if (number) number.textContent = String(value);
            const tile = letterBoard.querySelector(`[data-index="${index}"]`);
            if (tile) tile.setAttribute("aria-label", `Row ${Math.floor(index / boardSize) + 1}, column ${index % boardSize + 1}, letter ${cell.letter}, number ${cell.value}`);
        });
    }

    function stopTimer() {
        if (timerInterval !== null) window.clearInterval(timerInterval);
        timerInterval = null;
    }

    function completeRound() {
        if (phase !== "active") return;
        stopTimer();
        phase = "between";
        gameTotal += roundScore;
        roundTotalLabel.textContent = `Round ${round} total`;
        updateScoreDisplay();
        addRoundScore(round, roundScore);
        if (rules.getRoundCompletion(round, foundKeys.size) === "win") {
            phase = "ending-delay";
            setSpinLabel("Game complete", true);
            setStatus("All ten rounds are complete! Your results are ready.");
            speakInstruction("All ten rounds are complete. Your results are ready.");
            endDelayTimeout = window.setTimeout(() => {
                endDelayTimeout = null;
                showEndBanner("win");
            }, rules.WIN_BANNER_DELAY_MS);
            return;
        }
        setSpinLabel("Spin next round", false);
        setStatus(`Round ${round} complete! Spin when you are ready for round ${round + 1}.`);
        speakInstruction(`Round ${round} complete. Spin when you are ready for round ${round + 1}.`);
    }

    function handleTimeout() {
        if (phase !== "active") return;
        stopTimer();
        timeLeft.textContent = "0";
        updateCountdownValues(DIFFICULTIES[difficulty].seconds);
        if (!rules.shouldContinueAfterTimeout(foundKeys.size)) {
            phase = "ended";
            speakInstruction("Time is up. Find at least two words to continue. Try again.");
            showEndBanner("loss");
            return;
        }
        completeRound();
    }

    function tickTimer() {
        if (phase !== "active") return;
        const elapsed = currentElapsedSeconds();
        const remaining = Math.max(0, DIFFICULTIES[difficulty].seconds - elapsed);
        timeLeft.textContent = String(remaining);
        updateCountdownValues(elapsed);
        if (remaining <= 0) handleTimeout();
    }

    function addRoundScore(roundNumberValue, total) {
        const item = document.createElement("li");
        item.innerHTML = `<span>Round ${roundNumberValue}</span><strong>${total}</strong>`;
        roundScoreList.appendChild(item);
        scoresEmpty.classList.add("hidden");
    }

    function showEndBanner(outcome) {
        stopTimer();
        phase = "ended";
        endCard.classList.toggle("win", outcome === "win");
        endCard.classList.toggle("loss", outcome === "loss");
        endTitle.textContent = outcome === "win" ? "Congratulations!" : "Try again!";
        endOverlay.classList.remove("hidden");
        speakInstruction(outcome === "win" ? "Congratulations! You completed Word Wheels." : "Try again. Start a new game when you are ready.");
        endButton.focus();
    }

    function clearTimers() {
        stopTimer();
        if (spinTimeout !== null) window.clearTimeout(spinTimeout);
        if (endDelayTimeout !== null) window.clearTimeout(endDelayTimeout);
        spinTimeout = null;
        endDelayTimeout = null;
        stopSpeech();
    }

    function startClock() {
        phase = "active";
        startTime = Date.now();
        timeLeft.textContent = String(DIFFICULTIES[difficulty].seconds);
        updateCountdownValues(0);
        setStatus(`Find ${currentWord.split("").join(" ")} four times. The clock is ticking!`);
        timerInterval = window.setInterval(tickTimer, 1000);
    }

    function beginRound() {
        if (phase === "rolling" || phase === "active" || phase === "ended" || phase === "ending-delay") return;
        const startingNextRound = phase === "between";
        if (startingNextRound) round += 1;
        const config = DIFFICULTIES[difficulty];
        boardSize = config.size;
        const candidates = WORDS.filter(word => word !== lastWord);
        const nextWord = candidates[Math.floor(Math.random() * candidates.length)];
        const puzzle = rules.createPuzzle(nextWord, boardSize);
        if (!puzzle) {
            if (startingNextRound) round -= 1;
            setStatus("We could not make a fresh puzzle. Please try again.");
            return;
        }

        clearTimers();
        belts.forEach(buildBelt);
        phase = "rolling";
        currentWord = nextWord;
        lastWord = nextWord;
        matches = puzzle.matches;
        foundKeys = new Set();
        selection = [];
        roundScore = 0;
        cells = puzzle.letters.map(letter => ({ letter, value: 10, revealed: false }));
        letterBoard.replaceChildren();
        targetWord.textContent = "? ? ?";
        targetCaption.textContent = "Your word is spinning";
        roundNumber.textContent = String(round);
        timeLeft.textContent = "—";
        roundTotalLabel.textContent = `Round ${round} total`;
        roundTotalText.textContent = "0";
        updateFoundCount();
        updateScoreDisplay();
        setSpinLabel("Spinning…", true);
        setStatus("The rollers are turning. The timer starts when your word appears.");

        currentWord.split("").forEach((letter, index) => {
            const belt = belts[index];
            belt.style.transition = "none";
            belt.style.transform = "translateY(0)";
            const target = 26 + ALPHABET.indexOf(letter);
            void belt.offsetHeight;
            requestAnimationFrame(() => {
                belt.style.transition = "transform 950ms cubic-bezier(.12,.72,.18,1)";
                belt.style.transform = `translateY(-${target * 68}px)`;
            });
        });

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        spinTimeout = window.setTimeout(() => {
            belts.forEach((belt, index) => {
                showStoppedLetter(belt, currentWord[index]);
                belt.parentElement?.parentElement?.setAttribute("aria-label", `Letter ${currentWord[index]}`);
            });
            targetWord.textContent = currentWord.split("").join(" ");
            targetCaption.textContent = "Find this word four times";
            renderBoard();
            spinTimeout = null;
            setSpinLabel("Searching…", true);
            startClock();
            const spelled=currentWord.split("").join(", ");
            const fullGuidance=guidanceRoundsShown<2;
            guidanceRoundsShown++;
            speakInstruction(fullGuidance
                ? `Your word is ${spelled}. Find it four times. Click the three letters in order, or drag across them in a straight line.`
                : `Find ${spelled} four times.`);
        }, reducedMotion ? 0 : 1050);
    }

    function resetSelection(lastIndex = null) {
        selection = [];
        letterBoard.querySelectorAll(".letter-tile.is-selected").forEach(tile => {
            tile.classList.remove("is-selected", "color-1", "color-2", "color-3");
        });
        if (lastIndex !== null && phase === "active") {
            selection = [lastIndex];
            letterBoard.querySelector(`[data-index="${lastIndex}"]`)?.classList.add("is-selected", "color-1");
        }
    }

    function markFound(path) {
        const key = [...path].sort((a, b) => a - b).join(",");
        if (foundKeys.has(key)) return false;
        const match = matches.find(candidate => [...candidate].sort((a, b) => a - b).join(",") === key);
        if (!match) return false;

        roundScore += rules.scorePath(cells, path);
        path.forEach((index, position) => {
            const cell = cells[index];
            cell.revealed = true;
            const tile = letterBoard.querySelector(`[data-index="${index}"]`);
            tile?.classList.remove("is-selected", "color-1", "color-2", "color-3", "is-hint");
            tile?.classList.add("is-found", `color-${position + 1}`);
            tile?.setAttribute("aria-label", `Found ${currentWord[position]}, revealed number ${cell.value}`);
            tile.disabled = true;
        });
        foundKeys.add(key);
        updateFoundCount();
        updateScoreDisplay();
        resetSelection();

        if (foundKeys.size === REQUIRED_MATCHES) {
            setStatus("All four found!");
            completeRound();
        } else {
            setStatus(`Nice find! Find ${REQUIRED_MATCHES - foundKeys.size} more.`);
            speakInstruction(`Great! You found ${currentWord}. Find ${REQUIRED_MATCHES - foundKeys.size} more.`);
        }
        return true;
    }

    function beginDrag(event) {
        const tile = event.target.closest(".letter-tile");
        if (!tile || phase !== "active") return;
        const index = Number(tile.dataset.index);
        if (cells[index].revealed) return;
        event.preventDefault();
        if (DIFFICULTIES[difficulty].seconds - currentElapsedSeconds() <= 0) {
            handleTimeout();
            return;
        }
        tickTimer();
        if (phase !== "active") return;
        activePointerId = event.pointerId;
        pointerStartIndex = index;
        pointerDidMove = false;
        pointerFoundWord = false;
        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
        letterBoard.classList.add("is-dragging");
        tile.classList.add("is-pressed");
    }

    function extendDrag(index) {
        if (!selection.length || selection.length >= currentWord.length || selection.includes(index) || cells[index]?.revealed) return;
        const path = [...selection, index];
        if (!rules.isStraightLinePath(path, boardSize)) {
            resetSelection();
            selection = [index];
            letterBoard.querySelector(`[data-index="${index}"]`)?.classList.add("is-selected", "color-1");
            setStatus("Keep dragging in a straight line. Start again from this letter.");
            return;
        }
        selection.push(index);
        letterBoard.querySelector(`[data-index="${index}"]`)?.classList.add("is-selected", `color-${selection.length}`);
        if (selection.length < currentWord.length) setStatus("One more letter!");
    }

    function moveDrag(event) {
        if (activePointerId === null || event.pointerId !== activePointerId) return;
        const deltaX = event.clientX - pointerStartX;
        const deltaY = event.clientY - pointerStartY;
        if (!pointerDidMove && Math.hypot(deltaX, deltaY) >= 12) pointerDidMove = true;
        if (pointerDidMove && !pointerFoundWord) {
            const matchingPath = rules.findWordAlongDrag(cells, currentWord, pointerStartIndex, deltaX, deltaY, boardSize);
            if (matchingPath) {
                resetSelection();
                selection = matchingPath;
                selection.forEach((cellIndex, position) => {
                    letterBoard.querySelector(`[data-index="${cellIndex}"]`)?.classList.add("is-selected", `color-${position + 1}`);
                });
                pointerFoundWord = true;
                setStatus("Great direction! Release to select the word.");
                return;
            }
        }
        if (pointerFoundWord) return;
        const tile = document.elementFromPoint(event.clientX, event.clientY)?.closest(".letter-tile");
        if (!tile || !letterBoard.contains(tile)) return;
        const index = Number(tile.dataset.index);
        if (!pointerDidMove && index !== pointerStartIndex) {
            pointerDidMove = true;
            resetSelection();
            selection = [pointerStartIndex];
            letterBoard.querySelector(`[data-index="${pointerStartIndex}"]`)?.classList.add("is-selected", "color-1");
            setStatus("Drag across the next two letters in the word.");
        }
        if (pointerDidMove) extendDrag(index);
    }

    function finishDrag(event) {
        if (activePointerId === null || (event.pointerId !== undefined && event.pointerId !== activePointerId)) return;
        const clickedIndex = pointerStartIndex;
        const wasDrag = pointerDidMove;
        activePointerId = null;
        pointerStartIndex = null;
        pointerDidMove = false;
        pointerFoundWord = false;
        letterBoard.classList.remove("is-dragging");
        letterBoard.querySelectorAll(".letter-tile.is-pressed").forEach(tile => tile.classList.remove("is-pressed"));
        if (phase !== "active") {
            resetSelection();
            return;
        }
        if (!wasDrag) {
            selectCellByClick(clickedIndex);
            return;
        }
        if (selection.length !== currentWord.length || !rules.isStraightLinePath(selection, boardSize)) {
            resetSelection();
            setStatus("Select all three letters in a straight line by clicking or dragging.");
            return;
        }
        finishSelection("drag");
    }

    function cancelDrag(event) {
        if (activePointerId === null || (event.pointerId !== undefined && event.pointerId !== activePointerId)) return;
        activePointerId = null;
        pointerStartIndex = null;
        pointerDidMove = false;
        pointerFoundWord = false;
        letterBoard.classList.remove("is-dragging");
        letterBoard.querySelectorAll(".letter-tile.is-pressed").forEach(tile => tile.classList.remove("is-pressed"));
        resetSelection();
        if (phase === "active") setStatus("Selection canceled. Click or drag to try again.");
    }

    function selectCellByClick(index) {
        if (phase !== "active" || cells[index]?.revealed) return;
        if (DIFFICULTIES[difficulty].seconds - currentElapsedSeconds() <= 0) {
            handleTimeout();
            return;
        }
        tickTimer();
        if (phase !== "active") return;

        if (selection.includes(index)) {
            resetSelection();
            setStatus("Selection cleared. Click the first letter to try again.");
            return;
        }
        if (!selection.length) {
            selection = [index];
            letterBoard.querySelector(`[data-index="${index}"]`)?.classList.add("is-selected", "color-1");
            setStatus("First letter selected. Click the next letter in the word.");
            return;
        }

        const path = [...selection, index];
        if (!rules.isStraightLinePath(path, boardSize)) {
            resetSelection(index);
            setStatus("Choose touching letters in one straight line. Start again from this letter.");
            return;
        }
        selection.push(index);
        letterBoard.querySelector(`[data-index="${index}"]`)?.classList.add("is-selected", `color-${selection.length}`);
        if (selection.length < currentWord.length) {
            setStatus("One more letter!");
            return;
        }
        finishSelection("click");
    }

    function finishSelection(method) {
        if (selection.length !== currentWord.length || !rules.isStraightLinePath(selection, boardSize)) {
            resetSelection();
            setStatus("Select all three letters in a straight line by clicking or dragging.");
            return;
        }
        const path = [...selection];
        const letters = path.map(cellIndex => cells[cellIndex].letter).join("");
        if (letters === currentWord && markFound(path)) return;
        resetSelection();
        setStatus(method === "click"
            ? "Not quite. Click another matching word, one letter at a time."
            : "Not quite. Try dragging across another matching word.");
        speakInstruction("Not quite. Find the three letters in order, in one straight line.");
    }

    function startGame() {
        clearTimers();
        belts.forEach(clearBelt);
        activePointerId = null;
        pointerStartIndex = null;
        pointerDidMove = false;
        pointerFoundWord = false;
        letterBoard.classList.remove("is-dragging");
        phase = "selection";
        guidanceRoundsShown = 0;
        difficulty = selectedDifficulty();
        boardSize = DIFFICULTIES[difficulty].size;
        round = 1;
        gameTotal = 0;
        roundScore = 0;
        lastWord = "";
        currentWord = "";
        cells = [];
        matches = [];
        foundKeys = new Set();
        selection = [];
        letterBoard.replaceChildren();
        letterBoard.className = "letter-board";
        roundScoreList.replaceChildren();
        scoresEmpty.classList.remove("hidden");
        targetWord.textContent = "? ? ?";
        targetCaption.textContent = "Spin to reveal your word";
        roundNumber.textContent = "1";
        timeLeft.textContent = String(DIFFICULTIES[difficulty].seconds);
        roundTotalText.textContent = "0";
        gameTotalText.textContent = "0";
        wordsFoundText.textContent = "0/4";
        endOverlay.classList.add("hidden");
        modePanel.classList.add("hidden");
        gamePanel.classList.remove("hidden");
        phase = "ready";
        document.body.classList.add("word-game-active");
        setSpinLabel("Spin", false);
        setStatus("Take a moment to get comfortable. Your first spin starts the round.");
        requestAnimationFrame(()=>speakInstruction("Press Spin to make a three letter word. Then find the word four times on the board."));
    }

    function backToDifficulty() {
        clearTimers();
        belts.forEach(clearBelt);
        activePointerId = null;
        pointerStartIndex = null;
        pointerDidMove = false;
        pointerFoundWord = false;
        letterBoard.classList.remove("is-dragging");
        phase = "selection";
        currentWord = "";
        cells = [];
        matches = [];
        foundKeys = new Set();
        selection = [];
        gameTotal = 0;
        roundScore = 0;
        round = 1;
        lastWord = "";
        letterBoard.replaceChildren();
        letterBoard.className = "letter-board";
        roundScoreList.replaceChildren();
        scoresEmpty.classList.remove("hidden");
        targetWord.textContent = "? ? ?";
        targetCaption.textContent = "Spin to reveal your word";
        roundNumber.textContent = "1";
        timeLeft.textContent = String(DIFFICULTIES[selectedDifficulty()].seconds);
        roundTotalText.textContent = "0";
        gameTotalText.textContent = "0";
        wordsFoundText.textContent = "0/4";
        endOverlay.classList.add("hidden");
        gamePanel.classList.add("hidden");
        modePanel.classList.remove("hidden");
        document.body.classList.remove("word-game-active");
        setStatus("Start the game, then spin the rollers.");
    }

    function handleReset() {
        startGame();
    }

    function handleModeChange() {
        const selected = document.querySelector(`input[name="mode"][value="${difficulty}"]`);
        if (selected) selected.checked = true;
        backToDifficulty();
    }

    belts.forEach(clearBelt);
    letterBoard.addEventListener("pointerdown", beginDrag);
    document.addEventListener("pointermove", moveDrag);
    document.addEventListener("pointerup", finishDrag);
    document.addEventListener("pointercancel", cancelDrag);
    startButton.addEventListener("click", startGame);
    spinButton.addEventListener("click", beginRound);
    resetButton.addEventListener("click", handleReset);
    changeModeButton.addEventListener("click", handleModeChange);
    endButton.addEventListener("click", handleReset);
    replayVoiceButton.addEventListener("click",()=>speakInstruction(currentVoiceInstruction));
    document.querySelectorAll('input[name="mode"]').forEach(input => {
        input.addEventListener("change", () => {
            const next = DIFFICULTIES[input.value];
            timeLeft.textContent = String(next.seconds);
        });
    });
})();
