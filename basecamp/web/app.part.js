(function(){
"use strict";
/* ---------- shared template library (injected from logos-production-office/src/qml/templates.js) ---------- */
/*@@TEMPLATES@@*/

var LOGO="@@LOGO@@";
// Portfolio video URLs, keyed by SHOWCASE file name: {video, poster}. Filled in at build time.
var SHOWCASE_URLS=/*@@SHOWCASE_URLS@@*/{};

/* ---------- state ---------- */
var S={db:null,user:null,assets:null,downloads:null,mode:"loading",events:{},order:[],cur:null,mod:"overview",creating:false,panel:"home",readOnly:false,newFmt:"festival",pending:{},inflight:{},writing:{},timers:{},stale:false,armed:null,builder:null,
  showcase:null,showEdit:false,reel:{},reelItems:{},lightbox:null,uploading:0,archMod:"general",deferRender:false,scTimer:null,scWriting:false};
try{var saved=JSON.parse(localStorage.getItem("epo-view")||"{}");if(saved.cur)S.cur=saved.cur;if(saved.mod)S.mod=saved.mod;if(typeof saved.panel==="string")S.panel=saved.panel==="builder"?"":saved.panel}catch(e){}
function remember(){try{localStorage.setItem("epo-view",JSON.stringify({cur:S.cur,mod:S.mod,panel:S.panel}))}catch(e){}}
function SL(){return '<span class="sl">//</span>'}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function ev(){return S.events[S.cur]}
function toast(m){var el=document.getElementById("toast");el.textContent=m;el.classList.add("on");clearTimeout(toast._t);toast._t=setTimeout(function(){el.classList.remove("on")},2200)}
function fmtLabel(f){return FORMATS[f]?FORMATS[f].label:""}

/* ---------- writes ---------- */
function patch(id,fields){
  var e=S.events[id];if(!e)return;
  Object.keys(fields).forEach(function(k){e[k]=fields[k]});
  if(S.mode!=="db"||S.readOnly)return;
  S.pending[id]=Object.assign(S.pending[id]||{},fields);
  clearTimeout(S.timers[id]);S.timers[id]=setTimeout(function(){flush(id)},650);
}
function flush(id){
  if(S.writing[id]){S.timers[id]=setTimeout(function(){flush(id)},300);return}
  var f=S.pending[id];if(!f)return;delete S.pending[id];
  f.updatedAt=new Date().toISOString();S.inflight[id]=f;S.writing[id]=true;setSync("Saving…");
  S.db.collection("events").doc(id).update(f).then(function(){S.writing[id]=false;delete S.inflight[id];setSync("Saved")},function(err){
    S.writing[id]=false;delete S.inflight[id];
    if(err&&err.code==="invalid_argument"){S.readOnly=true;setSync("View only");render();toast("You can view this office but not edit it")}
    else if(err&&err.code==="unavailable"){S.pending[id]=Object.assign(f,S.pending[id]||{});setTimeout(function(){flush(id)},800+Math.random()*800)}
    else{setSync("Not saved");toast("Change not saved: "+(err&&err.message||"try again"))}
  });
}
function setSync(t){var el=document.getElementById("sync");if(el)el.textContent=t}
// Patch and write straight away (used right after an upload, so the file is never left without its record).
function patchNow(id,fields){patch(id,fields);if(S.mode==="db"&&!S.readOnly){clearTimeout(S.timers[id]);flush(id)}}
// Patch the fields a custom-module change touches.
function patchCustom(id){var e=S.events[id],f={custom:e.custom,modules:e.modules};(e.custom||[]).forEach(function(c){f[c.id]=e[c.id]||[]});patch(id,f)}

/* ---------- render: sidebar ---------- */
function sortedEvents(){return S.order.slice().sort(function(a,b){return (S.events[a].startDate||"9").localeCompare(S.events[b].startDate||"9")})}
function renderSide(){
  var e=ev(),home=S.panel==="home";
  var h='<button class="brand" data-act="home" aria-label="INTERSECT home"><img src="'+LOGO+'" alt="INTERSECT"><span class="kicker">Production office</span></button>';
  h+='<div class="evlist"><button class="homebtn" data-act="home" aria-current="'+home+'">Home</button></div>';
  h+='<div style="display:flex;flex-direction:column;gap:8px"><div class="label">Events</div><div class="evlist">';
  sortedEvents().forEach(function(id){var x=S.events[id];h+='<button class="evbtn" data-act="pick" data-id="'+esc(id)+'" aria-current="'+(id===S.cur&&!S.creating&&!S.panel)+'"><span class="n">'+esc(x.name)+'</span><span class="m">'+esc(fmtLabel(x.format))+(x.startDate?" · "+shortDate(x.startDate):"")+'</span></button>'});
  h+='</div>'+(S.readOnly?'':'<button class="btn small" data-act="new">+ New event</button>')+'</div>';
  if(e&&!S.creating&&!S.panel){
    h+='<div style="display:flex;flex-direction:column;gap:8px"><div class="label">Modules</div><nav class="modnav">';
    eventModules(e).forEach(function(m){h+='<button class="modbtn" data-act="mod" data-m="'+esc(m)+'" aria-current="'+(S.mod===m)+'"><span>'+esc(moduleTitle(e,m))+'</span><span class="c">'+modCount(e,m)+'</span></button>'});
    h+='</nav>'+(S.readOnly?'':'<button class="btn small" data-act="builder" data-id="">+ Custom module</button>')+'</div>';
  }
  h+='<div class="sync" id="sync" style="margin-top:auto">'+(S.mode==="db"?(S.readOnly?"View only":"Synced · shared with your team"):S.mode==="local"?"Preview mode · not saved":"")+'</div>';
  document.getElementById("side").innerHTML=h;
  var m='<div class="row" style="justify-content:space-between"><button class="brand" data-act="home" aria-label="INTERSECT home"><img src="'+LOGO+'" alt="INTERSECT"></button><button class="btn small" data-act="home">Home</button></div><div class="row"><label for="mev" style="position:absolute;left:-9999px">Event</label><select id="mev">';
  if(home||!S.order.length)m+='<option value="" selected>Choose an event</option>';
  sortedEvents().forEach(function(id){m+='<option value="'+esc(id)+'"'+(id===S.cur&&!home?' selected':'')+'>'+esc(S.events[id].name)+'</option>'});
  m+='</select>'+(S.readOnly?'':'<button class="btn small" data-act="new">+ New</button>')+'</div>';
  if(e&&!S.creating&&!S.panel){m+='<div class="mtabs">';eventModules(e).forEach(function(x){m+='<button class="modbtn" data-act="mod" data-m="'+esc(x)+'" aria-current="'+(S.mod===x)+'">'+esc(moduleTitle(e,x))+'</button>'});m+='</div>'}
  document.getElementById("mtop").innerHTML=m;
}

/* ---------- render: cells & tables ---------- */
function colMin(c){var t=c[2];if(t==="calc"&&c[4]==="text")return 420;return {long:250,select:130,money:100,num:90,date:150,time:96,check:64,score:60,calc:100,tminus:150}[t]||180}
function cell(k,c,r){
  var e=ev(),key=c[0],type=c[2],v=r[key],ro=S.readOnly?" disabled":"";
  var id=S.cur+"-"+k+"-"+r.id+"-"+key;
  var a=' id="'+esc(id)+'" data-t="'+esc(k)+'" data-r="'+esc(r.id)+'" data-c="'+esc(key)+'" aria-label="'+esc(c[1])+'"'+ro;
  var mw=' style="min-width:'+colMin(c)+'px"';
  if(type==="select"){var pill=isPill(c);var o=c[3].map(function(x){return '<option'+(String(v)===x?' selected':'')+'>'+esc(x)+'</option>'}).join("");return '<td'+mw+'><select'+a+(pill?' class="pill" data-k="'+pillKind(String(v||""))+'"':'')+'>'+(v?'':'<option value="" selected></option>')+o+'</select></td>'}
  if(type==="check")return '<td class="c"><input type="checkbox"'+a+(v?' checked':'')+'></td>';
  if(type==="money"||type==="num")return '<td'+mw+'><input type="number" inputmode="decimal" step="any"'+a+' value="'+esc(v)+'"></td>';
  if(type==="date")return '<td'+mw+'><input type="date"'+a+' value="'+esc(v)+'"></td>';
  if(type==="time")return '<td'+mw+'><input type="time"'+a+' value="'+esc(v)+'"></td>';
  if(type==="long")return '<td'+mw+'><textarea rows="1" class="cell"'+a+'>'+esc(v)+'</textarea></td>';
  if(type==="score"){var s=riskScore(r);return '<td><span class="score '+(s>=12?"hi":s>=6?"md":"lo")+'">'+(s||"–")+'</span></td>'}
  if(type==="calc")return '<td'+mw+'><div class="calc'+(c[4]==="text"?"":" r")+'">'+esc(calcText(e,c,r))+'</div></td>';
  if(type==="tminus"){var due=e.startDate?addDays(e.startDate,-7*(+v||0)):"";var late=due&&dayDiff(due)<0&&r.status!=="Done";return '<td'+mw+'><div class="tm"><span>T</span><input type="number" step="1"'+a+' value="'+esc(v)+'" title="Weeks before show day; negative for after"><span class="due'+(late?" late":"")+'">'+(due?shortDate(due):"")+'</span></div></td>'}
  return '<td'+mw+'><input type="text"'+a+' value="'+esc(v)+'"></td>';
}
function tableBlock(k){
  var e=ev(),t=tableOf(e,k);if(!t)return "";var rs=sortedRows(e,k);
  var h='<section class="block"><div class="bhead"><div><h2>'+esc(t.t)+'</h2>'+(t.lead?'<p>'+esc(t.lead)+'</p>':'')+'</div><span class="chip">'+rs.length+' row'+(rs.length===1?"":"s")+'</span></div><div class="tw"><table><thead><tr>';
  t.cols.forEach(function(c){h+='<th'+(c[2]==="money"||c[2]==="num"||(c[2]==="calc"&&c[4]!=="text")?' class="num"':'')+'>'+esc(c[1])+(c[2]==="money"?" ("+esc(e.currency||"EUR")+")":"")+'</th>'});
  h+='<th></th></tr></thead><tbody>';
  if(!rs.length)h+='<tr><td colspan="'+(t.cols.length+1)+'" style="padding:14px 10px;color:var(--muted)">Nothing here yet. Add the first row below.</td></tr>';
  rs.forEach(function(r){h+='<tr>';t.cols.forEach(function(c){h+=cell(k,c,r)});h+='<td class="x">'+(S.readOnly?'':'<button class="del'+(S.armed===k+r.id?' arm':'')+'" data-act="delrow" data-t="'+esc(k)+'" data-r="'+esc(r.id)+'" aria-label="Delete row">'+(S.armed===k+r.id?'Delete':'×')+'</button>')+'</td></tr>'});
  h+='</tbody></table></div><div class="tfoot">'+(S.readOnly?'<span></span>':'<button class="btn small" data-act="addrow" data-t="'+esc(k)+'">+ Add row</button>');
  if(t.totals){h+='<span class="tot">'+t.totals.map(function(f){var x=columnTotal(e,k,f);return esc(x.label)+": "+(x.isMoney?money(x.value,e.currency):count(x.value))}).join(" · ")+'</span>'}
  return h+'</div></section>';
}
function tiles(list){
  return '<div class="stats">'+list.map(function(s){return '<div class="stat'+(s.bad?" bad":"")+'"><span class="label">'+esc(s.label)+'</span><span class="v">'+esc(s.value)+'</span>'+(s.bar!==undefined&&s.bar>=0?'<div class="tile-bar"><i style="width:'+Math.round(Math.max(0,Math.min(1,s.bar))*100)+'%"></i></div>':'')+'<span class="s">'+esc(s.sub||"")+'</span></div>'}).join("")+'</div>';
}
function briefBlock(){
  var e=ev(),b=e.brief||{},ro=S.readOnly?" disabled":"";
  function f(key,label,type,wide,opts,val,scope){var id="f-"+scope+"-"+key;var a=' id="'+id+'" data-scope="'+scope+'" data-k="'+key+'"'+ro;var inp;
    if(type==="area")inp='<textarea'+a+'>'+esc(val)+'</textarea>';
    else if(type==="select")inp='<select'+a+'>'+opts.map(function(o){var v=Array.isArray(o)?o[0]:o,l=Array.isArray(o)?o[1]:o;return '<option value="'+esc(v)+'"'+(String(val)===v?' selected':'')+'>'+esc(l)+'</option>'}).join("")+'</select>';
    else inp='<input type="'+(type==="money"||type==="num"?"number":type==="date"?"date":"text")+'"'+a+' value="'+esc(val)+'">';
    return '<div class="field'+(wide?" wide":"")+'"><label for="'+id+'">'+esc(label)+'</label>'+inp+'</div>'}
  var h='<section class="block"><div class="bhead"><div><h2>Event details</h2><p>No supplier is booked until this page is signed off.</p></div></div><div class="form">';
  EVENT_FIELDS.forEach(function(x){
    var opts=x[2]==="format"?FORMAT_ORDER.map(function(k){return [k,FORMATS[k].label]}):x[3];
    h+=f(x[0],x[1],x[2]==="format"?"select":x[2],false,opts,x[0]==="currency"?(e.currency||"EUR"):e[x[0]],"ev");
  });
  h+='</div></section><section class="block"><div class="bhead"><div><h2>Brief</h2><p>Concept, audience and the commitments that never bend.</p></div></div><div class="form">';
  BRIEF_FIELDS.forEach(function(x){h+=f(x[0],x[1],x[2],x[3]===true,x[3]===true?null:x[3],b[x[0]],"brief")});
  return h+'</div></section>';
}
function debriefBlock(){
  var e=ev();return '<section class="block"><div class="bhead"><div><h2>Debrief notes</h2><p>Did we hit each KPI? Where did money leak? Who do we rebook? What starts earlier next time?</p></div></div><div class="form"><div class="field wide"><label for="f-ev-debrief">Notes</label><textarea id="f-ev-debrief" data-scope="ev" data-k="debrief" style="min-height:140px"'+(S.readOnly?" disabled":"")+'>'+esc(e.debrief)+'</textarea></div></div></section>';
}

/* ---------- render: overview ---------- */
function overview(){
  var e=ev(),h=tiles(overviewStats(e));
  var up=nextMilestones(e,5);
  h+='<section class="block"><div class="bhead"><div><h2>Next milestones</h2><p>'+(e.startDate?'Counted back from show day, '+fmtDate(e.startDate)+'.':'Set a show day in the brief to date these.')+'</p></div><button class="btn small" data-act="mod" data-m="timeline">Open timeline</button></div><div class="list">';
  if(!up.length)h+='<div class="li"><span></span><span style="color:var(--muted)">All milestones done.</span><span></span></div>';
  up.forEach(function(x){h+='<div class="li"><span class="k">'+esc(x.t)+'</span><span>'+esc(x.what)+(x.owner?' <span style="color:var(--muted)">· '+esc(x.owner)+'</span>':'')+'</span><span class="chip'+(x.late?" bad":x.soon?" tape":"")+'">'+esc(x.due)+'</span></div>'});
  h+='</div></section>';
  var risks=topRisks(e,3);
  if(risks.length){h+='<section class="block"><div class="bhead"><div><h2>Top risks</h2></div><button class="btn small" data-act="mod" data-m="risks">Open register</button></div><div class="list">';
    risks.forEach(function(x){h+='<div class="li"><span class="score '+(x.s>=12?"hi":x.s>=6?"md":"lo")+'">'+x.s+'</span><span>'+esc(x.risk)+(x.fallback?' <span style="color:var(--muted)">· fallback: '+esc(x.fallback)+'</span>':'')+'</span><span class="chip">'+(x.owner?esc(x.owner):"No owner")+'</span></div>'});
    h+='</div></section>'}
  h+='<section class="block"><div class="bhead"><div><h2>Modules</h2><p>Switched on for this '+esc(fmtLabel(e.format).toLowerCase()||"event")+'. Add others or build your own below.</p></div></div><div class="modgrid">';
  eventModules(e).filter(function(m){return m!=="overview"}).forEach(function(m){var c=modCount(e,m),p=c?c.split("/"):null,nf=archiveFor(e.archive,m==="archive"?"":m).length;
    var sub=m==="archive"?(nf?nf+" file"+(nf===1?"":"s")+" · "+humanSize(archiveStats(e.archive).size):"No files yet"):m==="showreel"?(archiveVideos(e.archive).length+" video"+(archiveVideos(e.archive).length===1?"":"s")):(p?c+' complete':'Open')+(nf?' · '+nf+' file'+(nf===1?'':'s'):'');
    h+='<button class="modcard" data-act="mod" data-m="'+esc(m)+'"><b>'+esc(moduleTitle(e,m))+(isCustom(m)?' <span class="custom-tag">· custom</span>':'')+'</b>'+(p&&m!=="archive"?'<div class="bar"><i style="width:'+(p[0]/p[1]*100)+'%"></i></div>':'')+'<span class="s">'+esc(sub)+'</span></button>'});
  h+='</div>';
  if(!S.readOnly){
    var missing=MOD_ORDER.filter(function(m){return e.modules.indexOf(m)<0}),lib=customLibrary(S.events,e);
    h+='<div class="tfoot"><div class="addmods"><span class="label" style="align-self:center">Add module</span><button class="btn small tape" data-act="builder" data-id="">+ Custom module</button>';
    lib.forEach(function(l,i){h+='<button class="btn small" data-act="libcopy" data-i="'+i+'">+ '+esc(l.title)+' <span class="custom-tag">from '+esc(l.from)+'</span></button>'});
    missing.forEach(function(m){h+='<button class="btn small" data-act="addmod" data-m="'+m+'">+ '+esc(MODULES[m].t)+'</button>'});
    h+='</div></div>';
  }
  return h+'</section>';
}

/* ---------- render: custom module builder ---------- */
function builderView(){
  var b=S.builder,editing=!!b.id;
  var h='<div class="builder"><h1>'+(editing?'Edit '+esc(b.title):'New custom module')+'</h1><p class="lead">Name the module and choose its columns. It works like any other module: rows, totals for number and money columns, and progress for status and checkbox columns.</p>';
  h+='<div class="bgrid"><div class="field"><label for="b-title">Module name</label><input id="b-title" data-bf="title" type="text" placeholder="e.g. Volunteer shifts" value="'+esc(b.title)+'"></div><div class="field"><label for="b-lead">Description (optional)</label><input id="b-lead" data-bf="lead" type="text" placeholder="One line on what this tracks" value="'+esc(b.lead)+'"></div></div>';
  h+='<section class="block" style="margin:0"><div class="bhead"><div><h2>Columns</h2><p>Status columns show as coloured pills and count toward progress. Choice lists take options separated by commas.</p></div></div><div class="brows">';
  b.rows.forEach(function(r,i){
    h+='<div class="brow"><span class="n">'+(i+1)+'</span><input id="b-l-'+i+'" data-bi="'+i+'" data-bk="label" type="text" placeholder="Column name" aria-label="Column '+(i+1)+' name" value="'+esc(r.label)+'">';
    h+='<select id="b-t-'+i+'" data-bi="'+i+'" data-bk="type" aria-label="Column '+(i+1)+' type">'+CUSTOM_TYPES.map(function(t){return '<option value="'+t[0]+'"'+(r.type===t[0]?' selected':'')+'>'+esc(t[1])+'</option>'}).join("")+'</select>';
    h+=r.type==="select"?'<input class="opt" id="b-o-'+i+'" data-bi="'+i+'" data-bk="options" type="text" placeholder="Options, e.g. Small, Medium, Large" aria-label="Column '+(i+1)+' options" value="'+esc(r.options||"")+'">':'<span class="opt"></span>';
    h+='<span class="acts"><button class="btn small" data-act="bmove" data-i="'+i+'" data-d="-1" aria-label="Move up">↑</button><button class="btn small" data-act="bmove" data-i="'+i+'" data-d="1" aria-label="Move down">↓</button><button class="btn small" data-act="bremove" data-i="'+i+'">Remove</button></span></div>';
  });
  h+='</div><div class="tfoot"><button class="btn small" data-act="badd">+ Add column</button></div></section>';
  h+='<div class="row"><button class="btn tape" data-act="bsave">'+(editing?'Save changes':'Add module')+'</button><button class="btn" data-act="bcancel">Cancel</button>';
  if(editing)h+='<span style="width:24px"></span><button class="btn danger" data-act="bdelete">'+(S.armed==="cm"+b.id?'Delete module and its rows':'Delete module')+'</button>';
  return h+'</div></div>';
}

/* ---------- render: home ---------- */
function showcaseItems(){
  var list=S.showcase&&Array.isArray(S.showcase.items)?S.showcase.items:SHOWCASE.map(function(d){var u=SHOWCASE_URLS[d.file]||{};return {key:d.key,title:d.title,caption:d.caption,url:u.video||"",poster:u.poster||""}});
  return list.filter(function(x){return x&&x.url});
}
function canUpload(){return S.mode==="db"&&!!S.assets&&!S.readOnly}
function homeView(){
  var first=sortedEvents()[0],nMods=MOD_ORDER.length-1;
  var h='<div class="home"><section class="hero"><div><img class="logo" src="'+LOGO+'" alt="INTERSECT, art, technology, culture"><h1>Events<br>at the edge'+SL()+'</h1></div>';
  h+='<div><p class="lead">'+esc(BRAND.lead)+'</p>'+BRAND.paragraphs.map(function(p){return '<p>'+esc(p)+'</p>'}).join("");
  h+='<div class="cta">'+(S.readOnly?'':'<button class="btn tape" data-act="new">Start a production file</button>')+(first?'<button class="btn" data-act="pick" data-id="'+esc(first)+'">Open '+esc(S.events[first].name)+'</button>':'')+'</div></div></section>';
  h+='<div class="facts"><div class="fact"><b>'+FORMAT_ORDER.length+'</b><span>Event formats</span></div><div class="fact"><b>'+nMods+'</b><span>Built-in modules</span></div><div class="fact"><b>2–12 mo</b><span>Campaign arcs</span></div><div class="fact"><b>20+ yrs</b><span>Lessons, built in</span></div></div>';
  // showreel
  var items=showcaseItems(),editable=canUpload();
  h+='<section><div class="sec-title">Portfolio '+SL()+' previous events</div>';
  h+=reel("home",items.map(function(x){return {title:x.title,caption:x.caption,url:x.url,poster:x.poster}}),{empty:"Portfolio videos appear here."});
  if(editable)h+='<div class="row" style="margin-top:10px"><button class="btn small" data-act="scedit">'+(S.showEdit?'Done managing videos':'Manage videos')+'</button></div>';
  if(editable&&S.showEdit)h+=showcaseEditor();
  h+='</section>';
  h+='<div class="open"><span class="tag">Open source</span><p>'+esc(BRAND.open)+'</p></div>';
  h+='<section><div class="sec-title">Formats '+SL()+' start from a template</div><div class="formats">';
  FORMAT_ORDER.forEach(function(k){h+='<button class="fmt" data-act="fmtstart" data-f="'+k+'"'+(S.readOnly?' disabled':'')+'><b>'+esc(FORMATS[k].label)+'</b><span>'+esc(FORMATS[k].blurb)+'</span></button>'});
  h+='</div></section>';
  h+='<div class="clients"><span>Worked with</span>'+BRAND.clients.map(function(c){return '<b>'+esc(c)+'</b>'}).join('<span>'+SL()+'</span>')+'</div>';
  return h+'</div>';
}
function showcaseEditor(){
  var list=showcaseItems(),h='<div class="reel-edit"><div class="label">Videos in the carousel</div>';
  list.forEach(function(x,i){h+='<div class="er"><span class="label">'+(i+1<10?"0":"")+(i+1)+'</span><input id="sc-t-'+i+'" data-sc="title" data-i="'+i+'" aria-label="Title" value="'+esc(x.title)+'"><input id="sc-c-'+i+'" data-sc="caption" data-i="'+i+'" aria-label="Caption" placeholder="Caption" value="'+esc(x.caption)+'"><span class="row"><button class="btn small" data-act="scmove" data-i="'+i+'" data-d="-1" aria-label="Move up">↑</button><button class="btn small" data-act="scmove" data-i="'+i+'" data-d="1" aria-label="Move down">↓</button><button class="btn small'+(S.armed==="sc"+i?' danger':'')+'" data-act="scdel" data-i="'+i+'">'+(S.armed==="sc"+i?'Remove from carousel':'Remove')+'</button></span></div>'});
  h+='<div class="row"><label class="btn small tape" for="sc-add">+ Add video</label><input id="sc-add" type="file" accept="video/mp4,video/webm" multiple hidden><span class="label">MP4 or WebM, up to 20 MB each</span></div>';
  return h+'</div>';
}
/* ---------- video carousel ---------- */
function reel(prefix,items,opts){
  S.reelItems[prefix]=items;S.reelOpts=S.reelOpts||{};S.reelOpts[prefix]=opts||{};
  return '<div class="reel" id="reel-'+prefix+'">'+reelInner(prefix)+'</div>';
}
function reelInner(prefix){
  var items=S.reelItems[prefix]||[],opts=(S.reelOpts||{})[prefix]||{};
  if(!items.length)return '<div class="reel-empty">'+esc(opts.empty||"No videos yet.")+'</div>';
  var i=Math.max(0,Math.min(items.length-1,S.reel[prefix]||0)),x=items[i],n=items.length;
  var h='<div class="reel-stage"><video src="'+esc(x.url)+'"'+(x.poster?' poster="'+esc(x.poster)+'"':'')+' controls playsinline preload="metadata" aria-label="'+esc(x.title)+'"></video>';
  if(n>1)h+='<button class="reel-nav prev" data-act="reel" data-p="'+prefix+'" data-d="-1" aria-label="Previous video">←</button><button class="reel-nav next" data-act="reel" data-p="'+prefix+'" data-d="1" aria-label="Next video">→</button>';
  h+='</div><div class="reel-cap"><div><b>'+esc(x.title)+'</b><br><span>'+esc(x.caption||"")+'</span></div><span class="count">'+(i+1<10?"0":"")+(i+1)+' / '+(n<10?"0":"")+n+'</span></div>';
  if(n>1){h+='<div class="reel-thumbs">';items.forEach(function(t,j){h+='<button class="reel-thumb" data-act="reelgo" data-p="'+prefix+'" data-i="'+j+'" aria-current="'+(j===i)+'" aria-label="Play '+esc(t.title)+'">'+(t.poster?'<img src="'+esc(t.poster)+'" alt="">':'<span class="ph"></span>')+'<span>'+esc(t.title)+'</span></button>'});h+='</div>'}
  return h;
}
function reelGo(prefix,i){
  var items=S.reelItems[prefix]||[];if(!items.length)return;
  S.reel[prefix]=(i+items.length)%items.length;
  var el=document.getElementById("reel-"+prefix);if(el)el.innerHTML=reelInner(prefix);
}

/* ---------- archive ---------- */
var NATIVE_TYPES={png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",webp:"image/webp",mp4:"video/mp4",webm:"video/webm",pdf:"application/pdf",csv:"text/csv",md:"text/markdown",json:"application/json",txt:"text/plain"};
var MAX_NATIVE=20*1048576,MAX_WRAPPED=14*1048576;
function fileRow(f,onArchivePage){
  var e=ev(),k=fileKind(f.name,f.type),viewable=!f.wrapped&&(k==="image"||k==="video");
  var meta=KIND_LABELS[k]+" · "+humanSize(f.size)+" · added "+(f.addedAt?shortDate(f.addedAt.slice(0,10)):"");
  var h='<div class="file"><span class="kind '+k+'">'+esc(KIND_LABELS[k])+'</span><div class="fmeta"><span class="fn" title="'+esc(f.name)+'">'+esc(f.name)+'</span><span class="fd">'+esc(meta)+'</span>';
  h+=S.readOnly?(f.note?'<span class="fd">'+esc(f.note)+'</span>':''):'<input class="note" id="an-'+esc(f.id)+'" data-an="'+esc(f.id)+'" placeholder="Add a note" aria-label="Note for '+esc(f.name)+'" value="'+esc(f.note||"")+'">';
  h+='</div><div class="fileacts">';
  if(onArchivePage&&!S.readOnly){h+='<select data-am="'+esc(f.id)+'" aria-label="Module for '+esc(f.name)+'"><option value="general"'+(f.module==="general"?" selected":"")+'>General</option>'+archiveTargets(e).map(function(m){return '<option value="'+esc(m)+'"'+(f.module===m?' selected':'')+'>'+esc(moduleTitle(e,m))+'</option>'}).join("")+'</select>'}
  if(viewable)h+='<button class="btn small" data-act="fview" data-id="'+esc(f.id)+'">View</button>';
  h+='<button class="btn small" data-act="fsave" data-id="'+esc(f.id)+'">Save</button>';
  if(!S.readOnly&&S.assets)h+='<button class="btn small'+(S.armed==="f"+f.id?' danger':'')+'" data-act="fdel" data-id="'+esc(f.id)+'">'+(S.armed==="f"+f.id?'Delete for good':'Delete')+'</button>';
  return h+'</div></div>';
}
function dropZone(mod,label,accept){
  if(!canUpload())return '<div class="drop"><p>'+(S.mode==="db"?'Only people who can edit this office can add files.':'Files can be added on the published page.')+'</p></div>';
  var id="up-"+mod.replace(/[^a-z0-9_-]/gi,"");
  return '<div class="drop" data-drop="'+esc(mod)+'"><p>'+esc(label)+'</p><label class="btn small tape" for="'+id+'">Add files</label><input id="'+id+'" type="file" data-up="'+esc(mod)+'" multiple hidden'+(accept?' accept="'+accept+'"':'')+'>'+(S.uploading?'<span class="chip lean">Uploading '+S.uploading+'…</span>':'')+'</div>';
}
function archiveBlock(mod){
  var e=ev(),list=archiveFor(e.archive,mod);
  var h='<section class="block"><div class="bhead"><div><h2>Files '+SL()+' '+esc(moduleTitle(e,mod))+'</h2><p>Contracts, riders, plans, photos and anything else for this module. Kept in the Intersect Archive.</p></div><span class="chip">'+list.length+' file'+(list.length===1?'':'s')+'</span></div>';
  h+=dropZone(mod,"Drop files here, or add them from your computer.");
  if(list.length){h+='<div class="files">';list.forEach(function(f){h+=fileRow(f,false)});h+='</div>'}
  return h+'</section>';
}
function archivePage(){
  var e=ev(),st=archiveStats(e.archive),groups=archiveGroups(e,e.archive);
  var docs=(st.kinds.pdf||0)+(st.kinds.doc||0)+(st.kinds.sheet||0)+(st.kinds.deck||0);
  var h=tiles([{label:"Files",value:String(st.count),sub:groups.length+" module"+(groups.length===1?"":"s")+" with files"},{label:"Total size",value:humanSize(st.size),sub:"Across this event"},{label:"Documents",value:String(docs),sub:"PDFs, docs, sheets and decks"},{label:"Photos and video",value:String((st.kinds.image||0)+(st.kinds.video||0)),sub:(st.kinds.video||0)+" video"+((st.kinds.video||0)===1?"":"s")+" in the showreel"}]);
  h+='<div class="banner">The Intersect Archive keeps every private document this event produces, filed under the module it belongs to. On this page files live in the office\'s private file store, visible only to people you share it with. In the INTERSECT app for Logos Basecamp they are stored on your own Logos Storage node and never advertised to the network.</div>';
  h+='<section class="block"><div class="bhead"><div><h2>Add to the archive</h2><p>Images, video and PDFs up to 20 MB; other files (Word, Excel, decks, zips) up to 14 MB.</p></div></div>';
  if(canUpload()){h+='<div class="drop" data-drop="*"><p>File under</p><select id="arch-mod" data-archsel="1" aria-label="File under module"><option value="general"'+(S.archMod==="general"?" selected":"")+'>General</option>'+archiveTargets(e).map(function(m){return '<option value="'+esc(m)+'"'+(S.archMod===m?' selected':'')+'>'+esc(moduleTitle(e,m))+'</option>'}).join("")+'</select><label class="btn small tape" for="up-all">Add files</label><input id="up-all" type="file" data-up="*" multiple hidden>'+(S.uploading?'<span class="chip lean">Uploading '+S.uploading+'…</span>':'')+'</div>'}
  else h+=dropZone("general","");
  h+='</section>';
  if(!groups.length)h+='<section class="block"><div class="reel-empty">Nothing archived yet. Files you add on any module page appear here too.</div></section>';
  else{h+='<section class="block"><div class="bhead"><div><h2>Everything in the archive</h2><p>Grouped by module, newest first. Change a file\'s module to refile it.</p></div><span class="chip">'+st.count+' files</span></div>';
    groups.forEach(function(g){h+='<div class="grp"><span>'+esc(g.title)+'</span><span>'+g.items.length+' · '+humanSize(archiveStats(g.items).size)+'</span></div><div class="files" style="border-top:0">';g.items.forEach(function(f){h+=fileRow(f,true)});h+='</div>'});
    h+='</section>'}
  return h;
}
function showreelPage(){
  var e=ev(),vids=archiveVideos(e.archive).filter(function(x){return !x.wrapped});
  var h='<section class="block"><div class="bhead"><div><h2>Showreel</h2><p>Every MP4 or WebM video archived for this event, in one carousel: recaps, teasers, documentation, partner content.</p></div><span class="chip">'+vids.length+' video'+(vids.length===1?'':'s')+'</span></div></section>';
  h+=reel("ev-"+S.cur,vids.map(function(v){return {title:v.name.replace(/\.[^.]+$/,""),caption:(v.note?v.note+" · ":"")+(v.module==="general"?"General":moduleTitle(e,v.module)),url:v.url,poster:""}}),{empty:"No videos archived for this event yet. Add one below."});
  h+='<div style="height:18px"></div><section class="block"><div class="bhead"><div><h2>Add videos</h2><p>MP4 or WebM, up to 20 MB each. They are filed under Showreel in the archive.</p></div></div>'+dropZone("showreel","Drop videos here.","video/mp4,video/webm")+'</section>';
  return h;
}
function readBuf(file){
  if(file.arrayBuffer)return file.arrayBuffer();
  return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(r.result)};r.onerror=function(){rej(r.error)};r.readAsArrayBuffer(file)});
}
function toB64(buf){var b=new Uint8Array(buf),out="",CH=0x8000;for(var i=0;i<b.length;i+=CH)out+=String.fromCharCode.apply(null,b.subarray(i,i+CH));return btoa(out)}
function fromB64(s){var bin=atob(s),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u}
function uploadFiles(files,mod){
  if(!canUpload()){toast("Only people who can edit this office can add files");return}
  var list=Array.prototype.slice.call(files||[]);if(!list.length)return;
  var id=S.cur;S.uploading+=list.length;render();
  var chain=Promise.resolve(),added=0,failed=[];
  list.forEach(function(file){chain=chain.then(function(){return uploadOne(file,mod,id).then(function(ok){if(ok)added++;else failed.push(file.name)})})});
  chain.then(function(){S.uploading=0;render();
    if(failed.length)toast(failed.length===1?failed[0]+" wasn't added":failed.length+" files weren't added");
    else toast(added===1?"File added to the archive":added+" files added to the archive")});
}
function uploadOne(file,mod,id){
  var ext=String(file.name).toLowerCase().split(".").pop(),native=NATIVE_TYPES[ext];
  function record(res,wrapped){
    var e=S.events[id];if(!e)return true;
    var item={id:rid(),module:mod,name:file.name,size:file.size,type:file.type||native||"",assetId:res.id,url:res.url||("/_blob/"+res.id),wrapped:!!wrapped,addedAt:new Date().toISOString(),note:""};
    patchNow(id,{archive:(e.archive||[]).concat([item])});
    return true;
  }
  function fail(err,limitMsg){toast(limitMsg||explain(err,file.name));return false}
  function wrap(){
    if(file.size>MAX_WRAPPED)return Promise.resolve(fail(null,file.name+" is over 14 MB, the web limit for this file type"));
    return readBuf(file).then(function(buf){
      var json=JSON.stringify({format:"intersect-archive/1",name:file.name,type:file.type||"",size:file.size,data:toB64(buf)});
      return S.assets.upload(new Blob([json],{type:"application/json"}),{type:"application/json"}).then(function(r){return record(r,true)},function(err){return fail(err)});
    });
  }
  if(native){
    if(file.size>MAX_NATIVE)return Promise.resolve(fail(null,file.name+" is over 20 MB, the web upload limit"));
    return S.assets.upload(file,{type:native}).then(function(r){return record(r,false)},function(err){
      // A text file that isn't UTF-8 is refused as text; keep it as a wrapped file instead.
      if(err&&(err.code==="invalid_request"||err.code==="unsupported_type")&&/^text\/|json/.test(native))return wrap();
      return fail(err)});
  }
  return wrap();
}
function explain(err,name){
  var c=err&&err.code;
  if(c==="too_large")return name+" is too large for the web archive";
  if(c==="quota_or_state")return "The archive is full. Delete files you no longer need";
  if(c==="rate_limited")return "Too many uploads at once. Try again in a moment";
  if(c==="not_granted"||c==="capability_disabled")return "Uploading isn't available here";
  return "Couldn't add "+name+(err&&err.message?": "+err.message:"");
}
function findFile(fid){var e=ev();return (e&&e.archive||[]).filter(function(x){return x.id===fid})[0]}
function saveFile(f){
  if(!S.downloads){toast("Saving files isn't available in this view");return}
  fetch(f.url).then(function(res){if(!res.ok)throw new Error("missing");return f.wrapped?res.json().then(function(j){return fromB64(j.data).buffer}):res.blob()})
  .then(function(data){return S.downloads.save({filename:f.name,data:data})})
  .catch(function(err){var c=err&&err.code;
    if(c==="declined")return;
    if(c==="rejected_extension"||c==="extension_not_enabled")toast("This file type can't be saved from the web page. Open it in the INTERSECT Basecamp app");
    else if(err&&err.message==="missing")toast("That file is no longer in the store");
    else toast("Couldn't save "+f.name)});
}
function deleteFile(f){
  var id=S.cur,e=ev();
  function drop(){patchNow(id,{archive:(S.events[id].archive||[]).filter(function(x){return x.id!==f.id})});render();toast("File deleted")}
  if(S.assets&&f.assetId)S.assets.delete(f.assetId).then(drop,function(err){if(err&&err.code==="not_uploader")toast("Only the person who added this file can delete it");else drop()});
  else drop();
}
function renderLightbox(){
  var el=document.getElementById("lb"),x=S.lightbox;
  if(!x){el.innerHTML="";return}
  el.innerHTML='<div class="lightbox" role="dialog" aria-label="'+esc(x.name)+'"><span class="lt">'+esc(x.name)+'</span><button class="close" data-act="lbclose">Close</button>'+(x.kind==="video"?'<video src="'+esc(x.url)+'" controls autoplay playsinline></video>':'<img src="'+esc(x.url)+'" alt="'+esc(x.name)+'">')+'</div>';
}
/* ---------- showcase list (shared doc site/showcase) ---------- */
function setShowcase(list){
  S.showcase={items:list};render();
  clearTimeout(S.scTimer);S.scTimer=setTimeout(writeShowcase,600);
}
function writeShowcase(){
  if(!S.db||S.readOnly)return;
  if(S.scWriting){S.scTimer=setTimeout(writeShowcase,300);return}
  S.scWriting=true;
  S.db.doc("site/showcase").set({items:S.showcase.items,updatedAt:new Date().toISOString()}).then(function(){S.scWriting=false},function(err){S.scWriting=false;toast("Carousel not saved: "+(err&&err.message||"try again"))});
}
function addShowcaseVideos(files){
  var list=Array.prototype.slice.call(files||[]),items=showcaseItems().slice(),chain=Promise.resolve();
  if(!list.length||!canUpload())return;
  S.uploading+=list.length;render();
  list.forEach(function(file){chain=chain.then(function(){
    var ext=String(file.name).toLowerCase().split(".").pop();
    if(!/^(mp4|webm)$/.test(ext)){toast(file.name+" isn't MP4 or WebM");return}
    if(file.size>MAX_NATIVE){toast(file.name+" is over 20 MB");return}
    return S.assets.upload(file,{type:NATIVE_TYPES[ext]}).then(function(r){items.push({key:rid(),title:file.name.replace(/\.[^.]+$/,""),caption:"",url:r.url||("/_blob/"+r.id),assetId:r.id,poster:""})},function(err){toast(explain(err,file.name))});
  })});
  chain.then(function(){S.uploading=0;setShowcase(items);S.reel.home=items.length-1;render()});
}

