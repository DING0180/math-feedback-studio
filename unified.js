/* Unifies navigation and presents linked records without merging or overwriting source datasets. */
const U_FEEDBACK_PAGES=['platform','tags','measures','feedback'];
const uTabs=[['platform','学校模板反馈'],['tags','平时表现标签'],['measures','改进措施'],['feedback','家长评语']];
const uPlatformMenu=menus.find(m=>m[0]==='platform');if(uPlatformMenu){uPlatformMenu[2]='反馈';uPlatformMenu[3]='整理标签、措施和家长评语'}
const uDashboard=views.dashboard;views.dashboard=function(){return uDashboard().replaceAll('学校模板反馈','反馈').replaceAll('选择标签，整理评语素材','标签、措施与家长评语')};
const uOriginalStudents=views.students;
function uResolve(s,exam){let explicit=s.profileLinks?.[exam.id];if(explicit){let person=exam.students.find(x=>x.id===explicit);return person?{person,mode:'手动确认'}:{person:null,mode:'关联记录已不存在'}}let byId=exam.students.filter(x=>x.studentId&&x.studentId===s.id);if(byId.length===1)return {person:byId[0],mode:byId[0].name===s.name?'学号匹配':'学号匹配，姓名不同请核对'};return {person:null,mode:'未关联'}}
function uLegacy(s){return (s.exams||[]).filter(e=>Core.validScore(e.score,e.total)).map(e=>({name:e.name,date:e.date||'',score:+e.score,total:+e.total,kind:'总分记录'}))}
function uTotal(exam,p){let all=exam.questions.map(q=>({q,v:p.scores?.[q.id]}));if(!all.length||all.some(({q,v})=>q.max===null||q.max===undefined||!v||v.status!=='有分数'))return null;return {score:all.reduce((a,{v})=>a+v.value,0),total:all.reduce((a,{q})=>a+q.max,0)}}
function uTrend(s){let a=uLegacy(s).map(x=>({...x,sort:x.date||''}));for(let e of ssExams){let r=uResolve(s,e);if(r.person){let t=uTotal(e,r.person);if(t)a.push({name:e.name,date:'',sort:e.created||'',score:t.score,total:t.total,kind:'逐题汇总'})}}a.sort((x,y)=>x.sort.localeCompare(y.sort));if(!a.length)return '<div class="empty">完整的成绩数据录入后，可查看得分率变化。</div>';let points=a.map((x,i)=>{let px=46+(a.length===1?175:i*350/(a.length-1)),py=140-(x.score/x.total)*105;return {x:px,y:py,v:x}});return `<svg class="chart" viewBox="0 0 440 175" role="img" aria-label="历次考试得分率变化"><line x1="45" y1="140" x2="398" y2="140" stroke="#d6e5dc"/><line x1="45" y1="35" x2="398" y2="35" stroke="#d6e5dc" stroke-dasharray="4"/><text x="6" y="39" font-size="10" fill="#657a70">100%</text><text x="18" y="144" font-size="10" fill="#657a70">0%</text><polyline fill="none" stroke="#327b5a" stroke-width="3" points="${points.map(p=>p.x+','+p.y).join(' ')}"/>${points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#327b5a"/><text x="${p.x}" y="${p.y-9}" text-anchor="middle" font-size="10" fill="#355a48">${(p.v.score/p.v.total*100).toFixed(1)}%</text><text x="${p.x}" y="159" text-anchor="middle" font-size="10" fill="#657a70">${E(p.v.name.slice(0,7))}</text>`).join('')}</svg><p class="hint">仅汇总已录入全部逐题得分及满分的考试；逐题考试按导入时间排列。不同考试难度可能不同。</p>`}
function uExamPanel(s,e,i){
 const {person:p,mode}=uResolve(s,e);
 const pages=p?.cards?.length?ssTotalPages(p):0;
 const cropCount=e.questions.reduce((total,q)=>total+(p?.crops?.[q.id]?.length||0),0);
 const rows=p?e.questions.map(q=>{
  const value=p.scores?.[q.id]||{status:'未录入'};
  const status=value.status==='有分数'?(q.max==null?'已录入':value.value<q.max?'有失分':'满分'):value.status;
  const count=p.crops?.[q.id]?.length||0;
  return `<tr><td>${E(q.id)}</td><td>${value.value??'—'} / ${q.max??'—'}</td><td>${E(status)}</td>
   <td>${count?`<button class="smallbtn" data-u-crop-exam="${i}" data-u-crop-q="${E(q.id)}" aria-label="${E(q.id)} · 查看 ${count} 张切片${p.cropsStale?'（待复核）':''}">查看 ${count} 张${p.cropsStale?'（待复核）':''}</button>`:'未切图'}</td><td>${E(p.notes?.[q.id]||'—')}</td></tr>`;
 }).join(''):'';
 return `<div class="unified-exam" data-exam-index="${i}"><div class="panel-head"><div><h3>${E(e.name)}</h3>
  <p class="hint">${E(mode)}${p?` · 逐题表：${E(p.name)} ${E(p.studentId||'无学号')}`:''}</p></div>
  <div class="toolbar">${pages?`<button type="button" class="smallbtn primary" data-u-view-card="${i}">查看整卷答题卡</button>`:''}
  <button class="smallbtn" data-u-link="${i}">${p?'调整关联':'关联学生'}</button>${p?`<button class="smallbtn danger" data-u-remove-exam="${i}">删除该次记录</button>`:''}</div></div>
  ${p?`<p class="hint u-card-summary">${pages?`整卷答题卡 ${pages} 页`:'暂无整卷答题卡'} · ${cropCount} 张逐题切片</p><div class="scroll"><table><thead><tr><th>题目</th><th>得分 / 满分</th><th>情况</th><th>答题卡切片</th><th>备注</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="hint">请先确认此考试中对应的学生，再查看答题卡。</p>'}</div>`;
}

