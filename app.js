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
const defaultSubtitle='TSV Aue-Wingeshausen · Saison 2026/27';
let links=[],layout=[],separatorTitles={},subtitle=defaultSubtitle;
const normalizeFiles=files=>(files||[]).map(f=>({...f,label:typeof f.label==='string'?f.label:fileTitle(f.name||f.path?.split('/').pop())}));
function renderHeader(){
 $('pageSubtitle').textContent=subtitle;
 const now=new Date();
 $('currentDate').textContent=[now.getDate(),now.getMonth()+1,now.getFullYear()].map((v,i)=>i<2?String(v).padStart(2,'0'):String(v)).join('.');
 $('currentDate').dateTime=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
const clone=x=>JSON.parse(JSON.stringify(x));
function normalizeLayout(value){
 const known=[...links.map(x=>'link:'+x.id),...teams.map(t=>'team:'+t.id)];
 const legacy={login:'link:login',clicktt:'link:clicktt',schedule:'link:schedule',portal:'link:portal'};
 const proposed=Array.isArray(value)?value.map(x=>legacy[x]||x):['link:login','link:clicktt',...teams.map(t=>'team:'+t.id),'link:schedule','link:portal'];
 return [...new Set([...proposed.filter(x=>known.includes(x)||x.startsWith('separator:')),...known])];
}
function migrate(data){
 teams=(data.teams||[]).map(t=>({...t,files:normalizeFiles(t.files),buttons:t.buttons||[]}));
 links=(Array.isArray(data.links)?data.links:defaultLinks).map(x=>({...x,files:normalizeFiles(x.files)}));
 if(!Array.isArray(data.links)){const schedule=links.find(x=>x.id==='schedule');schedule.url=data.scheduleUrl||defaultSchedule}
 subtitle=typeof data.subtitle==='string'?data.subtitle:defaultSubtitle;
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
function fileButtons(files){return (files||[]).map(f=>`<a class="secondary-button" href="${esc(fileHref(f))}" target="_blank" rel="noopener">📄 ${esc(f.label??fileTitle(f.name))}</a>`).join('')}
function teamButtons(t){return (t.buttons||[]).map(b=>`<a class="secondary-button" href="${esc(validUrl(b.url))}" target="_blank" rel="noopener">${esc(b.label||'Link')}</a>`).join('')}
function tileLink(owner,label){
 const href=validUrl(owner.url);
 return href==='#'?'':`<a href="${esc(href)}" aria-label="${esc(label)}" style="position:absolute;inset:0;border-radius:24px;z-index:1;"></a>`;
}
function renderPublic(){
 renderHeader();
 const grid=$('teamGrid');if(!grid)return;
 grid.innerHTML=layout.map(id=>{
  if(id.startsWith('separator:')){const title=separatorTitles[id]||'';return `<div class="section-divider">${title?`<span>${esc(title)}</span>`:''}</div>`}
  if(id.startsWith('team:')){
   const t=teams.find(x=>'team:'+x.id===id);if(!t)return '';
   return `<div class="tile"><div class="tile-icon">${esc(t.icon||'🏓')}</div><div><div class="tile-title">${esc(t.name)}</div><div class="tile-desc">${t.url?'Tabelle &amp; Ergebnisse':'Dateien öffnen'}</div><div class="tile-actions">${teamButtons(t)}${fileButtons(t.files)}</div></div>${tileLink(t,t.name+' Tabelle und Ergebnisse')}</div>`;
  }
  const l=links.find(x=>'link:'+x.id===id);if(!l)return '';
  return `<div class="tile"><div class="tile-icon">${esc(l.icon||'🔗')}</div><div><div class="tile-title">${esc(l.name)}</div><div class="tile-desc">${esc(l.description||(l.url?'Link öffnen':'Dateien öffnen'))}</div><div class="tile-actions">${fileButtons(l.files)}</div></div>${tileLink(l,l.name+' öffnen')}</div>`;
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
  const details=document.createElement('div');details.className='file-details';
  const a=document.createElement('a');a.textContent=f.name;a.href=fileHref(f);a.target='_blank';a.rel='noopener';details.append(a);
  field(details,'Dateibeschriftung',f.label,v=>f.label=v);row.append(details);
  const b=document.createElement('button');b.textContent='Entfernen';b.className='danger';b.onclick=()=>{owner.files=owner.files.filter(x=>x!==f);pending=pending.filter(x=>x.path!==f.path);removed.push(f.path);renderEditors()};row.append(b);files.append(row);
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
function iconPicker(container,value,oninput){
 const input=field(container,'Icon / eigenes Kürzel',value,oninput);
 const choices=document.createElement('div');choices.className='icon-choices';
 for(const [icon,name] of [['🏓','Tischtennis'],['🔗','Link'],['📄','Datei'],['📁','Ordner'],['📅','Kalender'],['🔐','Login'],['🏆','Pokal'],['👥','Mannschaft'],['🧒','Jugend'],['📍','Ort'],['ℹ️','Information'],['📢','Neuigkeiten'],['⭐','Stern'],['🏠','Startseite']]){
  const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=icon;button.title=name;button.setAttribute('aria-label',name);
  button.setAttribute('aria-pressed',String(icon===value));
  button.onclick=()=>{input.value=icon;oninput(icon);for(const b of choices.children)b.setAttribute('aria-pressed',String(b===button))};choices.append(button);
 }
 input.oninput=()=>{oninput(input.value);for(const b of choices.children)b.setAttribute('aria-pressed',String(b.textContent===input.value))};container.append(choices);
}
function validTile(owner){
 const url=(owner.url||'').trim();
 return Boolean(owner.name.trim())&&(url?validUrl(url)!=='#':Boolean(owner.files?.length));
}
function renderEditors(){
 $('subtitleEditor').value=subtitle;
 renderLayout();
 const teamRoot=$('teamEditors');teamRoot.replaceChildren();
 teams.forEach(t=>{
  const div=document.createElement('div');div.className='team-editor';
  const heading=document.createElement('strong');heading.textContent=t.name;div.append(heading);
  field(div,'Mannschaft',t.name,v=>{t.name=v;heading.textContent=v});
  iconPicker(div,t.icon,v=>t.icon=v);
  field(div,'Link zur Mannschaftstabelle (optional bei Dateien)',t.url,v=>t.url=v,'url');
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
  del.onclick=()=>{removed.push(...t.files.map(x=>x.path));pending=pending.filter(x=>!x.path.startsWith(`uploads/${t.id}/`));teams=teams.filter(x=>x!==t);layout=layout.filter(x=>x!=='team:'+t.id);renderEditors()};div.append(del);teamRoot.append(div);
 });
 const linkRoot=$('linkEditors');linkRoot.replaceChildren();
 links.forEach(l=>{
  const div=document.createElement('div');div.className='team-editor';
  const heading=document.createElement('strong');heading.textContent=l.name;div.append(heading);
  field(div,'Buttonbeschriftung',l.name,v=>{l.name=v;heading.textContent=v});
  iconPicker(div,l.icon,v=>l.icon=v);
  field(div,'Untertitel',l.description,v=>l.description=v);
  field(div,'Zieladresse (optional bei Dateien)',l.url,v=>l.url=v,'url');
  fileEditor(div,l);
  const del=document.createElement('button');del.className='danger';del.textContent='Kachel löschen';
  del.onclick=()=>{removed.push(...l.files.map(x=>x.path));pending=pending.filter(x=>!x.path.startsWith(`uploads/${l.id}/`));links=links.filter(x=>x!==l);layout=layout.filter(x=>x!=='link:'+l.id);renderEditors()};div.append(del);linkRoot.append(div);
 });
}
function addFiles(t,files){for(let f of files){if(f.size>20*1024*1024){status(`${f.name}: maximal 20 MB pro Datei`);continue}let name=f.name.replace(/[\\/]/g,'_').replace(/[\u0000-\u001f]/g,'').trim();if(!name)continue;let p=`uploads/${t.id}/${name}`;if(t.files.some(x=>x.path===p)){if(!confirm(`${name} ersetzen?`))continue;t.files=t.files.filter(x=>x.path!==p)}t.files.push({name,path:p,label:fileTitle(f.name)});pending=pending.filter(x=>x.path!==p);pending.push({file:f,path:p})}renderEditors()}
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
 if(teams.some(t=>!validTile(t)||(t.buttons||[]).some(b=>!b.label.trim()||!validUrl(b.url).startsWith('http'))))return status('Bitte Mannschaftsnamen und einen gültigen Link oder mindestens eine Datei eingeben. Zusatzlinks benötigen Beschriftung und gültige URL.');
 if(links.some(l=>!validTile(l)))return status('Bitte jede allgemeine Kachel mit Titel und einem gültigen Link oder mindestens einer Datei versehen.');
 busy=true;$('saveAll').disabled=true;
 try{
  const allFiles=[...teams,...links].flatMap(x=>x.files||[]);
  const deleted=[...new Set(removed)].filter(p=>!allFiles.some(f=>f.path===p));
  let n=0,total=pending.length+deleted.length+1;
  for(const x of pending){status(`Upload ${++n}/${total}: ${x.file.name}`);await putFile(x.path,await bytesb64(x.file),`TSV: ${x.file.name} hochladen`)}
  for(const p of deleted){status(`Löschen ${++n}/${total}: ${p}`);await deleteFile(p)}
  status(`Speichere Konfiguration ${++n}/${total}`);
  await putFile('teams.json',utf8b64(JSON.stringify({version:5,subtitle,teams,links,layout,separatorTitles},null,2)),'TSV: Homepage aktualisieren');
  pending=[];removed=[];status('Erfolgreich gespeichert! GitHub Pages aktualisiert die Webseite kurz danach.');renderEditors();renderPublic();
 }catch(e){status('Speichern unterbrochen: '+e.message+' – erneut versuchen.')}finally{busy=false;$('saveAll').disabled=false}
};
$('logout').onclick=()=>{settings.token='';$('editorArea').hidden=true;$('loginArea').hidden=false;pending=[];removed=[];status('Abgemeldet.')};
$('subtitleEditor').oninput=()=>subtitle=$('subtitleEditor').value;
renderHeader();setInterval(renderHeader,30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderHeader()});
loadPublic();
})();