/* ---------- render: main ---------- */
function creator(first){
  var h='<div class="empty"><h1>'+(first?'Open your first production file':'New event')+'</h1><p>Pick a format and a show day. The template fills in milestones counted back from that date, budget lines, venue checks, risks and wrap tasks; you switch modules on or off later.</p>';
  h+='<div class="formats">';FORMAT_ORDER.forEach(function(k){h+='<button class="fmt" data-act="fmt" data-f="'+k+'" aria-pressed="'+(S.newFmt===k)+'"><b>'+esc(FORMATS[k].label)+'</b><span>'+esc(FORMATS[k].blurb)+'</span><span style="font-family:var(--mono);font-size:11px">'+(FORMAT_MODULES[k].length-1)+' modules</span></button>'});h+='</div>';
  h+='<div class="form" style="border:0;padding:0"><div class="field"><label for="nn">Event name</label><input id="nn" type="text" placeholder="e.g. Summer Solstice Festival"></div><div class="field"><label for="nd">Show day</label><input id="nd" type="date"></div><div class="field"><label for="nc">City</label><input id="nc" type="text"></div></div>';
  h+='<div class="row"><button class="btn primary" data-act="create">Create event</button>'+(first?'<button class="btn" data-act="example">Load an example festival</button>':'<button class="btn" data-act="cancelnew">Cancel</button>')+'</div></div>';
  return h;
}
function render(){
  var focus=document.activeElement,fid=focus&&focus.id,sel=null;
  try{if(focus&&focus.selectionStart!=null)sel=[focus.selectionStart,focus.selectionEnd]}catch(e){}
  renderSide();
  var main=document.getElementById("main"),h="";
  if(S.mode==="loading")return;
  if(S.creating&&!S.readOnly){main.innerHTML=creator(!S.order.length);restore(fid,sel);return}
  if(S.panel==="home"||!S.order.length){main.innerHTML=homeView();restore(fid,sel);return}
  if(!ev())S.cur=sortedEvents()[0];
  var e=ev();
  if(S.panel==="builder"&&S.builder){main.innerHTML=builderView();restore(fid,sel);return}
  if(eventModules(e).indexOf(S.mod)<0)S.mod="overview";
  var d=dayDiff(e.startDate);
  h+='<div class="head"><div><div class="label">'+esc(fmtLabel(e.format))+SL()+esc(moduleTitle(e,S.mod))+'</div><h1>'+esc(e.name)+'</h1><div class="sub">'+esc(subtitle(e))+'</div></div>';
  if(d!=null)h+='<span class="tminus'+(d<0?" past":"")+'" title="Days to show day">'+esc(countdown(e))+'</span>';
  h+='</div>';
  if(S.mode==="local")h+='<div class="banner">Preview mode: changes stay in this window and are not saved. Open the published page to keep and share your work.</div>';
  if(S.stale)h+='<div class="banner">Can’t reach the shared store yet. What you see may be out of date.</div>';
  if(S.mod==="overview")h+=overview();
  else sections(e,S.mod).forEach(function(k){h+=k==="brief"?briefBlock():k==="budgetSummary"?tiles(budgetStats(e)):k==="debrief"?debriefBlock():k==="archive"?archivePage():k==="showreel"?showreelPage():tableBlock(k)});
  if(S.mod!=="overview"&&S.mod!=="archive"&&S.mod!=="showreel")h+=archiveBlock(S.mod);
  if(S.mod==="brief"&&!S.readOnly){h+='<section class="block"><div class="tfoot" style="border:0"><span style="color:var(--muted);font-size:13px">Remove this event and all its modules for everyone.</span>'+(S.armed==="event"?'<span class="row"><button class="btn small danger" data-act="delevent">Delete for good</button><button class="btn small" data-act="disarm">Keep it</button></span>':'<button class="btn small danger" data-act="armevent">Delete event</button>')+'</div></section>'}
  if(S.mod!=="overview"&&S.mod!=="brief"&&S.mod!=="archive"&&!S.readOnly){h+='<div class="row" style="justify-content:flex-end">'+(isCustom(S.mod)?'<button class="btn small" data-act="builder" data-id="'+esc(S.mod)+'">Edit columns</button>':'')+'<button class="btn small" data-act="hidemod" data-m="'+esc(S.mod)+'">Hide this module</button></div>'}
  main.innerHTML=h;restore(fid,sel);
}
// Re-render unless a video is playing, so a teammate's edit never stops playback.
function safeRender(){var v=document.querySelector("#main video");if(v&&!v.paused&&!v.ended){S.deferRender=true;return}S.deferRender=false;render()}
function restore(fid,sel){if(!fid)return;var el=document.getElementById(fid);if(el){el.focus({preventScroll:true});try{if(sel&&el.setSelectionRange)el.setSelectionRange(sel[0],sel[1])}catch(e){}}}