function uViewExamCard(examIndex,opener){
 const profile=student(),exam=ssExams[examIndex];
 const person=profile&&exam&&uResolve(profile,exam).person;
 const total=person?.cards?.length?ssTotalPages(person):0;
 if(!total)return toast('这次考试还没有关联整卷答题卡。');
 modal(`${profile.name} · ${exam.name} · 整卷答题卡`,`
  <div class="row u-card-controls">
   <button type="button" class="smallbtn" data-u-card-step="-1">← 上一页</button>
   <span class="hint" data-u-card-page aria-live="polite"></span>
   <button type="button" class="smallbtn" data-u-card-step="1">下一页 →</button>
   <button type="button" class="smallbtn" data-u-card-zoom aria-pressed="false">查看原始尺寸</button>
  </div>
  <div class="u-card-viewer" aria-label="整卷答题卡图片" tabindex="0"></div>
  <p class="hint" data-u-card-status role="status"></p>`);
 const overlay=document.querySelector('.modalback:last-child');
 const dialog=overlay.querySelector('.modal');
 const title=dialog.querySelector('h2');
 title.id='u-card-dialog-title';
 dialog.classList.add('u-card-dialog');
 dialog.setAttribute('role','dialog');
 dialog.setAttribute('aria-modal','true');
 dialog.setAttribute('aria-labelledby',title.id);
 const viewer=dialog.querySelector('.u-card-viewer');
 const pageLabel=dialog.querySelector('[data-u-card-page]');
 const status=dialog.querySelector('[data-u-card-status]');
 const prev=dialog.querySelector('[data-u-card-step="-1"]');
 const next=dialog.querySelector('[data-u-card-step="1"]');
 const zoom=dialog.querySelector('[data-u-card-zoom]');
 let current=1,request=0,showNative=false;
 const close=()=>{
  overlay.remove();
  if(opener.isConnected)opener.focus();
 };
 const showPage=async value=>{
  if(value<1||value>total)return;
  const ticket=++request;
  current=value;
  prev.disabled=value===1;
  next.disabled=value===total;
  pageLabel.textContent=`第 ${value} / ${total} 页`;
  viewer.replaceChildren();
  viewer.setAttribute('aria-busy','true');
  status.textContent='正在打开答题卡…';
  try{
   const canvas=await ssPageCanvas(person,value);
   if(ticket!==request||!overlay.isConnected)return;
   canvas.className='u-card-image';
   canvas.classList.toggle('u-card-image--native',showNative);
   canvas.setAttribute('role','img');
   canvas.setAttribute('aria-label',`${profile.name}的整卷答题卡，第 ${value} 页`);
   viewer.replaceChildren(canvas);
   viewer.scrollTo(0,0);
   status.textContent='';
  }catch{
   if(ticket===request&&overlay.isConnected)status.textContent='无法打开这一页，请检查答题卡原文件。';
  }finally{
   if(ticket===request&&overlay.isConnected)viewer.setAttribute('aria-busy','false');
  }
 };
 prev.onclick=()=>showPage(current-1);
 next.onclick=()=>showPage(current+1);
 zoom.onclick=()=>{
  showNative=!showNative;
  zoom.setAttribute('aria-pressed',String(showNative));
  zoom.textContent=showNative?'适应窗口':'查看原始尺寸';
  viewer.querySelector('canvas')?.classList.toggle('u-card-image--native',showNative);
  if(!showNative)viewer.scrollTo(0,0);
 };
 overlay.querySelectorAll('.close').forEach(button=>button.onclick=close);
 overlay.onclick=event=>{if(event.target===overlay)close()};
 overlay.onkeydown=event=>{
  if(event.key==='Escape'){event.preventDefault();close();return;}
  if(event.key==='Tab'){
   const controls=[...dialog.querySelectorAll('button:not(:disabled),[tabindex="0"]')];
   const first=controls[0],last=controls.at(-1);
   if((event.shiftKey&&event.target===first)||(!event.shiftKey&&event.target===last)){
    event.preventDefault();
    (event.shiftKey?last:first).focus();
   }
   return;
  }
  if(event.target===viewer&&showNative)return;
  if(event.key==='ArrowLeft'){event.preventDefault();showPage(current-1);}
  if(event.key==='ArrowRight'){event.preventDefault();showPage(current+1);}
 };
 dialog.querySelector('.close').focus();
 showPage(1);
}
function uProfile(s){if(!s)return '';let history=uLegacy(s);return `<div class="panel unified-profile"><div class="panel-head"><div><h2>成绩变化</h2><p class="muted">总分记录和已关联的逐题考试</p></div><button data-go="question-analysis" class="smallbtn">进入逐题分析</button></div>${uTrend(s)}${history.length?`<div class="scroll"><table><thead><tr><th>考试</th><th>日期</th><th>得分 / 满分</th></tr></thead><tbody>${history.map(x=>`<tr><td>${E(x.name)}</td><td>${E(x.date||'未填写')}</td><td>${x.score} / ${x.total}</td></tr>`).join('')}</tbody></table></div>`:''}</div><div class="panel"><div class="panel-head"><div><h2>逐题成绩与答题卡</h2><p class="muted">按考试查看整卷和逐题切片。</p></div></div>${ssExams.length?ssExams.map((e,i)=>uExamPanel(s,e,i)).join(''):'<div class="empty">还没有逐题考试。导入成绩表和答题卡后，可以在这里查看。</div>'}</div>`}
views.students=function(){let html=uOriginalStudents(),s=student();if(!s)return html;let count=(s.exams||[]).length+ssExams.filter(e=>uResolve(s,e).person).length;html=html.replace(`<div class="metric"><small>考试记录</small><b>${s.exams.length}</b>`,`<div class="metric"><small>考试记录</small><b>${count}</b>`);html=html.replace('<button class="danger smallbtn" data-act="deleteStudent">删除学生</button>','<div class="toolbar"><button class="smallbtn" data-u-edit>编辑资料</button><button class="danger smallbtn" data-u-remove>删除档案</button></div>');let marker='<div class="panel"><div class="panel-head"><h2>历史评价</h2>';return html.replace(marker,uProfile(s)+marker)};
function uEdit(){let s=student();if(!s)return;modal('编辑学生资料',`<p class="hint">修改档案姓名、编号或班级。其他已导入的原始成绩表和学校模板不会被改写；可以手动确认关联。</p><div class="formgrid"><label class="field">姓名<input id="u-name" value="${E(s.name)}"></label><label class="field">学号 / 编号<input id="u-id" value="${E(s.id)}"></label><label class="field">教学班<input id="u-group" value="${E(s.group||'')}"></label><label class="field">行政班<input id="u-class" value="${E(s.className||'')}"></label></div>`,'保存',d=>{let name=d.querySelector('#u-name').value.trim(),id=d.querySelector('#u-id').value.trim();if(!name||!id)return alert('姓名和编号不能为空。');if(db.students.some(x=>x!==s&&x.id===id))return alert('编号已存在，请使用不同编号。');s.profileLinks??={};for(let e of ssExams){let r=uResolve(s,e);if(r.person)s.profileLinks[e.id]=r.person.id}s.name=name;s.id=id;s.group=d.querySelector('#u-group').value.trim();s.className=d.querySelector('#u-class').value.trim();selected=id;save();d.remove();render();toast('学生资料已保存')})}
function uRemove(){let s=student();if(!s)return;let linked=ssExams.filter(e=>uResolve(s,e).person).length;modal('删除学生档案',`<div class="alert">将永久删除“${E(s.name)}”的学生档案，以及其中的平时标签、手工录入成绩和历史评价。</div><p class="hint">学校模板反馈与逐题考试是独立保存的数据，${linked?`该生在 ${linked} 次逐题考试中已有关联；`:''}本操作不会删除这些原始记录或答题卡。建议先使用两个备份按钮分别备份。</p>`,'删除档案',d=>{if(!confirm('再次确认：删除该学生的档案及档案内数据？此操作无法撤销。'))return;db.students=db.students.filter(x=>x!==s);selected=db.students[0]?.id||'';save();d.remove();render();toast('学生档案已删除')})}
function uLink(i){let s=student(),e=ssExams[i];if(!s||!e)return;let cur=s.profileLinks?.[e.id]||'';modal('确认考试学生',`<p class="hint">当前档案：${E(s.name)} · ${E(s.id)}。请在“${E(e.name)}”的原始成绩表中选择对应学生，避免同名误关联。</p><label class="field">成绩表中的学生<select id="u-link-person"><option value="">不设手动关联（按学号匹配）</option>${e.students.map(x=>`<option value="${E(x.id)}" ${x.id===cur?'selected':''}>${E(x.name)} · ${E(x.studentId||'无学号')}</option>`).join('')}</select></label>`,'保存关联',d=>{let value=d.querySelector('#u-link-person').value;if(value&&db.students.some(other=>other!==s&&uResolve(other,e).person?.id===value))return alert('该考试记录已关联到其他学生，请先核对并解除原关联。');s.profileLinks??={};if(value)s.profileLinks[e.id]=value;else delete s.profileLinks[e.id];save();d.remove();render();toast('学生关联已更新')})}
function uRemoveExam(i){let s=student(),e=ssExams[i],r=e&&uResolve(s,e);if(!r?.person)return;if(!confirm(`确定删除 ${s.name} 在“${e.name}”的逐题成绩、答题卡原文件和切图吗？这不会删除其他学生记录，且无法撤销。请先备份逐题档案。`))return;(async()=>{let previous=e.students,index=previous.indexOf(r.person);e.students=previous.filter(x=>x!==r.person);if(!await ssSave(e)){e.students=previous;return}if(s.profileLinks)delete s.profileLinks[e.id];save();if(ssCurrent===e.id&&ssStudent===r.person.id)ssStudent=e.students[0]?.id||'';render();toast('已删除该学生的本次逐题记录')})()}
function uImportLegacyTags(){let daily=Object.values(db.tags||{}).flat(),action=db.measures||[],d=0,a=0;for(let t of daily)if(!pf.library.daily.includes(t)){pf.library.daily.push(t);d++}for(let t of action)if(!pf.library.action.includes(t)){pf.library.action.push(t);a++}pfSave();render();toast(`已添加 ${d} 条表现标签、${a} 条措施标签`)}
function uClearPlatform(){let r=pfStudent();if(!r)return;if(!confirm(`确定清空 ${r.name} 已填写的平时标签、考试备注、措施、个性化写作备注、评语草稿和修改过的成绩吗？学校原表原有内容会保留。此操作无法撤销。`))return;r.daily=[];r.action=[];r.dailyNote='';r.examNote='';r.actionNote='';r.instruction='';r.draft={};r.draftEdited={};r.draftExamId='';r.grade=r.originalGrade??'';pfSave();render();toast('该学生的反馈素材已清空')}
const uPriorBind=bind;bind=function(){uPriorBind();document.querySelectorAll('[data-u-sub]').forEach(x=>x.onclick=()=>switchPage(x.dataset.uSub));let edit=$('[data-u-edit]'),remove=$('[data-u-remove]');if(edit)edit.onclick=uEdit;if(remove)remove.onclick=uRemove;document.querySelectorAll('[data-u-link]').forEach(x=>x.onclick=()=>uLink(+x.dataset.uLink));document.querySelectorAll('[data-u-remove-exam]').forEach(x=>x.onclick=()=>uRemoveExam(+x.dataset.uRemoveExam));if(page==='platform'){let top=document.querySelector('.pf-top .toolbar');if(top){let b=document.createElement('button');b.className='smallbtn';b.textContent='导入旧版标签';b.title='仅复制标签库，不更改学生已经选择的内容';b.onclick=uImportLegacyTags;top.prepend(b)}}if(page==='platform'&&pfStudent()){let slot=document.querySelector('.pf-layout>section:last-child>.panel>.panel-head');if(slot){let b=document.createElement('button');b.className='smallbtn danger';b.textContent='清空该生反馈素材';b.onclick=uClearPlatform;slot.append(b)}}document.querySelectorAll('[data-u-crop-exam]').forEach(x=>x.onclick=()=>{let s=student(),e=ssExams[+x.dataset.uCropExam],r=e&&uResolve(s,e);if(!r?.person)return alert('关联记录已不存在，请重新确认。');ssCurrent=e.id;ssStudent=r.person.id;ssViewCrop(x.dataset.uCropQ)})};
const uOldRender=render;render=function(){uOldRender();for(let x of document.querySelectorAll('#nav [data-page]')){if(['tags','measures','feedback'].includes(x.dataset.page))x.remove();if(x.dataset.page==='platform'&&U_FEEDBACK_PAGES.includes(page))x.classList.add('active')}if(U_FEEDBACK_PAGES.includes(page)){$('#title').textContent='反馈';$('#subtitle').textContent='整理平时表现、改进措施和家长评语';let tabs=document.createElement('div');tabs.className='unified-tabs';tabs.setAttribute('aria-label','反馈功能');tabs.innerHTML=uTabs.map(([key,label])=>`<button data-u-sub="${key}" class="${page===key?'active':''}" aria-current="${page===key?'page':'false'}">${label}</button>`).join('');$('#content').prepend(tabs);let note=document.createElement('p');note.className='unified-data-hint';note.textContent='学校模板反馈按教学班保存。可从旧版复制标签库，已选标签和备注分开保留。';tabs.after(note);tabs.querySelectorAll('[data-u-sub]').forEach(x=>x.onclick=()=>switchPage(x.dataset.uSub))}};
const uProfileCardsPriorBind=bind;
bind=function(){
 uProfileCardsPriorBind();
 document.querySelectorAll('[data-u-view-card]').forEach(button=>{
  button.onclick=()=>uViewExamCard(Number(button.dataset.uViewCard),button);
 });
};
render();

