(function () {
    "use strict";

    const rules = globalThis.RollOrStackRules;
    if (!rules) return;

    const $ = id => document.getElementById(id);
    const ui = {
        modePanel: $("modePanel"), gamePanel: $("gamePanel"), startButton: $("startButton"),
        toyCount: $("toyCount"), modeName: $("modeName"), testsTried: $("testsTried"),
        promptText: $("promptText"), stage: $("circusStage"), hoopRig: $("hoopRig"), activeToy: $("activeToy"),
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
        renderOrientation(toy, orientation);
        ui.promptText.textContent = `Test the ${toy.name.toLowerCase()}`;
        ui.turnButton.classList.toggle("hidden", !rules.supportsTurn(state.mode, toy));
        ui.nextButton.disabled = true;
        setMessage(`Meet the ${toy.name.toLowerCase()}. Choose Roll or Stack.`, true);
    }

    function renderOrientation(toy, orientation) {
        const pose = toy.orientations.length > 1 ? `-${orientation.id}` : "";
        const source = `toys/${toy.id}${pose}.png`;
        for (const image of [ui.toyEmoji, ui.flyingEmoji]) {
            image.src = source;
            image.classList.toggle("inverted", toy.id === "half-ball" && orientation.id === "round");
        }
        ui.orientationText.textContent = orientation.label;
        ui.orientationText.parentElement.classList.toggle("hidden", !rules.supportsTurn(state.mode, toy));
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
        ui.flyingToy.getAnimations?.().forEach(animation => animation.cancel());
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
        const runId = state.runId;
        setControls(false);
        ui.activeToy.classList.add("turning");
        await delay(300);
        if (runId !== state.runId) return;
        state.orientationIndex = rules.nextOrientation(state.mode, toy, state.orientationIndex);
        renderOrientation(toy, currentOrientation());
        await delay(340);
        if (runId !== state.runId) return;
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

    const chute = [[25.7,42.2],[28.2,44.4],[30.1,49.2],[32,56.5],[34.4,63.2],[37.5,68.4],[40.2,70.7]];
    const stackContact = [74.5,49.7];

    function toyMotion(station, kind, toy) {
        const stage = ui.stage.getBoundingClientRect();
        const resting = ui.toyEmoji.getBoundingClientRect();
        const sprite = ui.flyingEmoji.getBoundingClientRect();
        const start = [
            100 * (resting.left + resting.width / 2 - stage.left - ui.stage.clientLeft) / ui.stage.clientWidth,
            100 * (resting.bottom - stage.top - ui.stage.clientTop) / ui.stage.clientHeight
        ];
        const rollsInPlane = /^(beach-ball|tennis-ball|orange|toy-wheel|toy-egg)$/.test(toy.id);
        const contact = station === "roll" ? chute[0] : stackContact;
        const points = [
            [...start,0,0],
            [(start[0]+contact[0])/2,Math.min(start[1],contact[1])-6,0,.12],
            [...contact,0,.29]
        ];
        if (station === "roll") {
            chute.slice(1).forEach(([x,y], index) => {
                const step = index+1;
                const angle = kind === "tumble" ? step*58
                    : kind === "slide" ? 0
                    : kind === "roll" && rollsInPlane ? step*54
                    : kind === "wobble" || kind === "rock" || kind === "uneven-roll" ? (step%2?12:-12)
                    : kind === "curve" ? step*8 : 0;
                points.push([x,y,angle,.29+.71*step/(chute.length-1)]);
            });
        } else if (kind === "stay") points.push([...stackContact,0,1]);
        else if (kind === "rock") points.push([74.2,49.7,-13,.52],[74.8,49.7,13,.73],[...stackContact,0,1]);
        else {
            const angle = kind === "tip" ? 85 : 155;
            points.push([78.1,56.5,angle*.5,.56],[84.4,58.7,angle*.8,.77],[86,76,angle,1]);
        }
        return points.map(([left,top,angle,offset]) => {
            const radians = angle*Math.PI/180;
            const halfHeight = (Math.abs(Math.cos(radians))*sprite.height+Math.abs(Math.sin(radians))*sprite.width)/2;
            return { left:`${left}%`, top:`calc(${top}% - ${halfHeight}px)`, transform:`rotate(${angle}deg)`, offset };
        });
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
        await delay(680);
        if (runId !== state.runId) return;
        ui.flyingToy.className = "flying-toy";
        const frames = toyMotion(station, outcome.kind, toy);
        ui.hoopRig.classList.add("releasing");
        ui.flyingToy.classList.toggle("can-rolling", station === "roll" && toy.id === "soup-can" && outcome.kind === "roll" && !reducedMotion.matches);
        const motion = reducedMotion.matches ? undefined : ui.flyingToy.animate?.(frames, { duration:1800, fill:"forwards" });
        if (motion) await motion.finished.catch(() => {});
        else {
            const { offset, ...landing } = frames.at(-1);
            Object.assign(ui.flyingToy.style, landing);
        }
        if (runId !== state.runId) return;
        ui.resultBurst.style.left = station === "roll" ? "40%" : "75%";
        ui.resultBurst.classList.remove("hidden");
        const expected = rules.predictionFor(outcome, station);
        const predictionNote = prediction ? (prediction === expected ? " Great prediction!" : ` You predicted ${prediction.toLowerCase()}, and now we discovered what really happens.`) : "";
        setMessage(outcome.message + predictionNote, true);
        ui.promptText.textContent = outcome.message;
        await delay(820);
        if (runId !== state.runId) return;
        ui.flyingToy.classList.add("hidden");
        motion?.cancel();
        ui.resultBurst.classList.add("hidden");
        ui.hoopRig.style.setProperty("--return-angle", station === "roll" ? "25deg" : "-25deg");
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
