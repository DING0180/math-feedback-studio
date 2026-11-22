/* 全班逐题回看：沿用学生档案和浏览器中已保存的作答切片。 */
let qrMode = 'archive';
let qrGroup = null;
let qrExamId = '';
let qrQuestionId = '';
let qrStudentIndex = 0;
let qrImageRequest = 0;
const qrImageUrls = new Set();

function qrCrops(person, questionId) {
  const cuts = person?.crops?.[questionId];
  return Array.isArray(cuts) ? cuts.filter(cut => cut?.blob instanceof Blob && cut.blob.size > 0) : [];
}

function qrHasCrops(person) {
  return Object.keys(person?.crops ?? {}).some(questionId => qrCrops(person, questionId).length);
}

function qrGroupLabel(group) {
  return group === 'IG1' ? 'IG1（含 IG1.1）' : group || '未分班';
}

function qrSelection() {
  const groups = new Map();
  for (const student of activeStudentRoster()) {
    const group = student.group || '';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(student);
  }
  const examOptions = students => ssExams.flatMap(exam => {
    if (!exam.questions?.length) return [];
    const entries = students.map(student => ({student, person: uResolve(student, exam).person}));
    if (!entries.some(({person}) => person)) return [];
    return [{exam, entries, hasCrops: entries.some(({person}) => qrHasCrops(person))}];
  });
  if (!groups.has(qrGroup)) {
    const firstWithCrops = [...groups].find(([, students]) => examOptions(students).some(exam => exam.hasCrops));
    qrGroup = firstWithCrops?.[0] ?? groups.keys().next().value ?? null;
  }
  const options = examOptions(groups.get(qrGroup) ?? []);
  const current = options.find(({exam}) => exam.id === qrExamId) ?? options.find(option => option.hasCrops) ?? options[0];
  if (!current) return {groups, options, entries: [], questions: [], question: null};

  qrExamId = current.exam.id;
  const questions = current.exam.questions.map(question => ({
    ...question,
    cropCount: current.entries.filter(({person}) => qrCrops(person, question.id).length).length,
  }));
  const question = questions.find(option => option.id === qrQuestionId) ?? questions.find(option => option.cropCount) ?? questions[0];
  qrQuestionId = question.id;
  qrStudentIndex = Math.min(qrStudentIndex, current.entries.length - 1);
  return {groups, options, entries: current.entries, questions, question};
}

function qrOption(value, text, chosen) {
  return `<option value="${E(String(value))}"${value === chosen ? ' selected' : ''}>${E(text)}</option>`;
}

function qrView() {
  const {groups, options, entries, questions, question} = qrSelection();
  return `<section class="panel qr-panel" aria-labelledby="qr-title">
    <div class="qr-heading"><h2 id="qr-title">全班逐题回看</h2><p class="muted">固定一道题，依次查看全班学生的作答。可用左右方向键切换学生。</p></div>
    <div class="qr-filters">
      <label class="field">教学班<select id="qr-group" ${groups.size ? '' : 'disabled'}>${groups.size ? [...groups.keys()].map(group => qrOption(group, qrGroupLabel(group), qrGroup)).join('') : '<option>暂无班级</option>'}</select></label>
      <label class="field">考试<select id="qr-exam" ${options.length ? '' : 'disabled'}>${options.map(({exam}) => qrOption(exam.id, exam.name, qrExamId)).join('') || '<option>暂无已关联考试</option>'}</select></label>
      <label class="field">题目<select id="qr-question" ${questions.length ? '' : 'disabled'}>${questions.map(q => qrOption(q.id, q.cropCount ? `${q.id} · ${q.cropCount} 人有切片` : q.id, qrQuestionId)).join('') || '<option>暂无题目</option>'}</select></label>
    </div>
    ${question ? `<div class="qr-stage">
      <div class="qr-review-bar">
        <button type="button" data-qr-move="-1" aria-label="上一位学生">← 上一位</button>
        <label class="field">学生<select id="qr-student">${entries.map(({student}, index) => qrOption(index, student.name, qrStudentIndex)).join('')}</select></label>
        <button type="button" data-qr-move="1" aria-label="下一位学生">下一位 →</button>
        <span class="qr-counter" role="status"></span>
      </div>
      <div class="qr-meta"></div>
      <div class="qr-images"></div>
    </div>` : `<div class="empty qr-empty">${groups.size ? '此班暂无已关联考试。请先关联逐题成绩，再查看答题卡切片。' : '请先添加或导入学生班级名单。'}</div>`}
  </section>`;
}

function qrReleaseImages() {
  qrImageRequest++;
  for (const url of qrImageUrls) URL.revokeObjectURL(url);
  qrImageUrls.clear();
}

