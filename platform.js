/* 学校模板工作流：保留原始工作簿，仅写回指定学生行的成绩和反馈。 */
const PF_KEY='math-feedback-platform-v1';
const PF_GROUPS = ['IG1', 'IGB', 'IG3'];
const PF_STYLE = '亲切自然、具体客观，符合数学教师身份';
const pfWorkspace = () => ({template:null, records:[], selected:'', style:PF_STYLE});
const pfDefault = () => ({
  group:'IGB',
  classes:Object.fromEntries(PF_GROUPS.map(group => [group, pfWorkspace()])),
  library:{daily:Object.values(defaults).flat(), action:[...measures0]}
});
let pfSearch = '';

function pfGroupHint(record) {
  const label = String(record.cls || '').trim().normalize('NFKC');
  if (/^IG2024级数学走班B-2$/i.test(label)) return 'IGB';
  const explicit = PF_GROUPS.find(group => new RegExp('^' + group + '(?:$|[ .·/-])', 'i').test(label));
  if (explicit) return explicit;
  const groups = [...new Set(db.students.filter(s => PF_GROUPS.includes(s.group) && s.name === record.name).map(s => s.group))];
  return groups.length === 1 ? groups[0] : '';
}

function pfNormalize(data) {
  if (!data || typeof data !== 'object') return pfDefault();
  const {template, records, selected, style, search, ...normalized} = data;
  normalized.library ??= pfDefault().library;
  normalized.library.daily ??= [];
  normalized.library.action ??= [];
  if (!normalized.classes) {
    normalized.classes = pfDefault().classes;
    const original = Array.isArray(records) ? records : [];
    const hints = new Set(original.map(pfGroupHint));
    const only = hints.size === 1 ? [...hints][0] : '';
    if (template || original.length) {
      const group = only || 'legacy';
      normalized.classes[group] = {...pfWorkspace(), template:template || null, records:original, selected:selected || '', style:style ?? PF_STYLE};
      normalized.group = group;
    }
    for (const group of PF_GROUPS) normalized.classes[group].style = style ?? PF_STYLE;
  }
  for (const group of PF_GROUPS) normalized.classes[group] ??= pfWorkspace();
  for (const workspace of Object.values(normalized.classes)) {
    workspace.records = Array.isArray(workspace.records) ? workspace.records.map(pfPrepare) : [];
    workspace.style ??= PF_STYLE;
    workspace.selected ??= '';
  }
  if (!Object.hasOwn(normalized.classes, normalized.group)) normalized.group = 'IGB';
  return normalized;
}

let pf;
try { pf = pfNormalize(JSON.parse(localStorage.getItem(PF_KEY))); }
catch { pf = pfDefault(); }

function pfSave() {
  try {
    localStorage.setItem(PF_KEY, JSON.stringify(pf));
    return true;
  } catch {
    alert('保存失败：浏览器存储空间不足。请先备份数据，避免关闭页面。');
    return false;
  }
}
function pfActive() { return pf.classes[pf.group]; }

function pfRecords(workspace = pfActive(), group = pf.group) {
  if (!workspace.template && PF_GROUPS.includes(group)) {
    const existing = new Set(workspace.records.map(record => record.profileId));
    for (const student of db.students.filter(student => student.group === group)) {
      if (existing.has(student.id)) continue;
      workspace.records.push(pfPrepare({
        key:'profile:' + student.id, profileId:student.id, row:null, id:student.id,
        name:student.name, cls:student.className || group, originalGrade:'', originalFeedback:''
      }));
    }
  }
  return workspace.records;
}

function pfStudent() {
  const workspace = pfActive();
  const records = pfRecords(workspace);
  const student = records.find(record => record.key === workspace.selected) || records[0];
  workspace.selected = student?.key || '';
  return student;
}

function pfSwitch(group) {
  if (!Object.hasOwn(pf.classes, group) || group === pf.group) return;
  pf.group = group;
  pfSearch = '';
  pfStudent();
  pfSave();
  render();
}

