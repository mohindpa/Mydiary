const $ = (selector) => document.querySelector(selector);
const storeKey = 'my-little-shelf-v1';
const today = () => new Intl.DateTimeFormat('en', { day:'numeric', month:'long', year:'numeric' }).format(new Date());
const shortDate = () => new Intl.DateTimeFormat('en', { month:'short', year:'numeric' }).format(new Date());
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const defaultDiary = () => ({ id:uid(), title:'September feelings', cover:'plum', created:today(), pages:[{id:uid(), date:today(), text:'Dear diary,\n\nToday I want to remember the little things.\n\n'}], bookmarks:[], settings:{ mode:'english', font:'hand', paper:'parchment' } });
let state = JSON.parse(localStorage.getItem(storeKey) || 'null') || { diaries:[defaultDiary()], trash:[], active:null, night:false };
let activePage = 0, candidate = null, toastTimer;
function save(){ localStorage.setItem(storeKey, JSON.stringify(state)); $('#saveStatus').innerHTML='<i></i> Saved in this browser'; }
function activeDiary(){ return state.diaries.find(d=>d.id===state.active); }
function esc(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function showToast(message){ clearTimeout(toastTimer); $('#toast').textContent=message; $('#toast').classList.add('show'); toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2300); }
function renderShelf(){
  $('#diaryShelf').innerHTML=state.diaries.map(d=>`<button class="spine ${d.cover} ${d.id===state.active?'active':''}" data-id="${d.id}"><span class="line"></span><span><b>${esc(d.title)}</b><small>${d.pages.length} ${d.pages.length===1?'page':'pages'} · ${shortDate()}</small></span><em>›</em></button>`).join('');
  $('#trashCount').textContent=state.trash.length;
}
function showWelcome(){ state.active=null; save(); renderShelf(); $('#diaryView').classList.add('hidden'); $('#welcomeView').classList.remove('hidden'); }
function openDiary(id){ state.active=id; activePage=0; save(); renderShelf(); $('#welcomeView').classList.add('hidden'); $('#diaryView').classList.remove('hidden'); applySettings(); renderPage(); }
function applySettings(){ const d=activeDiary(); document.body.dataset.paper=d.settings.paper; document.body.dataset.font=d.settings.font; $('#inputMode').value=d.settings.mode; $('#fontChoice').value=d.settings.font; $('#paperChoice').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.paper===d.settings.paper)); $('#modeExplainer').textContent=d.settings.mode==='manglish' ? 'Type Malayalam sounds in English letters. Choose the word you mean from the small suggestion card.' : 'Write naturally in English.'; }
function renderPage(animate=false){
  const d=activeDiary(); if(!d) return; const p=d.pages[activePage];
  $('#diaryTitle').value=d.title; $('#diaryStarted').textContent=`BEGUN ${d.created.toUpperCase()}`; $('#pageDate').textContent=p.date; $('#pageNo').textContent=String(activePage+1).padStart(2,'0'); $('#entryText').value=p.text;
  $('#bookmarkRibbon').classList.toggle('hidden',!d.bookmarks.includes(p.id)); $('#addBookmark').innerHTML=d.bookmarks.includes(p.id)?'<span>◆</span> Remove page mark':'<span>◆</span> Mark this page';
  $('#previousPage').disabled=activePage===0; $('#nextPage').querySelector('span').textContent=activePage===d.pages.length-1?'New page':'Next page';
  $('#pageDots').innerHTML=d.pages.map((p,i)=>`<button class="page-dot ${i===activePage?'active':''} ${d.bookmarks.includes(p.id)?'marked':''}" title="Page ${i+1}${d.bookmarks.includes(p.id)?' · marked':''}" data-page="${i}"></button>`).join('');
  updateWords(); if(animate){ $('#paperPage').classList.remove('page-turn'); void $('#paperPage').offsetWidth; $('#paperPage').classList.add('page-turn'); }
}
function updateWords(){ const words=$('#entryText').value.trim().split(/\s+/).filter(Boolean).length; $('#wordCount').textContent=`${words} ${words===1?'word':'words'}`; }
function changePage(i, animate=true){ const d=activeDiary(); if(i<0)return; if(i>=d.pages.length) d.pages.push({id:uid(),date:today(),text:''}); activePage=i; candidate=null; $('#candidatePopover').classList.add('hidden'); save(); renderPage(animate); $('#entryText').focus(); }
function newDiary(){ $('#newDiaryName').value=''; selectedCover='plum'; $('#coverChoice').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.cover==='plum')); $('#newDiaryDialog').showModal(); setTimeout(()=>$('#newDiaryName').focus(),50); }
let selectedCover='plum';
function createDiary(){ const d=defaultDiary(); d.title=$('#newDiaryName').value.trim() || 'Untitled diary'; d.cover=selectedCover; state.diaries.unshift(d); save(); renderShelf(); openDiary(d.id); showToast('A fresh diary has found its place on the shelf.'); }
function moveToTrash(){ const d=activeDiary(); state.diaries=state.diaries.filter(x=>x.id!==d.id); state.trash.unshift({...d, removed:today()}); state.active=null; save(); renderShelf(); showWelcome(); showToast('Diary moved to the quiet corner.'); }
function renderTrash(){ $('#trashList').innerHTML=state.trash.length?state.trash.map(d=>`<div class="trash-item"><span class="mini-cover ${d.cover}"></span><b>${esc(d.title)}</b><button data-restore="${d.id}">Restore</button><button data-delete="${d.id}" title="Permanently delete">×</button></div>`).join(''):'<p class="trash-empty">Nothing has been set aside. Your shelf is clear.</p>'; }
function openTrash(){ renderTrash(); $('#trashDialog').showModal(); }
function updateEntry(){ const d=activeDiary(); if(!d)return; d.pages[activePage].text=$('#entryText').value; save(); updateWords(); }
// A compact local transliterator for common Malayalam syllables. It keeps English text when it is not confident and offers choices before committing.
const words={
  'njan':['ഞാൻ'],'njān':['ഞാൻ'],'ente':['എന്റെ'],'enikku':['എനിക്ക്'],'sugham':['സുഖം'],'sukham':['സുഖം'],'malayalam':['മലയാളം'],'malayalam':['മലയാളം'],'malayali':['മലയാളി'],'nanni':['നന്ദി'],'namaskaram':['നമസ്കാരം'],'veedu':['വീട്'],'veettil':['വീട്ടിൽ'],'innu':['ഇന്ന്'],'innale':['ഇന്നലെ'],'naale':['നാളെ'],'ippo':['ഇപ്പോൾ'],'ishtam':['ഇഷ്ടം'],'santhosham':['സന്തോഷം'],'dukham':['ദുഃഖം'],'sneham':['സ്നേഹം'],'kudumbam':['കുടുംബം'],'amma':['അമ്മ'],'achan':['അച്ഛൻ'],'chechi':['ചേച്ചി'],'chettan':['ചേട്ടൻ'],'koottukaran':['കൂട്ടുകാരൻ'],'koottukari':['കൂട്ടുകാരി'],'mazha':['മഴ'],'vishamam':['വിഷമം'],'nalla':['നല്ല'],'valare':['വളരെ'],'oru':['ഒരു'],'ithu':['ഇത്'],'athu':['അത്'],'evide':['എവിടെ'],'engane':['എങ്ങനെ'],'und':['ഉണ്ട്'],'undu':['ഉണ്ട്'],'illa':['ഇല്ല'],'venam':['വേണം'],'poyi':['പോയി'],'varum':['വരും'],'varunnu':['വരുന്നു'],'ezhuthuka':['എഴുതുക'],'diary':['ഡയറി'],
};
const vowel={a:'അ',aa:'ആ',i:'ഇ',ii:'ഈ',u:'ഉ',uu:'ഊ',e:'എ',ee:'ഏ',ai:'ഐ',o:'ഒ',oo:'ഓ',au:'ഔ'};
function roughMalayalam(raw){
  const w=raw.toLowerCase(); if(words[w]) return words[w]; if(vowel[w])return [vowel[w]];
  const consonants=[['ng','ങ'],['nj','ഞ'],['zh','ഴ'],['th','ത'],['dh','ധ'],['ph','ഫ'],['kh','ഖ'],['ch','ച'],['sh','ശ'],['tt','ട'],['nn','ണ'],['kk','ക'],['pp','പ'],['mm','മ'],['ll','ല'],['rr','ര'],['k','ക'],['g','ഗ'],['c','ച'],['j','ജ'],['t','ട'],['d','ദ'],['n','ന'],['p','പ'],['b','ബ'],['m','മ'],['y','യ'],['r','ര'],['l','ല'],['v','വ'],['s','സ'],['h','ഹ']];
  let left=w, out='', matched=false; while(left){ let pair=consonants.find(([latin])=>left.startsWith(latin)); if(pair){ out+=pair[1]; left=left.slice(pair[0].length); const vow=['aa','ii','uu','ee','oo','ai','au','a','i','u','e','o'].find(v=>left.startsWith(v)); if(vow){ out+=({a:'',aa:'ാ',i:'ി',ii:'ീ',u:'ു',uu:'ൂ',e:'െ',ee:'േ',ai:'ൈ',o:'ൊ',oo:'ോ',au:'ൗ'})[vow]; left=left.slice(vow.length); } else if(left) out+='്'; matched=true; } else { return []; } } return matched?[out]:[];
}
function offerCandidate(){
  const d=activeDiary(); if(!d||d.settings.mode!=='manglish') return; const el=$('#entryText'), end=el.selectionStart, before=el.value.slice(0,end), match=before.match(/([A-Za-zā]+)$/); if(!match || match[1].length<2) { $('#candidatePopover').classList.add('hidden');return; }
  const source=match[1], options=[...(words[source.toLowerCase()]||[]),...roughMalayalam(source)].filter((x,i,a)=>a.indexOf(x)===i).slice(0,3); if(!options.length){$('#candidatePopover').classList.add('hidden');return;}
  candidate={start:end-source.length,end,options}; const pop=$('#candidatePopover'); pop.innerHTML=options.map((o,i)=>`<button data-candidate="${i}">${o}<small>${i+1}</small></button>`).join('');
  const position=el.value.slice(0,end).split('\n'); pop.style.left=`${Math.min(420, 10+source.length*13)}px`; pop.style.top=`${Math.min(396, 77+(position.length-1)*42)}px`; pop.classList.remove('hidden');
}
function chooseCandidate(index){ if(!candidate)return; const el=$('#entryText'), text=el.value, chosen=candidate.options[index]; el.value=text.slice(0,candidate.start)+chosen+text.slice(candidate.end); const pos=candidate.start+chosen.length; el.focus(); el.setSelectionRange(pos,pos); candidate=null; $('#candidatePopover').classList.add('hidden'); updateEntry(); }

