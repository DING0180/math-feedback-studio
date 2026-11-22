/* 考试分析：先看班级，再展开某场考试的逐题分数。 */
let caGroup='',caExamId='',caSearch='',caAdmin='',caIndividual=false;
const caAdminCollator = new Intl.Collator('zh-CN', {numeric: true});

function caAdminName(student) {
  const name = String(student.className ?? '').trim().normalize('NFKC');
  const primary = student.group === 'IG1' && /^IG1\.([1-6])$/i.exec(name);
  if (primary) return `七年级${primary[1]}班`;
  const junior = student.group === 'IGB' && /^IGB([1-3])$/i.exec(name);
  if (junior) return `九年级${Number(junior[1]) + 6}班`;
  return name.replace(/^([七八九]年级)\s*(\d+)\s*班$/, '$1$2班');
}

function caAdminKey(student) {
  return 'class:' + caAdminName(student);
}

function caAdminSelect(students) {
  const names = [...new Set(students.map(caAdminName))].filter(Boolean).sort(caAdminCollator.compare);
  if (students.some(student => !caAdminName(student))) names.push('');
  if (caAdmin && !names.some(name => 'class:' + name === caAdmin)) caAdmin = '';
  return `<label class="field ca-select">行政班<select id="ca-admin" ${names.length ? '' : 'disabled'}>
    <option value="">全部行政班</option>
    ${names.map(name => {
      const value = 'class:' + name;
      return `<option value="${E(value)}" ${caAdmin === value ? 'selected' : ''}>${E(name || '未填写行政班')}</option>`;
    }).join('')}
  </select></label>`;
}

function caVisibleStudents(students) {
  const query = caSearch.trim().toLowerCase();
  return students.filter(student => {
    if (caAdmin && caAdminKey(student) !== caAdmin) return false;
    return `${student.name} ${student.id} ${student.className || ''} ${caAdminName(student)}`.toLowerCase().includes(query);
  });
}