function pfScoreTarget(exam, person) {
  const exact = Object.values(pf.classes).flatMap(workspace => workspace.records)
    .filter(record => person.studentId && record.id === person.studentId && record.name === person.name);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  const profiles = db.students.filter(profile => PF_GROUPS.includes(profile.group) && uResolve(profile, exam).person === person);
  if (profiles.length !== 1) return null;
  const profile = profiles[0];
  const candidates = pfRecords(pf.classes[profile.group], profile.group)
    .filter(record => record.profileId === profile.id || (!record.profileId && record.name === profile.name));
  return candidates.length === 1 ? candidates[0] : null;
}
function pfPrepare(r){r.daily??=[];r.action??=[];r.dailyNote??='';r.examNote??='';r.actionNote??='';r.instruction??='';r.grade??='';return r}
function pfChunk(r,style=pfActive().style){let parts=[];let daily=[...r.daily,r.dailyNote].filter(Boolean);if(daily.length)parts.push('【平常表现要点】\n'+daily.map(x=>'• '+x).join('\n'));if(r.examNote.trim())parts.push('【考试反馈要点】\n'+r.examNote.trim());let action=[...r.action,r.actionNote].filter(Boolean);if(action.length)parts.push('【有效措施要点】\n'+action.map(x=>'• '+x).join('\n'));if(r.instruction.trim())parts.push('【个性化写作备注】\n'+r.instruction.trim());if(parts.length&&style.trim())parts.push('【给 Codex 的语言风格要求】\n'+style.trim());return parts.join('\n\n')}
function pfContent(r,style=pfActive().style){let material=pfChunk(r,style);return [r.originalFeedback?.trim(),material].filter(Boolean).join('\n\n')}
function pfBytesTo64(bytes){let out='';for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(out)}
function pf64ToBytes(s){let a=atob(s),u=new Uint8Array(a.length);for(let i=0;i<a.length;i++)u[i]=a.charCodeAt(i);return u}
function pfXml(str){let d=new DOMParser().parseFromString(str,'application/xml');if(d.getElementsByTagName('parsererror').length)throw Error('工作簿 XML 无法解析');return d}
function pfAll(node,local){return [...node.getElementsByTagNameNS('*',local)]}
function pfValue(cell,shared){if(!cell)return '';let t=cell.getAttribute('t'),v=pfAll(cell,'v')[0]?.textContent??'';if(t==='s')return shared[+v]??'';if(t==='inlineStr')return pfAll(cell,'t').map(x=>x.textContent).join('');return v}
async function pfParse(file){if(!/\.xlsx$/i.test(file.name))throw Error('请选择学校平台导出的 .xlsx 模板。');let bytes=new Uint8Array(await file.arrayBuffer()),zip=await JSZip.loadAsync(bytes);let workbook=pfXml(await zip.file('xl/workbook.xml').async('string')),sheets=pfAll(workbook,'sheet');if(!sheets.length)throw Error('模板没有工作表。');let sheet=sheets[0],rid=sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||sheet.getAttribute('r:id');let rel=pfXml(await zip.file('xl/_rels/workbook.xml.rels').async('string')),link=pfAll(rel,'Relationship').find(x=>x.getAttribute('Id')===rid);if(!link)throw Error('无法定位工作表。');let target=link.getAttribute('Target').replace(/^\//,'');let path=target.startsWith('xl/')?target:'xl/'+target;if(!zip.file(path))throw Error('无法读取工作表内容。');let shared=[];if(zip.file('xl/sharedStrings.xml')){let x=pfXml(await zip.file('xl/sharedStrings.xml').async('string'));shared=pfAll(x,'si').map(n=>pfAll(n,'t').map(t=>t.textContent).join(''))}let doc=pfXml(await zip.file(path).async('string')),rows=pfAll(doc,'row'),row2=rows.find(r=>r.getAttribute('r')==='2');function cells(row){let o={};for(let c of pfAll(row,'c')){let k=(c.getAttribute('r')||'').match(/^[A-Z]+/i)?.[0]?.toUpperCase();if(k)o[k]=pfValue(c,shared)}return o}let h=row2&&cells(row2);let expected=['学号','学生姓名','班级','成绩','反馈'];if(!h||expected.some((x,i)=>String(h[String.fromCharCode(65+i)]||'').trim()!==x))throw Error('未识别学校模板第 2 行表头，应为：'+expected.join('、'));let records=[];for(let row of rows){let n=+row.getAttribute('r');if(n<3)continue;let c=cells(row),name=String(c.B??'').trim();if(!name)continue;let id=String(c.A??'').trim(),cls=String(c.C??'').trim();if(!cls)throw Error('第 '+n+' 行缺少班级，请先在原模板中核对。');records.push({key:id?`id:${id}`:`name:${cls}:${name}`,row:n,id,name,cls,grade:String(c.D??''),originalFeedback:String(c.E??'')})}if(!records.length)throw Error('模板中没有学生记录。');let keys=new Set;for(let r of records){if(keys.has(r.key))throw Error('学生标识重复：请核对模板中的学号或同班同名学生。');keys.add(r.key)}return {template:{name:file.name,path,sheet:sheet.getAttribute('name'),base64:pfBytesTo64(bytes)},records}}
function pfHasDraft(record) {
  return record.daily.length || record.action.length ||
    [record.dailyNote, record.examNote, record.actionNote, record.instruction].some(value => value.trim()) ||
    record.grade !== (record.originalGrade ?? '');
}

function pfTemplateRecords(parsed, workspace, group) {
  const old = pfRecords(workspace, group);
  const matches = new Set();
  const roster = db.students.filter(student => student.group === group);
  const byName = new Map();
  for (const record of parsed.records) byName.set(record.name, (byName.get(record.name) || 0) + 1);
  const imported = parsed.records.map(record => {
    record.originalGrade = record.grade;
    const profiles = roster.filter(student => student.name === record.name);
    if (profiles.length === 1 && byName.get(record.name) === 1) record.profileId = profiles[0].id;
    let previous = old.find(item => item.id === record.id && item.name === record.name && item.cls === record.cls);
    if (!previous && record.profileId) {
      const drafts = old.filter(item => item.profileId === record.profileId && item.name === record.name);
      if (drafts.length === 1) previous = drafts[0];
    }
    if (previous && !matches.has(previous)) {
      for (const field of ['daily','action','dailyNote','examNote','actionNote','instruction']) record[field] = previous[field];
      if (previous.grade !== (previous.originalGrade ?? '')) record.grade = previous.grade;
      matches.add(previous);
    }
    return pfPrepare(record);
  });
  const retained = old.filter(record => !matches.has(record) && pfHasDraft(record))
    .map(record => ({...record, key:'draft:' + record.key.replace(/^draft:/, ''), row:null}));
  return {records:[...imported, ...retained], retained:retained.length};
}

function pfInput() {
  const group = pf.group;
  const workspace = pfActive();
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = '.xlsx';
  file.onchange = async () => {
    if (!file.files[0]) return;
    try {
      const parsed = await pfParse(file.files[0]);
      if (PF_GROUPS.includes(group) && parsed.records.some(record => {
        const hint = pfGroupHint(record);
        return hint && hint !== group;
      })) throw Error('这份模板的学生与当前教学班不一致，请先切换到相应班级。');
      const next = pfTemplateRecords(parsed, workspace, group);
      if (workspace.template && !confirm('将更换当前班级的模板。匹配的草稿会保留，无法匹配且已填写的草稿会单独保留。继续吗？')) return;
      const previous = {...workspace};
      workspace.template = parsed.template;
      workspace.records = next.records;
      workspace.selected = next.records[0]?.key || '';
      if (!pfSave()) {
        Object.assign(workspace, previous);
        return;
      }
      if (pf.group === group) pfSearch = '';
      render();
      toast('已读取 ' + parsed.records.length + ' 名学生' + (next.retained ? '，保留 ' + next.retained + ' 份未关联草稿' : ''));
    } catch (error) {
      alert('读取模板失败：' + error.message);
    }
  };
  file.click();
}
function pfSelectedChip(type,t){return `<button class="chip on" data-pf-toggle="${type}" data-tag-value="${E(t)}" title="点击取消">✓ ${E(t)}</button>`}
function pfSection(r,type,title,description){let values=r[type],note=type==='daily'?'dailyNote':'actionNote';return `<div class="feedback-card"><div class="panel-head"><div><h3>${title}</h3><p class="muted">${description}</p></div><span class="tag">已选 ${values.length} 条</span></div><div class="chips">${values.map(t=>pfSelectedChip(type,t)).join('')||'<span class="hint">点击下方标签库，为这位学生选择要点。</span>'}</div><div class="pf-library"><div class="section-title">标签库 · 点击选择或取消</div><div class="chips">${pf.library[type].map(t=>`<button class="chip ${values.includes(t)?'on':''}" data-pf-toggle="${type}" data-tag-value="${E(t)}">${values.includes(t)?'✓ ':''}${E(t)}</button>`).join('')||'<span class="hint">还没有标签。可以先添加您常用的描述，以后反复点击使用。</span>'}</div><div class="row"><input id="pf-new-${type}" placeholder="输入一条新标签，可反复用于不同学生" class="grow"><button data-pf-add="${type}">加入标签库</button><button data-pf-bulk="${type}">批量添加</button><button data-pf-manage="${type}">管理标签</button></div></div><div class="row pf-note-head"><label class="section-title" for="pf-${note}">个性化备注</label><button class="smallbtn" data-pf-voice="${note}">🎙 语音输入</button></div><textarea id="pf-${note}" data-pf-field="${note}" placeholder="可补充这位学生的具体情况；也可点击语音输入。">${E(r[note])}</textarea></div>`}
function pfClassOptions() {
  return Object.keys(pf.classes).map(group =>
    `<option value="${E(group)}"${pf.group === group ? ' selected' : ''}>${E(group === 'legacy' ? '原模板' : group)}</option>`
  ).join('');
}
function pfView(){const workspace=pfActive(),records=pfRecords(workspace),template=workspace.template;let r=pfStudent(),list=records.filter(x=>`${x.name} ${x.id} ${x.cls}`.toLowerCase().includes(pfSearch.toLowerCase()));return `<div class="panel pf-top"><div class="panel-head"><div><h2>学校模板 · 反馈要点工作区</h2><p class="muted">导入学校原表，选择标签、记录备注，导出 Excel 交给 Codex 润色。</p></div><div class="toolbar"><label class="field">教学班<select id="pf-group">${pfClassOptions()}</select></label><button data-pf-action="import">${template?'更换本班模板':'导入本班模板'}</button><button class="primary" data-pf-action="export" ${records.length?'':'disabled'}>导出本班 Codex 素材表</button>${template&&records.some(s=>s.row===null)?'<button data-pf-action="generic">导出本班全部草稿</button>':''}</div></div><div class="hint">${template?`当前模板：${E(template.name)}`:'当前使用工作台名单。可填写反馈并导出通用素材，导入学校模板后可按原表格式导出。'}</div><div class="alert">导出的反馈是给 Codex 整理的素材，不是最终评语；请让 Codex 完成融合并检查后，再上传学校平台。</div></div>${!r?'<div class="panel empty">本班暂无学生。可在学生档案添加学生，或导入本班学校模板。</div>':`<div class="layout pf-layout"><section class="panel"><div class="panel-head"><h2>学生名单 <span class="muted">${records.length}</span></h2></div><input id="pf-search" class="search" placeholder="搜索姓名、学号或班级" value="${E(pfSearch)}"><div class="student-list">${list.map(s=>`<div class="student ${s.key===r.key?'selected':''}" data-pf-select="${E(s.key)}"><div class="student-name"><span class="avatar">${E(s.name.slice(-1))}</span><div><b>${E(s.name)}</b><small>${E(s.id||'无学号')} · ${E(s.cls)}</small></div></div><span class="hint">${pfChunk(s)?'已记录':''}</span></div>`).join('')||'<div class="empty">暂无匹配的学生</div>'}</div></section><section><div class="panel"><div class="panel-head"><div><h2>${E(r.name)} <span class="muted">${E(r.id||'无学号')}</span></h2><p class="muted">${E(r.cls)} · ${r.row===null?'工作台草稿':`学校原表第 ${r.row} 行`}</p></div><label class="field" style="width:145px">成绩（按平台要求填写）<input data-pf-field="grade" value="${E(r.grade)}" placeholder="留空亦可"></label></div>${r.originalFeedback?`<div class="summary"><b>原表已有反馈（导出时保留）</b><br>${E(r.originalFeedback)}</div>`:''}${pfSection(r,'daily','第一部分 · 平常表现','选择真实观察，或补充这名学生的具体情况。')}<div class="feedback-card"><div class="panel-head"><div><h3>第二部分 · 考试反馈</h3><p class="muted">考试后再补充答题卡分析，当前可留空。</p></div><button class="smallbtn" data-pf-voice="examNote">🎙 语音输入</button></div><textarea data-pf-field="examNote" id="pf-examNote" placeholder="考试结束后记录错题、优势或分析要点。">${E(r.examNote)}</textarea></div>${pfSection(r,'action','第三部分 · 有效措施','选择适合的措施，必要时录入个性化安排。')}<div class="feedback-card"><div class="panel-head"><div><h3>给 Codex 的个性化备注</h3><p class="muted">例如需要强调的特点、措辞偏好或希望避免的表达。</p></div><button class="smallbtn" data-pf-voice="instruction">🎙 语音输入</button></div><textarea data-pf-field="instruction" id="pf-instruction" placeholder="可留空；会与该生反馈要点一起导出。">${E(r.instruction)}</textarea></div><div class="feedback-card"><h3>全班统一语言风格</h3><p class="hint">作为写作要求随素材导出，您还可以在发给 Codex 时调整。</p><input id="pf-style" value="${E(workspace.style)}" placeholder="例如：亲切自然、具体客观"></div><div class="panel-head"><h3>导出内容预览</h3><span class="hint">${template&&r.row!==null?'保存在原表“反馈”列':'随通用素材导出'}</span></div><div class="summary" id="pf-preview">${E(pfContent(r)||'选择标签或输入备注后，在此显示素材。')}</div></div></section></div>`}`}
function pfManage(type){let name=type==='daily'?'平常表现':'有效措施',body=`<p class="hint">删除标签只影响标签库，已给学生选择的内容会保留；修改标签会同步更新已选记录。</p><div id="pf-manage-list">${pf.library[type].map((t,i)=>`<div class="row pf-manage-row"><input data-pf-manage-value="${i}" class="grow" value="${E(t)}"><button class="smallbtn danger" data-pf-delete="${i}">删除</button></div>`).join('')||'<p class="hint">标签库还是空的。</p>'}</div>`;modal('管理'+name+'标签',body,'保存修改',d=>{let entries=[...d.querySelectorAll('[data-pf-manage-value]')],newlist=[],changes=[];for(let inp of entries){let i=+inp.dataset.pfManageValue,old=pf.library[type][i],val=inp.value.trim();if(!val){alert('标签不能为空，请填写或使用删除按钮。');return}if(newlist.includes(val)){alert('标签内容不能重复。');return}newlist.push(val);changes.push([old,val])}for(let [old,val] of changes)if(old!==val)for(let r of Object.values(pf.classes).flatMap(workspace=>workspace.records))r[type]=r[type].map(t=>t===old?val:t);pf.library[type]=newlist;pfSave();d.remove();render();toast('标签库已保存')});let d=document.querySelector('.modalback:last-child');d.querySelectorAll('[data-pf-delete]').forEach(btn=>btn.onclick=()=>btn.closest('.pf-manage-row').remove())}
function pfBulk(type){modal('批量添加标签',`<p class="hint">每行一条，可一次粘贴多条标签；重复内容会自动跳过。</p><textarea id="pf-bulk-input" placeholder="每行输入一条标签" rows="10"></textarea>`,'添加标签',d=>{let lines=d.querySelector('#pf-bulk-input').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),count=0;for(let t of lines)if(!pf.library[type].includes(t)){pf.library[type].push(t);count++}pfSave();d.remove();render();toast(`已添加 ${count} 条标签`)})}
let pfRecognition=null;
function pfVoice(field){let Rec=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Rec){alert('当前浏览器不支持网页语音识别。可点击输入框后使用 Windows 语音输入（Win + H），或换支持该功能的浏览器。');return}if(pfRecognition){pfRecognition.stop();return}if(!confirm('语音识别由浏览器提供，可能把语音发送给浏览器的识别服务并需要联网。请确认愿意使用后再开始；不要说出不希望发送的信息。'))return;let target=$(`#pf-${field}`),s=pfStudent(),workspace=pfActive(),key=s.key,rec=new Rec();pfRecognition=rec;rec.lang='zh-CN';rec.continuous=false;rec.interimResults=false;let status=document.querySelector(`[data-pf-voice="${field}"]`);if(status)status.textContent='■ 停止录音';rec.onresult=e=>{let text=[...e.results].map(x=>x[0].transcript).join('');let record=workspace.records.find(r=>r.key===key);if(!record)return;record[field]=(record[field]?record[field]+'，':'')+text;pfSave();if(pfActive()===workspace&&pfStudent()?.key===key&&target?.isConnected){target.value=record[field];let prev=$('#pf-preview');if(prev)prev.textContent=pfContent(record)}};rec.onerror=e=>{let reasons={'not-allowed':'麦克风权限未授予','service-not-allowed':'语音服务不可用','network':'语音服务网络不可用','no-speech':'没有检测到语音','audio-capture':'未找到可用麦克风'};alert((reasons[e.error]||'语音识别未完成')+'。请点击备注输入框，然后按 Win + H 使用 Windows 语音输入；Windows 听写可能需要网络和麦克风权限。');target?.focus()};rec.onend=()=>{pfRecognition=null;if(status)status.textContent='🎙 语音输入'};try{rec.start();toast('正在听写，请开始说话')}catch(e){pfRecognition=null;alert('无法启动语音识别：'+e.message)}}
function pfSetCell(row,ref,value,doc){let ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main',cell=[...row.children].find(n=>n.localName==='c'&&n.getAttribute('r')===ref);if(!cell){cell=doc.createElementNS(ns,'c');cell.setAttribute('r',ref);let col=ref.match(/^[A-Z]+/)[0];let next=[...row.children].find(n=>n.localName==='c'&&((n.getAttribute('r')||'').match(/^[A-Z]+/)||[''])[0]>col);row.insertBefore(cell,next||null)}for(let child of [...cell.children])if(['v','is','f'].includes(child.localName))cell.removeChild(child);cell.setAttribute('t','inlineStr');let is=doc.createElementNS(ns,'is'),t=doc.createElementNS(ns,'t');t.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');t.textContent=value;is.appendChild(t);cell.appendChild(is)}
async function pfExport(generic = false) {
  const workspace = pfActive();
  const group = pf.group === 'legacy' ? '原模板' : pf.group;
  const records = pfRecords(workspace);
  const template = workspace.template;
  const style = workspace.style;
  if (!records.length) return;
  try {
    if (generic || !template) {
      const rows = [['编号','学生姓名','教学班','行政班或原表班级','成绩','反馈'],
        ...records.map(record => [record.id, record.name, group, record.cls, record.grade, pfContent(record, style)])];
      await Excel.write(rows, group + '_Codex反馈素材.xlsx');
    } else {
      const updates = records.filter(record => Number.isInteger(record.row)).map(record => ({
        row:record.row,
        grade:record.grade !== (record.originalGrade ?? '') ? record.grade : null,
        feedback:pfChunk(record, style) ? pfContent(record, style) : null
      }));
      const zip = await JSZip.loadAsync(pf64ToBytes(template.base64));
      const doc = pfXml(await zip.file(template.path).async('string'));
      const rows = new Map(pfAll(doc, 'row').map(row => [+row.getAttribute('r'), row]));
      for (const update of updates) {
        const row = rows.get(update.row);
        if (!row) throw Error('模板缺少第 ' + update.row + ' 行');
        if (update.grade !== null) pfSetCell(row, 'D' + update.row, update.grade, doc);
        if (update.feedback !== null) pfSetCell(row, 'E' + update.row, update.feedback, doc);
      }
      zip.file(template.path, new XMLSerializer().serializeToString(doc));
      const output = await zip.generateAsync({type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      Excel.download(output, group + '_给Codex的反馈素材_' + template.name);
    }
    toast('已导出 ' + group + ' 的反馈素材');
  } catch (error) {
    alert('导出失败：' + error.message);
  }
}
function pfBind(){const group=$('#pf-group');if(group)group.onchange=()=>{pfSwitch(group.value);$('#pf-group')?.focus()};document.querySelectorAll('[data-pf-action]').forEach(x=>x.onclick=()=>x.dataset.pfAction==='import'?pfInput():pfExport(x.dataset.pfAction==='generic'));document.querySelectorAll('[data-pf-select]').forEach(x=>x.onclick=()=>{pfActive().selected=x.dataset.pfSelect;pfSave();render()});let search=$('#pf-search');if(search)search.oninput=()=>{pfSearch=search.value;let pos=search.selectionStart;render();$('#pf-search').focus();$('#pf-search').setSelectionRange(pos,pos)};document.querySelectorAll('[data-pf-toggle]').forEach(x=>x.onclick=()=>{let r=pfStudent(),type=x.dataset.pfToggle,t=x.dataset.tagValue;r[type]=r[type].includes(t)?r[type].filter(z=>z!==t):[...r[type],t];pfSave();render()});document.querySelectorAll('[data-pf-add]').forEach(x=>x.onclick=()=>{let type=x.dataset.pfAdd,t=$(`#pf-new-${type}`).value.trim();if(!t)return toast('请输入一条标签');if(pf.library[type].includes(t))return toast('标签已存在');pf.library[type].push(t);pfSave();render();toast('已加入标签库')});document.querySelectorAll('[data-pf-bulk]').forEach(x=>x.onclick=()=>pfBulk(x.dataset.pfBulk));document.querySelectorAll('[data-pf-manage]').forEach(x=>x.onclick=()=>pfManage(x.dataset.pfManage));document.querySelectorAll('[data-pf-field]').forEach(x=>x.oninput=()=>{let r=pfStudent();r[x.dataset.pfField]=x.value;pfSave();let p=$('#pf-preview');if(p)p.textContent=pfContent(r)||'选择标签或输入备注后，在此显示素材。'});document.querySelectorAll('[data-pf-voice]').forEach(x=>x.onclick=()=>pfVoice(x.dataset.pfVoice));let style=$('#pf-style');if(style)style.oninput=()=>{pfActive().style=style.value;pfSave();$('#pf-preview').textContent=pfContent(pfStudent())||'选择标签或输入备注后，在此显示素材。'}}
window.getPlatformBackup = () => JSON.parse(JSON.stringify(pf));
window.restorePlatformBackup = data => {
  pf = pfNormalize(data);
  pfSearch = '';
  pfSave();
};
menus.push(['platform','▧','学校模板反馈','按学校模板整理三部分反馈要点']);views.platform=pfView;const pfOriginalBind=bind;bind=function(){pfOriginalBind();if(page==='platform')pfBind()};render();

