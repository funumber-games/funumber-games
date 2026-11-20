(function (root, factory) {
    const rules = factory();
    if (typeof module === "object" && module.exports) module.exports = rules;
    if (root) root.WordWheelsRules = rules;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const WORDS = ["CAT", "DOG", "SUN", "HAT", "MAP", "PEN", "BUS", "CUP", "RED", "FOX", "PIG", "JAM", "VAN", "BOX", "CAN", "LEG", "BED", "TOP", "WIN", "FUN", "LOG", "RUG", "BAT", "ANT", "NET", "POT", "FAN", "LID", "KEY", "TOY", "CAR", "SKY", "JET", "BAG", "FIG", "COW", "HEN", "OWL"];
    const REQUIRED_MATCHES = 4;
    const TOTAL_ROUNDS = 10;
    const WIN_BANNER_DELAY_MS = 5000;
    const DIFFICULTIES = {
        simple: { label: "Simple Mode", size: 6, seconds: 60, hint: true },
        moderate: { label: "Moderate Mode", size: 8, seconds: 60, hint: false },
        difficult: { label: "Difficult Mode", size: 9, seconds: 30, hint: false }
    };
    const DIRECTIONS = [[0,1],[1,0],[1,1],[1,-1],[0,-1],[-1,0],[-1,-1],[-1,1]];

    function randomItem(list, random) {
        return list[Math.floor(random() * list.length)];
    }

    function shuffle(list, random) {
        const result = [...list];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    function enumeratePaths(word, size) {
        const paths = [];
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                for (const [dr, dc] of DIRECTIONS) {
                    const endRow = row + dr * (word.length - 1);
                    const endCol = col + dc * (word.length - 1);
                    if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;
                    paths.push(Array.from({ length: word.length }, (_, offset) => (row + dr * offset) * size + col + dc * offset));
                }
            }
        }
        return paths;
    }

    function findMatches(grid, word, size) {
        return enumeratePaths(word, size).filter(path => path.map(index => grid[index]).join("") === word);
    }

    function chooseFourPaths(paths, random) {
        const ordered = shuffle(paths, random);
        const chosen = [];
        const occupied = new Set();
        function chooseFrom(startIndex) {
            if (chosen.length === REQUIRED_MATCHES) return true;
            for (let i = startIndex; i < ordered.length; i++) {
                const path = ordered[i];
                if (path.some(cell => occupied.has(cell))) continue;
                chosen.push(path);
                path.forEach(cell => occupied.add(cell));
                if (chooseFrom(i + 1)) return true;
                chosen.pop();
                path.forEach(cell => occupied.delete(cell));
            }
            return false;
        }
        return chooseFrom(0) ? chosen : null;
    }

    function createPuzzle(word, size, random = Math.random) {
        if (typeof word !== "string" || word.length !== 3 || !Number.isInteger(size) || size < word.length) return null;
        const paths = enumeratePaths(word, size);
        for (let attempt = 0; attempt < 400; attempt++) {
            const wordPaths = chooseFourPaths(paths, random);
            if (!wordPaths) continue;
            const letters = Array.from({ length: size * size }, () => randomItem(ALPHABET, random));
            wordPaths.forEach(path => path.forEach((cell, position) => { letters[cell] = word[position]; }));
            const exactMatches = findMatches(letters, word, size);
            if (exactMatches.length === REQUIRED_MATCHES) return { letters, matches: exactMatches };
        }
        return null;
    }

    function getCountdownValue(elapsedSeconds) {
        return Math.max(0, 10 - Math.floor(Math.max(0, elapsedSeconds) / 3));
    }

    function scorePath(cells, path) {
        return path.reduce((sum, index) => sum + Number(cells[index]?.value || 0), 0);
    }

    function isStraightLinePath(path, size) {
        if (!Array.isArray(path) || path.length < 2 || !Number.isInteger(size) || size < 1) return false;
        if (path.some(index => !Number.isInteger(index) || index < 0 || index >= size * size)) return false;
        const row = index => Math.floor(index / size);
        const column = index => index % size;
        const rowStep = row(path[1]) - row(path[0]);
        const columnStep = column(path[1]) - column(path[0]);
        if (Math.max(Math.abs(rowStep), Math.abs(columnStep)) !== 1) return false;
        return path.every((index, position) =>
            row(index) === row(path[0]) + rowStep * position &&
            column(index) === column(path[0]) + columnStep * position
        );
    }

    function findWordAlongDrag(cells, word, startIndex, deltaX, deltaY, size) {
        if (!Array.isArray(cells) || typeof word !== "string" || !word.length || !Number.isInteger(startIndex) ||
            startIndex < 0 || startIndex >= size * size || Math.hypot(deltaX, deltaY) < 1) return null;

        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        let rowStep;
        let columnStep;
        if (absX >= absY * 2.414) {
            rowStep = 0;
            columnStep = Math.sign(deltaX);
        } else if (absY >= absX * 2.414) {
            rowStep = Math.sign(deltaY);
            columnStep = 0;
        } else {
            rowStep = Math.sign(deltaY);
            columnStep = Math.sign(deltaX);
        }

        const startRow = Math.floor(startIndex / size);
        const startColumn = startIndex % size;
        const half = Math.floor(word.length / 2);
        for (let offset = -half; offset <= half; offset++) {
            const firstRow = startRow + rowStep * offset;
            const firstColumn = startColumn + columnStep * offset;
            const endRow = firstRow + rowStep * (word.length - 1);
            const endColumn = firstColumn + columnStep * (word.length - 1);
            if (firstRow < 0 || firstRow >= size || firstColumn < 0 || firstColumn >= size ||
                endRow < 0 || endRow >= size || endColumn < 0 || endColumn >= size) continue;
            const path = Array.from({ length: word.length }, (_, position) =>
                (firstRow + rowStep * position) * size + firstColumn + columnStep * position);
            const letters = path.map(index => cells[index]?.letter ?? cells[index]).join("");
            if (letters === word) return path;
            const reversed = [...path].reverse();
            if (reversed.map(index => cells[index]?.letter ?? cells[index]).join("") === word) return reversed;
        }
        return null;
    }

    function shouldContinueAfterTimeout(foundCount) {
        return Number(foundCount) >= 2;
    }

    function getRoundCompletion(round, foundCount, totalRounds = TOTAL_ROUNDS) {
        if (!shouldContinueAfterTimeout(foundCount)) return "loss";
        return Number(round) >= Number(totalRounds) ? "win" : "continue";
    }

    return {
        ALPHABET,
        WORDS,
        REQUIRED_MATCHES,
        TOTAL_ROUNDS,
        WIN_BANNER_DELAY_MS,
        DIFFICULTIES,
        enumeratePaths,
        findMatches,
        createPuzzle,
        getCountdownValue,
        scorePath,
        isStraightLinePath,
        findWordAlongDrag,
        shouldContinueAfterTimeout,
        getRoundCompletion
    };
});
