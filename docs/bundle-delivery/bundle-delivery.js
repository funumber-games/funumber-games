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
    const hopLayer = $("#hopLayer");
    const orderNumber = $("#orderNumber");
    const orderBreakdown = $("#orderBreakdown");
    const promptText = $("#promptText");
    const deliverButton = $("#deliverButton");
    const demoOverlay = $("#demoOverlay");
    const speech = window.speechSynthesis;
    speech?.getVoices();

    const bundleTrayCapacity = 10;
    const state = {
        mode: "simple",
        order: 34,
        startingPencilCount: 0,
        bundles: 0,
        loose: 0,
        bundleStock: bundleTrayCapacity,
        looseStock: 10,
        round: 1,
        busy: false,
        delivered: false,
        demoShown: false,
        orderVersion: 0
    };

    const smallWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
    const tensWords = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
    const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

    function numberWords(value) {
        if (value === 100) return "one hundred";
        if (value < 20) return smallWords[value];
        const tens = Math.floor(value / 10);
        const ones = value % 10;
        return `${tensWords[tens]}${ones ? `-${smallWords[ones]}` : ""}`;
    }

    function selectedMode() {
        return document.querySelector('input[name="mode"]:checked')?.value || "simple";
    }

    function preferredVoice(role) {
        const voices = (window.speechSynthesis?.getVoices?.() || []).filter(voice => /^en/i.test(voice.lang));
        const names = role === "lucy" ? /heera|veena|lekha|samantha|karen|moira|tessa|zira|susan/i : /rishi|daniel|aaron|alex|fred|gordon|matthew|thomas/i;
        return voices.find(voice => names.test(voice.name))
            || voices.find(voice => /^en-IN$/i.test(voice.lang))
            || voices[0];
    }

    function makeUtterance(text, role) {
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = preferredVoice(role);
        utterance.lang = voice?.lang || "en-IN";
        utterance.pitch = role === "lucy" ? 1.2 : .95;
        if (voice) utterance.voice = voice;
        return utterance;
    }

    function speak(text, role = "jones") {
        if (!("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(makeUtterance(text, role));
    }

    function speakAndWait(text, role) {
        if (!("speechSynthesis" in window)) return Promise.resolve();
        return new Promise(resolve => {
            const utterance = makeUtterance(text, role);
            const timeout = setTimeout(resolve, 2500 + text.length * 85);
            utterance.onend = utterance.onerror = () => {
                clearTimeout(timeout);
                resolve();
            };
            window.speechSynthesis.speak(utterance);
        });
    }

    const pencilHues = [0, 32, 52, 94, 139, 183, 225, 269, 309, 337];

    function makeStick(index) {
        const stick = document.createElement("span");
        stick.className = "craft-stick";
        stick.style.setProperty("--pencil-hue", `${pencilHues[index % pencilHues.length]}deg`);
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
        button.className = "supply-item";
        button.setAttribute("aria-label", kind === "bundle" ? "Pack one bundle of ten" : "Pack one loose pencil");

        if (kind === "bundle") {
            const art = document.createElement("span");
            art.className = "bundle-pile-art";
            for (let index = 0; index < count; index += 1) art.append(makeBundle());
            button.append(art);
        } else {
            const art = document.createElement("span");
            art.className = "stick-pile-art";
            art.setAttribute("aria-hidden", "true");
            for (let index = 0; index < count; index += 1) {
                art.append(makeStick(state.loose + count - 1 - index));
            }
            button.append(art);
        }

        const badge = document.createElement("strong");
        badge.className = "supply-count";
        badge.textContent = kind === "bundle" ? `${count} bundles` : `${count} pencils`;
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
        deliverButton.classList.toggle("ready", !state.delivered && logic.validatePacking(state.order, state.bundles, state.loose));
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
        button.className = "packed-item";
        button.setAttribute("aria-label", `Return this ${kind === "bundle" ? "bundle of ten" : "loose pencil"}`);
        button.append(kind === "bundle" ? makeBundle() : makeStick(index));
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
        if (state.mode !== "simple") return;
        const digits = logic.digitsFor(state.order);
        for (let index = state.bundles; index < digits.tens; index += 1) packedBundles.append(Object.assign(document.createElement("i"), { className: "guide-slot" }));
        for (let index = state.loose; index < digits.ones; index += 1) packedSticks.append(Object.assign(document.createElement("i"), { className: "guide-slot" }));
    }

    async function animateHop(source, kind, destination) {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !Element.prototype.animate) return;
        const layer = hopLayer.getBoundingClientRect();
        const sourcePiece = source.querySelector(".craft-bundle:last-child, .craft-stick:last-child");
        const from = sourcePiece.getBoundingClientRect();
        const placeholder = makePackedButton(kind, 0);
        placeholder.style.visibility = "hidden";
        const guide = destination.querySelector(".guide-slot");
        if (guide) guide.replaceWith(placeholder);
        else destination.append(placeholder);
        const to = placeholder.firstElementChild.getBoundingClientRect();
        const item = document.createElement("span");
        item.className = "hopping-item";
        item.append(kind === "bundle" ? makeBundle() : makeStick(state.loose));
        item.style.left = `${from.left - layer.left + (from.width - sourcePiece.offsetWidth) / 2}px`;
        item.style.top = `${from.top - layer.top + (from.height - sourcePiece.offsetHeight) / 2}px`;
        hopLayer.append(item);
        sourcePiece.style.visibility = "hidden";
        const dx = to.left - from.left;
        const dy = to.top - from.top;
        const animation = item.animate([
            { transform:"translate(0,0)" },
            { transform:`translate(${dx * .5}px,${dy * .5 - layer.height * .13}px)`, offset:.52 },
            { transform:`translate(${dx}px,${dy}px)` }
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
        if (kind === "stick" && state.loose >= 10) return setPrompt("The Ones compartment is full. Return a pencil before adding another.", true);
        state.busy = true;
        source.disabled = true;
        await animateHop(source, kind, kind === "bundle" ? packedBundles : packedSticks);
        if (!source.isConnected || gamePanel.classList.contains("hidden")) return;
        if (kind === "bundle") {
            state.bundles += 1;
            state.bundleStock -= 1;
            if (state.bundleStock === 0) state.bundleStock = bundleTrayCapacity;
        } else {
            state.loose += 1;
            state.looseStock -= 1;
            if (state.looseStock === 0) state.looseStock = 10;
        }
        state.busy = false;
        renderSupply();
        renderPacked();
        renderGuides();
        updateStatus();
        if (state.mode === "difficult" && logic.canBundleTen(state.loose) && state.bundles < 9) {
            await bundleTen();
            return;
        }
        showPackingStatus();
    }

    function returnItem(kind) {
        if (state.busy || state.delivered) return;
        if (kind === "bundle" && state.bundles > 0) {
            state.bundles -= 1;
            state.bundleStock = Math.min(bundleTrayCapacity, state.bundleStock + 1);
        }
        if (kind === "stick" && state.loose > 0) {
            state.loose -= 1;
            state.looseStock = Math.min(10, state.looseStock + 1);
        }
        renderSupply();
        renderPacked();
        renderGuides();
        updateStatus();
        showPackingStatus();
    }

    function showPackingStatus() {
        setPrompt(logic.validatePacking(state.order, state.bundles, state.loose) ? "Ready to deliver!" : "");
    }

    async function bundleTen() {
        if (state.busy || state.delivered) return;
        const result = logic.bundleTen(state.bundles, state.loose);
        if (!result.changed) return setPrompt("You need exactly ten loose pencils to make a bundle.", true);
        state.busy = true;
        const packedStick = packedSticks.firstElementChild;
        packedSticks.classList.add("regrouping");
        await wait(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 20 : 650);
        if (!packedStick?.isConnected || gamePanel.classList.contains("hidden")) return;
        state.bundles = result.bundles;
        state.loose = result.loose;
        state.busy = false;
        packedSticks.classList.remove("regrouping");
        renderPacked();
        updateStatus();
        speak("Ten ones became one ten. The total stayed the same!");
        showPackingStatus();
    }

    function orderSpeech() {
        if (state.mode === "difficult" && state.startingPencilCount > 0) {
            return `I need ${numberWords(state.order)} colour pencils to distribute, and I could find only ${numberWords(state.startingPencilCount)}. Please help me with the rest of the pencils.`;
        }
        return `I want to buy ${numberWords(state.order)} colour pencils.`;
    }

    async function announceOrder() {
        if (!speech) return;
        const version = state.orderVersion;
        if (!speech.getVoices().length) {
            await new Promise(resolve => {
                const ready = () => {
                    clearTimeout(timeout);
                    speech.removeEventListener("voiceschanged", ready);
                    resolve();
                };
                const timeout = setTimeout(ready, 1000);
                speech.addEventListener("voiceschanged", ready);
                if (speech.getVoices().length) ready();
            });
        }
        if (version !== state.orderVersion) return;
        if (state.round !== 1) return speak(orderSpeech(), "lucy");
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(makeUtterance("Lucy visits the stationery shop to buy colour pencils.", "jones"));
        window.speechSynthesis.speak(makeUtterance("Hello Lucy, how can I help you today?", "jones"));
        const request = state.mode === "difficult" && state.startingPencilCount > 0
            ? orderSpeech()
            : `It's my son's birthday today, and I want to buy ${numberWords(state.order)} colour pencils to distribute in his class.`;
        window.speechSynthesis.speak(makeUtterance(`Hello, Mr. Jones. ${request}`, "lucy"));
    }

    function hint() {
        const message = state.mode === "simple"
            ? `Pack ${logic.digitsFor(state.order).tens} bundles and ${logic.digitsFor(state.order).ones} loose pencils.`
            : logic.packingHint(state.order, state.bundles, state.loose);
        setPrompt(message, true);
    }

    async function deliver() {
        if (state.busy || state.delivered) return;
        const version = state.orderVersion;
        const correct = logic.validatePacking(state.order, state.bundles, state.loose);
        const reply = logic.deliveryReply(state.order, state.bundles, state.loose);
        state.busy = true;
        deliverButton.disabled = true;
        const sequence = logic.countPackedPencils(state.bundles, state.loose);
        const items = [...scene.querySelectorAll(".packed-item")];
        window.speechSynthesis?.cancel();
        setPrompt("Here you go. Please count if they are correct.");
        await speakAndWait(promptText.textContent, "jones");
        if (version !== state.orderVersion) return;
        if (!items.length) await speakAndWait("Zero pencils.", "lucy");
        for (let index = 0; index < items.length; index += 1) {
            if (version !== state.orderVersion) return;
            items.forEach(item => item.classList.remove("counting"));
            items[index].classList.add("counting");
            await speakAndWait(numberWords(sequence[index]), "lucy");
            await wait(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 20 : 90);
        }
        if (version !== state.orderVersion) return;
        items.forEach(item => item.classList.remove("counting"));
        setPrompt(reply);
        await speakAndWait(reply, "lucy");
        if (version !== state.orderVersion) return;
        state.delivered = correct;
        if (correct) {
            createCelebration();
            deliverButton.textContent = "Next Order →";
        }
        deliverButton.disabled = false;
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
        state.orderVersion += 1;
        window.speechSynthesis?.cancel();
        packedSticks.classList.remove("regrouping");
        state.order = logic.makeOrder(state.mode);
        const initial = logic.initialPacking(state.mode, state.order);
        state.bundles = initial.bundles;
        state.loose = initial.regroup ? initial.loose - 1 : initial.loose;
        state.startingPencilCount = logic.packedValue(state.bundles, state.loose);
        state.bundleStock = bundleTrayCapacity;
        state.looseStock = 10;
        state.busy = false;
        state.delivered = false;
        deliverButton.textContent = "Deliver";
        deliverButton.disabled = false;
        renderSupply();
        renderPacked();
        renderGuides();
        updateStatus();
        if (initial.regroup) setPrompt("Add a pencil to see ten ones become one bundle.");
        else setPrompt(state.mode === "simple" ? `Pack ${logic.digitsFor(state.order).tens} bundles and ${logic.digitsFor(state.order).ones} loose pencils.` : "Pack the order, then press Deliver.");
        if (announce) announceOrder();
    }

    function startGame() {
        state.mode = selectedMode();
        state.round = 1;
        modePanel.classList.add("hidden");
        gamePanel.classList.remove("hidden");
        const showDemo = state.mode === "simple" && !state.demoShown;
        startOrder({ announce: !showDemo });
        if (showDemo) {
            state.demoShown = true;
            demoOverlay.classList.remove("hidden");
            speak($("#demoTitle").textContent);
        }
    }

    $("#startButton").addEventListener("click", startGame);
    $("#speakerButton").addEventListener("click", () => { if (!state.busy) speak(orderSpeech(), "lucy"); });
    $("#hintButton").addEventListener("click", () => { if (!state.busy) hint(); });
    deliverButton.addEventListener("click", () => {
        if (state.busy) return;
        if (!state.delivered) return deliver();
        state.round += 1;
        startOrder({ announce:true });
    });
    $("#resetButton").addEventListener("click", () => { state.round = 1; startOrder({ announce:true }); });
    $("#changeModeButton").addEventListener("click", () => { state.orderVersion += 1; window.speechSynthesis?.cancel(); gamePanel.classList.add("hidden"); modePanel.classList.remove("hidden"); });
    $("#closeDemoButton").addEventListener("click", () => { demoOverlay.classList.add("hidden"); announceOrder(); });
})();