/* ---------- interactions ---------- */
function setCell(t){
  var k=t.dataset.t,r=t.dataset.r,c=t.dataset.c,e=ev();var arr=(e[k]||[]).map(function(x){return Object.assign({},x)});var i=arr.findIndex(function(x){return x.id===r});if(i<0)return;
  arr[i][c]=t.type==="checkbox"?t.checked:t.value;var f={};f[k]=arr;patch(S.cur,f);
}
function setField(t){
  var e=ev(),k=t.dataset.k,v=t.value;
  if(t.dataset.scope==="brief"){var b=Object.assign({},e.brief||{});b[k]=v;patch(S.cur,{brief:b})}
  else{var f={};f[k]=v;if(k==="format"&&FORMAT_MODULES[v]){var mods=e.modules.slice();FORMAT_MODULES[v].forEach(function(m){if(mods.indexOf(m)<0)mods.push(m)});mods.sort(modSort);f.modules=mods}patch(S.cur,f)}
}
function openBuilder(id){
  var e=ev(),def=id?customDef(e,id):null;
  S.builder=def?{id:id,title:def.title,lead:def.lead||"",rows:builderRows(def.cols)}:{id:"",title:"",lead:"",rows:[{label:"Item",type:"text"},{label:"Owner",type:"text"},{label:"Due",type:"date"},{label:"Status",type:"status"}]};
  S.panel="builder";S.armed=null;render();window.scrollTo(0,0);
}
document.addEventListener("input",function(evt){var t=evt.target;if(S.readOnly)return;
  if(t.dataset.an){var e0=ev();patch(S.cur,{archive:(e0.archive||[]).map(function(x){return x.id===t.dataset.an?Object.assign({},x,{note:t.value}):x})});return}
  if(t.dataset.sc){var it=showcaseItems().map(function(x){return Object.assign({},x)});it[+t.dataset.i][t.dataset.sc]=t.value;S.showcase={items:it};clearTimeout(S.scTimer);S.scTimer=setTimeout(writeShowcase,700);var cap=document.querySelector("#reel-home .reel-cap");if(cap&&(S.reel.home||0)===+t.dataset.i){S.reelItems.home=it.map(function(x){return {title:x.title,caption:x.caption,url:x.url,poster:x.poster}})}return}
  if(t.dataset.bf&&S.builder){S.builder[t.dataset.bf]=t.value;return}
  if(t.dataset.bi!==undefined&&S.builder&&t.dataset.bk!=="type"){S.builder.rows[+t.dataset.bi][t.dataset.bk]=t.value;return}
  if(t.dataset.t&&t.dataset.c)setCell(t);else if(t.dataset.k&&t.dataset.scope)setField(t)});
