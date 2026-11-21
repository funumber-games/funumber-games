(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.BuildNumberLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const P = (id, kind, path, rotation = 0, name = kind) => ({ id, kind, path, rotation, name });
  const digits = {
    0: [P('oval', 'oval', 'M50 14 C27 14 22 34 22 50 C22 72 31 86 50 86 C69 86 78 72 78 50 C78 28 69 14 50 14 Z', 0, 'big oval')],
    1: [P('topSlant', 'line', 'M35 30 L50 18', 140, 'small slanting line'), P('stand', 'line', 'M50 18 L50 84', 90, 'standing line')],
    2: [P('topCurve', 'curve', 'M25 32 C28 12 72 10 76 32 C78 45 64 52 51 61', 0, 'upper curve'), P('slant', 'line', 'M51 61 L27 82', 135, 'slanting line'), P('base', 'line', 'M27 82 L76 82', 0, 'sleeping line')],
    3: [P('upper', 'curve', 'M28 25 C40 10 74 16 72 35 C71 47 59 49 49 50', 0, 'upper curve'), P('lower', 'curve', 'M49 50 C63 50 75 56 72 72 C68 91 38 91 26 77', 0, 'lower curve')],
    4: [P('slant', 'line', 'M58 16 L25 61', 125, 'slanting line'), P('cross', 'line', 'M25 61 L76 61', 0, 'sleeping line'), P('right', 'line', 'M61 17 L61 84', 90, 'standing line')],
    5: [P('top', 'line', 'M70 18 L31 18', 0, 'sleeping line'), P('left', 'line', 'M31 18 L29 49', 90, 'standing line'), P('curve', 'curve', 'M29 49 C62 39 76 51 72 70 C68 89 38 91 25 77', 0, 'lower curve')],
    6: [P('outer', 'curve', 'M68 18 C38 13 24 36 25 59 C26 84 44 91 61 84', 0, 'large curve'), P('loop', 'oval', 'M51 45 C31 45 26 57 27 68 C29 86 55 92 69 78 C82 65 70 45 51 45 Z', 0, 'small oval')],
    7: [P('top', 'line', 'M25 18 L76 18', 0, 'sleeping line'), P('slant', 'line', 'M76 18 L43 84', 116, 'slanting line')],
    8: [P('topLoop', 'oval', 'M50 13 C31 13 27 25 30 37 C34 51 67 51 71 37 C74 24 68 13 50 13 Z', 0, 'upper oval'), P('bottomLoop', 'oval', 'M50 48 C28 48 23 65 28 77 C35 93 67 93 73 77 C78 63 70 48 50 48 Z', 0, 'lower oval')],
    9: [P('loop', 'oval', 'M49 14 C29 14 24 29 29 41 C35 57 64 57 72 42 C80 27 69 14 49 14 Z', 0, 'upper oval'), P('right', 'line', 'M72 34 L69 84', 90, 'standing line')]
  };
  function partsFor(number) { return digits[number].map(part => ({ ...part })); }
  function isComplete(parts, placedIds) { return parts.every(part => placedIds.includes(part.id)); }
  function angleDistance(a, b) {
    const difference = Math.abs((((a - b) % 180) + 180) % 180);
    return Math.min(difference, 180 - difference);
  }
  function accepts(piece, target) {
    return !piece.extra && piece.id === target.id && piece.kind === target.kind && angleDistance(piece.rotation, target.rotation) < 1;
  }
  function orderFor(mode) { return mode === 'simple' ? [0, 1, 4, 7, 2, 3, 5, 6, 8, 9] : [0,1,2,3,4,5,6,7,8,9]; }
  function shuffledNumbers(random = Math.random, previous = null) {
    const numbers=[0,1,2,3,4,5,6,7,8,9];
    for(let index=numbers.length-1;index>0;index--){
      const swapIndex=Math.floor(random()*(index+1));
      [numbers[index],numbers[swapIndex]]=[numbers[swapIndex],numbers[index]];
    }
    if(previous!==null&&numbers[0]===previous&&numbers.length>1){
      [numbers[0],numbers[1]]=[numbers[1],numbers[0]];
    }
    return numbers;
  }
  return { digits, partsFor, isComplete, accepts, orderFor, shuffledNumbers, angleDistance };
});
