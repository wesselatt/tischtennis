(()=>{'use strict';
const $=id=>document.getElementById(id), enc=s=>encodeURIComponent(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const settings={owner:'',repo:'',branch:'main',token:''};let teams=[],pending=[],removed=[],busy=false;
const base=()=>`https://api.github.com/repos/${enc(settings.owner)}/${enc(settings.repo)}`;
const headers=()=>({'Accept':'application/vnd.github+json','Authorization':`Bearer ${settings.token}`,'X-GitHub-Api-Version':'2022-11-28'});
const status=s=>$('status').textContent=s;
const defaultSchedule='https://vereinskalender-tsv-aw.web.app/?public=KTVRUAwJOeEPjeZOxVE7';
const defaultLinks=[
{id:'login',name:'click-TT ID',icon:'🔐',description:'Persönlicher Login',url:"https://ttde-id.liga.nu/oauth2/authz/ttde?redirect_uri=https%3A%2F%2Fwttv.click-tt.de%2Fcgi-bin%2FWebObjects%2FnuLigaTTDE.woa%2Fwa%2FoAuthLogin&client_id=XtVpGjXKAhz3BZuu&scope=nuLiga&response_type=code&state=nonce%3DVF6WbXUOvThfnk6cXJFwPJDVdDlK9l17",files:[]},
{id:'clicktt',name:'click-TT',icon:'🏓',description:'Südwestfalen 2026/27',url:'https://wttv.click-tt.de/cgi-bin/WebObjects/nuLigaTTDE.woa/wa/leaguePage?championship=S%C3%BCdwestfalen%2026/27',files:[]},
{id:'schedule',name:'Gesamt-Spielplan',icon:'📅',description:'Alle Spiele im Überblick',url:defaultSchedule,files:[]},
{id:'portal',name:'myTischtennis.de',icon:'🏓',description:'Portal öffnen',url:'https://www.mytischtennis.de/',files:[]}
];
let links=[],layout=[],separatorTitles={};
const clone=x=>JSON.parse(JSON.stringify(x));
function normalizeLayout(value){
 const known=[...links.map(x=>'link:'+x.id),...teams.map(t=>'team:'+t.id)];
 const legacy={login:'link:login',clicktt:'link:clicktt',schedule:'link:schedule',portal:'link:portal'};
 const proposed=Array.isArray(value)?value.map(x=>legacy[x]||x):['link:login','link:clicktt',...teams.map(t=>'team:'+t.id),'link:schedule','link:portal'];
 return [...new Set([...proposed.filter(x=>known.includes(x)||x.startsWith('separator:')),...known])];
}
function migrate(data){
 teams=(data.teams||[]).map(t=>({...t,files:t.files||[],buttons:t.buttons||[]}));
 links=(Array.isArray(data.links)?data.links:defaultLinks).map(x=>({...x,files:x.files||[]}));
 if(!Array.isArray(data.links)){const schedule=links.find(x=>x.id==='schedule');schedule.url=data.scheduleUrl||defaultSchedule}
 separatorTitles=data.separatorTitles||{};layout=normalizeLayout(data.layout);
}
const labelFor=id=>id.startsWith('team:')?(teams.find(t=>'team:'+t.id===id)?.name||id):id.startsWith('link:')?(links.find(l=>'link:'+l.id===id)?.name||id):'Trennlinie';
const fileTitle=name=>String(name||'').replace(/\.[^.]+$/,'');
async function api(path,options={}){const r=await fetch(base()+path,{...options,headers:{...headers(),...(options.headers||{})}});if(!r.ok){let msg='';try{msg=(await r.json()).message||''}catch{}throw Error(`GitHub ${r.status}: ${msg}`)}return r.status===204?null:r.json()}
const path=p=>p.split('/').map(enc).join('/');
const utf8b64=s=>{let a=new TextEncoder().encode(s),v='';for(let i=0;i<a.length;i+=8192)v+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(v)};
const bytesb64=async f=>{let a=new Uint8Array(await f.arrayBuffer()),v='';for(let i=0;i<a.length;i+=8192)v+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(v)};
async function getFile(p){try{return await api(`/contents/${path(p)}?ref=${enc(settings.branch)}`)}catch(e){if(e.message.startsWith('GitHub 404'))return null;throw e}}
async function putFile(p,content,message){let old=await getFile(p);return api(`/contents/${path(p)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,content,branch:settings.branch,...(old?{sha:old.sha}:{})})})}
async function deleteFile(p){let old=await getFile(p);if(old)await api(`/contents/${path(p)}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:`TSV: Datei entfernen ${p}`,sha:old.sha,branch:settings.branch})})}
const validUrl=s=>{try{let u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:'#'}catch{return '#'}};
function fileHref(f){return f.path.split('/').map(enc).join('/')}
function fileButtons(files){return (files||[]).map(f=>`<a class="secondary-button" href="${esc(fileHref(f))}" target="_blank" rel="noopener">📄 ${esc(fileTitle(f.name))}</a>`).join('')}
function teamButtons(t){return (t.buttons||[]).map(b=>`<a class="secondary-button" href="${esc(validUrl(b.url))}" target="_blank" rel="noopener">${esc(b.label||'Link')}</a>`).join('')}
function renderPublic(){
 const grid=$('teamGrid');if(!grid)return;
 grid.innerHTML=layout.map(id=>{
  if(id.startsWith('separator:')){const title=separatorTitles[id]||'';return `<div class="section-divider">${title?`<span>${esc(title)}</span>`:''}</div>`}
  if(id.startsWith('team:')){
   const t=teams.find(x=>'team:'+x.id===id);if(!t)return '';
   return `<div class="tile"><div class="tile-icon">${esc(t.icon||'🏓')}</div><div><div class="tile-title">${esc(t.name)}</div><div class="tile-desc">Tabelle &amp; Ergebnisse</div><div class="tile-actions">${teamButtons(t)}${fileButtons(t.files)}</div></div><a href="${esc(validUrl(t.url))}" aria-label="${esc(t.name)} Tabelle und Ergebnisse" style="position:absolute;inset:0;border-radius:24px;z-index:1;"></a></div>`;
  }
  const l=links.find(x=>'link:'+x.id===id);if(!l)return '';
  return `<div class="tile"><div class="tile-icon">${esc(l.icon||'🔗')}</div><div><div class="tile-title">${esc(l.name)}</div><div class="tile-desc">${esc(l.description||'Link öffnen')}</div><div class="tile-actions">${fileButtons(l.files)}</div></div><a href="${esc(validUrl(l.url))}" aria-label="${esc(l.name)} öffnen" style="position:absolute;inset:0;border-radius:24px;z-index:1;"></a></div>`;
 }).join('');
}
async function loadPublic(){try{let r=await fetch(`teams.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw Error();migrate(await r.json());renderPublic()}catch(e){console.warn('Startseite konnte nicht geladen werden',e)}}
const makeId=()=>crypto.randomUUID?crypto.randomUUID():`t${Date.now()}${Math.random().toString(36).slice(2)}`;
function renderLayout(){
 const root=$('layoutEditors');root.replaceChildren();
 layout.forEach((id,i)=>{
  const row=document.createElement('div');row.className='sort-row';row.dataset.item=id;
  const grip=document.createElement('button');grip.type='button';grip.className='sort-grip secondary';grip.textContent='☰';grip.title='Gedrückt halten und verschieben';
  const name=document.createElement('span');name.className='sort-name';name.textContent=labelFor(id);row.append(grip,name);
  if(id.startsWith('separator:')){
   const input=document.createElement('input');input.placeholder='Optionale Überschrift';input.value=separatorTitles[id]||'';
   input.oninput=()=>separatorTitles[id]=input.value;row.append(input);
   const del=document.createElement('button');del.className='danger';del.textContent='✕';del.onclick=()=>{layout=layout.filter(x=>x!==id);delete separatorTitles[id];renderLayout()};row.append(del);
  }
  for(const [symbol,delta] of [['↑',-1],['↓',1]]){
   const b=document.createElement('button');b.className='secondary';b.textContent=symbol;b.disabled=i+delta<0||i+delta>=layout.length;b.onclick=()=>moveItem(id,i+delta);row.append(b);
  }
  root.append(row);
  // Pointer capture bleibt auf dem Griff; Ziel wird anhand der tatsächlichen Zeilenposition ermittelt.
  grip.addEventListener('pointerdown',e=>{
   if(e.pointerType==='mouse'&&e.button!==0)return;
   e.preventDefault();grip.setPointerCapture(e.pointerId);row.classList.add('dragging');
   const move=ev=>{
    const others=[...root.querySelectorAll('.sort-row')].filter(x=>x!==row);
    const target=others.find(x=>ev.clientY<x.getBoundingClientRect().top+x.getBoundingClientRect().height/2);
    root.insertBefore(row,target||null);
   };
   const finish=()=>{grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',finish);grip.removeEventListener('pointercancel',finish);row.classList.remove('dragging');layout=[...root.querySelectorAll('.sort-row')].map(x=>x.dataset.item);renderLayout()};
   grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',finish);grip.addEventListener('pointercancel',finish);
  });
 });
}
function moveItem(id,target){const i=layout.indexOf(id);if(i<0||target<0||target>=layout.length)return;layout.splice(i,1);layout.splice(target,0,id);renderLayout()}
function fileEditor(container,owner){
 const files=document.createElement('div');files.className='files';
 (owner.files||[]).forEach(f=>{
  const row=document.createElement('div');row.className='file-row';
  const a=document.createElement('a');a.textContent=fileTitle(f.name);a.href=fileHref(f);a.target='_blank';row.append(a);
  const b=document.createElement('button');b.textContent='Entfernen';b.className='danger';b.onclick=()=>{if(confirm(`Datei ${f.name} entfernen?`)){owner.files=owner.files.filter(x=>x!==f);pending=pending.filter(x=>x.path!==f.path);removed.push(f.path);renderEditors()}};row.append(b);files.append(row);
 });
 container.append(files);
 const drop=document.createElement('div');drop.className='drop';drop.tabIndex=0;drop.textContent='Dateien hierher ziehen oder tippen';
 const inp=document.createElement('input');inp.type='file';inp.multiple=true;inp.hidden=true;drop.append(inp);container.append(drop);
 drop.onclick=()=>inp.click();drop.onkeydown=e=>{if(e.key==='Enter')inp.click()};
 drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragover')};drop.ondragleave=()=>drop.classList.remove('dragover');
 drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragover');addFiles(owner,e.dataTransfer.files)};
 inp.onchange=()=>{addFiles(owner,inp.files);inp.value=''};
}
function field(container,label,value,oninput,type='text'){
 const l=document.createElement('label');l.textContent=label;
 const input=document.createElement('input');input.type=type;input.value=value||'';input.oninput=()=>oninput(input.value);l.append(input);container.append(l);return input;
}
function renderEditors(){
 renderLayout();
 const teamRoot=$('teamEditors');teamRoot.replaceChildren();
 teams.forEach(t=>{
  const div=document.createElement('div');div.className='team-editor';
  const heading=document.createElement('strong');heading.textContent=t.name;div.append(heading);
  field(div,'Mannschaft',t.name,v=>{t.name=v;heading.textContent=v});
  field(div,'Symbol / Kürzel',t.icon,v=>t.icon=v);
  field(div,'Link zur Mannschaftstabelle',t.url,v=>t.url=v,'url');
  const sub=document.createElement('h4');sub.textContent='Zusätzliche Link-Buttons';div.append(sub);
  (t.buttons||[]).forEach((b,i)=>{
   const line=document.createElement('div');line.className='button-editor';
   field(line,'Buttonbeschriftung',b.label,v=>b.label=v);
   field(line,'Zieladresse',b.url,v=>b.url=v,'url');
   const del=document.createElement('button');del.className='danger';del.textContent='Link entfernen';del.onclick=()=>{t.buttons.splice(i,1);renderEditors()};line.append(del);div.append(line);
  });
  const add=document.createElement('button');add.className='secondary';add.textContent='+ Link-Button';add.onclick=()=>{t.buttons.push({label:'Neuer Link',url:''});renderEditors()};div.append(add);
  fileEditor(div,t);
  const del=document.createElement('button');del.className='danger';del.textContent='Mannschaft löschen';
  del.onclick=()=>{if(confirm(`Mannschaft ${t.name} löschen?`)){removed.push(...t.files.map(x=>x.path));pending=pending.filter(x=>!x.path.startsWith(`uploads/${t.id}/`));teams=teams.filter(x=>x!==t);layout=layout.filter(x=>x!=='team:'+t.id);renderEditors()}};div.append(del);teamRoot.append(div);
 });
 const linkRoot=$('linkEditors');linkRoot.replaceChildren();
 links.forEach(l=>{
  const div=document.createElement('div');div.className='team-editor';
  const heading=document.createElement('strong');heading.textContent=l.name;div.append(heading);
  field(div,'Buttonbeschriftung',l.name,v=>{l.name=v;heading.textContent=v});
  field(div,'Icon (Emoji oder Kürzel)',l.icon,v=>l.icon=v);
  field(div,'Untertitel',l.description,v=>l.description=v);
  field(div,'Zieladresse',l.url,v=>l.url=v,'url');
  fileEditor(div,l);
  const del=document.createElement('button');del.className='danger';del.textContent='Kachel löschen';
  del.onclick=()=>{if(confirm(`Kachel ${l.name} löschen?`)){removed.push(...l.files.map(x=>x.path));pending=pending.filter(x=>!x.path.startsWith(`uploads/${l.id}/`));links=links.filter(x=>x!==l);layout=layout.filter(x=>x!=='link:'+l.id);renderEditors()}};div.append(del);linkRoot.append(div);
 });
}
function addFiles(t,files){for(let f of files){if(f.size>20*1024*1024){status(`${f.name}: maximal 20 MB pro Datei`);continue}let name=f.name.replace(/[\\/]/g,'_').replace(/[\u0000-\u001f]/g,'').trim();if(!name)continue;let p=`uploads/${t.id}/${name}`;if(t.files.some(x=>x.path===p)){if(!confirm(`${name} ersetzen?`))continue;t.files=t.files.filter(x=>x.path!==p)}t.files.push({name,path:p});pending=pending.filter(x=>x.path!==p);pending.push({file:f,path:p})}renderEditors()}
function adminVisibility(){let active=location.hash==='#admin';$('admin').classList.toggle('active',active);document.querySelector('main.app').style.display=active?'none':'';if(active)window.scrollTo(0,0)}
window.addEventListener('hashchange',adminVisibility);adminVisibility();$('closeAdmin').onclick=()=>location.hash='';
$('connect').onclick=async()=>{
 Object.assign(settings,{owner:$('owner').value.trim(),repo:$('repo').value.trim(),branch:$('branch').value.trim()||'main',token:$('token').value.trim()});
 if(!settings.owner||!settings.repo||!settings.token)return status('Repository und Token erforderlich.');
 try{
  status('Prüfe Zugriff …');
  const r=await api(`/contents/teams.json?ref=${enc(settings.branch)}`);
  const data=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(r.content.replace(/\\s/g,'')),c=>c.charCodeAt(0))));
  migrate(data);pending=[];removed=[];$('token').value='';
  $('loginArea').hidden=true;$('editorArea').hidden=false;renderEditors();
  status('Verbunden. Änderungen werden erst mit „Speichern“ veröffentlicht.');
 }catch(e){settings.token='';status('Verbindung fehlgeschlagen: '+e.message)}
};
$('addTeam').onclick=()=>{const t={id:makeId(),name:'Neue Mannschaft',icon:'🏓',url:'',files:[],buttons:[]};teams.push(t);layout.push('team:'+t.id);renderEditors()};
$('addLink').onclick=()=>{const l={id:makeId(),name:'Neue Verlinkung',icon:'🔗',description:'',url:'',files:[]};links.push(l);layout.push('link:'+l.id);renderEditors()};
$('addSeparator').onclick=()=>{const id='separator:'+makeId();separatorTitles[id]='';layout.push(id);renderLayout()};
$('saveAll').onclick=async()=>{
 if(busy)return;
 if(teams.some(t=>!t.name.trim()||!validUrl(t.url).startsWith('http')||(t.buttons||[]).some(b=>!b.label.trim()||!validUrl(b.url).startsWith('http'))))return status('Bitte Mannschaftsnamen und alle Mannschaftslinks vollständig eingeben.');
 if(links.some(l=>!l.name.trim()||!validUrl(l.url).startsWith('http')))return status('Bitte alle allgemeinen Kacheln mit Titel und gültiger URL versehen.');
 busy=true;$('saveAll').disabled=true;
 try{
  const allFiles=[...teams,...links].flatMap(x=>x.files||[]);
  const deleted=[...new Set(removed)].filter(p=>!allFiles.some(f=>f.path===p));
  let n=0,total=pending.length+deleted.length+1;
  for(const x of pending){status(`Upload ${++n}/${total}: ${x.file.name}`);await putFile(x.path,await bytesb64(x.file),`TSV: ${x.file.name} hochladen`)}
  for(const p of deleted){status(`Löschen ${++n}/${total}: ${p}`);await deleteFile(p)}
  status(`Speichere Konfiguration ${++n}/${total}`);
  await putFile('teams.json',utf8b64(JSON.stringify({version:4,teams,links,layout,separatorTitles},null,2)),'TSV: Homepage aktualisieren');
  pending=[];removed=[];status('Erfolgreich gespeichert! GitHub Pages aktualisiert die Webseite kurz danach.');renderEditors();renderPublic();
 }catch(e){status('Speichern unterbrochen: '+e.message+' – erneut versuchen.')}finally{busy=false;$('saveAll').disabled=false}
};
$('logout').onclick=()=>{settings.token='';$('editorArea').hidden=true;$('loginArea').hidden=false;pending=[];removed=[];status('Abgemeldet.')};
loadPublic();
})();
