// app.js - robust PWA drawing app (no external libs)
(function(){
  const DPR = window.devicePixelRatio || 1;
  const canvas = document.getElementById('canvas');
  const wrap = document.getElementById('canvasWrap');
  function fit(){ const r = wrap.getBoundingClientRect(); canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px'; canvas.width = Math.floor(r.width * DPR); canvas.height = Math.floor(r.height * DPR); canvas.getContext('2d').setTransform(DPR,0,0,DPR,0,0); }
  window.addEventListener('resize', fit); setTimeout(fit,60);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  // state
  const state = { tool:'brush', brush:'basic', color:'#5b4636', size:12, opacity:1 };
  // palette
  const palette = ['#5b4636','#a4866c','#c9b79b','#ffd700','#ffdf73','#f0e6c0','#ffffff','#000000','glitter'];
  const palEl = document.getElementById('palette'); const picker = document.getElementById('picker');
  palette.forEach(c=>{ const el = document.createElement('div'); el.className='sw'; if(c==='glitter'){ el.style.background='linear-gradient(45deg,#ffd700,#fff)'; } else el.style.background = c; el.addEventListener('click', ()=>{ state.color = c; picker.value = (c==='glitter'?'#ffd700':c); }); palEl.appendChild(el); });
  picker.addEventListener('input', (e)=> state.color = e.target.value);
  // tools UI
  document.querySelectorAll('.tool').forEach(b=> b.addEventListener('click', ()=> { document.querySelectorAll('.tool').forEach(x=>x.classList.remove('active')); b.classList.add('active'); state.tool = b.dataset.tool; }));
  document.querySelectorAll('.brush').forEach(b=> b.addEventListener('click', ()=> { document.querySelectorAll('.brush').forEach(x=>x.classList.remove('active')); b.classList.add('active'); state.brush = b.dataset.brush; }));
  const sizeEl = document.getElementById('size'); sizeEl.addEventListener('input', ()=> state.size = +sizeEl.value);
  // mobile toggle
  const tools = document.getElementById('tools'); document.getElementById('mobileToggle').addEventListener('click', ()=> tools.classList.toggle('show'));
  // pointer drawing
  let drawing=false, lastX=0, lastY=0;
  function getPos(e){ const r = canvas.getBoundingClientRect(); return { x: (e.clientX ?? (e.touches && e.touches[0].clientX)) - r.left, y: (e.clientY ?? (e.touches && e.touches[0].clientY)) - r.top }; }
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e)=>{ if(e.button===2) return; e.preventDefault(); const p = getPos(e); drawing = true; lastX = p.x; lastY = p.y; ctx.save(); ctx.lineJoin = ctx.lineCap = 'round'; ctx.lineWidth = state.size; ctx.globalAlpha = state.opacity; ctx.strokeStyle = (state.color==='glitter' ? '#ffd700' : state.color); ctx.beginPath(); ctx.moveTo(lastX, lastY); });
  canvas.addEventListener('pointermove', (e)=>{ if(!drawing) return; const p = getPos(e); if(state.brush === 'glitter'){ ctx.lineTo(p.x, p.y); ctx.stroke(); for(let i=0;i<2;i++){ if(Math.random()<0.15){ ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(p.x + (Math.random()-0.5)*state.size, p.y + (Math.random()-0.5)*state.size, 1,1); } } } else if(state.brush === 'pattern'){ const dx = p.x - lastX, dy = p.y - lastY, dist = Math.hypot(dx,dy); const step = Math.max(1, state.size/4); for(let t=0;t<dist;t+=step){ const cx = lastX + (dx*(t/dist||0)); const cy = lastY + (dy*(t/dist||0)); ctx.beginPath(); ctx.arc(cx,cy,state.size/4,0,Math.PI*2); ctx.fillStyle = (state.color==='glitter'?'#ffd700':state.color); ctx.fill(); } } else if(state.brush === 'calligraphy'){ const angle = Math.atan2(p.y-lastY, p.x-lastX) + Math.PI/6; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(angle); ctx.fillStyle = (state.color==='glitter'?'#ffd700':state.color); ctx.fillRect(-state.size/2, -state.size*0.6, state.size, state.size*0.8); ctx.restore(); } else if(state.brush==='texture'){ ctx.lineWidth = state.size*0.9; ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke(); if(Math.random()<0.3){ ctx.fillStyle='rgba(0,0,0,0.03)'; ctx.fillRect(p.x-state.size/2, p.y-state.size/2, state.size, 1); } } else { ctx.lineTo(p.x, p.y); ctx.stroke(); } lastX = p.x; lastY = p.y; });
  window.addEventListener('pointerup', (e)=>{ if(!drawing) return; drawing = false; ctx.restore(); saveSnapshot(); });
  // undo/redo
  const history = []; let hidx = -1;
  function saveSnapshot(){ try{ const url = canvas.toDataURL('image/png'); if(hidx < history.length-1) history.splice(hidx+1); history.push(url); if(history.length>30) history.shift(); hidx = history.length-1; }catch(e){ console.warn(e); } }
  document.getElementById('undo').addEventListener('click', ()=>{ if(hidx<=0) return; hidx--; const img = new Image(); img.onload = ()=>{ ctx.clearRect(0,0,canvas.width/DPR, canvas.height/DPR); ctx.drawImage(img,0,0,canvas.width/DPR, canvas.height/DPR); }; img.src = history[hidx]; });
  document.getElementById('redo').addEventListener('click', ()=>{ if(hidx>=history.length-1) return; hidx++; const img = new Image(); img.onload = ()=>{ ctx.clearRect(0,0,canvas.width/DPR, canvas.height/DPR); ctx.drawImage(img,0,0,canvas.width/DPR, canvas.height/DPR); }; img.src = history[hidx]; });
  saveSnapshot();
  // drag & drop import + file input (raster + svg)
  const dropHint = document.getElementById('dropHint');
  ['dragenter','dragover'].forEach(ev => { wrap.addEventListener(ev, (e)=>{ e.preventDefault(); dropHint.style.display='block'; }); });
  ['dragleave','drop'].forEach(ev => { wrap.addEventListener(ev, (e)=>{ e.preventDefault(); dropHint.style.display='none'; }); });
  wrap.addEventListener('drop', async (e)=>{ e.preventDefault(); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if(f) handleFile(f); });
  document.getElementById('importBtn').addEventListener('click', ()=> document.getElementById('file').click());
  document.getElementById('file').addEventListener('change', (ev)=>{ const f = ev.target.files[0]; if(f) handleFile(f); });
  async function handleFile(file){ const name = file.name.toLowerCase(); if(name.endsWith('.svg')){ const txt = await file.text(); const blob = new Blob([txt], {type:'image/svg+xml'}); const url = URL.createObjectURL(blob); const img = new Image(); img.onload = ()=>{ const r = canvas.getBoundingClientRect(); const scale = Math.min((r.width*0.8)/img.width, (r.height*0.8)/img.height, 1); const w = img.width*scale, h = img.height*scale; ctx.drawImage(img, (r.width-w)/2, (r.height-h)/2, w, h); saveSnapshot(); URL.revokeObjectURL(url); }; img.src = url; } else if(name.match(/\.(png|jpe?g|gif|webp)$/)){ const img = new Image(); const url = URL.createObjectURL(file); img.onload = ()=>{ const r = canvas.getBoundingClientRect(); const scale = Math.min((r.width*0.85)/img.width, (r.height*0.85)/img.height, 1); const w = img.width*scale, h = img.height*scale; ctx.drawImage(img, (r.width-w)/2, (r.height-h)/2, w, h); saveSnapshot(); URL.revokeObjectURL(url); }; img.src = url; } else { alert('Unsupported file'); } }
  // bake 3D: simple approach omitted for reliability - can be added later
  // save/export with resolution & quality
  document.getElementById('save').addEventListener('click', ()=>{ const mul = Math.max(1, Math.min(4, parseInt(prompt('Resolution multiplier (1-4):','1'))||1)); const q = prompt('JPEG quality 0.1-1 (leave blank for PNG):','0.92'); const w = Math.floor(canvas.width/DPR * mul); const h = Math.floor(canvas.height/DPR * mul); const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; const t = tmp.getContext('2d'); t.drawImage(canvas,0,0, w, h); if(q){ const qq = Math.max(0.1, Math.min(1, parseFloat(q)||0.92)); tmp.toBlob(b=>{ const a=document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'drawing.jpg'; a.click(); }, 'image/jpeg', qq); } else { tmp.toBlob(b=>{ const a=document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'drawing.png'; a.click(); }, 'image/png'); } });
  // service worker registration
  if('serviceWorker' in navigator){ window.addEventListener('load', async ()=>{ try{ await navigator.serviceWorker.register('sw.js'); console.log('sw registered'); }catch(e){ console.warn('sw failed', e); } }); }
  // prevent context menu on canvas
  canvas.addEventListener('contextmenu', e=>e.preventDefault());
})();