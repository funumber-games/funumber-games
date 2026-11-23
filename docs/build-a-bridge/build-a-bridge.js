(() => {
    "use strict";

    const MODE_CONFIG = {
        simple: { label: "Simple", min: 3, max: 5, extraBlocks: 0, guides: true },
        moderate: { label: "Moderate", min: 4, max: 7, extraBlocks: 2, guides: true },
        difficult: { label: "Difficult", min: 5, max: 8, extraBlocks: 2, guides: false }
    };

    const numberWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
    const elements = {
        modePanel: document.getElementById("modePanel"),
        gamePanel: document.getElementById("gamePanel"),
        startButton: document.getElementById("startButton"),
        resetButton: document.getElementById("resetButton"),
        changeModeButton: document.getElementById("changeModeButton"),
        roundStatus: document.getElementById("roundStatus"),
        modeStatus: document.getElementById("modeStatus"),
        blockStatus: document.getElementById("blockStatus"),
        instructionTitle: document.getElementById("instructionTitle"),
        instructionText: document.getElementById("instructionText"),
        voiceButton: document.getElementById("voiceButton"),
        scene: document.getElementById("scene"),
        sceneBackground: document.getElementById("sceneBackground"),
        measureTrack: document.getElementById("measureTrack"),
        guideSlots: document.getElementById("guideSlots"),
        placedBlocks: document.getElementById("placedBlocks"),
        bridgePlank: document.getElementById("bridgePlank"),
        rabbitCover: document.getElementById("rabbitCover"),
        rabbitCanvas: document.getElementById("rabbitCanvas"),
        workbench: document.getElementById("workbench"),
        blockPile: document.getElementById("blockPile"),
        plankChoices: document.getElementById("plankChoices"),
        undoButton: document.getElementById("undoButton"),
        doneButton: document.getElementById("doneButton"),
        nextButton: document.getElementById("nextButton"),
        feedback: document.getElementById("feedback")
    };

    const state = {
        mode: "simple",
        round: 0,
        gap: 4,
        placed: 0,
        supply: 4,
        phase: "measure",
        plankValues: [3, 4, 5],
        currentInstruction: "",
        animation: null,
        spriteAnimation: null,
        speechTimer: null
    };

    const rabbitSheet = new Image();
    rabbitSheet.src = "build-a-bridge-rabbit-running.png";

    function sizeRabbitCanvas() {
        const canvas = elements.rabbitCanvas;
        const width = Math.max(1, Math.round(elements.scene.clientWidth));
        const height = Math.max(1, Math.round(elements.scene.clientHeight));
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        return canvas.getContext("2d");
    }

    function drawRabbit(frame, xRatio, groundRatio, phase = 0, moving = false) {
        if (!rabbitSheet.complete || !rabbitSheet.naturalWidth) return;
        const canvas = elements.rabbitCanvas;
        const context = sizeRabbitCanvas();
        const width = canvas.width;
        const height = canvas.height;
        const x = width * xRatio;
        const ground = height * groundRatio;
        const frameWidth = rabbitSheet.naturalWidth / 8;
        const frameHeight = rabbitSheet.naturalHeight;
        const sourceY = frameHeight * .34;
        const sourceHeight = frameHeight * .31;
        const rabbitWidth = width * .13;
        const rabbitHeight = sourceHeight / frameWidth * rabbitWidth;
        const bounce = moving ? Math.sin(phase * Math.PI * 2) ** 2 * rabbitHeight * .035 : 0;
        const squash = moving && (frame === 0 || frame === 5) ? .97 : 1;

        context.clearRect(0, 0, width, height);
        context.fillStyle = "rgba(37, 59, 41, .25)";
        context.beginPath();
        context.ellipse(x, ground - 2, rabbitWidth * .36, Math.max(3, rabbitHeight * .04), 0, 0, Math.PI * 2);
        context.fill();
        context.save();
        context.translate(x, ground - bounce);
        context.scale(1 / squash, squash);
        context.drawImage(rabbitSheet, frame * frameWidth, sourceY, frameWidth, sourceHeight,
            -rabbitWidth / 2, -rabbitHeight, rabbitWidth, rabbitHeight);
        context.restore();
    }

    function drawWaitingRabbit(side = "left") {
        drawRabbit(6, side === "left" ? .17 : .78, .39);
    }

    rabbitSheet.addEventListener("load", () => drawWaitingRabbit());

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function shuffle(values) {
        const copy = [...values];
        for (let index = copy.length - 1; index > 0; index -= 1) {
            const other = Math.floor(Math.random() * (index + 1));
            [copy[index], copy[other]] = [copy[other], copy[index]];
        }
        return copy;
    }

    function chooseGap() {
        const config = MODE_CONFIG[state.mode];
        if (state.mode === "simple" && state.round === 1) return 4;
        let value = randomInt(config.min, config.max);
        if (value === state.gap && config.max > config.min) value = value === config.max ? value - 1 : value + 1;
        return value;
    }

    function createPlankValues() {
        if (state.mode === "simple" && state.round === 1) return [3, 4, 5];
        const candidates = [];
        for (let value = Math.max(2, state.gap - 2); value <= state.gap + 2; value += 1) {
            if (value !== state.gap) candidates.push(value);
        }
        const distractors = shuffle(candidates).slice(0, 2);
        const values = [state.gap, ...distractors];
        if (state.mode === "simple") return values.sort((a, b) => a - b);
        return shuffle(values);
    }

    function setInstruction(title, detail, spoken = `${title} ${detail}`) {
        elements.instructionTitle.textContent = title;
        elements.instructionText.textContent = detail;
        state.currentInstruction = spoken;
    }

    function speak(message = state.currentInstruction) {
        if (!("speechSynthesis" in window) || !message) return;
        window.clearTimeout(state.speechTimer);
        const synth = window.speechSynthesis;
        synth.cancel();
        state.speechTimer = window.setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(message);
            const voices = synth.getVoices();
            utterance.voice = voices.find(voice => voice.name === "Rishi") || voices.find(voice => voice.lang === "en-IN") || voices.find(voice => voice.lang.startsWith("en")) || null;
            utterance.lang = "en-IN";
            utterance.rate = 1;
            utterance.pitch = 1;
            synth.resume();
            synth.speak(utterance);
        }, 80);
    }

    function updateUnitSize() {
        const trackWidth = elements.measureTrack.getBoundingClientRect().width;
        if (!trackWidth) return;
        elements.scene.style.setProperty("--unit-size", `${trackWidth / state.gap}px`);
    }

    function renderGuides() {
        elements.guideSlots.replaceChildren();
        if (!MODE_CONFIG[state.mode].guides) return;
        for (let index = 0; index < state.gap; index += 1) {
            const slot = document.createElement("span");
            slot.className = "guide-slot";
            elements.guideSlots.append(slot);
        }
    }

    function renderPlacedBlocks() {
        elements.placedBlocks.replaceChildren();
        for (let index = 0; index < state.placed; index += 1) {
            const block = document.createElement("span");
            block.className = "measure-block";
            block.textContent = String(index + 1);
            if (index === state.placed - 1) block.classList.add("landing");
            block.setAttribute("aria-label", `Block ${index + 1}`);
            elements.placedBlocks.append(block);
        }
        elements.blockStatus.textContent = String(state.placed);
        elements.undoButton.disabled = state.placed === 0 || state.phase !== "measure";
        elements.doneButton.disabled = state.placed === 0 || state.phase !== "measure";
    }

    function renderSupply() {
        elements.blockPile.replaceChildren();
        const button = document.createElement("button");
        button.type = "button";
        button.className = "supply-block";
        button.disabled = state.phase !== "measure" || state.placed >= state.supply;
        button.setAttribute("aria-label", `Place measuring block ${state.placed + 1}`);
        button.addEventListener("click", placeBlock);
        elements.blockPile.append(button);
    }

    function renderPlanks() {
        elements.plankChoices.replaceChildren();
        state.plankValues.forEach(value => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "plank-choice";
            button.dataset.length = String(value);
            button.style.width = `calc(var(--unit-size) * ${value})`;
            button.disabled = state.phase !== "choose";
            button.setAttribute("aria-label", `${value}-block plank`);
            if (state.mode !== "difficult") {
                const label = document.createElement("span");
                label.textContent = `${value} blocks`;
                button.append(label);
            }
            button.addEventListener("click", () => tryPlank(value, button));
            elements.plankChoices.append(button);
        });
    }

    function renderAll() {
        updateUnitSize();
        renderGuides();
        renderPlacedBlocks();
        renderSupply();
        renderPlanks();
    }

    function startRound() {
        state.round += 1;
        state.gap = chooseGap();
        state.placed = 0;
        state.supply = state.gap + MODE_CONFIG[state.mode].extraBlocks;
        state.phase = "measure";
        state.plankValues = createPlankValues();
        state.animation?.cancel();
        state.spriteAnimation?.cancel();
        elements.scene.classList.remove("crossing");
        elements.sceneBackground.src = "build-a-bridge-layout-white-rabbit.png";
        elements.measureTrack.classList.remove("hidden");
        elements.rabbitCover.classList.remove("hidden");
        drawWaitingRabbit();
        elements.bridgePlank.className = "bridge-plank hidden";
        elements.bridgePlank.style.removeProperty("--unit-size");
        elements.doneButton.classList.toggle("hidden", state.mode === "simple");
        elements.nextButton.classList.add("hidden");
        elements.workbench.classList.remove("hidden");
        elements.roundStatus.textContent = String(state.round);
        elements.modeStatus.textContent = MODE_CONFIG[state.mode].label;
        elements.feedback.textContent = "Place the blocks end to end across the measuring line.";
        setInstruction("How many blocks wide is the creek?", "Tap the blocks to measure from one bank to the other.");
        renderAll();
        window.setTimeout(() => speak(), 250);
    }

    function startGame() {
        state.mode = document.querySelector('input[name="mode"]:checked')?.value || "simple";
        state.round = 0;
        elements.modePanel.classList.add("hidden");
        elements.gamePanel.classList.remove("hidden");
        alignPageTop();
        startRound();
    }

    function placeBlock() {
        if (state.phase !== "measure" || state.placed >= state.supply) return;
        state.placed += 1;
        renderPlacedBlocks();
        renderSupply();
        elements.feedback.textContent = `${numberWords[state.placed]}. Keep measuring.`;
        speak(numberWords[state.placed]);

        if (state.mode === "simple" && state.placed === state.gap) finishMeasurement();
    }

    function undoBlock() {
        if (state.phase !== "measure" || state.placed === 0) return;
        state.placed -= 1;
        elements.feedback.textContent = "The last block is back in the work area.";
        renderPlacedBlocks();
        renderSupply();
    }

    function finishMeasurement() {
        if (state.phase !== "measure") return;
        if (state.placed < state.gap) {
            const missing = state.gap - state.placed;
            elements.feedback.textContent = `${missing} more ${missing === 1 ? "block is" : "blocks are"} needed to reach the end mark.`;
            speak("The blocks do not reach the end yet. Keep measuring.");
            return;
        }
        if (state.placed > state.gap) {
            const extra = state.placed - state.gap;
            elements.feedback.textContent = `The row is ${extra} ${extra === 1 ? "block" : "blocks"} too long. Use Undo.`;
            speak("The row goes past the end. Use undo and try again.");
            return;
        }

        state.phase = "choose";
        elements.doneButton.disabled = true;
        elements.undoButton.disabled = true;
        const gapWord = numberWords[state.gap];
        elements.feedback.textContent = `The gap is ${state.gap} blocks wide. Choose the matching plank.`;
        setInstruction(`The gap is ${state.gap} blocks wide.`, `Which plank is ${state.gap} blocks long?`, `The gap is ${gapWord} blocks wide. Which plank is ${gapWord} blocks long?`);
        renderSupply();
        renderPlanks();
        speak();
    }

    function tryPlank(value, button) {
        if (state.phase !== "choose") return;
        if (value !== state.gap) {
            const result = value < state.gap ? "Too short" : "Too long";
            button.classList.remove("wrong");
            void button.offsetWidth;
            button.classList.add("wrong");
            elements.feedback.textContent = `${result}. Compare the plank with the measured row and try again.`;
            speak(`${result}. Try another plank.`);
            return;
        }

        state.phase = "crossing";
        renderSupply();
        renderPlanks();
        elements.bridgePlank.style.width = `calc(var(--unit-size) * ${state.gap})`;
        elements.bridgePlank.classList.remove("hidden");
        elements.bridgePlank.classList.add("arriving");
        elements.feedback.textContent = "It fits! Watch the rabbit cross the bridge.";
        setInstruction("It fits!", "The rabbit can cross safely.", "It fits! Watch the rabbit cross the bridge.");
        speak();
        window.setTimeout(runRabbitCrossing, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 20 : 650);
    }

    function runRabbitCrossing() {
        elements.scene.classList.add("crossing");
        elements.bridgePlank.style.setProperty("--unit-size", `${100 / state.gap}%`);
        elements.measureTrack.classList.add("hidden");
        elements.rabbitCover.classList.remove("hidden");
        elements.bridgePlank.classList.remove("hidden");

        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) {
            drawWaitingRabbit("right");
            finishCrossing();
            return;
        }

        const gapLeft = 29.8;
        const gapWidth = 38.9;
        const rabbitAnchor = 0;
        const blockFootfalls = Array.from({ length: state.gap }, (_, index) =>
            gapLeft + ((index + .5) * gapWidth / state.gap) - rabbitAnchor
        );
        const movementPoints = [24, ...blockFootfalls, 78];
        const stepDuration = 640;
        const segmentCount = movementPoints.length - 1;
        const totalDuration = stepDuration * segmentCount;
        const startedAt = performance.now();
        let animationFrame = 0;
        let cancelled = false;
        state.animation = { cancel() { cancelled = true; cancelAnimationFrame(animationFrame); } };

        function animateRabbit(now) {
            if (cancelled) return;
            const elapsed = Math.min(now - startedAt, totalDuration);
            const segment = Math.min(Math.floor(elapsed / stepDuration), segmentCount - 1);
            const phase = elapsed >= totalDuration ? 0 : (elapsed % stepDuration) / stepDuration;
            const x = movementPoints[segment] + (movementPoints[segment + 1] - movementPoints[segment]) * phase;
            const frame = elapsed >= totalDuration ? 6 : Math.floor(phase * 8);
            drawRabbit(frame, x / 100, .36, phase, elapsed < totalDuration);
            if (elapsed < totalDuration) animationFrame = requestAnimationFrame(animateRabbit);
            else finishCrossing();
        }
        animationFrame = requestAnimationFrame(animateRabbit);
    }

    function finishCrossing() {
        state.phase = "complete";
        drawWaitingRabbit("right");
        elements.nextButton.classList.remove("hidden");
        elements.feedback.textContent = "The rabbit reached the far bank. Wonderful measuring!";
        setInstruction("The rabbit made it across!", "Choose Next Crossing for another creek gap.");
        speak("The rabbit made it across. Wonderful measuring!");
    }

    function resetGame() {
        state.round = 0;
        alignPageTop();
        startRound();
    }

    function changeMode() {
        window.clearTimeout(state.speechTimer);
        window.speechSynthesis?.cancel();
        state.animation?.cancel();
        state.spriteAnimation?.cancel();
        elements.gamePanel.classList.add("hidden");
        elements.modePanel.classList.remove("hidden");
        alignPageTop();
    }

    function alignPageTop() {
        window.requestAnimationFrame(() => {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        });
    }

    elements.startButton.addEventListener("click", startGame);
    elements.resetButton.addEventListener("click", resetGame);
    elements.changeModeButton.addEventListener("click", changeMode);
    elements.voiceButton.addEventListener("click", () => speak());
    elements.undoButton.addEventListener("click", undoBlock);
    elements.doneButton.addEventListener("click", finishMeasurement);
    elements.nextButton.addEventListener("click", () => {
        elements.measureTrack.classList.remove("hidden");
        startRound();
    });
    window.addEventListener("resize", () => {
        updateUnitSize();
        renderPlanks();
    });
})();