const caLegacyExamView=views.exams;
const CA_IG1_OCTOBER_ID = 'ig1-harvey-2026-oct-month';
const CA_IG1_MIDTERM_ID = 'ig1-harvey-2026-midterm';
function caIg1Midterm(exam) {
  return exam.id === CA_IG1_MIDTERM_ID && exam.importTag === 'ig1-harvey-2026';
}
function caExamIndex(exam) {
  if (['harvey-2026-first-question-scores', 'ig3-alice-2026-first', CA_IG1_OCTOBER_ID].includes(exam.id)) return 0;
  if (caIg1Midterm(exam) || ['harvey-2026-midterm-question-scores', 'ig3-alice-2026-midterm'].includes(exam.id)) return 1;
  return -1;
}
function caScores(s){let r=(s.comparisonRecords||[]).find(x=>x.key===THREE_CLASS_KEY);if(r)return {names:r.examNames,scores:r.scores,ranks:r.ranks};let a=s.ig3AliceTotals;if(a)return {names:a.names,scores:a.scores,ranks:null};return null}
function caApplicableExam(e,group){if(e.importTag==='harvey-2026')return group==='IGB';if(e.importTag==='ig3-alice-2026')return group==='IG3';if(e.importTag==='ig1-harvey-2026')return group==='IG1';return activeStudentRoster(group).some(s=>uResolve(s,e).person)}
function caNumber(v){return typeof v==='number'&&Number.isFinite(v)?v:null}
function caMean(list,i){let v=list.map(x=>caNumber(caScores(x)?.scores?.[i])).filter(x=>x!==null);return v.length?`${(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1)} 分 · ${v.length} 人`:'暂无数据'}
function caDelta(s){let a=caScores(s)?.scores||[],x=caNumber(a[0]),y=caNumber(a[1]);if(x===null||y===null)return '<span class="ca-na">—</span>';let d=Math.round((y-x)*100)/100;return `<span class="ca-delta ${d>0?'up':d<0?'down':'flat'}">${d>0?'↑ +':d<0?'↓ ':''}${d} 分</span>`}
function caExtraColumns(list){let seen=new Map();for(const s of list)for(const x of (s.exams||[])){let key=JSON.stringify([x.name,x.date||'']);if(!seen.has(key))seen.set(key,{key,name:x.name,date:x.date||''})}return [...seen.values()].sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'))}
function caMismatchLabel(s){let totals=caScores(s)?.scores;if(!totals)return '';for(const e of ssExams){const i=caExamIndex(e),total=caNumber(totals[i]);if(total===null)continue;let p=uResolve(s,e).person;if(!p)continue;let v=e.questions.map(q=>p.scores?.[q.id]);if(v.length&&v.every(x=>x?.status==='有分数'&&Number.isFinite(x.value))&&Math.abs(v.reduce((n,x)=>n+x.value,0)-total)>0.001)return '逐题合计与原总分不一致，请核对'}return ''}
function caGradeRankDelta(record) {
  if (record?.rankScope !== 'grade' || !record.ranks.every(rank => Number.isInteger(rank) && rank > 0)) {
    return '<span class="ca-na">—</span>';
  }
  const [first, second] = record.ranks;
  const change = first - second;
  const style = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  const label = change > 0 ? `上升 ${change} 名` : change < 0 ? `下降 ${-change} 名` : '持平';
  return `<span class="ca-delta ${style}">${label}</span>`;
}
function caSummaryScore(record, index) {
  const score = caNumber(record?.scores?.[index]);
  const rank = record?.ranks?.[index];
  const adminRank = record?.adminRanks?.[index];
  const scope = record?.rankScope === 'grade' ? '年级' : '三班';
  return `${score === null ? '—' : `${score} 分`}${rank ? `<small>${scope}第 ${E(String(rank))} 名</small>` : ''}${adminRank ? `<small>行政班第 ${E(String(adminRank))} 名</small>` : ''}`;
}
function caSummaryRows(list, extras) {
  return list.map(s => {
    const record = caScores(s);
    const warning = caMismatchLabel(s);
    return `<tr><th scope="row"><button class="ca-name" data-ca-profile="${E(s.id)}">${E(s.name)}</button><small>${E(s.className||'')}</small>${warning ? `<small class="ca-warning">${E(warning)}</small>` : ''}</th>
      <td>${caSummaryScore(record, 0)}</td><td>${caSummaryScore(record, 1)}</td><td>${caDelta(s)}</td>
      ${caGroup === 'IG1' ? `<td>${caGradeRankDelta(record)}</td>` : ''}
      ${extras.map(col => {let e=(s.exams||[]).find(x=>JSON.stringify([x.name,x.date||''])===col.key);return `<td>${e?.score==null?'—':E(String(e.score))+' 分'}</td>`}).join('')}
      <td><button class="smallbtn" data-ca-profile="${E(s.id)}">查看档案</button></td></tr>`;
  }).join('');
}
function caMatrix(list,ex){if(!ex)return '<div class="empty">该班暂无已关联的逐题成绩，可在逐题分析中导入。</div>';let qs=ex.questions;return `<div class="ca-table-wrap"><table class="ca-table ca-matrix"><thead><tr><th scope="col">学生</th>${qs.map(q=>`<th scope="col">${E(q.id)}${q.max!=null?`<small>满分 ${q.max}</small>`:''}</th>`).join('')}</tr></thead><tbody>${list.map(s=>{let p=uResolve(s,ex).person;return `<tr><th scope="row"><button class="ca-name" data-ca-profile="${E(s.id)}">${E(s.name)}</button></th>${qs.map(q=>{let v=p?.scores?.[q.id],mark=p?.scoreMarks?.[q.id]||'',value=v?.status==='有分数'?v.value:v?.status==='缺考'?'缺考':'—';return `<td><span class="ca-score ${E(mark)}">${E(String(value))}</span></td>`}).join('')}</tr>`}).join('')}</tbody></table></div>`}
views.exams=function(){if(caIndividual)return `<div class="panel ca-back"><button data-ca-back>← 返回班级分析</button><span class="hint">当前查看单名学生，返回后可切换班级。</span></div>`+caLegacyExamView();
 let groupSelect=`<label class="field ca-select">教学班<select id="ca-group"><option value="">请选择班级</option>${[['IG1','IG1（含 IG1.1）'],['IGB','IGB'],['IG3','IG3']].map(([k,l])=>`<option value="${k}" ${caGroup===k?'selected':''}>${l}</option>`).join('')}</select></label>`;
 if(!caGroup)return `<section class="panel ca-intro"><div><span class="ca-kicker">CLASS OVERVIEW</span><h2>先选择一个班级</h2><p class="muted">查看全班的考试总分、成绩变化和每次考试的逐题得分。</p></div>${groupSelect}</section><div class="panel empty">选择 IG1、IGB 或 IG3 后，显示该班学生的成绩。</div>`;
 let all=activeStudentRoster(caGroup),adminSelect=caAdminSelect(all),list=caVisibleStudents(all);let exams=ssExams.filter(e=>caApplicableExam(e,caGroup));if(!exams.some(e=>e.id===caExamId))caExamId=exams[0]?.id||'';let ex=exams.find(e=>e.id===caExamId), n=all.filter(s=>{let v=caScores(s)?.scores||[];return caNumber(v[0])!==null&&caNumber(v[1])!==null}).length,extras=caExtraColumns(all);
 return `<section class="panel ca-intro"><div><span class="ca-kicker">CLASS OVERVIEW</span><h2>${E(caGroup)} · 成绩分析</h2><p class="muted">${all.length} 名学生 · ${n} 名已有两次成绩</p>${caAdmin || caSearch.trim() ? `<p class="hint">当前显示 ${list.length} 人。均分按整个教学班统计，排名保留原口径。</p>` : ''}</div><div class="ca-intro-actions">${groupSelect}${adminSelect}<button data-ca-individual>单个学生成绩管理</button></div></section><section class="ca-metrics"><div><span>第一次平均分</span><strong>${caMean(all,0)}</strong></div><div><span>第二次平均分</span><strong>${caMean(all,1)}</strong></div><div><span>两次均有成绩</span><strong>${all.filter(s=>{let a=caScores(s)?.scores||[];return caNumber(a[0])!==null&&caNumber(a[1])!==null}).length} 人</strong></div></section><section class="panel"><div class="panel-head ca-heading"><div><h2>全班总分变化</h2><p class="muted">第二次成绩减去第一次；点击学生姓名查看个人档案。</p></div><input class="ca-search" id="ca-search" value="${E(caSearch)}" placeholder="搜索姓名或编号" aria-label="搜索学生"></div><div class="ca-table-wrap"><table class="ca-table"><thead><tr><th scope="col">学生</th><th scope="col">${caGroup===`IG1`?`10月月度练习数1`:`初三上数1`}</th><th scope="col">${caGroup===`IG1`?(ssExams.some(caIg1Midterm)?`11月期中考试`:`11月期中考试（待导入）`):`11月期中`}</th><th scope="col">分数变化</th>${caGroup === 'IG1' ? '<th scope="col">年级名次变化</th>' : ''}${extras.map(x=>`<th scope="col">${E(x.name)}${x.date?`<small>${E(x.date)}</small>`:''}</th>`).join('')}<th scope="col">操作</th></tr></thead><tbody>${caSummaryRows(list,extras)||`<tr><td colspan="${(caGroup === 'IG1' ? 6 : 5)+extras.length}">没有符合条件的学生。</td></tr>`}</tbody></table></div><p class="hint">${caGroup === 'IG1' ? '年级名次按该次考试的年级成绩表显示，行政班名次按学生所在行政班显示。两次均有年级名次时显示变化，参考人数可能不同。' : '三班排名仅在已有 IGB 三班排名数据时显示。同分并列；原始成绩表未注明满分，暂不计算得分率。'}逐题分数调整后，原总分及排名不会自动更新，请核对提示。</p></section><section class="panel"><div class="panel-head ca-heading"><div><h2>每次考试的逐题得分</h2><p class="muted">选择考试并横向查看逐题得分；点击分数可修改或标注，均分按全班有效分数计算。</p></div><label class="field ca-select">选择考试<select id="ca-exam" ${exams.length?'':'disabled'}>${exams.map(x=>`<option value="${E(x.id)}" ${x.id===caExamId?'selected':''}>${E(x.name)}</option>`).join('')||'<option>暂无逐题考试</option>'}</select></label></div>${caMatrix(list,ex)}<p class="hint">不同试卷同一题号的考查内容可能不同，请结合试卷分析；“—”表示暂无记录，不代表 0 分。</p></section>`};
const caPriorBind=bind;bind=function(){caPriorBind();if(page!=='exams')return;let g=$('#ca-group');if(g)g.onchange=()=>{caGroup=g.value;caAdmin='';caSearch='';caExamId='';render()};let a=$('#ca-admin');if(a)a.onchange=()=>{caAdmin=a.value;render();$('#ca-admin')?.focus()};let x=$('#ca-exam');if(x)x.onchange=()=>{caExamId=x.value;render()};let q=$('#ca-search');if(q)q.oninput=()=>{caSearch=q.value;let p=q.selectionStart;render();$('#ca-search')?.focus();$('#ca-search')?.setSelectionRange(p,p)};document.querySelectorAll('[data-ca-profile]').forEach(b=>b.onclick=()=>{selected=b.dataset.caProfile;ig3GroupFilter=caGroup;switchPage('students')});let one=$('[data-ca-individual]');if(one)one.onclick=()=>{caIndividual=true;selected=activeStudentRoster(caGroup)[0]?.id||'';ig3GroupFilter=caGroup;render()};let back=$('[data-ca-back]');if(back)back.onclick=()=>{caIndividual=false;render()}};
const caPriorSwitch=switchPage;switchPage=function(p){if(p==='exams'&&page!=='exams')caIndividual=false;caPriorSwitch(p)};
render();


