(() => {
    const logic = window.VegetableStallLogic;
    const $ = selector => document.querySelector(selector);
    const modePanel = $("#modePanel");
    const gamePanel = $("#gamePanel");
    const stallScene = $("#stallScene");
    const stockLayer = $("#stockLayer");
    const basketLayer = $("#basketLayer");
    const hopLayer = $("#hopLayer");
    const answerPanel = $("#answerPanel");
    const numberCards = $("#numberCards");
    const orderCaption = $("#orderCaption");
    const answerQuestion = $("#answerQuestion");
    const feedbackBubble = $("#feedbackBubble");
    const nextOrderButton = $("#nextOrderButton");
    const packedCount = $("#packedCount");
    const roundNumber = $("#roundNumber");
    const modeName = $("#modeName");

    const state = {
        mode: "simple",
        order: null,
        packedCounts: {},
        packedItems: [],
        stock: {},
        round: 1,
        busy: false,
        answered: false
    };

    const countWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
    const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

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

    function updateStatus() {
        roundNumber.textContent = state.round;
        modeName.textContent = logic.MODE_CONFIG[state.mode].label;
        packedCount.textContent = `${logic.packedTotal(state.packedCounts)} / ${state.order.total}`;
    }

    function makeStock() {
        state.stock = Object.fromEntries(state.order.stockKinds.map(id => [id, logic.stockCount(state.order, id)]));
    }

    function setVegetableVisual(element, id) {
        element.replaceChildren();
        if (id === "cucumber") {
            const cucumber = document.createElement("span");
            cucumber.className = "whole-cucumber";
            cucumber.setAttribute("aria-hidden", "true");
            element.append(cucumber);
            return;
        }
        element.textContent = logic.vegetableById(id).emoji;
    }

    function renderStock() {
        stockLayer.replaceChildren();
        stockLayer.style.setProperty("--pile-count", state.order.stockKinds.length);
        state.order.stockKinds.forEach(id => {
            const vegetable = logic.vegetableById(id);
            const button = document.createElement("button");
            button.type = "button";
            button.className = "vegetable-button";
            button.dataset.vegetableId = id;
            button.setAttribute("aria-label", `${vegetable.singular}, ${state.stock[id]} available`);
            renderVegetablePile(button, id);
            button.addEventListener("click", () => chooseVegetable(button, id));
            stockLayer.append(button);
        });
    }

    function renderVegetablePile(button, id) {
        const vegetable = logic.vegetableById(id);
        const visibleCount = Math.min(state.stock[id], 9);
        button.replaceChildren();
        button.setAttribute("aria-label", `${vegetable.singular} pile, ${state.stock[id]} available`);
        for (let index = 0; index < visibleCount; index += 1) {
            const item = document.createElement("span");
            item.className = "pile-vegetable";
            item.dataset.pilePosition = index;
            item.setAttribute("aria-hidden", "true");
            setVegetableVisual(item, id);
            button.append(item);
        }
    }

    function packedLayout(items) {
        const rows = [[], []];
        const canSeparateParts = state.order.parts.length === 2
            && state.order.parts.every(part => items.filter(id => id === part.vegetableId).length <= 5);

        if (canSeparateParts) {
            state.order.parts.forEach((part, rowIndex) => {
                rows[rowIndex] = items
                    .map((id, originalIndex) => ({ id, originalIndex }))
                    .filter(item => item.id === part.vegetableId);
            });
        } else if (items.length <= 5) {
            rows[0] = items.map((id, originalIndex) => ({ id, originalIndex }));
        } else {
            rows[0] = items.slice(0, 5).map((id, originalIndex) => ({ id, originalIndex }));
            rows[1] = items.slice(5).map((id, index) => ({ id, originalIndex: index + 5 }));
        }

        return rows.flatMap((row, rowIndex) => {
            const firstColumn = 6 - row.length;
            return row.map((item, columnIndex) => ({
                ...item,
                row: rowIndex + 1,
                column: firstColumn + columnIndex * 2
            }));
        }).sort((a, b) => a.originalIndex - b.originalIndex);
    }

    function renderPacked() {
        basketLayer.replaceChildren();
        const layout = packedLayout(state.packedItems);
        state.packedItems.forEach((id, index) => {
            const item = document.createElement("span");
            item.className = "packed-vegetable";
            item.dataset.packedIndex = index;
            item.style.gridColumn = `${layout[index].column} / span 2`;
            item.style.gridRow = `${layout[index].row}`;
            setVegetableVisual(item, id);
            basketLayer.append(item);
        });
    }

    function updateStockButton(id) {
        const button = stockLayer.querySelector(`[data-vegetable-id="${id}"]`);
        if (!button) return;
        renderVegetablePile(button, id);
    }

    function setFeedback(message) {
        feedbackBubble.textContent = message;
    }

    async function animateHop(button, id) {
        const sceneRect = stallScene.getBoundingClientRect();
        const sourceRect = button.getBoundingClientRect();
        const basketRect = basketLayer.getBoundingClientRect();
        const targetSlot = packedLayout([...state.packedItems, id]).at(-1);
        const targetX = basketRect.left - sceneRect.left + basketRect.width * (targetSlot.column / 10 - .035);
        const targetY = basketRect.top - sceneRect.top + basketRect.height * (targetSlot.row === 1 ? .02 : .48);
        const startX = sourceRect.left - sceneRect.left + sourceRect.width * .35;
        const startY = sourceRect.top - sceneRect.top + sourceRect.height * .2;
        const hopper = document.createElement("span");
        hopper.className = "hopping-vegetable";
        setVegetableVisual(hopper, id);
        hopper.style.left = `${startX}px`;
        hopper.style.top = `${startY}px`;
        hopLayer.append(hopper);

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            hopper.remove();
            return;
        }

        const deltaX = targetX - startX;
        const deltaY = targetY - startY;
        const animation = hopper.animate([
            { transform: "translate(0, 0) scale(1) rotate(0deg)" },
            { transform: `translate(${deltaX * .5}px, ${deltaY * .5 - sceneRect.height * .14}px) scale(1.22) rotate(14deg)`, offset: .52 },
            { transform: `translate(${deltaX}px, ${deltaY}px) scale(.82) rotate(0deg)` }
        ], { duration: 620, easing: "cubic-bezier(.2,.75,.25,1)", fill: "forwards" });
        await animation.finished.catch(() => {});
        hopper.remove();
    }

    async function chooseVegetable(button, id) {
        if (state.busy || state.answered || logic.isComplete(state.order, state.packedCounts)) return;
        const active = logic.activePart(state.order, state.packedCounts);
        if (!logic.canAccept(state.order, state.packedCounts, id)) {
            button.classList.remove("wrong");
            void button.offsetWidth;
            button.classList.add("wrong");
            const requested = logic.vegetableById(active.vegetableId);
            setFeedback(`We need ${requested.plural}. Try again.`);
            speak(`We need ${requested.plural}. Try again.`);
            return;
        }

        state.busy = true;
        button.disabled = true;
        await animateHop(button, id);
        state.stock[id] -= 1;
        state.packedCounts[id] = (state.packedCounts[id] || 0) + 1;
        state.packedItems.push(id);
        renderPacked();
        updateStockButton(id);
        updateStatus();

        const groupCount = state.packedCounts[id];
        const packedVegetable = logic.vegetableById(id);
        setFeedback(`${countWords[groupCount]} ${groupCount === 1 ? packedVegetable.singular : packedVegetable.plural}`);
        speak(countWords[groupCount]);
        button.disabled = false;

        const nextPart = logic.activePart(state.order, state.packedCounts);
        if (nextPart && nextPart.vegetableId !== id) {
            const vegetable = logic.vegetableById(nextPart.vegetableId);
            await wait(650);
            setFeedback(`Great! Now pack ${nextPart.quantity} ${nextPart.quantity === 1 ? vegetable.singular : vegetable.plural}.`);
            speak(`Great! Now pack ${nextPart.quantity} ${vegetable.plural}.`);
        }

        if (logic.isComplete(state.order, state.packedCounts)) {
            await wait(550);
            showAnswers();
        }
        state.busy = false;
    }

    function showAnswers() {
        state.busy = false;
        const vegetable = logic.vegetableById(state.order.parts[0].vegetableId);
        answerQuestion.textContent = state.order.parts.length === 1
            ? `How many ${vegetable.plural} did you pack?`
            : "How many vegetables did you pack altogether?";
        numberCards.replaceChildren();
        logic.answerChoices(state.order.total).forEach(value => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "number-card";
            button.textContent = value;
            button.setAttribute("aria-label", `${value}`);
            button.addEventListener("click", () => checkAnswer(button, value));
            numberCards.append(button);
        });
        answerPanel.classList.remove("hidden");
        speak(answerQuestion.textContent);
        numberCards.querySelector("button")?.focus({ preventScroll:true });
    }

    async function checkAnswer(button, value) {
        if (state.answered || state.busy) return;
        if (value !== state.order.total) {
            button.classList.remove("wrong");
            void button.offsetWidth;
            button.classList.add("wrong");
            const originalQuestion = answerQuestion.textContent;
            answerQuestion.textContent = "Let’s count them again.";
            speak("Let's count them again.");
            await recount();
            answerQuestion.textContent = originalQuestion;
            return;
        }

        state.answered = true;
        button.classList.add("correct");
        numberCards.querySelectorAll("button").forEach(card => { card.disabled = true; });
        nextOrderButton.disabled = false;
        stallScene.classList.add("success");
        const itemName = state.order.parts.length === 1
            ? logic.vegetableById(state.order.parts[0].vegetableId).plural
            : "vegetables";
        const message = `Yes, ${countWords[state.order.total]} ${itemName}. Thank you!`;
        answerQuestion.textContent = message;
        setFeedback(message);
        speak(message);
        createCelebration();
    }

    async function recount() {
        if (state.busy || !state.packedItems.length) return;
        state.busy = true;
        const items = [...basketLayer.querySelectorAll(".packed-vegetable")];
        for (let index = 0; index < items.length; index += 1) {
            items.forEach(item => item.classList.remove("counting"));
            items[index].classList.add("counting");
            speak(countWords[index + 1]);
            await wait(720);
        }
        items.forEach(item => item.classList.remove("counting"));
        state.busy = false;
    }

    function createCelebration() {
        for (let index = 0; index < 18; index += 1) {
            const sparkle = document.createElement("i");
            sparkle.className = "stall-sparkle";
            sparkle.textContent = ["✨", "⭐", "🥕", "🍅"][index % 4];
            sparkle.style.setProperty("--x", `${20 + Math.random() * 65}%`);
            sparkle.style.setProperty("--delay", `${Math.random() * .35}s`);
            stallScene.append(sparkle);
            setTimeout(() => sparkle.remove(), 1500);
        }
    }

    function startOrder({ announce = true } = {}) {
        window.speechSynthesis?.cancel();
        state.order = logic.makeOrder(state.mode);
        state.packedCounts = {};
        state.packedItems = [];
        state.busy = false;
        state.answered = false;
        makeStock();
        renderStock();
        renderPacked();
        answerPanel.classList.add("hidden");
        stallScene.classList.remove("success");
        nextOrderButton.disabled = true;
        orderCaption.textContent = logic.orderText(state.order);
        setFeedback("Tap a vegetable to pack it.");
        updateStatus();
        if (announce) speak(orderCaption.textContent);
    }

    function startGame() {
        state.mode = selectedMode();
        state.round = 1;
        modePanel.classList.add("hidden");
        gamePanel.classList.remove("hidden");
        startOrder();
    }

    function resetGame() {
        state.round = 1;
        startOrder();
    }

    function nextOrder() {
        if (!state.answered) return;
        state.round += 1;
        startOrder();
    }

    function changeMode() {
        window.speechSynthesis?.cancel();
        gamePanel.classList.add("hidden");
        modePanel.classList.remove("hidden");
        $("#startButton").focus();
    }

    $("#startButton").addEventListener("click", startGame);
    $("#resetButton").addEventListener("click", resetGame);
    $("#changeModeButton").addEventListener("click", changeMode);
    $("#speakerButton").addEventListener("click", () => speak(orderCaption.textContent));
    $("#recountButton").addEventListener("click", recount);
    nextOrderButton.addEventListener("click", nextOrder);
    document.addEventListener("keydown", event => {
        if (gamePanel.classList.contains("hidden")) return;
        if (event.key.toLowerCase() === "h") speak(orderCaption.textContent);
        if (event.key.toLowerCase() === "n" && !nextOrderButton.disabled) nextOrder();
    });
})();
