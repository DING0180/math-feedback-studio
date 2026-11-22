/* Read communication and question records directly from the selected student's profile. */
const progressProfile = (() => {
  let scope = 'semester';
  let customRange;

  function parseDay(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const day = new Date(value + 'T00:00:00Z');
    return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value ? day : null;
  }

  function semesterRange() {
    const to = progressDay();
    const [year, month] = to.split('-').map(Number);
    const from = month < 3 ? `${year - 1}-09-01` : `${year}-${month < 9 ? '03-01' : '09-01'}`;
    return {from, to};
  }

  function rangeControls(range) {
    const scopes = [['semester', '本学期'], ['custom', '自选日期'], ['all', '全部记录']];
    return `<div class="tp-profile-filters">
      <label class="field">记录范围
        <select id="tp-profile-scope">
          ${scopes.map(([value, label]) => `<option value="${value}" ${value === scope ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </label>
      ${scope === 'custom' ? `
        <label class="field">开始日期<input type="date" id="tp-profile-from" value="${E(range.from)}" required></label>
        <label class="field">结束日期<input type="date" id="tp-profile-to" value="${E(range.to)}" required></label>
      ` : ''}
    </div>`;
  }

  function inRange(range, from, to = from) {
    return !range || (from <= range.to && to >= range.from);
  }

  function communicationLog(student, range) {
    const contacts = Array.isArray(student.parentContacts) ? student.parentContacts : [];
    const rows = [];
    for (const record of contacts) {
      if (!parseDay(record?.date) || !inRange(range, record.date)) continue;
      const status = progressContactStatus(record);
      const note = typeof record.note === 'string' ? record.note : '';
      if (status !== 'none' || note.trim()) rows.push({date: record.date, status, note});
    }
    rows.sort((a, b) => b.date.localeCompare(a.date));
    const count = rows.filter(record => record.status !== 'none').length;
    return `<div class="tp-profile-section">
      <div class="tp-profile-section-head"><h3 id="tp-profile-contact">家校沟通</h3><span>已沟通 <strong>${count}</strong> 次</span></div>
      ${rows.length ? `<div class="tp-table-wrap">
        <table class="tp-table" aria-labelledby="tp-profile-contact">
          <thead><tr><th scope="col">日期</th><th scope="col">沟通状态</th><th scope="col">备注</th></tr></thead>
          <tbody>${rows.map(({date, status, note}) => `<tr>
            <th scope="row" class="tp-profile-date"><time datetime="${date}">${date}</time></th>
            <td>${E(progressContactLabel(status))}</td>
            <td class="tp-profile-note">${E(note.trim() ? note : '—')}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>` : '<p class="hint tp-profile-empty">这段时间暂无沟通记录。</p>'}
    </div>`;
  }

  function questionLog(student, range) {
    const weeks = [];
    for (const [start, count] of Object.entries(student.weeklyQuestionCounts || {})) {
      const lastDay = parseDay(start);
      if (!lastDay || lastDay.getUTCDay() !== 1 || !Number.isSafeInteger(count) || count < 0) continue;
      lastDay.setUTCDate(lastDay.getUTCDate() + 6);
      const end = lastDay.toISOString().slice(0, 10);
      if (inRange(range, start, end)) weeks.push({start, end, count});
    }
    weeks.sort((a, b) => b.start.localeCompare(a.start));
    return `<div class="tp-profile-section">
      <div class="tp-profile-section-head"><h3 id="tp-profile-questions">每周提问</h3><span>已登记 <strong>${weeks.length}</strong> 周</span></div>
      ${weeks.length ? `<div class="tp-table-wrap">
        <table class="tp-table" aria-labelledby="tp-profile-questions">
          <thead><tr><th scope="col">周一至周日</th><th scope="col">提问次数</th></tr></thead>
          <tbody>${weeks.map(({start, end, count}) => `<tr>
            <th scope="row" class="tp-profile-date"><time datetime="${start}">${start}</time> 至 <time datetime="${end}">${end}</time></th>
            <td>${count} 次</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>` : '<p class="hint tp-profile-empty">这段时间暂无提问次数登记。</p>'}
    </div>`;
  }

  function view(student) {
    if (!student) return '';
    const range = scope === 'all' ? null : scope === 'custom' ? customRange : semesterRange();
    return `<section class="panel tp-profile-panel" aria-labelledby="tp-profile-heading">
      <div class="tp-profile-heading">
        <div>
          <h2 id="tp-profile-heading">沟通与提问记录</h2>
          ${range ? `<p class="hint">${E(range.from)} 至 ${E(range.to)}</p>` : ''}
        </div>
        ${rangeControls(range)}
      </div>
      ${communicationLog(student, range)}
      ${questionLog(student, range)}
    </section>`;
  }

  function redraw(control) {
    render();
    document.getElementById(control.id)?.focus({preventScroll: true});
  }

  function bind(root) {
    const picker = root.querySelector('#tp-profile-scope');
    if (!picker) return;
    picker.onchange = () => {
      scope = picker.value;
      if (scope === 'custom') customRange ??= semesterRange();
      redraw(picker);
    };
    const from = root.querySelector('#tp-profile-from');
    const to = root.querySelector('#tp-profile-to');
    if (!from || !to) return;
    const updateRange = event => {
      from.setCustomValidity('');
      to.setCustomValidity('');
      if (!parseDay(from.value) || !parseDay(to.value)) return;
      if (from.value > to.value) {
        event.target.setCustomValidity('开始日期应早于或等于结束日期。');
        event.target.reportValidity();
        return;
      }
      customRange = {from: from.value, to: to.value};
      redraw(event.target);
    };
    from.onchange = to.onchange = updateRange;
  }

  return {view, bind};
})();

function progressProfileView(student) { return progressProfile.view(student); }
function progressProfileBind(root) { progressProfile.bind(root); }
