(() => {
    const logic = window.BundleDeliveryLogic;
    const $ = selector => document.querySelector(selector);
    const modePanel = $("#modePanel");
    const gamePanel = $("#gamePanel");
    const scene = $("#bundleScene");
    const bundleSupply = $("#bundleSupply");
    const stickSupply = $("#stickSupply");
    const packedBundles = $("#packedBundles");
    const packedSticks = $("#packedSticks");
    const tensGuides = $("#tensGuides");
    const onesGuides = $("#onesGuides");
    const hopLayer = $("#hopLayer");
    const orderNumber = $("#orderNumber");
    const orderBreakdown = $("#orderBreakdown");
    const promptText = $("#promptText");
    const bundleTenButton = $("#bundleTenButton");
    const nextOrderButton = $("#nextOrderButton");
    const demoOverlay = $("#demoOverlay");

    const state = {
        mode: "simple",
        order: 34,
        bundles: 0,
        loose: 0,
        bundleStock: 5,
        looseStock: 10,
        round: 1,
        busy: false,
        delivered: false,
        demoShown: false
    };

    const smallWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
    const tensWords = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
    const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

    function numberWords(value) {
        if (value < 20) return smallWords[value];
        const tens = Math.floor(value / 10);
        const ones = value % 10;
        return `${tensWords[tens]}${ones ? `-${smallWords[ones]}` : ""}`;
    }

    function selectedMode() {
        return document.querySelector('input[name="mode"]:checked')?.value || "simple";
    }

    function preferredVoice() {
        const voices = window.speechSynthesis?.getVoices?.() || [];
        return voices.find(voice => /rishi/i.test(voice.name))
            || voices.find(voice => /^en-IN$/i.test(voice.lang))
            || voices.find(voice => /^en/i.test(voice.lang));
    }

    function speak(text) {
        if (!("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-IN";
        utterance.rate = 1;
        utterance.pitch = 1;
        const voice = preferredVoice();
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
    }

    function speakAndWait(text) {
        if (!("speechSynthesis" in window)) return Promise.resolve();
        return new Promise(resolve => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "en-IN";
            utterance.rate = 1;
            utterance.pitch = 1;
            const voice = preferredVoice();
            if (voice) utterance.voice = voice;
            utterance.onend = resolve;
            utterance.onerror = resolve;
            window.speechSynthesis.speak(utterance);
        });
    }

    function makeStick() {
        const stick = document.createElement("span");
        stick.className = "craft-stick";
        stick.setAttribute("aria-hidden", "true");
        return stick;
    }

    function makeBundle() {
        const bundle = document.createElement("span");
        bundle.className = "craft-bundle";
        bundle.setAttribute("aria-hidden", "true");
        return bundle;
    }

    function makeSupplyPile(kind, count) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "supply-item supply-pile-button";
        button.setAttribute("aria-label", kind === "bundle" ? "Pack one bundle of ten" : "Pack one loose stick");

        if (kind === "bundle") {
            const art = document.createElement("span");
            art.className = "bundle-pile-art";
            art.setAttribute("aria-hidden", "true");
            button.append(art);
        } else {
            const art = document.createElement("span");
            art.className = "stick-pile-art";
            art.setAttribute("aria-hidden", "true");
            for (let index = 0; index < 8; index += 1) art.append(makeStick());
            button.append(art);
        }

        const badge = document.createElement("strong");
        badge.className = "supply-count";
        badge.textContent = count;
        badge.setAttribute("aria-hidden", "true");
        button.append(badge);
        button.addEventListener("click", () => addItem(kind, button));
        return button;
    }

    function updateStatus() {
        const digits = logic.digitsFor(state.order);
        $("#roundNumber").textContent = state.round;
        $("#modeName").textContent = logic.MODE_CONFIG[state.mode].label;
        $("#packedValue").textContent = logic.packedValue(state.bundles, state.loose);
        $("#tensCount").textContent = state.bundles;
        $("#onesCount").textContent = state.loose;
        orderNumber.textContent = state.order;
        orderBreakdown.textContent = `${digits.tens} tens + ${digits.ones} ones`;
        bundleTenButton.classList.toggle("hidden", state.mode !== "difficult");
        bundleTenButton.disabled = !logic.canBundleTen(state.loose) || state.busy || state.delivered;
    }

    function renderSupply() {
        bundleSupply.replaceChildren();
        stickSupply.replaceChildren();
        bundleSupply.append(makeSupplyPile("bundle", state.bundleStock));
        stickSupply.append(makeSupplyPile("stick", state.looseStock));
    }

    function makePackedButton(kind, index) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `packed-item packed-${kind}`;
        button.dataset.index = index;
        button.setAttribute("aria-label", `Return this ${kind === "bundle" ? "bundle of ten" : "loose stick"}`);
        button.append(kind === "bundle" ? makeBundle() : makeStick());
        button.addEventListener("click", () => returnItem(kind));
        return button;
    }

    function renderPacked() {
        packedBundles.replaceChildren();
        packedSticks.replaceChildren();
        for (let index = 0; index < state.bundles; index += 1) packedBundles.append(makePackedButton("bundle", index));
        for (let index = 0; index < state.loose; index += 1) packedSticks.append(makePackedButton("stick", index));
    }

    function renderGuides() {
        tensGuides.replaceChildren();
        onesGuides.replaceChildren();
        if (state.mode !== "simple") return;
        const digits = logic.digitsFor(state.order);
        for (let index = 0; index < digits.tens; index += 1) tensGuides.append(Object.assign(document.createElement("i"), { className: "guide-slot" }));
        for (let index = 0; index < digits.ones; index += 1) onesGuides.append(Object.assign(document.createElement("i"), { className: "guide-slot" }));
    }

    async function animateHop(source, kind, destination) {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const sceneRect = scene.getBoundingClientRect();
        const from = source.getBoundingClientRect();
        const to = destination.getBoundingClientRect();
        const item = document.createElement("span");
        item.className = "hopping-item";
        item.append(kind === "bundle" ? makeBundle() : makeStick());
        item.style.left = `${from.left - sceneRect.left + from.width / 2}px`;
        item.style.top = `${from.top - sceneRect.top + from.height / 2}px`;
        hopLayer.append(item);
        const dx = to.left - from.left + to.width * .5;
        const dy = to.top - from.top + to.height * .45;
        const animation = item.animate([
            { transform:"translate(-50%,-50%) scale(.85)" },
            { transform:`translate(calc(-50% + ${dx * .5}px),calc(-50% + ${dy * .5 - sceneRect.height * .13}px)) scale(1.15)`, offset:.52 },
            { transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.78)` }
        ], { duration:480, easing:"cubic-bezier(.2,.72,.22,1)", fill:"forwards" });
        await animation.finished.catch(() => {});
        item.remove();
    }

    function setPrompt(message, announce = false) {
        promptText.textContent = message;
        if (announce) speak(message);
    }

    async function addItem(kind, source) {
        if (state.busy || state.delivered) return;
        if (kind === "bundle" && state.bundles >= 9) return setPrompt("The Tens compartment is full.", true);
        if (kind === "stick" && state.loose >= 10) return setPrompt("The Ones compartment is full. Return or bundle some sticks.", true);
        state.busy = true;
        source.disabled = true;
        await animateHop(source, kind, kind === "bundle" ? packedBundles : packedSticks);
        if (kind === "bundle") {
            state.bundles += 1;
            state.bundleStock -= 1;
            if (state.bundleStock === 0) state.bundleStock = 5;
        } else {
            state.loose += 1;
            state.looseStock -= 1;
            if (state.looseStock === 0) state.looseStock = 10;
        }
        state.busy = false;
        renderSupply();
        renderPacked();
        updateStatus();
        setPrompt(`${state.bundles} tens and ${state.loose} ones make ${logic.packedValue(state.bundles, state.loose)}.`, false);
    }

    function returnItem(kind) {
        if (state.busy || state.delivered) return;
        if (kind === "bundle" && state.bundles > 0) {
            state.bundles -= 1;
            state.bundleStock = Math.min(5, state.bundleStock + 1);
        }
        if (kind === "stick" && state.loose > 0) {
            state.loose -= 1;
            state.looseStock = Math.min(10, state.looseStock + 1);
        }
        renderSupply();
        renderPacked();
        updateStatus();
        setPrompt(`Returned one ${kind === "bundle" ? "bundle" : "loose stick"}.`);
    }

    async function bundleTen() {
        if (state.busy || state.delivered) return;
        const result = logic.bundleTen(state.bundles, state.loose);
        if (!result.changed) return setPrompt("You need exactly ten loose sticks to make a bundle.", true);
        state.busy = true;
        packedSticks.classList.add("regrouping");
        await wait(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 20 : 650);
        state.bundles = result.bundles;
        state.loose = result.loose;
        state.busy = false;
        packedSticks.classList.remove("regrouping");
        renderPacked();
        updateStatus();
        setPrompt("Ten ones became one ten. The total stayed the same!", true);
    }

    function orderSpeech() {
        return `${numberWords(state.order)} sticks, please!`;
    }

    function hint() {
        const message = state.mode === "simple"
            ? `Pack ${logic.digitsFor(state.order).tens} bundles and ${logic.digitsFor(state.order).ones} loose sticks.`
            : logic.packingHint(state.order, state.bundles, state.loose);
        setPrompt(message, true);
    }

    async function deliver() {
        if (state.busy || state.delivered) return;
        if (!logic.validatePacking(state.order, state.bundles, state.loose)) {
            scene.classList.remove("needs-fix");
            void scene.offsetWidth;
            scene.classList.add("needs-fix");
            return setPrompt(logic.packingHint(state.order, state.bundles, state.loose), true);
        }
        state.busy = true;
        state.delivered = true;
        const sequence = logic.countSequence(state.order);
        const items = [...packedBundles.children, ...packedSticks.children];
        window.speechSynthesis?.cancel();
        for (let index = 0; index < items.length; index += 1) {
            items.forEach(item => item.classList.remove("counting"));
            items[index].classList.add("counting");
            await speakAndWait(numberWords(sequence[index]));
            await wait(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 20 : 90);
        }
        items.forEach(item => item.classList.remove("counting"));
        await speakAndWait(`${state.bundles} tens and ${state.loose} ones make ${numberWords(state.order)}. Thank you!`);
        createCelebration();
        setPrompt(`${state.bundles} tens and ${state.loose} ones make ${state.order}. Delivery complete!`);
        nextOrderButton.classList.remove("hidden");
        $("#deliverButton").disabled = true;
        state.busy = false;
    }

    function createCelebration() {
        for (let index = 0; index < 18; index += 1) {
            const sparkle = document.createElement("i");
            sparkle.className = "bundle-sparkle";
            sparkle.textContent = ["✨", "⭐", "🔟", "🎁"][index % 4];
            sparkle.style.setProperty("--x", `${15 + Math.random() * 72}%`);
            sparkle.style.setProperty("--delay", `${Math.random() * .28}s`);
            scene.append(sparkle);
            setTimeout(() => sparkle.remove(), 1400);
        }
    }

    function startOrder({ announce = true } = {}) {
        window.speechSynthesis?.cancel();
        state.order = logic.makeOrder(state.mode);
        const initial = logic.initialPacking(state.mode, state.order);
        state.bundles = initial.bundles;
        state.loose = initial.loose;
        state.bundleStock = 5;
        state.looseStock = 10;
        state.busy = false;
        state.delivered = false;
        nextOrderButton.classList.add("hidden");
        $("#deliverButton").disabled = false;
        renderSupply();
        renderPacked();
        renderGuides();
        updateStatus();
        if (initial.regroup) setPrompt("This order has ten ones ready to regroup. Tie them into one bundle!");
        else setPrompt(state.mode === "simple" ? `Pack ${logic.digitsFor(state.order).tens} bundles and ${logic.digitsFor(state.order).ones} loose sticks.` : "Pack the order, then press Deliver.");
        if (announce) speak(orderSpeech());
    }

    function startGame() {
        state.mode = selectedMode();
        state.round = 1;
        modePanel.classList.add("hidden");
        gamePanel.classList.remove("hidden");
        startOrder({ announce:true });
        if (state.mode === "simple" && !state.demoShown) {
            state.demoShown = true;
            demoOverlay.classList.remove("hidden");
        }
    }

    $("#startButton").addEventListener("click", startGame);
    $("#speakerButton").addEventListener("click", () => speak(orderSpeech()));
    $("#hintButton").addEventListener("click", hint);
    $("#bundleTenButton").addEventListener("click", bundleTen);
    $("#deliverButton").addEventListener("click", deliver);
    $("#nextOrderButton").addEventListener("click", () => { state.round += 1; startOrder({ announce:true }); });
    $("#resetButton").addEventListener("click", () => { state.round = 1; startOrder({ announce:true }); });
    $("#changeModeButton").addEventListener("click", () => { window.speechSynthesis?.cancel(); gamePanel.classList.add("hidden"); modePanel.classList.remove("hidden"); });
    $("#closeDemoButton").addEventListener("click", () => { demoOverlay.classList.add("hidden"); speak(orderSpeech()); });
})();