document.addEventListener("change",function(evt){var t=evt.target;if(t.id==="mev"){if(!t.value)return;S.cur=t.value;S.creating=false;S.panel="";S.mod="overview";remember();render();return}if(S.readOnly)return;
  if(t.dataset.up){var mod=t.dataset.up==="*"?S.archMod:t.dataset.up;uploadFiles(t.files,mod);t.value="";return}
  if(t.id==="sc-add"){addShowcaseVideos(t.files);t.value="";return}
  if(t.dataset.archsel){S.archMod=t.value;return}
  if(t.dataset.am){var e1=ev();patchNow(S.cur,{archive:(e1.archive||[]).map(function(x){return x.id===t.dataset.am?Object.assign({},x,{module:t.value}):x})});render();toast("File moved");return}
  if(t.dataset.sc){render();return}
  if(t.dataset.bi!==undefined&&S.builder&&t.dataset.bk==="type"){S.builder.rows[+t.dataset.bi].type=t.value;render();return}
  if(t.dataset.t&&t.dataset.c){setCell(t);render()}else if(t.dataset.k&&t.dataset.scope){setField(t);render()}});
document.addEventListener("click",function(evt){
  var b=evt.target.closest("[data-act]");if(!b)return;var a=b.dataset.act,e=ev();
  if(a!=="delrow"&&a!=="armevent"&&a!=="bdelete"&&a!=="fdel"&&a!=="scdel")S.armed=null;
  if(a==="home"){S.panel="home";S.creating=false;remember();render();window.scrollTo(0,0)}
  else if(a==="fmtstart"){if(S.readOnly)return;S.newFmt=b.dataset.f;S.creating=true;render();window.scrollTo(0,0)}
  else if(a==="reel"){reelGo(b.dataset.p,(S.reel[b.dataset.p]||0)+(+b.dataset.d))}
  else if(a==="reelgo"){reelGo(b.dataset.p,+b.dataset.i)}
  else if(a==="scedit"){S.showEdit=!S.showEdit;render()}
  else if(a==="scmove"){var li=showcaseItems().slice(),i0=+b.dataset.i,j0=i0+(+b.dataset.d);if(j0>=0&&j0<li.length){var t0=li[i0];li[i0]=li[j0];li[j0]=t0;setShowcase(li)}}
  else if(a==="scdel"){var k0="sc"+b.dataset.i;if(S.armed!==k0){S.armed=k0;render();return}S.armed=null;var l2=showcaseItems().slice(),gone=l2.splice(+b.dataset.i,1)[0];if(gone&&gone.assetId&&S.assets)S.assets.delete(gone.assetId).catch(function(){});S.reel.home=0;setShowcase(l2);toast("Video removed from the carousel")}
  else if(a==="fview"){var fv=findFile(b.dataset.id);if(fv){S.lightbox={kind:fileKind(fv.name,fv.type),url:fv.url,name:fv.name};renderLightbox()}}
  else if(a==="lbclose"){S.lightbox=null;renderLightbox()}
  else if(a==="fsave"){var fs=findFile(b.dataset.id);if(fs)saveFile(fs)}
  else if(a==="fdel"){var fd=findFile(b.dataset.id);if(!fd)return;if(S.armed!=="f"+fd.id){S.armed="f"+fd.id;render();return}S.armed=null;deleteFile(fd)}
  else if(a==="pick"){S.cur=b.dataset.id;S.creating=false;S.panel="";S.mod="overview";remember();render();window.scrollTo(0,0)}
  else if(a==="mod"){S.mod=b.dataset.m;S.panel="";remember();render();window.scrollTo(0,0)}
  else if(a==="new"){S.creating=true;render();window.scrollTo(0,0)}
  else if(a==="cancelnew"){S.creating=false;render()}
  else if(a==="fmt"){S.newFmt=b.dataset.f;document.querySelectorAll(".fmt").forEach(function(x){x.setAttribute("aria-pressed",x.dataset.f===S.newFmt)})}
  else if(a==="create"||a==="example"){
    var data=a==="example"?exampleEvent():newEvent({format:S.newFmt,name:(document.getElementById("nn").value||"").trim()||"Untitled "+FORMATS[S.newFmt].label.toLowerCase(),startDate:document.getElementById("nd").value,city:(document.getElementById("nc").value||"").trim()});
    createEvent(data);
  }
  else if(a==="addrow"){var k=b.dataset.t,t=tableOf(e,k),r=blankRow(k,e),f={};f[k]=(e[k]||[]).concat([r]);patch(S.cur,f);render();var el=document.getElementById(S.cur+"-"+k+"-"+r.id+"-"+t.cols[0][0]);if(el)el.focus()}
  else if(a==="delrow"){var key=b.dataset.t+b.dataset.r;if(S.armed!==key){S.armed=key;render();return}S.armed=null;var f2={};f2[b.dataset.t]=(e[b.dataset.t]||[]).filter(function(x){return x.id!==b.dataset.r});patch(S.cur,f2);render();toast("Row deleted")}
  else if(a==="addmod"){var mods=e.modules.concat([b.dataset.m]).sort(modSort);patch(S.cur,{modules:mods});S.mod=b.dataset.m;render()}
  else if(a==="hidemod"){patch(S.cur,{modules:e.modules.filter(function(m){return m!==b.dataset.m})});S.mod="overview";render();toast("Module hidden · data kept")}
  else if(a==="armevent"){S.armed="event";render()}
  else if(a==="disarm"){S.armed=null;render()}
  else if(a==="delevent"){deleteEvent(S.cur)}
  else if(a==="builder"){openBuilder(b.dataset.id||"")}
  else if(a==="badd"){S.builder.rows.push({label:"",type:"text",options:""});render();var nb=document.getElementById("b-l-"+(S.builder.rows.length-1));if(nb)nb.focus()}
  else if(a==="bremove"){S.builder.rows.splice(+b.dataset.i,1);render()}
  else if(a==="bmove"){var i=+b.dataset.i,j=i+(+b.dataset.d),rr=S.builder.rows;if(j>=0&&j<rr.length){var tmp=rr[i];rr[i]=rr[j];rr[j]=tmp;render()}}
  else if(a==="bcancel"){S.panel="";S.builder=null;render()}
  else if(a==="bsave"){
    var bd=S.builder;
    if(!String(bd.title||"").trim()){toast("Give the module a name first");document.getElementById("b-title").focus();return}
    if(!bd.rows.some(function(r){return String(r.label||"").trim()})){toast("Add at least one column with a name");return}
    var id=bd.id;if(id)updateCustomModule(e,id,bd.title,bd.lead,bd.rows);else id=addCustomModule(e,bd.title,bd.lead,bd.rows);
    patchCustom(S.cur);S.panel="";S.builder=null;S.mod=id;remember();render();toast(bd.id?"Module updated":"Module added");
  }
  else if(a==="bdelete"){
    var cid=S.builder.id;if(S.armed!=="cm"+cid){S.armed="cm"+cid;render();return}
    S.armed=null;removeCustomModule(e,cid);var pf={custom:e.custom,modules:e.modules};pf[cid]=[];patch(S.cur,pf);
    S.panel="";S.builder=null;S.mod="overview";render();toast("Custom module deleted");
  }
  else if(a==="libcopy"){var lib=customLibrary(S.events,e)[+b.dataset.i];if(!lib)return;var nid=copyCustomModule(e,lib);patchCustom(S.cur);S.mod=nid;render();toast("Module added from "+lib.from)}
});
document.addEventListener("dragover",function(evt){var d=evt.target.closest&&evt.target.closest("[data-drop]");if(!d||!canUpload())return;evt.preventDefault();d.classList.add("over")});
document.addEventListener("dragleave",function(evt){var d=evt.target.closest&&evt.target.closest("[data-drop]");if(d)d.classList.remove("over")});
document.addEventListener("drop",function(evt){var d=evt.target.closest&&evt.target.closest("[data-drop]");if(!d||!canUpload())return;evt.preventDefault();d.classList.remove("over");var mod=d.dataset.drop==="*"?S.archMod:d.dataset.drop;uploadFiles(evt.dataTransfer&&evt.dataTransfer.files,mod)});
document.addEventListener("keydown",function(evt){if(evt.key==="Escape"&&S.lightbox){S.lightbox=null;renderLightbox()}});
["pause","ended"].forEach(function(n){document.addEventListener(n,function(){if(S.deferRender)setTimeout(safeRender,0)},true)});
function createEvent(data){
  var id="ev-"+rid();
  if(S.mode==="db"){S.db.collection("events").doc(id).set(data).then(function(){toast("Event created")},function(err){
    if(err&&err.code==="quota_exceeded")toast("Storage is full. Delete an old event first.");else if(err&&err.code==="invalid_argument"){S.readOnly=true;toast("You can view but not create events")}else toast("Couldn’t create the event. Try again.");
    delete S.events[id];S.order=S.order.filter(function(x){return x!==id});render()})}
  S.events[id]=normalise(data);if(S.order.indexOf(id)<0)S.order.push(id);S.cur=id;S.mod="overview";S.creating=false;S.panel="";remember();render();
}
function deleteEvent(id){
  S.armed=null;
  if(S.mode==="db"){S.db.collection("events").doc(id).delete().catch(function(){toast("Couldn’t delete. Try again.")})}
  var gone=S.events[id];
  // Files belong to the event: remove them from the store with it.
  if(S.assets&&gone&&gone.archive)gone.archive.forEach(function(f){if(f.assetId)S.assets.delete(f.assetId).catch(function(){})});
  delete S.events[id];S.order=S.order.filter(function(x){return x!==id});S.cur=sortedEvents()[0]||null;S.mod="overview";if(!S.cur)S.panel="home";remember();render();toast("Event deleted");
}

