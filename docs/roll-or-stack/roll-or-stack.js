(function () {
    "use strict";

    const rules = globalThis.RollOrStackRules;
    if (!rules) return;

    const $ = id => document.getElementById(id);
    const ui = {
        modePanel: $("modePanel"), gamePanel: $("gamePanel"), startButton: $("startButton"),
        toyCount: $("toyCount"), modeName: $("modeName"), testsTried: $("testsTried"),
        promptText: $("promptText"), hoopRig: $("hoopRig"), activeToy: $("activeToy"),
        toyEmoji: $("toyEmoji"), toyShape: $("toyShape"), flyingToy: $("flyingToy"),
        flyingEmoji: $("flyingEmoji"), rollButton: $("rollButton"), stackButton: $("stackButton"),
        turnButton: $("turnButton"), orientationText: $("orientationText"), resultBurst: $("resultBurst"),
        toyName: $("toyName"), feedbackText: $("feedbackText"), voiceButton: $("voiceButton"),
        nextButton: $("nextButton"), resetButton: $("resetButton"), changeModeButton: $("changeModeButton"),
        predictionOverlay: $("predictionOverlay"), predictionOptions: $("predictionOptions"),
        completionOverlay: $("completionOverlay"), playAgainButton: $("playAgainButton"),
        completionModeButton: $("completionModeButton")
    };

    const state = {
        mode: "simple", deck: [], toyIndex: 0, orientationIndex: 0,
        tests: 0, busy: false, message: "", runId: 0
    };
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const delay = ms => new Promise(resolve => setTimeout(resolve, reducedMotion.matches ? Math.min(ms, 40) : ms));
    const currentToy = () => state.deck[state.toyIndex];
    const currentOrientation = () => currentToy()?.orientations[state.orientationIndex];

    function preferredVoice() {
        const voices = speechSynthesis.getVoices();
        return voices.find(voice => voice.name === "Rishi" && voice.lang === "en-IN")
            || voices.find(voice => voice.lang === "en-IN")
            || voices.find(voice => voice.lang.startsWith("en"));
    }

    function speak(text) {
        if (!("speechSynthesis" in window) || !text) return;
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-IN";
        utterance.rate = 1;
        utterance.pitch = 1;
        const voice = preferredVoice();
        if (voice) utterance.voice = voice;
        speechSynthesis.speak(utterance);
    }

    function setMessage(text, say = false) {
        state.message = text;
        ui.feedbackText.textContent = text;
        if (say) speak(text);
    }

    function setControls(enabled) {
        ui.rollButton.disabled = !enabled;
        ui.stackButton.disabled = !enabled;
        ui.turnButton.disabled = !enabled;
        ui.nextButton.disabled = !enabled || state.tests === 0;
    }

    function renderToy() {
        const toy = currentToy();
        const orientation = currentOrientation();
        if (!toy || !orientation) return;
        ui.toyCount.textContent = `${state.toyIndex + 1} / ${state.deck.length}`;
        ui.modeName.textContent = rules.MODES[state.mode].label;
        ui.testsTried.textContent = String(state.tests);
        ui.toyName.textContent = toy.name;
        const hasSprite = Boolean(toy.sprite);
        const spriteImage = hasSprite ? `url("${toy.sprite}")` : "";
        ui.toyEmoji.textContent = hasSprite ? "" : toy.emoji;
        ui.toyEmoji.classList.toggle("has-sprite", hasSprite);
        ui.toyEmoji.style.backgroundImage = spriteImage;
        ui.toyShape.textContent = orientation.glyph;
        ui.flyingEmoji.textContent = hasSprite ? "" : toy.emoji;
        ui.flyingEmoji.classList.toggle("has-sprite", hasSprite);
        ui.flyingEmoji.style.backgroundImage = spriteImage;
        ui.orientationText.textContent = orientation.label;
        ui.promptText.textContent = `Choose a test for the ${toy.name.toLowerCase()}!`;
        ui.turnButton.classList.toggle("hidden", !rules.supportsTurn(state.mode, toy));
        ui.nextButton.disabled = true;
        setMessage(`Meet the ${toy.name.toLowerCase()}. Choose Roll or Stack.`, true);
    }

    function startGame(mode = state.mode) {
        state.runId += 1;
        state.mode = mode;
        state.deck = rules.createDeck(mode);
        state.toyIndex = 0;
        state.orientationIndex = 0;
        state.tests = 0;
        state.busy = false;
        ui.modePanel.classList.add("hidden");
        ui.gamePanel.classList.remove("hidden");
        ui.completionOverlay.classList.add("hidden");
        ui.predictionOverlay.classList.add("hidden");
        resetAnimationClasses();
        setControls(true);
        renderToy();
    }

    function showModePicker() {
        state.runId += 1;
        state.busy = false;
        if ("speechSynthesis" in window) speechSynthesis.cancel();
        ui.completionOverlay.classList.add("hidden");
        ui.predictionOverlay.classList.add("hidden");
        ui.gamePanel.classList.add("hidden");
        ui.modePanel.classList.remove("hidden");
    }

    function resetAnimationClasses() {
        ui.hoopRig.className = "hoop-rig";
        ui.hoopRig.style.removeProperty("--return-angle");
        ui.activeToy.classList.remove("turning");
        ui.flyingToy.className = "flying-toy hidden";
        ui.resultBurst.classList.add("hidden");
    }

    async function turnToy() {
        const toy = currentToy();
        if (state.busy || !rules.supportsTurn(state.mode, toy)) return;
        state.busy = true;
        setControls(false);
        ui.activeToy.classList.add("turning");
        await delay(300);
        state.orientationIndex = rules.nextOrientation(state.mode, toy, state.orientationIndex);
        ui.toyShape.textContent = currentOrientation().glyph;
        ui.orientationText.textContent = currentOrientation().label;
        await delay(340);
        ui.activeToy.classList.remove("turning");
        state.busy = false;
        setControls(true);
        setMessage(`${toy.name} is now ${currentOrientation().label}. Choose a test.`, true);
    }

    function askPrediction(station) {
        ui.predictionOptions.replaceChildren();
        rules.predictionOptions(station).forEach(label => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "prediction-option";
            button.textContent = label;
            button.addEventListener("click", () => {
                ui.predictionOverlay.classList.add("hidden");
                runTest(station, label);
            }, { once: true });
            ui.predictionOptions.append(button);
        });
        ui.predictionOverlay.classList.remove("hidden");
        ui.predictionOptions.querySelector("button")?.focus();
        speak(`What do you think will happen at the ${station === "roll" ? "slide" : "stacking block"}?`);
    }

    function chooseStation(station) {
        if (state.busy) return;
        if (state.mode === "difficult") askPrediction(station);
        else runTest(station, "");
    }

    async function runTest(station, prediction) {
        if (state.busy) return;
        const toy = currentToy();
        const outcome = rules.getOutcome(toy, state.orientationIndex, station);
        if (!outcome) return;
        const runId = ++state.runId;
        state.busy = true;
        state.tests += 1;
        ui.testsTried.textContent = String(state.tests);
        setControls(false);
        ui.promptText.textContent = station === "roll" ? "Testing on the slide…" : "Testing on the block…";
        ui.hoopRig.className = `hoop-rig swing-${station}`;
        await delay(660);
        if (runId !== state.runId) return;
        ui.hoopRig.classList.add("releasing");
        ui.flyingToy.className = `flying-toy to-${station} kind-${outcome.kind}`;
        await delay(1080);
        if (runId !== state.runId) return;
        ui.resultBurst.style.left = station === "roll" ? "17%" : "78%";
        ui.resultBurst.classList.remove("hidden");
        const expected = rules.predictionFor(outcome, station);
        const predictionNote = prediction ? (prediction === expected ? " Great prediction!" : ` You predicted ${prediction.toLowerCase()}, and now we discovered what really happens.`) : "";
        setMessage(outcome.message + predictionNote, true);
        ui.promptText.textContent = outcome.message;
        await delay(820);
        if (runId !== state.runId) return;
        ui.flyingToy.classList.add("hidden");
        ui.resultBurst.classList.add("hidden");
        ui.hoopRig.style.setProperty("--return-angle", station === "roll" ? "-25deg" : "25deg");
        ui.hoopRig.className = "hoop-rig returning";
        await delay(590);
        if (runId !== state.runId) return;
        resetAnimationClasses();
        state.busy = false;
        ui.promptText.textContent = `Try the ${toy.name.toLowerCase()} again or choose the next toy.`;
        setControls(true);
        ui.nextButton.disabled = false;
    }

    function nextToy() {
        if (state.busy) return;
        if (state.toyIndex >= state.deck.length - 1) {
            ui.completionOverlay.classList.remove("hidden");
            speak("Wonderful discovering! You tested every toy in this mode.");
            return;
        }
        state.toyIndex += 1;
        state.orientationIndex = 0;
        state.tests = 0;
        resetAnimationClasses();
        renderToy();
    }

    ui.startButton.addEventListener("click", () => startGame(document.querySelector('input[name="mode"]:checked')?.value || "simple"));
    ui.rollButton.addEventListener("click", () => chooseStation("roll"));
    ui.stackButton.addEventListener("click", () => chooseStation("stack"));
    ui.turnButton.addEventListener("click", turnToy);
    ui.nextButton.addEventListener("click", nextToy);
    ui.voiceButton.addEventListener("click", () => speak(state.message));
    ui.resetButton.addEventListener("click", () => startGame(state.mode));
    ui.changeModeButton.addEventListener("click", showModePicker);
    ui.playAgainButton.addEventListener("click", () => startGame(state.mode));
    ui.completionModeButton.addEventListener("click", showModePicker);

    document.addEventListener("keydown", event => {
        if (ui.gamePanel.classList.contains("hidden") || state.busy || event.repeat) return;
        if (event.key.toLowerCase() === "r") chooseStation("roll");
        if (event.key.toLowerCase() === "s") chooseStation("stack");
        if (event.key.toLowerCase() === "t" && !ui.turnButton.classList.contains("hidden")) turnToy();
        if (event.key.toLowerCase() === "n" && !ui.nextButton.disabled) nextToy();
    });

    if ("speechSynthesis" in window) speechSynthesis.getVoices();
})();
