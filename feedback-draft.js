/* Local school-template comments. Raw observations stay separate from editable paragraphs. */
const PF_DRAFT_NAMES = {daily:'平时表现', exam:'考试分析', action:'有效措施'};
const PF_DRAFT_TONES = {natural:'亲切自然', direct:'客观直接', encouraging:'鼓励引导', concise:'简洁实用'};

function pfDraftText(record) {
  return Object.entries(PF_DRAFT_NAMES).flatMap(([part,label])=>{
    const text = record.draft?.[part]?.trim();
    return text ? [`【${label}】${text}`] : [];
  }).join('\n\n');
}
function pfDraftPart(record, part) {
  const value = record.draft?.[part] || '';
  return `<div class="pf-draft-part" data-pf-draft-part="${part}">
    <div class="row pf-draft-toolbar">
      <label class="section-title" for="pf-draft-${part}">${PF_DRAFT_NAMES[part]}评语草稿</label>
      <button type="button" class="smallbtn" data-pf-write="${part}">${value.trim()?'重新生成':'生成'+PF_DRAFT_NAMES[part]}</button>
    </div>
    <textarea class="pf-draft-editor" id="pf-draft-${part}" rows="3" data-pf-draft-text="${part}" placeholder="生成后可直接修改，也可手写。">${E(value)}</textarea>
  </div>`;
}
function pfDraftControls(record) {
  const options = pfExamOptions(record);
  const current = options.find(option=>option.id===record.draftExamId) || options[0];
  return `<div class="pf-exam-controls">
    ${current?`<label class="field">本次考试<select id="pf-draft-exam-select">${options.map(({id,label})=>`<option value="${E(id)}" ${id===current.id?'selected':''}>${E(label)}</option>`).join('')}</select></label>
      <button type="button" class="smallbtn" data-pf-open-exam>查看该生逐题档案</button>`:''}
    <p class="hint" id="pf-exam-evidence">${current?'自动读取与该生档案关联的成绩和逐题记录；切片中的具体错因采用教师批注。':'当前没有已匹配的成绩记录，也可先填写考试观察。'}</p>
  </div>`;
}
function pfDraftActions() {
  return `<div class="row pf-draft-actions">
    <label class="field">语言风格<select id="pf-draft-tone">${Object.entries(PF_DRAFT_TONES).map(([id,label])=>`<option value="${id}" ${id===(pfActive().draftTone||'natural')?'selected':''}>${label}</option>`).join('')}</select></label>
    <button type="button" class="primary" data-pf-write="all">一键生成评语</button>
    <button type="button" data-pf-review>合并预览</button>
    <span class="hint" id="pf-draft-status" role="status"></span>
  </div>`;
}
function pfDraftGenerate(record, part, examId, style) {
  if (part==='daily') return {text:pfWriteDaily(record,style)};
  if (part==='action') return {text:pfWriteActions(record,style)};
  const evidence = examId ? pfExamFeedback(record,examId,style) : null;
  const note = record.examNote?.trim();
  const manual = note && /[。！？!?]$/.test(note) ? note : note ? note+'。' : '';
  let extra = manual;
  if (!evidence?.text && extra && record.name && !extra.includes(record.name)) extra = `${record.name}这次考试需要留意的是：${extra}`;
  return {...evidence, text:[evidence?.text,extra].filter(Boolean).join('')};
}
function pfDraftBind() {
  const record = pfStudent();
  if (!record) return;
  const select = $('#pf-draft-exam-select'), status = $('#pf-draft-status'), tone = $('#pf-draft-tone');
  if (tone) tone.onchange = () => {
    pfActive().draftTone = tone.value;
    pfSave();
    if(status) status.textContent = '风格已保存。重新生成后应用。';
  };
  if (select) select.onchange = () => {
    record.draftExamId = select.value;
    pfSave();
    $('#pf-exam-evidence').textContent = record.draft?.exam?.trim()
      ? '已切换考试。现有评语仍保留；如需更新，请重新生成考试分析。'
      : '点击生成考试分析，读取本次考试和可比的历史成绩。';
  };
  const openExam = document.querySelector('[data-pf-open-exam]');
  if (openExam) openExam.onclick = () => {
    const linked = pfExamLinks(record).find(item=>item.exam.id===select.value);
    if (!linked) return toast('没有可显示的逐题档案。');
    ssCurrent = linked.exam.id;
    ssStudent = linked.person.id;
    if (typeof qrMode !== 'undefined') qrMode = 'archive';
    switchPage('question-analysis');
  };
  const showStatus = message => { if(status) status.textContent = message; toast(message); };
  const syncButton = (part,value) => {
    const button = document.querySelector(`[data-pf-write="${part}"]`);
    if (button) button.textContent = value.trim()?'重新生成':'生成'+PF_DRAFT_NAMES[part];
  };
  document.querySelectorAll('[data-pf-draft-text]').forEach(input=>{input.oninput=()=>{
    const part = input.dataset.pfDraftText;
    (record.draft??={})[part] = input.value;
    (record.draftEdited??={})[part] = Boolean(input.value.trim());
    pfSave();
    syncButton(part,input.value);
  }});
  document.querySelectorAll('[data-pf-write]').forEach(button=>{button.onclick=()=>{
    const requested = button.dataset.pfWrite;
    const all = requested==='all';
    const parts = all?Object.keys(PF_DRAFT_NAMES).filter(part=>!record.draftEdited?.[part]):[requested];
    if (!parts.length) return showStatus('已保留三个手写段落；可合并预览或单独重新生成。');
    const written = [], cleared = [];
    for (const part of parts) {
      const result = pfDraftGenerate(record,part,select?.value,tone?.value || 'natural');
      if (!result.text) {
        if (part!=='exam' && !record.draftEdited?.[part] && record.draft?.[part]?.trim()) {
          record.draft[part] = '';
          const input = $(`#pf-draft-${part}`);
          if (input) input.value = '';
          syncButton(part,'');
          cleared.push(PF_DRAFT_NAMES[part]);
        }
        continue;
      }
      (record.draft??={})[part] = result.text;
      (record.draftEdited??={})[part] = false;
      const input = $(`#pf-draft-${part}`);
      if (input) input.value = result.text;
      syncButton(part,result.text);
      if (part==='exam') {
        record.draftExamId = select?.value || '';
        if (result.summary) $('#pf-exam-evidence').textContent = result.summary;
      }
      written.push(PF_DRAFT_NAMES[part]);
    }
    if (!written.length&&!cleared.length) {
      if (all&&pfDraftText(record)) return pfShowDraftPreview(record);
      return showStatus(all?'请先勾选标签、补充备注或关联考试成绩。':`${PF_DRAFT_NAMES[requested]}暂无可用内容，请先补充来源。`);
    }
    if (!pfSave()) return;
    showStatus([written.length?'已保存：'+written.join('、'):'',cleared.length?'已清除无来源的草稿：'+cleared.join('、'):'',all&&parts.length<3?'手写段落已保留':''].filter(Boolean).join('；'));
    if (all&&pfDraftText(record)) pfShowDraftPreview(record);
  }});
  const review = document.querySelector('[data-pf-review]');
  if (review) review.onclick = () => pfShowDraftPreview(record);
}
function pfShowDraftPreview(record) {
  const text = pfDraftText(record);
  if (!text) return toast('请先生成或填写评语。');
  const missing = Object.entries(PF_DRAFT_NAMES).filter(([part])=>!record.draft?.[part]?.trim()).map(([,label])=>label);
  modal(`${record.name} · 合并评语预览`, `<p class="hint">${missing.length?`尚未填写：${missing.join('、')}。空白段落不参与合并。`:'已按平时表现、考试分析、有效措施的顺序合并。'}可关闭预览，继续修改任意一段。</p>
    <label class="field">合并后的评语<textarea rows="10" readonly>${E(text)}</textarea></label>
    <div class="row"><button type="button" data-pf-copy>复制合并后的评语</button></div>`);
  const copy = document.querySelector('.modalback:last-child [data-pf-copy]');
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      copy.closest('.modal').querySelector('textarea').select();
      if (!document.execCommand('copy')) return toast('无法自动复制，已选中评语。');
    }
    toast('评语已复制');
  };
}
