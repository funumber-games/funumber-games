(function (root, factory) {
    const rules = factory();
    if (typeof module === "object" && module.exports) module.exports = rules;
    if (root) root.RollOrStackRules = rules;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const MODES = {
        simple: { label: "Simple", age: "Ages 3–4", levels: ["simple"] },
        moderate: { label: "Moderate", age: "Ages 4–5", levels: ["simple", "moderate"] },
        difficult: { label: "Difficult", age: "Ages 5–7", levels: ["simple", "moderate", "difficult"] }
    };

    const result = (kind, message) => ({ kind, message });
    const orientation = (id, label, glyph, roll, stack) => ({ id, label, glyph, roll, stack });

    const OBJECTS = [
        { id:"beach-ball", level:"simple", name:"Beach ball", emoji:"🏐", sprite:"beach-ball.png", color:"#ff6b6b", orientations:[orientation("round","round side","●",result("roll","The beach ball rolled down the slide!"),result("roll-off","The beach ball rolled off the block!"))] },
        { id:"wooden-cube", level:"simple", name:"Wooden cube", emoji:"🧊", color:"#d68b43", orientations:[orientation("face","flat face","■",result("slide","The wooden cube slid down the slide!"),result("stay","The wooden cube stayed steady on the block!"))] },
        { id:"tennis-ball", level:"simple", name:"Tennis ball", emoji:"🎾", color:"#b8e64a", orientations:[orientation("round","round side","●",result("roll","The tennis ball rolled down the slide!"),result("roll-off","The tennis ball rolled off the block!"))] },
        { id:"orange", level:"simple", name:"Toy orange", emoji:"🍊", color:"#ff9f1c", orientations:[orientation("round","round side","●",result("roll","The orange rolled down the slide!"),result("roll-off","The orange rolled off the block!"))] },
        { id:"gift-box", level:"simple", name:"Small gift box", emoji:"🎁", color:"#ef476f", orientations:[orientation("face","flat face","■",result("slide","The gift box slid down the slide!"),result("stay","The gift box stayed steady on the block!"))] },
        { id:"building-block", level:"simple", name:"Rectangular building block", emoji:"🧱", color:"#f1a340", orientations:[orientation("wide","wide flat face","▰",result("slide","The building block slid down the slide!"),result("stay","The building block stayed steady on the block!"))] },

        { id:"soup-can", level:"moderate", name:"Soup can", emoji:"🥫", color:"#e63946", orientations:[orientation("side","on its side","▰",result("roll","The can rolled on its round side!"),result("roll-off","The can rolled off the block!")),orientation("upright","standing upright","▮",result("slide","The upright can slid down the slide!"),result("stay","The can stayed steady on its flat end!"))] },
        { id:"tube", level:"moderate", name:"Short cardboard tube", emoji:"🧻", color:"#e8c07d", orientations:[orientation("side","on its side","▰",result("roll","The tube rolled on its round side!"),result("roll-off","The tube rolled off the block!")),orientation("upright","standing upright","▯",result("slide","The upright tube slid down the slide!"),result("stay","The tube stayed steady on its rim!"))] },
        { id:"toy-wheel", level:"moderate", name:"Toy wheel", emoji:"🛞", color:"#495057", orientations:[orientation("edge","on its edge","◉",result("roll","The wheel rolled on its edge!"),result("roll-off","The wheel rolled off the block!")),orientation("flat","laid flat","⬤",result("slide","The flat wheel slid down the slide!"),result("stay","The flat wheel stayed steady!"))] },
        { id:"ribbon-spool", level:"moderate", name:"Spool of ribbon", emoji:"🧵", color:"#9b5de5", orientations:[orientation("side","on its round rims","◉",result("roll","The spool rolled on its rims!"),result("roll-off","The spool rolled off the block!")),orientation("end","on its flat end","▮",result("slide","The spool slid on its flat end!"),result("stay","The spool stayed steady on its flat end!"))] },
        { id:"biscuit-tin", level:"moderate", name:"Round biscuit tin", emoji:"🍪", color:"#d4a373", orientations:[orientation("edge","on its edge","◉",result("roll","The tin rolled on its edge!"),result("tip","The tin tipped off the block!")),orientation("flat","laid flat","⬤",result("slide","The flat tin slid down the slide!"),result("stay","The flat tin stayed steady!"))] },
        { id:"cereal-box", level:"moderate", name:"Cereal box", emoji:"🥣", color:"#ffb703", orientations:[orientation("upright","standing tall","▮",result("slide","The cereal box slid down the slide!"),result("stay","The cereal box stayed steady on its base!")),orientation("flat","laid on its wide face","▰",result("slide","The cereal box slid on its wide face!"),result("stay","Its wider base made it very steady!"))] },
        { id:"toy-drum", level:"moderate", name:"Toy drum", emoji:"🥁", color:"#e63946", orientations:[orientation("side","on its side","▰",result("roll","The drum rolled on its round side!"),result("roll-off","The drum rolled off the block!")),orientation("upright","standing upright","▮",result("slide","The upright drum slid down the slide!"),result("stay","The drum stayed steady on its flat end!"))] },

        { id:"toy-egg", level:"difficult", name:"Toy egg", emoji:"🥚", color:"#f8f0d8", orientations:[orientation("side","on its side","⬭",result("wobble","The egg rolled with a wobble!"),result("roll-off","The egg wobbled and rolled off!")),orientation("end","balanced on its end","⬯",result("tumble","The egg tumbled down the slide!"),result("tip","The egg tipped off the block!"))] },
        { id:"die", level:"difficult", name:"Die", emoji:"🎲", color:"#f8f9fa", orientations:[orientation("face","on a flat face","⚄",result("tumble","The die tumbled down the slide!"),result("stay","The die stayed steady on its flat face!")),orientation("edge","balanced on an edge","◇",result("tumble","The die tumbled from its edge!"),result("tip","The die tipped off its edge!"))] },
        { id:"cone", level:"difficult", name:"Cone", emoji:"🔺", color:"#ff8c42", orientations:[orientation("side","on its curved side","◁",result("curve","The cone rolled in a curved path!"),result("roll-off","The cone rolled off the block!")),orientation("base","on its wide base","▲",result("slide","The cone slid on its base!"),result("stay","The cone stayed steady on its wide base!"))] },
        { id:"half-ball", level:"difficult", name:"Half-ball", emoji:"🌗", color:"#52b788", orientations:[orientation("round","rounded side down","◡",result("rock","The half-ball rocked down the slide!"),result("rock","The half-ball rocked on the block!")),orientation("flat","flat face down","◓",result("slide","The half-ball slid on its flat face!"),result("stay","The flat face stayed steady!"))] },
        { id:"wedge", level:"difficult", name:"Triangular wooden wedge", emoji:"📐", color:"#e9c46a", orientations:[orientation("broad","on its broad face","◢",result("slide","The wedge slid on its broad face!"),result("stay","The wedge stayed steady on its broad face!")),orientation("edge","balanced on an edge","△",result("tumble","The wedge tumbled down the slide!"),result("tip","The wedge tipped off its edge!"))] },
        { id:"bowling-pin", level:"difficult", name:"Toy bowling pin", emoji:"🎳", color:"#f8f9fa", orientations:[orientation("side","on its side","◁",result("uneven-roll","The bowling pin rolled unevenly!"),result("roll-off","The bowling pin rolled off the block!")),orientation("upright","standing upright","♟",result("tumble","The pin tumbled down the slide!"),result("stay","The pin stayed steady on its flat base!"))] },
        { id:"pear", level:"difficult", name:"Toy pear", emoji:"🍐", color:"#8ac926", orientations:[orientation("side","on its side","⬭",result("uneven-roll","The pear rolled unevenly!"),result("roll-off","The pear rolled off the block!")),orientation("base","on its broad flat base","♟",result("slide","The pear slid down the slide!"),result("stay","The pear stood on its broad base!"))] }
    ];

    function shuffle(items, random = Math.random) {
        const copy = [...items];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    function getObjects(mode) {
        const config = MODES[mode];
        if (!config) return [];
        return OBJECTS.filter(object => config.levels.includes(object.level));
    }

    function createDeck(mode, random = Math.random) {
        const objects = getObjects(mode);
        if (mode === "simple") {
            const ball = objects.find(object => object.id === "beach-ball");
            const cube = objects.find(object => object.id === "wooden-cube");
            return [ball, cube, ...shuffle(objects.filter(object => object !== ball && object !== cube), random)];
        }
        return shuffle(objects, random);
    }

    function supportsTurn(mode, object) {
        return mode !== "simple" && Boolean(object && object.orientations.length > 1);
    }

    function nextOrientation(mode, object, currentIndex) {
        if (!supportsTurn(mode, object)) return 0;
        return (currentIndex + 1) % object.orientations.length;
    }

    function getOutcome(object, orientationIndex, station) {
        if (!object || !["roll", "stack"].includes(station)) return null;
        const current = object.orientations[orientationIndex];
        return current ? current[station] : null;
    }

    function predictionFor(outcome, station) {
        if (!outcome) return "";
        if (station === "roll") {
            if (outcome.kind === "slide") return "Slide";
            if (outcome.kind === "tumble") return "Tumble";
            return "Roll";
        }
        if (outcome.kind === "stay") return "Stay steady";
        if (outcome.kind === "rock") return "Rock";
        return "Tip off";
    }

    function predictionOptions(station) {
        return station === "roll" ? ["Roll", "Slide", "Tumble"] : ["Stay steady", "Rock", "Tip off"];
    }

    function validateObjects() {
        return OBJECTS.every(object => object.id && object.name && object.emoji && object.orientations.length && object.orientations.every(item =>
            item.id && item.label && item.glyph && item.roll && item.stack && item.roll.message && item.stack.message
        ));
    }

    return { MODES, OBJECTS, getObjects, createDeck, supportsTurn, nextOrientation, getOutcome, predictionFor, predictionOptions, validateObjects };
});