/* ---------- boot ---------- */
function applySnap(snap){
  var seen={};
  snap.docs.forEach(function(d){var data=d.data();if(!data)return;var id=d.id;seen[id]=1;
    var merged=JSON.parse(JSON.stringify(data));Object.assign(merged,S.inflight[id]||{},S.pending[id]||{});
    S.events[id]=normalise(merged)});
  S.order=Object.keys(seen);Object.keys(S.events).forEach(function(id){if(!seen[id]&&!S.pending[id])delete S.events[id]});
  if(!S.events[S.cur])S.cur=sortedEvents()[0]||null;
  var a=document.activeElement;
  if(a&&a.closest&&a.closest("#main")&&(a.tagName==="TEXTAREA"||(a.tagName==="INPUT"&&a.type!=="checkbox"))){S.renderOnBlur=true}else safeRender();
}
document.addEventListener("focusout",function(){if(S.renderOnBlur){S.renderOnBlur=false;setTimeout(safeRender,0)}});
function startLocal(){if(S.mode!=="loading")return;S.mode="local";var e=normalise(exampleEvent()),id="ev-local";S.events[id]=e;S.order=[id];S.cur=id;render()}
function boot(){
  if(!window.claude||!window.claude.use){startLocal();return}
  var fallback=setTimeout(startLocal,10500);
  Promise.all([window.claude.use("db"),window.claude.use("user"),window.claude.use("assets"),window.claude.use("downloads")]).then(function(res){
    clearTimeout(fallback);var db=res[0],user=res[1];
    if(!db){startLocal();return}
    S.db=db;S.user=user;S.assets=res[2]||null;S.downloads=res[3]||null;S.mode="db";
    db.doc("site/showcase").onSnapshot(function(snap){S.showcase=snap.exists?snap.data():null;if(!S.showEdit)safeRender()},function(){});
    if(user&&user.can){Promise.resolve(user.can("data.write")).then(function(ok){if(ok===false){S.readOnly=true;render()}}).catch(function(){})}
    var timer=setTimeout(function(){S.stale=true;if(!S.order.length){document.getElementById("main").innerHTML='<div class="empty"><h1>Can’t reach your events yet</h1><p>The shared store isn’t answering. This page keeps trying; your events appear as soon as it does.</p></div>'}else render()},10000);
    db.collection("events").onSnapshot(function(snap){if(!snap.metadata.fromCache){clearTimeout(timer);S.stale=false}applySnap(snap)},function(err){clearTimeout(timer);S.stale=false;if(err&&err.code==="revoked"){S.readOnly=true}render()});
  },function(){clearTimeout(fallback);startLocal()});
}
window.__lib={newEvent:newEvent,exampleEvent:exampleEvent};
boot();
})();
