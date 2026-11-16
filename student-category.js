/* 教师手动设置的学生分类，随学生档案在本机保存。 */
const studentCategoryLabels = [
  {number:1, color:'绿色', rubric:'能力强，基础一般'},
  {number:2, color:'蓝色', rubric:'能力与基础一般'},
  {number:3, color:'黄色', rubric:'能力较好，基础较弱'},
  {number:4, color:'橙色', rubric:'基础与学习投入需加强'},
  {number:5, color:'红色', rubric:'能力、基础和学习态度需加强'},
];
const studentCategoryPreferenceKey = 'math-feedback-show-student-category';
let studentCategoryVisible = true;
try {
  studentCategoryVisible = localStorage.getItem(studentCategoryPreferenceKey) !== 'false';
} catch {}

function studentCategoryValue(studentRecord) {
  const value = studentRecord?.supportCategory;
  return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
}

function studentCategoryBadgeMarkup(category, text) {
  return `<span class="student-category-badge" data-student-category="${category.number}" title="${E(`${category.color} · ${category.rubric}`)}">${E(text)}</span>`;
}

function studentCategoryBadge(studentRecord) {
  const category = studentCategoryValue(studentRecord);
  if (!studentCategoryVisible || category === null) return '';
  return studentCategoryBadgeMarkup(studentCategoryLabels[category - 1], `分类 ${category}`);
}

function studentCategoryControls() {
  const legend = studentCategoryVisible
    ? `<div class="student-category-legend" aria-label="学生分类颜色图例">${studentCategoryLabels.map(category =>
      studentCategoryBadgeMarkup(category, `${category.number} ${category.color}`)
    ).join('')}</div>`
    : '';
  return `<div class="student-category-controls" data-student-category-controls>
    <label class="student-category-toggle"><input type="checkbox" data-student-category-toggle ${studentCategoryVisible ? 'checked' : ''}> 显示分类颜色</label>
    ${legend}
  </div>`;
}

function studentCategoryEditor(studentRecord) {
  const selectedCategory = studentCategoryValue(studentRecord);
  const options = studentCategoryLabels.map(category =>
    `<option value="${category.number}" ${selectedCategory === category.number ? 'selected' : ''}>${E(`${category.number} · ${category.color} · ${category.rubric}`)}</option>`
  ).join('');
  return `<div class="student-category-editor" data-student-category-editor>
    <label class="field" for="student-category">学生分类<select id="student-category">
      <option value="">未分类</option>${options}
    </select></label>${studentCategoryBadge(studentRecord)}
  </div>`;
}

const studentCategoryPriorBind = bind;
bind = function () {
  studentCategoryPriorBind();
  if (page !== 'students') return;

  const roster = document.querySelector('#content .student-list');
  if (roster && db.students.length) {
    roster.insertAdjacentHTML('beforebegin', studentCategoryControls());
    const studentsById = new Map(db.students.map(record => [record.id, record]));
    for (const row of roster.querySelectorAll('[data-select]')) {
      const record = studentsById.get(row.dataset.select);
      const badge = studentCategoryBadge(record);
      if (!badge) continue;
      row.classList.add('student-category-target');
      row.dataset.studentCategory = String(studentCategoryValue(record));
      row.querySelector('b')?.insertAdjacentHTML('afterend', badge);
    }
  }

  const record = student();
  const profileHead = document.querySelector('#content .layout > section:nth-child(2) > .panel > .panel-head');
  if (record && profileHead) {
    profileHead.insertAdjacentHTML('afterend', studentCategoryEditor(record));
  }
};

document.addEventListener('change', event => {
  const control = event.target;
  if (control.matches('[data-student-category-toggle]')) {
    studentCategoryVisible = control.checked;
    try {
      localStorage.setItem(studentCategoryPreferenceKey, String(studentCategoryVisible));
    } catch {}
    render();
    document.querySelector('[data-student-category-toggle]')?.focus({preventScroll:true});
    return;
  }
  if (page !== 'students' || control.id !== 'student-category') return;
  const record = student();
  if (!record) return;
  const value = control.value;
  if (value !== '' && !/^[1-5]$/.test(value)) return;
  const previous = record.supportCategory;
  if (value) record.supportCategory = Number(value);
  else delete record.supportCategory;
  try {
    save();
  } catch {
    if (previous === undefined) delete record.supportCategory;
    else record.supportCategory = previous;
    control.value = String(studentCategoryValue(record) ?? '');
    toast('无法保存学生分类，请检查浏览器存储空间。');
    return;
  }
  const scrollTop = document.querySelector('#content .student-list')?.scrollTop;
  render();
  const roster = document.querySelector('#content .student-list');
  if (roster) roster.scrollTop = scrollTop ?? 0;
  document.getElementById('student-category')?.focus({preventScroll:true});
  toast(value ? '已保存学生分类' : '已清除学生分类');
});

render();
