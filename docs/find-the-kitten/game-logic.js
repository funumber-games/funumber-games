(function (root, factory) {
    const api = factory();
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    root.FindKittenRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const MODES = {
        simple: { label: "Simple", digits: [1, 2, 3, 4, 5], steps: 1, visible: false },
        moderate: { label: "Moderate", digits: [1, 2, 3, 4, 5, 6, 7, 8, 9], steps: 1, visible: false },
        difficult: { label: "Difficult", digits: [1, 2, 3, 4, 5, 6, 7, 8, 9], steps: 2, visible: false }
    };

    const point = (name, x, y, width, height, clue, motion = "wobble", anchorX = x, anchorY = y) => ({ name, x, y, width, height, clue, motion, anchorX, anchorY });

    const SCENES = {
        circus: {
            name: "Circus Backstage", image: "scenes/circus-backstage.png", emoji: "🎪",
            locations: [
                point("empty chest", 72, 47, 18, 27, "Look in the empty chest", "lift"),
                point("drum", 14, 45, 18, 27, "Find it on the drum"),
                point("space beneath the blue hat", 38, 27, 9, 8, "Look beneath the blue hat", "tip", 42, 17),
                point("space next to the purple hat", 65, 17, 11, 13, "Look next to the purple hat", "tip", 55, 17),
                point("space above the party hat", 46, 27, 8, 8, "Look above the party hat", "wobble", 42, 34),
                point("space under the green hat", 56, 45, 12, 10, "Look under the green hat", "tip", 56, 35),
                point("red stool", 35, 68, 15, 11, "Look on the red stool"),
                point("space next to the beach ball", 80, 65, 10, 16, "Look next to the beach ball", "roll", 89, 65),
                point("left ball basket", 54, 82, 14, 18, "Look in the basket of balls"),
                point("space between the two baskets", 67, 83, 8, 16, "Look between the two baskets")
            ]
        },
        kitchen: {
            name: "Kitchen", image: "scenes/kitchen.png", emoji: "🥣",
            locations: [
                point("empty basket", 89, 76, 17, 28, "Look in the empty basket", "rock"),
                point("blue bowl", 30, 55, 14, 13, "Look in the blue bowl", "rock"),
                point("spotty cup", 50, 56, 13, 18, "Look in the spotty cup", "rock"),
                point("white plate", 69, 56, 19, 15, "Look on the white plate", "rock"),
                point("space beneath the red pot", 36, 27, 11, 9, "Look beneath the red pot", "wobble", 36, 15),
                point("space next to the yellow pot", 43, 15, 9, 12, "Look next to the yellow pot", "wobble", 51, 15),
                point("spoon jar", 14, 34, 14, 23, "Look in the spoon jar"),
                point("space under the table", 49, 76, 30, 13, "Look under the table", "wobble", 49, 61),
                point("space above the flower pot", 90, 27, 11, 11, "Look above the flower pot", "wobble", 90, 36),
                point("space between the bowl and the cup", 40, 55, 8, 11, "Look between the bowl and the cup")
            ]
        },
        vegetables: {
            name: "Vegetable Stall", image: "scenes/vegetable-stall.png", emoji: "🥕",
            locations: [
                point("empty crate", 24, 78, 18, 17, "Look in the empty crate", "lift"),
                point("carrot crate", 22, 50, 18, 16, "Look in the carrot crate"),
                point("tomato crate", 50, 50, 18, 16, "Look in the tomato crate"),
                point("cabbage crate", 75, 50, 18, 16, "Look in the cabbage crate"),
                point("space beneath the red jar", 44, 31, 10, 8, "Look beneath the red jar", "wobble", 44, 22),
                point("space next to the yellow jar", 66, 22, 10, 12, "Look next to the yellow jar", "wobble", 56, 22),
                point("tomato basket", 52, 84, 18, 25, "Look in the basket of tomatoes"),
                point("blue stool", 76, 72, 15, 10, "Look on the blue stool"),
                point("space above the flower pot", 7, 70, 10, 12, "Look above the flower pot", "wobble", 7, 84),
                point("space between the two jars", 51, 22, 8, 12, "Look between the two jars")
            ]
        },
        music: {
            name: "Music Room", image: "scenes/music-room.png", emoji: "🎵",
            locations: [
                point("empty music stand", 88, 39, 14, 17, "Look on the empty music stand", "tip"),
                point("drum", 14, 42, 16, 17, "Look on the drum"),
                point("space beneath the red maraca", 44, 28, 10, 8, "Look beneath the red maraca", "roll", 44, 18),
                point("space next to the green maraca", 64, 18, 10, 12, "Look next to the green maraca", "roll", 53, 18),
                point("keyboard", 66, 43, 23, 12, "Look on the keyboard"),
                point("space under the blue stool", 48, 82, 14, 12, "Look under the blue stool", "wobble", 48, 67),
                point("tambourine basket", 29, 72, 15, 18, "Look in the tambourine basket", "wobble"),
                point("space above the wooden shelf", 50, 12, 24, 8, "Look above the wooden shelf", "wobble", 50, 24),
                point("space under the red rug", 51, 96, 20, 8, "Look under the red rug", "lift", 51, 88),
                point("space between the two maracas", 49, 18, 7, 11, "Look between the two maracas")
            ]
        },
        grocery: {
            name: "Grocery Store", image: "scenes/grocery-store.png", emoji: "🛒",
            locations: [
                point("empty shopping basket", 40, 78, 18, 26, "Look in the empty shopping basket", "rock"),
                point("cash register", 18, 54, 20, 25, "Look on the cash register"),
                point("red jar", 54, 21, 10, 13, "Look in the red jar"),
                point("space next to the yellow jar", 62, 21, 8, 12, "Look next to the yellow jar", "wobble", 70, 21),
                point("space beneath the green jar", 90, 35, 8, 8, "Look beneath the green jar", "wobble", 86, 21),
                point("blue box", 58, 47, 13, 14, "Look on the blue box"),
                point("space between the blue and red boxes", 71, 47, 13, 14, "Look between the blue and red boxes"),
                point("space above the red box", 81, 36, 8, 8, "Look above the red box", "wobble", 85, 47),
                point("tomato bowl", 65, 67, 18, 18, "Look in the bowl of tomatoes"),
                point("space between the two milk cartons", 90, 81, 8, 18, "Look between the two milk cartons")
            ]
        },
        storeroom: {
            name: "Storeroom", image: "scenes/storeroom.png", emoji: "📦",
            locations: [
                point("empty wooden crate", 54, 78, 25, 27, "Look in the empty wooden crate", "lift"),
                point("space beneath the watering can", 32, 30, 13, 8, "Look beneath the watering can", "tip", 32, 18),
                point("space under the folded blanket", 52, 29, 14, 8, "Look under the folded blanket", "wobble", 52, 17),
                point("space next to the beach ball", 82, 18, 10, 13, "Look next to the beach ball", "roll", 72, 18),
                point("rope", 92, 30, 11, 24, "Look inside the loop of rope"),
                point("nut jar", 38, 42, 12, 14, "Look in the jar on the shelf"),
                point("blue box", 63, 42, 15, 13, "Look on the blue box"),
                point("space under the red stool", 19, 91, 15, 10, "Look under the red stool", "wobble", 19, 74),
                point("wicker basket", 82, 75, 18, 22, "Look in the wicker basket", "rock"),
                point("space between the crate and the basket", 68, 77, 9, 16, "Look between the crate and the basket")
            ]
        },
        jungle: {
            name: "Jungle Clearing", image: "scenes/jungle-clearing.png", emoji: "🌿",
            locations: [
                point("empty tree hollow", 14, 29, 13, 25, "Look in the empty tree hollow", "peek"),
                point("hollow log", 72, 42, 17, 22, "Look in the hollow log"),
                point("space beneath the red mushroom", 88, 76, 10, 10, "Look beneath the red mushroom", "wobble", 88, 64),
                point("space next to the left rock", 18, 72, 11, 18, "Look next to the left rock", "wobble", 30, 72),
                point("right rock", 72, 72, 17, 19, "Look on the right rock"),
                point("space between the two rocks", 50, 77, 10, 14, "Look between the two rocks"),
                point("space above the red flower", 92, 81, 8, 8, "Look above the red flower", "wobble", 88, 91),
                point("jungle path", 51, 89, 30, 18, "Look on the jungle path"),
                point("space under the tree branch", 52, 18, 24, 9, "Look under the tree branch", "wobble", 52, 8),
                point("space beneath the big leaf", 18, 94, 12, 8, "Look beneath the big leaf", "wobble", 12, 86)
            ]
        },
        zoo: {
            name: "Zoo Path", image: "scenes/zoo-path.png", emoji: "🦒",
            locations: [
                point("empty sign", 51, 32, 17, 17, "Look on the empty sign", "wobble"),
                point("space under the bench", 26, 80, 22, 12, "Look under the bench", "wobble", 26, 68),
                point("space next to the giraffe", 40, 28, 9, 20, "Look next to the giraffe", "peek", 31, 28),
                point("flower bed", 50, 68, 18, 15, "Look in the flower bed"),
                point("space above the stairs", 87, 32, 14, 10, "Look above the stairs", "wobble", 87, 48),
                point("space beneath the flower pot", 94, 72, 9, 11, "Look beneath the flower pot", "wobble", 94, 57),
                point("left rock", 76, 86, 17, 19, "Look on the left rock"),
                point("space next to the right rock", 96, 86, 8, 16, "Look next to the right rock", "wobble", 93, 86),
                point("space between the two rocks", 84, 86, 9, 15, "Look between the two rocks"),
                point("space below the wooden fence", 34, 58, 19, 9, "Look below the wooden fence", "wobble", 34, 47)
            ]
        }
    };

    function shuffle(items, random = Math.random) {
        const result = [...items];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    function createRound(theme, mode, random = Math.random) {
        if (!SCENES[theme] || !MODES[mode]) return null;
        return [0, ...shuffle(MODES[mode].digits, random)];
    }

    function createTurn(theme, mode, digit) {
        const scene = SCENES[theme];
        const config = MODES[mode];
        if (!scene || !config || !Number.isInteger(digit) || digit < 0 || digit > 9 || !config.digits.includes(digit) && digit !== 0) return null;
        const target = scene.locations[digit];
        if (digit === 0) {
            return {
                digit,
                targetIndex: 0,
                expected: [0],
                clues: [`${target.clue}. Find zero.`],
                announcement: `Zero. The ${target.name} is empty, so there are no objects inside.`
            };
        }
        if (mode === "simple") {
            return { digit, targetIndex: digit, expected: [digit], clues: [`Find ${digit}. ${target.clue}.`], announcement: String(digit) };
        }
        if (mode === "moderate") {
            return { digit, targetIndex: digit, expected: [digit], clues: [`${target.clue}.`], announcement: String(digit) };
        }
        const anchorIndex = digit === 9 ? 1 : digit + 1;
        const anchor = scene.locations[anchorIndex];
        return {
            digit,
            targetIndex: digit,
            expected: [anchorIndex, digit],
            clues: [`First, ${anchor.clue.toLowerCase()}.`, `Now, ${target.clue.toLowerCase()}.`],
            announcement: String(digit)
        };
    }

    function checkTap(turn, step, locationIndex) {
        if (!turn || !Number.isInteger(step) || !Number.isInteger(locationIndex)) return { correct: false, complete: false, nextStep: step };
        const correct = turn.expected[step] === locationIndex;
        return { correct, complete: correct && step === turn.expected.length - 1, nextStep: correct ? step + 1 : step };
    }

    function getRevealSequence(turn, step = 0) {
        if (!turn || !Array.isArray(turn.expected) || !Number.isInteger(step) || step < 0) return [];
        return turn.expected.slice(step);
    }

    function validateSpatialRelation(location) {
        const clue = location.clue.toLowerCase();
        if (/under|beneath|below/.test(clue)) return location.y >= location.anchorY + 3;
        if (/above/.test(clue)) return location.y <= location.anchorY - 3;
        if (/next to/.test(clue)) return Math.abs(location.x - location.anchorX) >= 3 || Math.abs(location.y - location.anchorY) >= 3;
        if (/between/.test(clue)) return /between|two/.test(location.name.toLowerCase());
        return true;
    }

    function validateScenes() {
        return Object.entries(SCENES).map(([id, scene]) => ({
            id,
            valid: scene.locations.length === 10 && scene.locations.every(location =>
                location.x - location.width / 2 >= 0 && location.x + location.width / 2 <= 100 &&
                location.y - location.height / 2 >= 0 && location.y + location.height / 2 <= 100 &&
                location.width >= 7 && location.height >= 7 && /in|inside|on|under|beneath|next to|above|below|between/i.test(location.clue) &&
                validateSpatialRelation(location)
            ) && new Set(scene.locations.map(location => `${location.x},${location.y}`)).size === 10
        }));
    }

    return { MODES, SCENES, shuffle, createRound, createTurn, checkTap, getRevealSequence, validateSpatialRelation, validateScenes };
});