function qrSwapImages(holder, crops, studentName, questionId, emptyHint) {
  const request = ++qrImageRequest;
  const next = document.createElement('div');
  const nextUrls = [];
  next.innerHTML = crops.length ? crops.map((crop, index) => {
    const url = URL.createObjectURL(crop.blob);
    qrImageUrls.add(url);
    nextUrls.push(url);
    const caption = crops.length > 1 ? `<figcaption>切片 ${index + 1} / ${crops.length}</figcaption>` : '';
    return `<figure><img src="${E(url)}" alt="${E(`${studentName} ${questionId} 作答切片 ${index + 1}`)}">${caption}</figure>`;
  }).join('') : `<div class="empty qr-empty">${E(emptyHint)}</div>`;

  const discard = url => { if (qrImageUrls.delete(url)) URL.revokeObjectURL(url); };
  const commit = () => {
    if (request !== qrImageRequest || !holder.isConnected) {
      nextUrls.forEach(discard);
      return;
    }
    const {scrollLeft, scrollTop} = holder;
    holder.querySelectorAll('img').forEach(image => discard(image.src));
    holder.replaceChildren(...next.childNodes);
    holder.scrollTo(scrollLeft, scrollTop);
    holder.removeAttribute('aria-busy');
  };
  if (!crops.length) {
    commit();
    return;
  }
  holder.setAttribute('aria-busy', 'true');
  const images = [...next.querySelectorAll('img')];
  Promise.allSettled(images.map(image => image.decode())).then(results => {
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') return;
      discard(nextUrls[index]);
      const message = document.createElement('p');
      message.className = 'qr-empty';
      message.textContent = '这张切片无法打开。';
      images[index].replaceWith(message);
    });
    commit();
  });
}

function qrShowStudent(selection) {
  const {entries, question} = selection;
  const {student, person} = entries[qrStudentIndex];
  const {id, max, cropCount} = question;
  const score = person?.scores?.[id];
  const mark = score?.status === '有分数' && Number.isFinite(score.value) ? `${score.value} / ${max ?? '未设满分'}` : score?.status || '未录入';
  const note = person?.notes?.[id];
  $('#qr-student').value = String(qrStudentIndex);
  $('[data-qr-move="-1"]').disabled = qrStudentIndex === 0;
  $('[data-qr-move="1"]').disabled = qrStudentIndex === entries.length - 1;
  $('.qr-counter').textContent = `${qrStudentIndex + 1} / ${entries.length} 位 · ${cropCount} 人有切片`;
  $('.qr-meta').innerHTML = `<p><strong>得分</strong> ${E(mark)}</p>${note ? `<p class="qr-note"><strong>教师备注</strong> ${E(note)}</p>` : ''}${person?.cropsStale ? '<p class="qr-note">答题卡已更新，此切片待复核。</p>' : ''}`;

  const holder = $('.qr-images');
  const crops = qrCrops(person, id);
  const hint = !person ? '该生尚未关联这场考试。' : person.cards?.length ? '该生有原卷，本题暂无切片。' : '该生尚未导入答题卡。';
  qrSwapImages(holder, crops, student.name, id, hint);
}

function qrSetStudent(index, selection) {
  if (index < 0 || index >= selection.entries.length || index === qrStudentIndex) return;
  qrStudentIndex = index;
  qrShowStudent(selection);
}

const qrArchiveView = views['question-analysis'];
views['question-analysis'] = function () {
  const tabs = [['archive', '逐题档案'], ['review', '全班逐题回看']];
  const toolbar = `<div class="qr-mode-tabs" role="group" aria-label="逐题分析视图">${tabs.map(([mode, label]) => {
    const active = mode === qrMode;
    return `<button type="button" class="${active ? 'active' : ''}" aria-pressed="${active}" data-qr-mode="${mode}">${label}</button>`;
  }).join('')}</div>`;
  return toolbar + (qrMode === 'review' ? qrView() : qrArchiveView());
};

const qrPriorBind = bind;
bind = function () {
  qrPriorBind();
  if (page !== 'question-analysis') return;
  document.querySelectorAll('[data-qr-mode]').forEach(button => {
    button.onclick = () => {
      qrMode = button.dataset.qrMode;
      render();
      $(`[data-qr-mode="${qrMode}"]`).focus();
    };
  });
  if (qrMode !== 'review') return;

  const optionChanges = {
    'qr-group': value => { qrGroup = value; qrExamId = ''; qrQuestionId = ''; },
    'qr-exam': value => { qrExamId = value; qrQuestionId = ''; },
    'qr-question': value => { qrQuestionId = value; },
  };
  for (const [id, change] of Object.entries(optionChanges)) {
    $(`#${id}`).onchange = event => {
      change(event.currentTarget.value);
      qrStudentIndex = 0;
      render();
      $(`#${id}`).focus();
    };
  }
  const selection = qrSelection();
  if (!selection.question) return;
  qrShowStudent(selection);
  $('#qr-student').onchange = event => qrSetStudent(Number(event.currentTarget.value), selection);
  document.querySelectorAll('[data-qr-move]').forEach(button => {
    button.onclick = () => qrSetStudent(qrStudentIndex + Number(button.dataset.qrMove), selection);
  });
};

const qrPriorRender = render;
render = function () {
  qrReleaseImages();
  qrPriorRender();
};
document.addEventListener('keydown', event => {
  if (page !== 'question-analysis' || qrMode !== 'review' || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.target?.closest?.('select, input, textarea, [contenteditable]') || $('.modalback')) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  const button = $(`[data-qr-move="${event.key === 'ArrowLeft' ? -1 : 1}"]`);
  if (!button) return;
  event.preventDefault();
  button.click();
});
