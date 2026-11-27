(function (root, factory) {
    const rules = factory();
    if (typeof module === "object" && module.exports) module.exports = rules;
    if (root) root.GameRules = rules;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    function getWheelNumber(rotation, count) {
        const sectionAngle = 360 / count;
        const arrowAngle = ((-rotation % 360) + 360) % 360;
        return Math.floor(arrowAngle / sectionAngle) + 1;
    }

    function getWheelLabelPosition(index, count, radiusPercent = 38) {
        const sectionAngle = 360 / count;
        const angle = index * sectionAngle + sectionAngle / 2;
        const radians = angle * Math.PI / 180;
        return {
            left: 50 + radiusPercent * Math.sin(radians),
            top: 50 - radiusPercent * Math.cos(radians)
        };
    }

    function updateMatchStreak(currentCount, event) {
        if (event === "spin") return { count: 0, announcement: "" };
        const count = currentCount + 1;
        const announcement = {
            3: "Nice Job!",
            5: "Good Spot!! Very Nice!!",
            7: "Rocking Performance! Keep Going!"
        }[count] || "";
        return { count, announcement };
    }

    function getCombinedMatchAnnouncement(streakAnnouncement, blockEmptied) {
        if (!blockEmptied) return streakAnnouncement;
        if (!streakAnnouncement || streakAnnouncement === "Nice Job!") return "Nice Job!";
        return `Nice Job! ${streakAnnouncement}`;
    }

    function getBlockConfettiColor(blockColor) {
        return blockColor;
    }

    function getCelebrationTimings() {
        return { niceJobMs: 1100, finalDelayMs: 1150 };
    }

    function inSameBlock(row, column, startRow, startColumn, blockSize) {
        return Math.floor(row / blockSize) === Math.floor(startRow / blockSize) &&
            Math.floor(column / blockSize) === Math.floor(startColumn / blockSize);
    }

    function canPlaceNumber(board, row, column, number, blockSize = 3) {
        if (!board[row] || board[row][column] !== null && board[row][column] !== "") return false;
        return [[row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]]
            .some(([r, c]) => board[r] && inSameBlock(r, c, row, column, blockSize) &&
                String(board[r][c] ?? "") === String(number));
    }

    function findConnectedGroup(board, startRow, startColumn, number, blockSize = 3) {
        const pending = [[startRow, startColumn]];
        const visited = new Set();
        const matches = [];
        while (pending.length) {
            const [row, column] = pending.pop();
            const key = `${row},${column}`;
            if (visited.has(key)) continue;
            visited.add(key);
            if (!board[row] || String(board[row][column] ?? "") !== String(number) ||
                !inSameBlock(row, column, startRow, startColumn, blockSize)) continue;
            matches.push({ row, column });
            pending.push([row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]);
        }
        return matches;
    }

    // Return the extra blank cells needed to complete the number's group.
    // A null result means there is not enough connected empty space, so callers
    // should keep only the player's placement and avoid a partial auto-fill.
    function getAutoFillCells(board, startRow, startColumn, number, blockSize = 3) {
        const group = findConnectedGroup(board, startRow, startColumn, number, blockSize);
        const needed = Math.max(0, Number(number) - group.length);
        if (needed === 0) return [];

        const pending = [];
        const visited = new Set();
        const cells = [];
        const addNeighbors = (row, column) => {
            for (const [nextRow, nextColumn] of [
                [row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]
            ]) {
                const key = `${nextRow},${nextColumn}`;
                if (visited.has(key)) continue;
                visited.add(key);
                if (board[nextRow] && inSameBlock(nextRow, nextColumn, startRow, startColumn, blockSize) &&
                    (board[nextRow][nextColumn] === null || board[nextRow][nextColumn] === "")) {
                    pending.push([nextRow, nextColumn]);
                }
            }
        };

        group.forEach(({ row, column }) => addNeighbors(row, column));
        while (pending.length && cells.length < needed) {
            const [row, column] = pending.shift();
            cells.push({ row, column });
            addNeighbors(row, column);
        }
        return cells.length === needed ? cells : null;
    }

    function reduceToSingleDigit(value) {
        let result = Math.abs(Number(value));
        if (!Number.isFinite(result)) return null;
        while (result >= 10) {
            result = String(result).split("").reduce((sum, digit) => sum + Number(digit), 0);
        }
        return result;
    }

    function calculateRawOperationResult(operator, first, second) {
        const a = Number(first);
        const b = Number(second);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
        let result;
        switch (operator) {
            case "+": result = a + b; break;
            case "-": result = a - b; break;
            // Comparisons return the smaller or larger operand as a table number.
            case "<": result = Math.min(a, b); break;
            case ">": result = Math.max(a, b); break;
            case "*": result = a * b; break;
            case "/":
                if (b === 0 || a % b !== 0) return null;
                result = a / b;
                break;
            default: return null;
        }
        return result;
    }

    function getDigitReductionSteps(value) {
        let current = Math.abs(Number(value));
        if (!Number.isFinite(current)) return [];
        const steps = [];
        while (current >= 10) {
            const digits = String(current).split("").map(Number);
            const result = digits.reduce((sum, digit) => sum + digit, 0);
            steps.push({ value: current, digits, result });
            current = result;
        }
        return steps;
    }

    function calculateOperationResult(operator, first, second) {
        const rawResult = calculateRawOperationResult(operator, first, second);
        return rawResult === null ? null : reduceToSingleDigit(rawResult);
    }

    function getOppositeSectorIndices(rotation, count = 10) {
        if (count % 2 !== 0) throw new Error("Opposing arrows require an even number of sectors");
        const first = getWheelNumber(rotation, count) - 1;
        return [first, (first + count / 2) % count];
    }

    function createNumberWheelValues(rotation, operator, maxAnswer = 9, random = Math.random, count = 10) {
        const values = Array.from({ length: count }, () => Math.floor(random() * 9) + 1);
        const selectedIndices = getOppositeSectorIndices(rotation, count);
        const validPairs = [];
        for (let first = 1; first <= 9; first++) {
            for (let second = 1; second <= 9; second++) {
                if (operator === "-" && first <= second) continue;
                const result = calculateOperationResult(operator, first, second);
                if (result !== null && result >= 1 && result <= maxAnswer) validPairs.push({ first, second });
            }
        }
        if (!validPairs.length) throw new Error(`No number pairs produce a result from 1 to ${maxAnswer}`);
        const pair = validPairs[Math.floor(random() * validPairs.length)];
        values[selectedIndices[0]] = pair.first;
        values[selectedIndices[1]] = pair.second;
        return { values, selectedIndices };
    }

    function canPlaceFromCurrentSpin(pairReady, isAnimating, isClearing, gameIsOver) {
        return pairReady && !isAnimating && !isClearing && !gameIsOver;
    }

    function canSpinMathNumberWheel(roundActive, operatorSelected, operatorAnimating, numbersAnimating, numbersSpun, isClearing, gameIsOver) {
        return roundActive && operatorSelected && !operatorAnimating && !numbersAnimating &&
            !numbersSpun && !isClearing && !gameIsOver;
    }

    function getMathSpinOperations(mode) {
        const basic = ["+", "-", "<", ">"];
        return mode === "difficult" ? [...basic, "*", "/"] : basic;
    }

    function getMathSpinAnswerLimit(mode) {
        return mode === "difficult" ? 9 : 6;
    }

    return {
        getWheelNumber,
        getWheelLabelPosition,
        updateMatchStreak,
        getCombinedMatchAnnouncement,
        getBlockConfettiColor,
        getCelebrationTimings,
        canPlaceNumber,
        findConnectedGroup,
        getAutoFillCells,
        shouldClearGroup: (groupSize, number) => groupSize >= Number(number),
        hasReachedSpinLimit: (spins, limit) => spins >= limit,
        getNextSpinStreak: (streak, numbersCleared) => numbersCleared ? 0 : streak,
        reduceToSingleDigit,
        calculateRawOperationResult,
        getDigitReductionSteps,
        calculateOperationResult,
        getOppositeSectorIndices,
        createNumberWheelValues,
        canPlaceFromCurrentSpin,
        canSpinMathNumberWheel,
        getMathSpinOperations,
        getMathSpinAnswerLimit
    };
});
