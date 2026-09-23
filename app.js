const $ = (selector) => document.querySelector(selector);
const storeKey = 'my-little-shelf-v1';
const today = () => new Intl.DateTimeFormat('en', { day:'numeric', month:'long', year:'numeric' }).format(new Date());
const shortDate = () => new Intl.DateTimeFormat('en', { month:'short', year:'numeric' }).format(new Date());
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const defaultDiary = () => ({ id:uid(), title:'September feelings', cover:'plum', created:today(), pages:[{id:uid(), date:today(), html:'Dear diary,<br><br>Today I want to remember the little things.<br><br>'}], bookmarks:[], settings:{ mode:'english', font:'hand', paper:'parchment', size:20 } });
let state = JSON.parse(localStorage.getItem(storeKey) || 'null') || { diaries:[defaultDiary()], trash:[], active:null, night:false };
let activePage = 0, candidate = null, toastTimer, candidateTimer, candidateRequest = 0;
function save(){ localStorage.setItem(storeKey, JSON.stringify(state)); $('#saveStatus').innerHTML='<i></i> Saved in this browser'; }
function activeDiary(){ return state.diaries.find(d=>d.id===state.active); }
function esc(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function pageHtml(page){ return page.html ?? esc(page.text || '').replace(/\n/g,'<br>'); }
function showToast(message){ clearTimeout(toastTimer); $('#toast').textContent=message; $('#toast').classList.add('show'); toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2300); }
function renderShelf(){
  $('#diaryShelf').innerHTML=state.diaries.map(d=>`<button class="spine ${d.cover} ${d.id===state.active?'active':''}" data-id="${d.id}"><span class="line"></span><span><b>${esc(d.title)}</b><small>${d.pages.length} ${d.pages.length===1?'page':'pages'} · ${shortDate()}</small></span><em>›</em></button>`).join('');
  $('#trashCount').textContent=state.trash.length;
}
function showWelcome(){ state.active=null; save(); renderShelf(); $('#diaryView').classList.add('hidden'); $('#welcomeView').classList.remove('hidden'); }
function openDiary(id){ state.active=id; activePage=0; save(); renderShelf(); $('#welcomeView').classList.add('hidden'); $('#diaryView').classList.remove('hidden'); applySettings(); renderPage(); }
function applySettings(){ const d=activeDiary(); d.settings.size ??= 20; document.body.dataset.paper=d.settings.paper; document.body.dataset.font=d.settings.font; document.documentElement.style.setProperty('--entry-size',`${d.settings.size}px`); $('#fontSize').value=d.settings.size; $('#inputMode').value=d.settings.mode; $('#quickInputMode').value=d.settings.mode; $('#fontChoice').value=d.settings.font; $('#paperChoice').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.paper===d.settings.paper)); const manglish=d.settings.mode==='manglish'; $('#modeExplainer').textContent=manglish ? 'Type Malayalam sounds in English letters. Malayalam suggestions appear as you type; press Space to accept the first one.' : 'Write naturally in English.'; $('#quickModeHint').textContent=manglish ? 'Live Malayalam suggestions · Space accepts the first · 1–5 chooses an option' : 'Choose Manglish to type Malayalam sounds in English letters.'; }
function renderPage(animate=false){
  const d=activeDiary(); if(!d) return; const p=d.pages[activePage];
  $('#diaryTitle').value=d.title; $('#diaryStarted').textContent=`BEGUN ${d.created.toUpperCase()}`; $('#pageDate').textContent=p.date; $('#pageNo').textContent=String(activePage+1).padStart(2,'0'); $('#entryText').innerHTML=pageHtml(p);
  $('#bookmarkRibbon').classList.toggle('hidden',!d.bookmarks.includes(p.id)); $('#addBookmark').innerHTML=d.bookmarks.includes(p.id)?'<span>◆</span> Remove page mark':'<span>◆</span> Mark this page';
  $('#previousPage').disabled=activePage===0; $('#nextPage').querySelector('span').textContent=activePage===d.pages.length-1?'New page':'Next page';
  $('#pageDots').innerHTML=d.pages.map((p,i)=>`<button class="page-dot ${i===activePage?'active':''} ${d.bookmarks.includes(p.id)?'marked':''}" title="Page ${i+1}${d.bookmarks.includes(p.id)?' · marked':''}" data-page="${i}"></button>`).join('');
  updateWords(); if(animate){ $('#paperPage').classList.remove('page-turn'); void $('#paperPage').offsetWidth; $('#paperPage').classList.add('page-turn'); }
}
function updateWords(){ const words=$('#entryText').innerText.trim().split(/\s+/).filter(Boolean).length; $('#wordCount').textContent=`${words} ${words===1?'word':'words'}`; }
function changePage(i, animate=true){ const d=activeDiary(); if(i<0)return; if(i>=d.pages.length) d.pages.push({id:uid(),date:today(),html:''}); activePage=i; candidate=null; $('#candidatePopover').classList.add('hidden'); save(); renderPage(animate); $('#entryText').focus(); }
function newDiary(){ $('#newDiaryName').value=''; selectedCover='plum'; $('#coverChoice').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.cover==='plum')); $('#newDiaryDialog').showModal(); setTimeout(()=>$('#newDiaryName').focus(),50); }
let selectedCover='plum';
function createDiary(){ const d=defaultDiary(); d.title=$('#newDiaryName').value.trim() || 'Untitled diary'; d.cover=selectedCover; state.diaries.unshift(d); save(); renderShelf(); openDiary(d.id); showToast('A fresh diary has found its place on the shelf.'); }
function moveToTrash(){ const d=activeDiary(); state.diaries=state.diaries.filter(x=>x.id!==d.id); state.trash.unshift({...d, removed:today()}); state.active=null; save(); renderShelf(); showWelcome(); showToast('Diary moved to the quiet corner.'); }
function renderTrash(){ $('#trashList').innerHTML=state.trash.length?state.trash.map(d=>`<div class="trash-item"><span class="mini-cover ${d.cover}"></span><b>${esc(d.title)}</b><button data-restore="${d.id}">Restore</button><button data-delete="${d.id}" title="Permanently delete">×</button></div>`).join(''):'<p class="trash-empty">Nothing has been set aside. Your shelf is clear.</p>'; }
function openTrash(){ renderTrash(); $('#trashDialog').showModal(); }
function updateEntry(){ const d=activeDiary(); if(!d)return; d.pages[activePage].html=$('#entryText').innerHTML; delete d.pages[activePage].text; save(); updateWords(); }
function flowToNextPage(){
  const editor=$('#entryText'), d=activeDiary();
  if(editor.scrollHeight<=editor.clientHeight+4 || editor.innerText.length<130) return;
  const all=editor.innerText; let cut=all.lastIndexOf(' ', Math.max(80,all.length-150)); if(cut<50) cut=Math.floor(all.length*.72);
  const first=all.slice(0,cut).trimEnd(), rest=all.slice(cut).trimStart();
  d.pages[activePage].html=esc(first).replace(/\n/g,'<br>');
  d.pages.splice(activePage+1,0,{id:uid(),date:today(),html:esc(rest).replace(/\n/g,'<br>')});
  save(); changePage(activePage+1); showToast('Your writing carried on to a fresh page.');
}
function wordAtCaret(){
  const selection=window.getSelection();
  if(!selection.rangeCount || selection.focusNode?.nodeType!==Node.TEXT_NODE) return null;
  const node=selection.focusNode, end=selection.focusOffset, match=node.data.slice(0,end).match(/([A-Za-z.'-]+)$/);
  if(!match || match[1].length<2) return null;
  return {node,start:end-match[1].length,end,source:match[1]};
}
async function getMalayalamSuggestions(source){
  const response=await fetch(`/api/transliterate?text=${encodeURIComponent(source)}`,{cache:'no-store'});
  if(!response.ok) throw new Error('Suggestion service unavailable');
  const data=await response.json();
  return Array.isArray(data.result) ? [...new Set(data.result.filter(Boolean))].slice(0,5) : [];
}
function showCandidates(next){
  candidate=next; const pop=$('#candidatePopover'); pop.innerHTML=next.options.map((o,i)=>`<button data-candidate="${i}">${o}<small>${i+1}</small></button>`).join('');
  const range=document.createRange(); range.setStart(next.node,Math.max(0,next.start)); range.setEnd(next.node,next.end); const rect=range.getBoundingClientRect(); const box=$('#paperPage').getBoundingClientRect(); pop.style.left=`${Math.max(10,Math.min(420,rect.left-box.left))}px`; pop.style.top=`${Math.max(82,Math.min(396,rect.bottom-box.top+4))}px`; pop.classList.remove('hidden');
}
async function fetchAndShow(meta, requestId){
  try {
    const options=await getMalayalamSuggestions(meta.source);
    if(requestId!==candidateRequest || meta.node.data.slice(meta.start,meta.end)!==meta.source || !options.length) return;
    showCandidates({...meta,options});
  } catch { if(requestId===candidateRequest) $('#candidatePopover').classList.add('hidden'); }
}
function offerCandidate(){
  const d=activeDiary(); clearTimeout(candidateTimer); candidate=null;
  if(!d||d.settings.mode!=='manglish') { $('#candidatePopover').classList.add('hidden'); return; }
  const meta=wordAtCaret(); if(!meta){$('#candidatePopover').classList.add('hidden');return;}
  const requestId=++candidateRequest;
  candidateTimer=setTimeout(()=>fetchAndShow(meta,requestId),120);
}
async function acceptOnSpace(event){
  const d=activeDiary(); if(!d||d.settings.mode!=='manglish') return false;
  const meta=wordAtCaret(); if(!meta) return false;
  event.preventDefault();
  if(candidate && candidate.node===meta.node && candidate.start===meta.start && candidate.end===meta.end){ chooseCandidate(0,true); return true; }
  const requestId=++candidateRequest;
  try {
    const options=await getMalayalamSuggestions(meta.source);
    if(requestId!==candidateRequest || meta.node.data.slice(meta.start,meta.end)!==meta.source) return true;
    if(options.length){ showCandidates({...meta,options}); chooseCandidate(0,true); return true; }
  } catch { showToast('Malayalam suggestions are temporarily unavailable.'); }
  meta.node.data=meta.node.data.slice(0,meta.end)+' '+meta.node.data.slice(meta.end);
  const range=document.createRange(), selection=window.getSelection(); range.setStart(meta.node,meta.end+1); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); updateEntry();
  return true;
}
function chooseCandidate(index, appendSpace=false){ if(!candidate)return; const {node,start,end}=candidate, chosen=candidate.options[index]; node.data=node.data.slice(0,start)+chosen+(appendSpace?' ':'')+node.data.slice(end); const pos=start+chosen.length+(appendSpace?1:0), range=document.createRange(), selection=window.getSelection(); range.setStart(node,pos);range.collapse(true);selection.removeAllRanges();selection.addRange(range); $('#entryText').focus(); candidate=null; $('#candidatePopover').classList.add('hidden'); updateEntry(); }
function setInputMode(mode){ const d=activeDiary(); d.settings.mode=mode; if(mode==='manglish'&&d.settings.font==='hand') d.settings.font='malayalamSerif'; applySettings(); save(); showToast(mode==='manglish' ? 'Manglish typing is on. Type a Malayalam sound, then choose its suggestion.' : 'English typing is on.'); }
function setImmersive(on){
  document.body.classList.toggle('immersive',on);
  $('#immersiveToggle').setAttribute('aria-pressed',String(on));
  if(on){ document.documentElement.requestFullscreen?.().catch(()=>{}); setTimeout(()=>$('#entryText').focus(),80); }
  else if(document.fullscreenElement) document.exitFullscreen?.().catch(()=>{});
}

$('#newDiary').addEventListener('click',newDiary); $('#welcomeNew').addEventListener('click',newDiary); $('#returnShelf').addEventListener('click',showWelcome);
$('#diaryShelf').addEventListener('click',e=>{const b=e.target.closest('.spine');if(b)openDiary(b.dataset.id);});
$('#coverChoice').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;selectedCover=b.dataset.cover;$('#coverChoice').querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));});
$('#newDiaryForm').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();$('#newDiaryDialog').close();createDiary();});
$('#diaryTitle').addEventListener('input',e=>{activeDiary().title=e.target.value||'Untitled diary';save();renderShelf();});
$('#entryText').addEventListener('input',()=>{updateEntry(); offerCandidate(); flowToNextPage();});
$('#entryText').addEventListener('keydown',async e=>{if(e.key===' ' && await acceptOnSpace(e)) return; if(candidate && /^[1-5]$/.test(e.key)){e.preventDefault();chooseCandidate(+e.key-1);} else if(e.key==='Escape'){candidate=null;$('#candidatePopover').classList.add('hidden');}});
$('#candidatePopover').addEventListener('click',e=>{const b=e.target.closest('button');if(b)chooseCandidate(+b.dataset.candidate);});
$('#fontSize').addEventListener('input',e=>{activeDiary().settings.size=+e.target.value; applySettings();save();});
$('.writing-tools').addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault();});
$('.writing-tools').addEventListener('click',e=>{const command=e.target.closest('[data-command]')?.dataset.command;if(!command)return;document.execCommand(command,false,null);$('#entryText').focus();updateEntry();});
$('#inkColor').addEventListener('input',e=>{document.execCommand('foreColor',false,e.target.value);$('#entryText').focus();updateEntry();});
$('#highlightColor').addEventListener('input',e=>{document.execCommand('hiliteColor',false,e.target.value);$('#entryText').focus();updateEntry();});
$('#previousPage').addEventListener('click',()=>changePage(activePage-1)); $('#nextPage').addEventListener('click',()=>changePage(activePage+1)); $('#pageDots').addEventListener('click',e=>{const b=e.target.closest('button');if(b)changePage(+b.dataset.page);});
$('#addBookmark').addEventListener('click',()=>{const d=activeDiary(),id=d.pages[activePage].id,i=d.bookmarks.indexOf(id);if(i>=0){d.bookmarks.splice(i,1);showToast('Page mark removed.')}else{d.bookmarks.push(id);showToast('A brass mark now holds your place.')}save();renderPage();});
$('#deleteDiary').addEventListener('click',moveToTrash); $('#openTrash').addEventListener('click',openTrash); $('#trashList').addEventListener('click',e=>{const id=e.target.dataset.restore||e.target.dataset.delete;if(!id)return;if(e.target.dataset.restore){const d=state.trash.find(d=>d.id===id);state.trash=state.trash.filter(d=>d.id!==id);state.diaries.unshift(d);save();renderTrash();renderShelf();showToast('Diary returned to the shelf.');}else{state.trash=state.trash.filter(d=>d.id!==id);save();renderTrash();renderShelf();showToast('Diary permanently removed.');}});
$('#openSettings').addEventListener('click',()=>{applySettings();$('#settingsDialog').showModal();}); $('#inputMode').addEventListener('change',e=>setInputMode(e.target.value)); $('#quickInputMode').addEventListener('change',e=>setInputMode(e.target.value)); $('#fontChoice').addEventListener('change',e=>{activeDiary().settings.font=e.target.value;applySettings();save();}); $('#paperChoice').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;activeDiary().settings.paper=b.dataset.paper;applySettings();save();});
$('#immersiveToggle').addEventListener('click',()=>setImmersive(true)); $('#immersiveExit').addEventListener('click',()=>setImmersive(false)); document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement && document.body.classList.contains('immersive')) setImmersive(false);});
$('#toggleTheme').addEventListener('click',()=>{state.night=!state.night;document.body.classList.toggle('night',state.night);save();}); document.body.classList.toggle('night',state.night);
renderShelf();
