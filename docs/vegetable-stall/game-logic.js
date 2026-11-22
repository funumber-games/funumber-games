(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    root.VegetableStallLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const VEGETABLES = [
        { id: "carrot", singular: "carrot", plural: "carrots", emoji: "🥕" },
        { id: "tomato", singular: "tomato", plural: "tomatoes", emoji: "🍅" },
        { id: "pepper", singular: "bell pepper", plural: "bell peppers", emoji: "🫑" },
        { id: "cabbage", singular: "cabbage", plural: "cabbages", emoji: "🥬" },
        { id: "cauliflower", singular: "cauliflower", plural: "cauliflowers", emoji: "🥦" },
        { id: "eggplant", singular: "eggplant", plural: "eggplants", emoji: "🍆" },
        { id: "potato", singular: "potato", plural: "potatoes", emoji: "🥔" },
        { id: "onion", singular: "onion", plural: "onions", emoji: "🧅" },
        { id: "corn", singular: "corn cob", plural: "corn cobs", emoji: "🌽" }
    ];

    const MODE_CONFIG = {
        simple: { label: "Simple", max: 5, kinds: 1, parts: 1 },
        moderate: { label: "Moderate", max: 9, kinds: 3, parts: 1 },
        difficult: { label: "Difficult", max: 9, kinds: 4, parts: 2 }
    };

    const clampIndex = (length, rng) => Math.min(length - 1, Math.floor(rng() * length));
    const randomInt = (min, max, rng) => min + Math.floor(rng() * (max - min + 1));

    function shuffled(values, rng = Math.random) {
        const result = [...values];
        for (let index = result.length - 1; index > 0; index -= 1) {
            const other = Math.floor(rng() * (index + 1));
            [result[index], result[other]] = [result[other], result[index]];
        }
        return result;
    }

    function vegetableById(id) {
        return VEGETABLES.find(item => item.id === id);
    }

    function quantityWords(quantity, vegetable) {
        return `${quantity} ${quantity === 1 ? vegetable.singular : vegetable.plural}`;
    }

    function makeOrder(mode, rng = Math.random) {
        const config = MODE_CONFIG[mode] || MODE_CONFIG.simple;
        const pool = shuffled(VEGETABLES, rng);
        let parts;

        if (config.parts === 1) {
            const quantity = randomInt(1, config.max, rng);
            parts = [{ vegetableId: pool[0].id, quantity }];
        } else {
            const firstQuantity = randomInt(1, Math.min(5, config.max - 1), rng);
            const secondQuantity = randomInt(1, config.max - firstQuantity, rng);
            parts = [
                { vegetableId: pool[0].id, quantity: firstQuantity },
                { vegetableId: pool[1].id, quantity: secondQuantity }
            ];
        }

        const total = parts.reduce((sum, part) => sum + part.quantity, 0);
        const stockKinds = VEGETABLES.map(item => item.id);

        return { mode, parts, total, stockKinds };
    }

    function orderText(order) {
        const phrases = order.parts.map(part => quantityWords(part.quantity, vegetableById(part.vegetableId)));
        if (phrases.length === 1) return `${phrases[0]}, please!`;
        return `${phrases[0]} and ${phrases[1]}, please!`;
    }

    function activePart(order, packedCounts) {
        return order.parts.find(part => (packedCounts[part.vegetableId] || 0) < part.quantity) || null;
    }

    function canAccept(order, packedCounts, vegetableId) {
        const part = activePart(order, packedCounts);
        if (!part) return false;
        return part.vegetableId === vegetableId && (packedCounts[vegetableId] || 0) < part.quantity;
    }

    function isComplete(order, packedCounts) {
        return order.parts.every(part => (packedCounts[part.vegetableId] || 0) === part.quantity);
    }

    function packedTotal(packedCounts) {
        return Object.values(packedCounts).reduce((sum, count) => sum + count, 0);
    }

    function answerChoices(total, rng = Math.random) {
        const candidates = [];
        for (let value = 1; value <= 9; value += 1) {
            if (value !== total) candidates.push(value);
        }
        const distractors = shuffled(candidates, rng)
            .sort((a, b) => Math.abs(a - total) - Math.abs(b - total))
            .slice(0, 2);
        return shuffled([total, ...distractors], rng);
    }

    function stockCount(order, vegetableId) {
        const requested = order.parts.find(part => part.vegetableId === vegetableId);
        if (requested) return Math.min(12, requested.quantity + 4);
        return 5;
    }

    function transferOne(stock, packedCounts, vegetableId) {
        if ((stock[vegetableId] || 0) < 1) return null;
        return {
            stock: { ...stock, [vegetableId]: stock[vegetableId] - 1 },
            packedCounts: { ...packedCounts, [vegetableId]: (packedCounts[vegetableId] || 0) + 1 }
        };
    }

    function shouldHighlightBasket(mode, activeVegetableId, basketVegetableId) {
        return mode !== "difficult" && activeVegetableId === basketVegetableId;
    }

    return {
        VEGETABLES,
        MODE_CONFIG,
        vegetableById,
        makeOrder,
        orderText,
        activePart,
        canAccept,
        isComplete,
        packedTotal,
        answerChoices,
        stockCount,
        transferOne,
        shouldHighlightBasket,
        shuffled,
        randomInt,
        clampIndex
    };
});
