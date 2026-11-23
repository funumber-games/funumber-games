(function () {
  const L = window.BuildNumberLogic;
  const $ = id => document.getElementById(id);
  const state = { mode:'simple', index:0, number:0, numberDeck:[], parts:[], pieces:[], placed:new Set(), selected:null, history:[], locked:false, roundId:0 };
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
    state.roundId += 1;
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
      const slot=document.createElement('span'); slot.className='piece-slot';
      if(!piece){ tray.append(slot); return; }
      const btn=document.createElement('button'); btn.type='button'; btn.className='piece'; btn.dataset.pieceId=piece.pieceId; btn.setAttribute('aria-label',piece.name);
      btn.dataset.kind=piece.kind;
      if(state.selected===piece.pieceId) btn.classList.add('selected'); if(piece.used) btn.classList.add('used');
      const visibleRotation=((piece.rotation-piece.targetRotation)%180+180)%180;
      btn.style.setProperty('--rotation',`${visibleRotation}deg`);
      btn.innerHTML=`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${piece.path}"></path></svg>`;
      btn.addEventListener('click',()=>selectPiece(piece.pieceId)); enableDrag(btn,piece);
      const rotate=document.createElement('button'); rotate.type='button'; rotate.className='piece-turn'; rotate.textContent='↻'; rotate.setAttribute('aria-label',`Turn ${piece.name}`);
      rotate.hidden=state.mode==='simple'||piece.used;
      rotate.addEventListener('click',event=>{event.stopPropagation();turnPiece(piece.pieceId);});
      slot.append(btn,rotate); tray.append(slot);
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
  function turnPiece(pieceId){ if(state.locked)return; const p=getPiece(pieceId); if(!p||p.used)return; state.selected=pieceId; state.history.push({type:'turn',pieceId:p.pieceId,from:p.rotation}); p.rotation=(p.rotation+45)%180; render(); speak(`Turned ${p.name}.`); }
  function check(){ if(L.isComplete(state.parts,[...state.placed]))finish(); else {const left=state.parts.length-state.placed.size;speak(`${left} part${left===1?'':'s'} still need a place.`);} }
  function launchConfetti(){
    const colors=['#ff4d6d','#ffd166','#22c55e','#38bdf8','#a855f7','#fb923c'];
    for(let index=0;index<60;index+=1){
      const bit=document.createElement('i'); bit.className='build-confetti';
      bit.style.setProperty('--color',colors[index%colors.length]);
      bit.style.setProperty('--x',`${(Math.random()-.5)*78}vw`); bit.style.setProperty('--y',`${18+Math.random()*42}vh`);
      bit.style.setProperty('--spin',`${360+Math.random()*720}deg`); bit.style.setProperty('--delay',`${Math.random()*.2}s`);
      $('celebration').parentElement.append(bit); setTimeout(()=>bit.remove(),1900);
    }
  }
  async function finish(){
    state.locked=true; const completedRound=state.roundId; render();
    await new Promise(resolve=>setTimeout(resolve,3000));
    if(completedRound!==state.roundId||!state.locked)return;
    $('celebrationText').textContent=`You built the number ${state.number}!`;
    $('celebration').hidden=false; launchConfetti(); speak(`Fantastic! You built the number ${state.number}.`);
  }
  function updateButtons(){ $('checkBtn').hidden=state.mode!=='difficult'; }
  function next(){
    if(!state.numberDeck.length) state.numberDeck=L.shuffledNumbers(Math.random,state.number);
    begin(state.numberDeck.shift());
  }
  function enableDrag(btn,piece){
    let start=null;
    btn.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};btn.setPointerCapture(e.pointerId);});
    btn.addEventListener('pointermove',e=>{if(!start)return;if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>8){btn.classList.add('dragging');btn.style.translate=`${e.clientX-start.x}px ${e.clientY-start.y}px`;}});
    btn.addEventListener('pointerup',e=>{if(!start)return;const dragged=btn.classList.contains('dragging');btn.classList.remove('dragging');btn.style.translate='';start=null;if(!dragged)return;state.selected=piece.pieceId;const targetId=targetNearPoint(e.clientX,e.clientY,piece.pieceId);if(targetId)placeSelected(targetId);else render();});
  }
  function targetNearPoint(clientX,clientY,pieceId){
    const targetId=matchingTarget(pieceId); if(!targetId)return null;
    const hit=board.querySelector(`.target-hit[data-id="${targetId}"]`); if(!hit)return null;
    const rect=hit.getBoundingClientRect(); const margin=Math.max(24,Math.min(board.clientWidth,board.clientHeight)*.07);
    return clientX>=rect.left-margin&&clientX<=rect.right+margin&&clientY>=rect.top-margin&&clientY<=rect.bottom+margin?targetId:null;
  }
  board.addEventListener('click',event=>{if(!state.selected||event.target.closest('.target-hit'))return;const targetId=targetNearPoint(event.clientX,event.clientY,state.selected);if(targetId)placeSelected(targetId);});
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    state.mode=button.dataset.mode; state.index=0; state.numberDeck=L.shuffledNumbers(); $('modeOverlay').hidden=true; begin(state.numberDeck.shift());
  }));
  $('changeModeBtn').addEventListener('click',()=>{$('modeOverlay').hidden=false; if('speechSynthesis' in window) speechSynthesis.cancel();});
  $('hearBtn').addEventListener('click',()=>speak(`Build the number ${state.number}.`)); $('nextBtn').addEventListener('click',next);
  $('checkBtn').addEventListener('click',check); $('resetBtn').addEventListener('click',()=>begin(state.number));
  $('helpBtn').addEventListener('click',()=>$('helpDialog').showModal()); $('closeHelp').addEventListener('click',()=>$('helpDialog').close());
  begin(0,false);
})();