$('#newDiary').addEventListener('click',newDiary); $('#welcomeNew').addEventListener('click',newDiary); $('#returnShelf').addEventListener('click',showWelcome);
$('#diaryShelf').addEventListener('click',e=>{const b=e.target.closest('.spine');if(b)openDiary(b.dataset.id);});
$('#coverChoice').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;selectedCover=b.dataset.cover;$('#coverChoice').querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));});
$('#newDiaryForm').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();$('#newDiaryDialog').close();createDiary();});
$('#diaryTitle').addEventListener('input',e=>{activeDiary().title=e.target.value||'Untitled diary';save();renderShelf();});
$('#entryText').addEventListener('input',()=>{updateEntry(); offerCandidate();});
$('#entryText').addEventListener('keydown',e=>{if(candidate && /^[1-3]$/.test(e.key)){e.preventDefault();chooseCandidate(+e.key-1);} else if(e.key==='Escape'){candidate=null;$('#candidatePopover').classList.add('hidden');}});
$('#candidatePopover').addEventListener('click',e=>{const b=e.target.closest('button');if(b)chooseCandidate(+b.dataset.candidate);});
$('#previousPage').addEventListener('click',()=>changePage(activePage-1)); $('#nextPage').addEventListener('click',()=>changePage(activePage+1)); $('#pageDots').addEventListener('click',e=>{const b=e.target.closest('button');if(b)changePage(+b.dataset.page);});
$('#addBookmark').addEventListener('click',()=>{const d=activeDiary(),id=d.pages[activePage].id,i=d.bookmarks.indexOf(id);if(i>=0){d.bookmarks.splice(i,1);showToast('Page mark removed.')}else{d.bookmarks.push(id);showToast('A brass mark now holds your place.')}save();renderPage();});
$('#deleteDiary').addEventListener('click',moveToTrash); $('#openTrash').addEventListener('click',openTrash); $('#trashList').addEventListener('click',e=>{const id=e.target.dataset.restore||e.target.dataset.delete;if(!id)return;if(e.target.dataset.restore){const d=state.trash.find(d=>d.id===id);state.trash=state.trash.filter(d=>d.id!==id);state.diaries.unshift(d);save();renderTrash();renderShelf();showToast('Diary returned to the shelf.');}else{state.trash=state.trash.filter(d=>d.id!==id);save();renderTrash();renderShelf();showToast('Diary permanently removed.');}});
$('#openSettings').addEventListener('click',()=>{applySettings();$('#settingsDialog').showModal();}); $('#inputMode').addEventListener('change',e=>{activeDiary().settings.mode=e.target.value; if(e.target.value==='manglish'&&activeDiary().settings.font==='hand'){activeDiary().settings.font='malayalamSerif';$('#fontChoice').value='malayalamSerif';}applySettings();save();}); $('#fontChoice').addEventListener('change',e=>{activeDiary().settings.font=e.target.value;applySettings();save();}); $('#paperChoice').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;activeDiary().settings.paper=b.dataset.paper;applySettings();save();});
$('#toggleTheme').addEventListener('click',()=>{state.night=!state.night;document.body.classList.toggle('night',state.night);save();}); document.body.classList.toggle('night',state.night);
renderShelf();
