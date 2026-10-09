(()=>{'use strict';
const $=id=>document.getElementById(id), enc=s=>encodeURIComponent(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const settings={owner:'',repo:'',branch:'main',token:''};let teams=[],pending=[],removed=[],busy=false;
const base=()=>`https://api.github.com/repos/${enc(settings.owner)}/${enc(settings.repo)}`;
const headers=()=>({'Accept':'application/vnd.github+json','Authorization':`Bearer ${settings.token}`,'X-GitHub-Api-Version':'2022-11-28'});
const status=s=>$('status').textContent=s;
const defaultSchedule='https://vereinskalender-tsv-aw.web.app/?public=KTVRUAwJOeEPjeZOxVE7';
let scheduleUrl=defaultSchedule, layout=[];
const defaults=['login','clicktt','team:t1','team:t2','team:t3','team:t4','team:t5','schedule','portal'];
function normalizeLayout(value){
 const known=['login','clicktt',...teams.map(t=>'team:'+t.id),'schedule','portal'];
 const items=Array.isArray(value)?value.filter(x=>typeof x==='string'&&(known.includes(x)||x.startsWith('separator:'))):defaults.filter(x=>known.includes(x));
 return [...new Set([...items,...known])];
}
const labelFor=id=>id==='login'?'click-TT ID':id==='clicktt'?'click-TT':id==='schedule'?'Gesamt-Spielplan':id==='portal'?'myTischtennis.de':id.startsWith('team:')?(teams.find(t=>'team:'+t.id===id)?.name||id):'Trennlinie';

const fileTitle=name=>String(name||'').replace(/\.[^.]+$/,'');
async function api(path,options={}){const r=await fetch(base()+path,{...options,headers:{...headers(),...(options.headers||{})}});if(!r.ok){let msg='';try{msg=(await r.json()).message||''}catch{}throw Error(`GitHub ${r.status}: ${msg}`)}return r.status===204?null:r.json()}
const path=p=>p.split('/').map(enc).join('/');
const utf8b64=s=>{let a=new TextEncoder().encode(s),v='';for(let i=0;i<a.length;i+=8192)v+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(v)};
const bytesb64=async f=>{let a=new Uint8Array(await f.arrayBuffer()),v='';for(let i=0;i<a.length;i+=8192)v+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(v)};
async function getFile(p){try{return await api(`/contents/${path(p)}?ref=${enc(settings.branch)}`)}catch(e){if(e.message.startsWith('GitHub 404'))return null;throw e}}
async function putFile(p,content,message){let old=await getFile(p);return api(`/contents/${path(p)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,content,branch:settings.branch,...(old?{sha:old.sha}:{})})})}
async function deleteFile(p){let old=await getFile(p);if(old)await api(`/contents/${path(p)}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:`TSV: Datei entfernen ${p}`,sha:old.sha,branch:settings.branch})})}
const validUrl=s=>{try{let u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:'#'}catch{return '#'}};
function renderPublic(){
 const grid=$('teamGrid');if(!grid)return;
 const fixed=window.fixedCards;
 const teamCard=t=>`<div class="tile"><div class="tile-icon">${esc(t.icon||'🏓')}</div><div><div class="tile-title">${esc(t.name)}</div><div class="tile-desc">Tabelle &amp; Ergebnisse</div><div class="tile-actions">${(t.files||[]).map(f=>`<a class="secondary-button" href="${esc(f.path.split('/').map(enc).join('/'))}" target="_blank" rel="noopener" style="position:relative;z-index:2;margin:3px">📄 ${esc(fileTitle(f.name))}</a>`).join('')}</div></div><a href="${esc(validUrl(t.url))}" aria-label="${esc(t.name)} Tabelle und Ergebnisse" style="position:absolute;inset:0;border-radius:24px;z-index:1;"></a></div>`;
 const scheduleCard=`<a class="tile" href="${esc(validUrl(scheduleUrl))}" target="_blank" rel="noopener"><div class="tile-icon">📅</div><div><div class="tile-title">Gesamt-Spielplan</div><div class="tile-desc">Alle Spiele im Überblick</div></div></a>`;
 grid.innerHTML=layout.map(id=>{
   if(id.startsWith('separator:')){const title=separatorTitles[id]||'';return `<div class="section-divider">${title?`<span>${esc(title)}</span>`:''}</div>`}
   if(id.startsWith('team:')){const t=teams.find(x=>'team:'+x.id===id);return t?teamCard(t):''}
   return id==='login'?fixed.login:id==='clicktt'?fixed.clicktt:id==='portal'?fixed.portal:id==='schedule'?scheduleCard:'';
 }).join('');
}
let separatorTitles={};
async function loadPublic(){try{let r=await fetch(`teams.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw Error();let d=await r.json();teams=d.teams||[];scheduleUrl=d.scheduleUrl||defaultSchedule;separatorTitles=d.separatorTitles||{};layout=normalizeLayout(d.layout);renderPublic()}catch(e){console.warn('Statische Startseite als Fallback',e)}}
const makeId=()=>crypto.randomUUID?crypto.randomUUID():`t${Date.now()}${Math.random().toString(36).slice(2)}`;
function renderLayout(){
 const root=$('layoutEditors');root.replaceChildren();
 layout.forEach((id,i)=>{
  const row=document.createElement('div');row.className='sort-row';row.dataset.item=id;
  const grip=document.createElement('button');grip.type='button';grip.className='sort-grip secondary';grip.textContent='☰';grip.title='Ziehen zum Sortieren';grip.setAttribute('aria-label',labelFor(id)+' verschieben');
  const name=document.createElement('span');name.className='sort-name';name.textContent=labelFor(id);
  row.append(grip,name);
  if(id.startsWith('separator:')){
   const input=document.createElement('input');input.placeholder='Optionale Überschrift';input.value=separatorTitles[id]||'';input.setAttribute('aria-label','Trennlinie beschriften');
   input.oninput=()=>separatorTitles[id]=input.value;row.append(input);
   const del=document.createElement('button');del.type='button';del.className='danger';del.textContent='✕';del.title='Trennlinie löschen';
   del.onclick=()=>{layout=layout.filter(x=>x!==id);delete separatorTitles[id];renderLayout()};row.append(del);
  }
  for(const [symbol,delta] of [['↑',-1],['↓',1]]){
   const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=symbol;b.title='Verschieben '+(delta<0?'nach oben':'nach unten');b.disabled=i+delta<0||i+delta>=layout.length;
   b.onclick=()=>moveItem(id,i+delta);row.append(b);
  }
  root.append(row);
  grip.addEventListener('pointerdown',e=>{
   if(e.button!==0)return;e.preventDefault();grip.setPointerCapture(e.pointerId);row.classList.add('dragging');
   const onMove=ev=>{const el=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.sort-row');if(!el||el===row||!root.contains(el))return;
     const rect=el.getBoundingClientRect();root.insertBefore(row,ev.clientY<rect.top+rect.height/2?el:el.nextSibling)};
   const onEnd=()=>{grip.removeEventListener('pointermove',onMove);grip.removeEventListener('pointerup',onEnd);grip.removeEventListener('pointercancel',onEnd);row.classList.remove('dragging');layout=[...root.querySelectorAll('.sort-row')].map(x=>x.dataset.item);renderLayout()};
   grip.addEventListener('pointermove',onMove);grip.addEventListener('pointerup',onEnd,{once:true});grip.addEventListener('pointercancel',onEnd,{once:true});
  });
 });
}
function moveItem(id,target){const i=layout.indexOf(id);if(i<0||target<0||target>=layout.length)return;layout.splice(i,1);layout.splice(target,0,id);renderLayout()}
function renderEditors(){renderLayout();const root=$('teamEditors');root.replaceChildren();teams.forEach((t,i)=>{let div=document.createElement('div');div.className='team-editor';div.innerHTML=`<strong>${esc(t.name)}</strong><label>Name<input class="team-name" value="${esc(t.name)}"></label><label>Kachelsymbol / Kürzel<input class="team-icon" value="${esc(t.icon||'')}" maxlength="8"></label><label>Tabellenlink<input class="team-url" value="${esc(t.url||'')}"></label><div class="files"></div><div class="drop" tabindex="0">Dateien hierher ziehen oder tippen<input type="file" multiple hidden></div><button class="secondary up">↑</button><button class="secondary down">↓</button><button class="danger remove">Mannschaft löschen</button>`;
let update=()=>{t.name=div.querySelector('.team-name').value;t.icon=div.querySelector('.team-icon').value;t.url=div.querySelector('.team-url').value};div.querySelectorAll('input.team-name,input.team-icon,input.team-url').forEach(e=>e.addEventListener('input',update));
let files=div.querySelector('.files');(t.files||[]).forEach(f=>{let row=document.createElement('div');row.className='file-row';let a=document.createElement('a');a.textContent=fileTitle(f.name);a.href=path(f.path);a.target='_blank';row.append(a);let b=document.createElement('button');b.textContent='Entfernen';b.className='danger';b.onclick=()=>{if(confirm(`Datei ${f.name} entfernen?`)){t.files=t.files.filter(x=>x!==f);pending=pending.filter(x=>x.path!==f.path);removed.push(f.path);renderEditors()}};row.append(b);files.append(row)});
let drop=div.querySelector('.drop'),inp=drop.querySelector('input');drop.onclick=()=>inp.click();drop.onkeydown=e=>{if(e.key==='Enter')inp.click()};drop.ondragover=e=>{e.preventDefault();drop.style.background='rgba(217,35,50,.12)'};drop.ondragleave=()=>drop.style.background='';drop.ondrop=e=>{e.preventDefault();drop.style.background='';addFiles(t,e.dataTransfer.files)};inp.onchange=()=>{addFiles(t,inp.files);inp.value=''};
div.querySelector('.up').onclick=()=>{if(i){[teams[i-1],teams[i]]=[teams[i],teams[i-1]];renderEditors()}};div.querySelector('.down').onclick=()=>{if(i<teams.length-1){[teams[i+1],teams[i]]=[teams[i],teams[i+1]];renderEditors()}};
div.querySelector('.remove').onclick=()=>{if(confirm(`Mannschaft ${t.name} löschen? Die zugehörigen Dateien werden ebenfalls entfernt.`)){removed.push(...t.files.map(x=>x.path));pending=pending.filter(x=>!x.path.startsWith(`uploads/${t.id}/`));teams.splice(i,1);layout=layout.filter(x=>x!=='team:'+t.id);renderEditors()}};root.append(div)})}
function addFiles(t,files){for(let f of files){if(f.size>20*1024*1024){status(`${f.name}: maximal 20 MB pro Datei`);continue}let name=f.name.replace(/[\\/]/g,'_').replace(/[\u0000-\u001f]/g,'').trim();if(!name)continue;let p=`uploads/${t.id}/${name}`;if(t.files.some(x=>x.path===p)){if(!confirm(`${name} ersetzen?`))continue;t.files=t.files.filter(x=>x.path!==p)}t.files.push({name,path:p});pending=pending.filter(x=>x.path!==p);pending.push({file:f,path:p})}renderEditors()}
function adminVisibility(){let active=location.hash==='#admin';$('admin').classList.toggle('active',active);document.querySelector('main.app').style.display=active?'none':'';if(active)window.scrollTo(0,0)}
window.addEventListener('hashchange',adminVisibility);adminVisibility();$('closeAdmin').onclick=()=>location.hash='';
$('connect').onclick=async()=>{Object.assign(settings,{owner:$('owner').value.trim(),repo:$('repo').value.trim(),branch:$('branch').value.trim()||'main',token:$('token').value.trim()});if(!settings.owner||!settings.repo||!settings.token)return status('Repository und Token erforderlich.');try{status('Prüfe Zugriff …');let r=await api(`/contents/teams.json?ref=${enc(settings.branch)}`);let content=decodeURIComponent(escape(atob(r.content.replace(/\s/g,''))));let data=JSON.parse(content);teams=data.teams||[];scheduleUrl=data.scheduleUrl||defaultSchedule;separatorTitles=data.separatorTitles||{};layout=normalizeLayout(data.layout);$('scheduleUrl').value=scheduleUrl;pending=[];removed=[];$('token').value='';$('loginArea').hidden=true;$('editorArea').hidden=false;renderEditors();status('Verbunden. Änderungen werden erst mit „Speichern“ veröffentlicht.')}catch(e){settings.token='';status('Verbindung fehlgeschlagen: '+e.message+' (teams.json muss bereits im Repository liegen.)')}};
$('addTeam').onclick=()=>{const t={id:makeId(),name:'Neue Mannschaft',icon:'🏓',url:'',files:[]};teams.push(t);layout.push('team:'+t.id);renderEditors()};
$('addSeparator').onclick=()=>{const id='separator:'+makeId();separatorTitles[id]='';layout.push(id);renderLayout()};
$('saveAll').onclick=async()=>{if(busy)return;scheduleUrl=$('scheduleUrl').value.trim();if(!validUrl(scheduleUrl).startsWith('http'))return status('Bitte einen gültigen http(s)-Link für den Gesamt-Spielplan eingeben.');if(teams.some(t=>!t.name.trim()||!validUrl(t.url).startsWith('http')))return status('Bitte für jede Mannschaft einen Namen und gültigen http(s)-Tabellenlink eingeben.');busy=true;$('saveAll').disabled=true;try{let deleted=[...new Set(removed)].filter(p=>!teams.some(t=>t.files.some(f=>f.path===p)));let n=0,total=pending.length+deleted.length+1;for(let x of pending){status(`Upload ${++n}/${total}: ${x.file.name}`);await putFile(x.path,await bytesb64(x.file),`TSV: ${x.file.name} hochladen`)}for(let p of deleted){status(`Löschen ${++n}/${total}: ${p}`);await deleteFile(p)}status(`Speichere Mannschaften ${++n}/${total}`);await putFile('teams.json',utf8b64(JSON.stringify({version:3,scheduleUrl,teams,layout,separatorTitles},null,2)),'TSV: Mannschaften aktualisieren');pending=[];removed=[];status('Erfolgreich gespeichert! GitHub Pages aktualisiert die Webseite üblicherweise kurz danach.');renderEditors();renderPublic()}catch(e){status('Speichern unterbrochen: '+e.message+' – bereits hochgeladene Dateien können vorhanden sein. Erneut speichern.')}finally{busy=false;$('saveAll').disabled=false}};
$('logout').onclick=()=>{settings.token='';$('editorArea').hidden=true;$('loginArea').hidden=false;pending=[];removed=[];status('Abgemeldet.');};
// Originale feste Kacheln vor dem ersten dynamischen Rendern sichern.
const original=$('teamGrid').children;
window.fixedCards={login:original[0].outerHTML,clicktt:original[1].outerHTML,portal:original[original.length-1].outerHTML};
loadPublic();
})();
