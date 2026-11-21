(function () {
  const L = window.BuildNumberLogic;
  const $ = id => document.getElementById(id);
  const state = { mode:'simple', index:0, number:0, numberDeck:[], parts:[], pieces:[], placed:new Set(), selected:null, history:[], locked:false };
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const board = $('board'), tray = $('tray'), caption = $('caption');
  const modeNames = { simple:'Simple', moderate:'Moderate', difficult:'Difficult' };
  const shapePath = { line:'M18 50 L82 50', curve:'M72 20 C30 3 18 32 18 50 C18 74 40 90 72 77', oval:'M50 14 C25 14 20 34 20 50 C20 72 31 86 50 86 C69 86 80 72 80 50 C80 28 69 14 50 14 Z' };

  function speak(text, rate=.82) {
    caption.textContent = text;
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.rate = rate; u.pitch = 1.12; speechSynthesis.speak(u);
  }
  function svgEl(name, attrs={}) { const el=document.createElementNS(SVG_NS,name); Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v)); return el; }
  function shuffled(list) { return list.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]); }
  function rotationsFor(part) {
    if (state.mode === 'simple') return part.rotation;
    const offsets = part.kind === 'oval' ? [0,90] : [0,45,90,135];
    return (part.rotation + offsets[Math.floor(Math.random()*offsets.length)]) % 180;
  }
  function makePieces(parts) {
    const pieces = parts.map((p,i)=>({...p,pieceId:`${p.id}-${i}`,targetRotation:p.rotation,rotation:rotationsFor(p)}));
    if (state.mode === 'difficult') {
      const extras=['line','curve','oval'].map((kind,i)=>({id:`extra${i}`,pieceId:`extra-${i}`,kind,path:shapePath[kind],name:`extra ${kind}`,targetRotation:0,rotation:[0,45,90,135][i],extra:true}));
      pieces.push(...extras);
    }
    if (state.mode === 'difficult') {
      const required = shuffled(pieces.filter(piece => !piece.extra));
      const extras = shuffled(pieces.filter(piece => piece.extra));
      return shuffled([...required, ...extras.slice(0, Math.max(0, 5-required.length))]);
    }
    return shuffled(pieces);
  }
  function begin(number, announce=true) {
    state.number = number; state.parts=L.partsFor(number); state.pieces=makePieces(state.parts); state.placed.clear(); state.selected=null; state.history=[]; state.locked=false;
    $('targetNumber').textContent=number; $('celebration').hidden=true;
    render();
    const prompt=`Build the number ${number}. Choose a shape.`;
    caption.textContent=prompt;
    if (announce) requestAnimationFrame(()=>requestAnimationFrame(()=>speak(prompt)));
  }
  function render() { renderBoard(); renderTray(); updateButtons(); }
  function renderBoard() {
    board.replaceChildren();
    const openTargets=[];
    state.parts.forEach(part=>{
      if (state.mode !== 'difficult' || state.placed.has(part.id)) board.append(svgEl('path',{d:part.path,class:state.placed.has(part.id)?'placed':'guide'}));
      if (!state.placed.has(part.id)) {
        openTargets.push(part);
      }
    });
    const matchingId=state.selected?matchingTarget(state.selected):null;
    openTargets.sort((a,b)=>(a.id===matchingId)-(b.id===matchingId)).forEach(part=>{
      const hit=svgEl('path',{d:part.path,class:'target-hit','aria-label':`Place ${part.name}`,'data-id':part.id});
      if(matchingId===part.id) hit.classList.add('ready');
      hit.addEventListener('click',()=>placeSelected(part.id));
      board.append(hit);
    });
  }
  board.setAttribute('tabindex','0');
  board.addEventListener('keydown',event=>{
    if((event.key==='Enter'||event.key===' ')&&state.selected){
      event.preventDefault();
      const targetId=matchingTarget(state.selected);
      if(targetId) placeSelected(targetId); else speak('Turn this piece or choose another shape.');
    }
  });
  function renderTray() {
    tray.replaceChildren();
    const slots=[...state.pieces]; while(slots.length<5) slots.push(null);
    slots.forEach(piece=>{
      if(!piece){ tray.append(document.createElement('span')); return; }
      const btn=document.createElement('button'); btn.type='button'; btn.className='piece'; btn.dataset.pieceId=piece.pieceId; btn.setAttribute('aria-label',piece.name);
      if(state.selected===piece.pieceId) btn.classList.add('selected'); if(piece.used) btn.classList.add('used');
      const visibleRotation=((piece.rotation-piece.targetRotation)%180+180)%180;
      btn.style.setProperty('--rotation',`${visibleRotation}deg`);
      btn.innerHTML=`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${piece.path}"></path></svg>`;
      btn.addEventListener('click',()=>selectPiece(piece.pieceId)); enableDrag(btn,piece);
      tray.append(btn);
    });
  }
  function selectPiece(id) { if(state.locked)return; state.selected=state.selected===id?null:id; render(); if(state.selected){const p=getPiece(id);speak(`Selected ${p.name}. Tap its place on the board.`);} }
  function getPiece(id){return state.pieces.find(p=>p.pieceId===id);}
  function matchingTarget(pieceId){ const p=getPiece(pieceId); const t=state.parts.find(part=>!state.placed.has(part.id)&&L.accepts(p,part)); return t&&t.id; }
  function placeSelected(targetId){
    if(!state.selected||state.locked){speak('Choose a shape first.');return;}
    const piece=getPiece(state.selected), target=state.parts.find(p=>p.id===targetId);
    if(!L.accepts(piece,target)){speak(`That piece needs a different place${piece.rotation!==target.rotation?' or turn':''}. Try again.`);return;}
    state.history.push({type:'place',targetId,pieceId:piece.pieceId}); state.placed.add(targetId); piece.used=true; state.selected=null; render();
    if(L.isComplete(state.parts,[...state.placed])) finish(); else speak(`Great! ${state.placed.size} part${state.placed.size===1?'':'s'} placed.`);
  }
  function turn(){ if(!state.selected){speak('Choose a piece to turn.');return;} const p=getPiece(state.selected); state.history.push({type:'turn',pieceId:p.pieceId,from:p.rotation}); p.rotation=(p.rotation+45)%180; render(); speak(`Turned ${p.name}.`); }
  function undo(){ const a=state.history.pop(); if(!a){speak('There is nothing to undo yet.');return;} if(a.type==='place'){state.placed.delete(a.targetId);getPiece(a.pieceId).used=false;} else getPiece(a.pieceId).rotation=a.from; state.locked=false;$('celebration').hidden=true;render();speak('Undone.'); }
  function hint(){ const target=state.parts.find(p=>!state.placed.has(p.id)); if(!target){speak('The number is complete.');return;} let piece=state.pieces.find(p=>!p.used&&p.id===target.id&&!p.extra); if(!piece){speak(`Look for a ${target.name}.`);return;} state.selected=piece.pieceId; if(piece.rotation!==target.rotation&&state.mode!=='simple') speak(`Choose the highlighted ${piece.name}, then turn it to fit.`); else speak(`Choose the highlighted ${piece.name}, then tap the glowing place.`); render(); }
  function check(){ if(L.isComplete(state.parts,[...state.placed]))finish(); else {const left=state.parts.length-state.placed.size;speak(`${left} part${left===1?'':'s'} still need a place.`);hint();} }
  function finish(){state.locked=true;$('celebrationText').textContent=`You built the number ${state.number}!`;$('celebration').hidden=false;render();speak(`Fantastic! You built the number ${state.number}.`);}
  function updateButtons(){ $('turnBtn').hidden=state.mode==='simple'; $('checkBtn').hidden=state.mode!=='difficult'; $('hintBtn').textContent=state.mode==='difficult'?'Show Outline':'💡 Hint'; }
  function next(){
    if(!state.numberDeck.length) state.numberDeck=L.shuffledNumbers(Math.random,state.number);
    begin(state.numberDeck.shift());
  }
  function enableDrag(btn,piece){
    let start=null;
    btn.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};btn.setPointerCapture(e.pointerId);});
    btn.addEventListener('pointermove',e=>{if(!start)return;if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>8){btn.classList.add('dragging');btn.style.translate=`${e.clientX-start.x}px ${e.clientY-start.y}px`;}});
    btn.addEventListener('pointerup',e=>{if(!start)return;const dragged=btn.classList.contains('dragging');btn.classList.remove('dragging');btn.style.translate='';start=null;if(!dragged)return;state.selected=piece.pieceId;const el=document.elementFromPoint(e.clientX,e.clientY);const hit=el&&el.closest&&el.closest('.target-hit');if(hit)placeSelected(hit.dataset.id);else render();});
  }
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    state.mode=button.dataset.mode; state.index=0; state.numberDeck=L.shuffledNumbers(); $('modeStatus').textContent=modeNames[state.mode]; $('modeOverlay').hidden=true; begin(state.numberDeck.shift());
  }));
  $('changeModeBtn').addEventListener('click',()=>{$('modeOverlay').hidden=false; if('speechSynthesis' in window) speechSynthesis.cancel();});
  $('hearBtn').addEventListener('click',()=>speak(`Build the number ${state.number}.`)); $('nextBtn').addEventListener('click',next);
  $('turnBtn').addEventListener('click',turn); $('hintBtn').addEventListener('click',hint); $('checkBtn').addEventListener('click',check); $('undoBtn').addEventListener('click',undo); $('resetBtn').addEventListener('click',()=>begin(state.number));
  $('helpBtn').addEventListener('click',()=>$('helpDialog').showModal()); $('closeHelp').addEventListener('click',()=>$('helpDialog').close());
  begin(0,false);
})();
