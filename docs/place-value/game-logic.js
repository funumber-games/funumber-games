(function (root) {
    const placeValues = { hundreds: 100, tens: 10, ones: 1 };
    const towerValue = (place, count) => placeValues[place] * count;
    const towerSpeech = (place, count) => `${count} times ${placeValues[place]} is ${towerValue(place, count)}.`;
    const towerCounts = number => ({
        hundreds: Math.floor(number / 100),
        tens: Math.floor(number / 10) % 10,
        ones: number % 10
    });
    const matchesNumber = (value, target) => /^[1-9]\d{2}$/.test(value) && Number(value) === target;

    function makeSwapChallenge(number) {
        const digits = String(number).split("").map(Number);
        // Prefer adjacent places and keep the result a three-digit number.
        for (const [left, right] of [[0, 1], [1, 2], [0, 2]]) {
            if (digits[left] === digits[right] || (left === 0 && digits[right] === 0)) continue;
            const swappedDigits = [...digits];
            [swappedDigits[left], swappedDigits[right]] = [digits[right], digits[left]];
            return {
                answer: Number(swappedDigits.join("")),
                left,
                right,
                digit: digits[left],
                from: digits[left] * 10 ** (2 - left),
                to: digits[left] * 10 ** (2 - right)
            };
        }
        return null;
    }

    function createSpeechQueue(synthesis, makeLine) {
        let tail = Promise.resolve();
        let generation = 0;
        let finishCurrent;

        function say(text) {
            if (!text || !synthesis) return Promise.resolve();
            const queuedGeneration = generation;
            tail = tail.then(() => {
                if (queuedGeneration !== generation) return;
                return new Promise(resolve => {
                    const line = makeLine(text);
                    const finish = () => {
                        clearTimeout(timeout);
                        if (finishCurrent === finish) finishCurrent = undefined;
                        resolve();
                    };
                    const timeout = setTimeout(() => {
                        finish();
                        synthesis.cancel();
                    }, 5000 + text.length * 150);
                    finishCurrent = finish;
                    line.onend = line.onerror = finish;
                    try {
                        synthesis.speak(line);
                    } catch {
                        finish();
                    }
                });
            });
            return tail;
        }

        function stop() {
            generation++;
            finishCurrent?.();
            synthesis?.cancel();
            tail = Promise.resolve();
        }

        return { say, stop, whenIdle: () => tail };
    }

    const api = { towerValue, towerSpeech, towerCounts, matchesNumber, makeSwapChallenge, createSpeechQueue };
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.PlaceValueLogic = api;
})(globalThis);
