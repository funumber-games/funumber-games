(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    root.BundleDeliveryLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const MODE_CONFIG = {
        simple: { label: "Simple", min: 21, max: 49 },
        moderate: { label: "Moderate", min: 21, max: 99 },
        difficult: { label: "Difficult", min: 21, max: 99 }
    };

    function digitsFor(number) {
        const value = Math.max(0, Math.floor(Number(number) || 0));
        return { tens: Math.floor(value / 10), ones: value % 10 };
    }

    function packedValue(bundles, loose) {
        return Math.max(0, bundles) * 10 + Math.max(0, loose);
    }

    function makeOrder(mode, rng = Math.random) {
        const config = MODE_CONFIG[mode] || MODE_CONFIG.simple;
        return config.min + Math.floor(rng() * (config.max - config.min + 1));
    }

    function validatePacking(order, bundles, loose) {
        const target = digitsFor(order);
        return target.tens === bundles && target.ones === loose;
    }

    function packingHint(order, bundles, loose) {
        const target = digitsFor(order);
        const bundleGap = target.tens - bundles;
        const looseGap = target.ones - loose;
        if (bundleGap > 0) return `Add ${bundleGap === 1 ? "one more bundle" : `${bundleGap} more bundles`}.`;
        if (bundleGap < 0) return `Take out ${bundleGap === -1 ? "one bundle" : `${Math.abs(bundleGap)} bundles`}.`;
        if (looseGap > 0) return `Add ${looseGap === 1 ? "one more loose pencil" : `${looseGap} more loose pencils`}.`;
        if (looseGap < 0) return `Take out ${looseGap === -1 ? "one loose pencil" : `${Math.abs(looseGap)} loose pencils`}.`;
        return "The order is ready to deliver!";
    }

    function canBundleTen(loose) {
        return loose === 10;
    }

    function bundleTen(bundles, loose) {
        if (!canBundleTen(loose)) return { bundles, loose, changed: false };
        return { bundles: bundles + 1, loose: 0, changed: true };
    }

    function countSequence(order) {
        const { tens, ones } = digitsFor(order);
        return countPackedPencils(tens, ones);
    }

    function countPackedPencils(tens, ones) {
        const values = [];
        for (let value = 1; value <= tens; value += 1) values.push(value * 10);
        for (let value = 1; value <= ones; value += 1) values.push(tens * 10 + value);
        return values;
    }

    function deliveryReply(order, bundles, loose) {
        if (validatePacking(order, bundles, loose)) return "They are correct. Thank you Mr. Jones!";
        return `They are not correct. Please fix the order. ${packingHint(order, bundles, loose)}`;
    }

    function initialPacking(mode, order, rng = Math.random) {
        if (mode !== "difficult") return { bundles: 0, loose: 0, regroup: false };
        const target = digitsFor(order);
        if (target.tens >= 6 && rng() < 0.4) return { bundles: target.tens - 1, loose: 10, regroup: true };
        return {
            bundles: Math.floor(rng() * Math.max(1, target.tens)),
            loose: Math.floor(rng() * Math.max(1, target.ones + 1)),
            regroup: false
        };
    }

    return { MODE_CONFIG, digitsFor, packedValue, makeOrder, validatePacking, packingHint, canBundleTen, bundleTen, countSequence, countPackedPencils, deliveryReply, initialPacking };
});
