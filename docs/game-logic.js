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

    function calculateOperationResult(operator, first, second) {
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
        return reduceToSingleDigit(result);
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
        canPlaceNumber,
        findConnectedGroup,
        getAutoFillCells,
        shouldClearGroup: (groupSize, number) => groupSize >= Number(number),
        hasReachedSpinLimit: (spins, limit) => spins >= limit,
        getNextSpinStreak: (streak, numbersCleared) => numbersCleared ? 0 : streak,
        reduceToSingleDigit,
        calculateOperationResult,
        getOppositeSectorIndices,
        createNumberWheelValues,
        canPlaceFromCurrentSpin,
        canSpinMathNumberWheel,
        getMathSpinOperations,
        getMathSpinAnswerLimit
    };
});
