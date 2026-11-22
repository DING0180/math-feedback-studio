function progressDay(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function progressContactStatus(record) {
  const status = record?.status;
  if (status === 'none' || status === 'parent' || status === 'teacher') return status;
  return record?.contacted === true ? 'legacy' : 'none';
}

function progressContactLabel(status) {
  if (status === 'parent') return '家长主动沟通';
  if (status === 'teacher') return '我主动沟通';
  if (status === 'legacy') return '已沟通（发起方待补）';
  return '未沟通';
}

function progressSave(student, field, value) {
  if (!db.students.includes(student) || student.archived === true) {
    toast('该学生已不在当前名单，请重新打开进度记录。');
    return false;
  }
  const previous = student[field];
  student[field] = value;
  try {
    save();
    return true;
  } catch {
    if (previous === undefined) delete student[field];
    else student[field] = previous;
    toast('保存失败，请检查浏览器存储空间后重试。');
    return false;
  }
}

(() => {
  const classes = ['IG1', 'IGB', 'IG3'];
  const sections = [
    ['contacts', '家校沟通', progressContactsView, progressContactsBind],
    ['questions', '每周提问', progressQuestionsView, progressQuestionsBind],
  ];
  let group = 'IG1';
  let section = sections[0];

  const menuIndex = menus.findIndex(item => item[0] === 'platform');
  menus.splice(menuIndex, 0, ['progress', '▦', '进度记录', '按日期记录家校沟通，按周登记学生提问次数']);

  views.progress = function () {
    const students = activeStudentRoster(group);
    return `<div class="tp-workspace">
      <div class="tp-navigation">
        <div class="tp-tabs" role="group" aria-label="进度记录类型">${sections.map(item =>
          `<button type="button" data-progress-section="${item[0]}" aria-pressed="${item === section}">${item[1]}</button>`
        ).join('')}</div>
        <label class="field tp-group-field">教学班
          <select id="tp-group">${classes.map(item =>
            `<option value="${item}"${item === group ? ' selected' : ''}>${item}</option>`
          ).join('')}</select>
        </label>
      </div>
      ${section[2](students)}
    </div>`;
  };

  const priorBind = bind;
  bind = function () {
    priorBind();
    if (page === 'students') {
      const profile = $('.tp-profile-panel');
      if (profile) progressProfileBind(profile);
      return;
    }
    if (page !== 'progress') return;
    const root = $('.tp-workspace');
    const classPicker = root.querySelector('#tp-group');
    classPicker.onchange = () => {
      group = classPicker.value;
      render();
      $('#tp-group')?.focus({preventScroll: true});
    };
    for (const button of root.querySelectorAll('[data-progress-section]')) {
      button.onclick = () => {
        const next = sections.find(item => item[0] === button.dataset.progressSection);
        if (next === section) return;
        section = next;
        render();
        $(`[data-progress-section="${section[0]}"]`)?.focus({preventScroll: true});
      };
    }
    section[3](root);
  };

  render();
})();
