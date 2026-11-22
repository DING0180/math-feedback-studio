/* Date-specific parent communication belongs to each student profile. */
const progressContacts = (() => {
  let date = '';
  let students = [];
  let followToday = true;
  let stopWatching = null;
  const dateFormat = /^\d{4}-\d{2}-\d{2}$/;
  const field = 'parentContacts';
  const statuses = ['none','parent','teacher'];

  function allRecords(student) {
    return Array.isArray(student[field]) ? student[field] : [];
  }

  function noteText(record) {
    return typeof record?.note === 'string' ? record.note.trim() : '';
  }

  function recordFor(student, day) {
    return allRecords(student).find(record => record?.date === day);
  }

  function historyFor(student) {
    return allRecords(student).filter(record =>
      record && dateFormat.test(record.date) && (progressContactStatus(record) !== 'none' || noteText(record))
    ).sort((a,b) => b.date.localeCompare(a.date));
  }

  function storeRecord(student, day, status, note) {
    const records = allRecords(student).filter(record => record?.date !== day);
    if (status === 'legacy') records.push({date:day, contacted:true, note});
    else if (status !== 'none' || note) records.push({date:day, status, note});
    return progressSave(student, field, records.length ? records : undefined);
  }

  function statusOptions(status) {
    const legacy = status === 'legacy'
      ? `<option value="legacy" disabled selected>${E(progressContactLabel('legacy'))}</option>` : '';
    return legacy + statuses.map(item =>
      `<option value="${item}"${item === status ? ' selected' : ''}>${E(progressContactLabel(item))}</option>`
    ).join('');
  }

  function rows() {
    return students.map(student => {
      const record = recordFor(student,date);
      const note = noteText(record);
      const contactStatus = progressContactStatus(record);
      const name = E(student.name);
      const caption = [student.className, student.id].filter(Boolean).join(' · ');
      const history = historyFor(student);
      const lastContact = history.find(item => progressContactStatus(item) !== 'none');
      return `<tr data-tp-contact-student="${E(student.id)}">
        <th scope="row">
          <strong class="tp-student-name">${name}</strong>
          ${caption ? `<small class="tp-student-meta">${E(caption)}</small>` : ''}
        </th>
        <td>
          <select class="tp-contact-state" data-tp-contact-state data-status="${contactStatus}" aria-label="${name} ${E(date)} 沟通状态">
            ${statusOptions(contactStatus)}
          </select>
        </td>
        <td>
          ${note ? `<p class="tp-contact-note-preview">${E(note)}</p>` : ''}
          <button type="button" class="smallbtn" data-tp-contact-note aria-label="${name} ${note ? '编辑备注' : '添加备注'}">${note ? '编辑备注' : '添加备注'}</button>
        </td>
        <td>
          <div class="tp-contact-actions">
            <button type="button" class="smallbtn" data-tp-contact-history aria-label="${name} 沟通历史" ${history.length ? '' : 'disabled'}>沟通历史${history.length ? `（${history.length}）` : ''}</button>
            ${lastContact ? `<small class="tp-student-meta" data-tp-contact-last>最近 ${E(lastContact.date)}</small>` : '<small class="tp-student-meta" data-tp-contact-last hidden></small>'}
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function status() {
    const completed = students.filter(student => progressContactStatus(recordFor(student,date)) !== 'none').length;
    return `当天已沟通 ${completed} / ${students.length} 人`;
  }

  function view(roster) {
    students = roster;
    if (followToday || !date) date = progressDay();
    return `<section class="panel tp-table-panel tp-contact-panel" aria-labelledby="tp-contact-heading">
      <div class="tp-panel-head">
        <div>
          <h2 id="tp-contact-heading">家校沟通</h2>
          <p class="hint" data-tp-contact-status aria-live="polite">${status()}</p>
        </div>
        <div class="tp-period-controls">
          <label class="field" for="tp-contact-date">沟通日期
            <input id="tp-contact-date" type="date" value="${E(date)}" required>
          </label>
          <button type="button" class="smallbtn" data-tp-contact-today>今天</button>
        </div>
      </div>
      ${students.length ? `<div class="tp-table-wrap">
        <table class="tp-table tp-contact-table" aria-label="家校沟通登记">
          <thead><tr><th scope="col">学生</th><th scope="col">沟通状态</th><th scope="col">当天备注</th><th scope="col">历史</th></tr></thead>
          <tbody>${rows()}</tbody>
        </table>
      </div>` : '<p class="empty">本班暂无在班学生。可先在学生档案中添加。</p>'}
    </section>`;
  }

  function repaint(panel, studentId, focusAttribute) {
    const tbody = panel.querySelector('tbody');
    if (tbody) tbody.innerHTML = rows();
    panel.querySelector('[data-tp-contact-status]').textContent = status();
    if (!studentId || !focusAttribute) return;
    const row = [...panel.querySelectorAll('[data-tp-contact-student]')]
      .find(item => item.dataset.tpContactStudent === studentId);
    const control = row?.querySelector(`[${focusAttribute}]`);
    (control?.disabled ? row.querySelector('[data-tp-contact-note]') : control)?.focus({preventScroll:true});
  }

  function updateStatus(panel,row,student,picker) {
    const record = recordFor(student,date);
    const previous = progressContactStatus(record);
    const selected = picker.value;
    if (!statuses.includes(selected) || !storeRecord(student,date,selected,noteText(record))) {
      picker.value = previous;
      return;
    }
    picker.dataset.status = selected;
    picker.querySelector('option[value="legacy"]')?.remove();
    const history = historyFor(student);
    const historyButton = row.querySelector('[data-tp-contact-history]');
    historyButton.disabled = !history.length;
    historyButton.textContent = history.length ? `沟通历史（${history.length}）` : '沟通历史';
    const lastContact = history.find(item => progressContactStatus(item) !== 'none');
    const recent = row.querySelector('[data-tp-contact-last]');
    recent.hidden = !lastContact;
    recent.textContent = lastContact ? `最近 ${lastContact.date}` : '';
    panel.querySelector('[data-tp-contact-status]').textContent = status();
  }

  function openDialog(title,body,confirmText,onSave,opener) {
    modal(title,body,confirmText,onSave);
    const backdrop = document.querySelector('.modalback:last-child');
    const dialog = backdrop.querySelector('.modal');
    const heading = dialog.querySelector('h2');
    heading.id = 'tp-contact-modal-heading';
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');
    dialog.setAttribute('aria-labelledby',heading.id);
    const close = () => {
      backdrop.remove();
      if (opener?.isConnected) opener.focus({preventScroll:true});
    };
    backdrop.querySelectorAll('.close').forEach(button => { button.onclick = close; });
    backdrop.onclick = event => { if (event.target === backdrop) close(); };
    backdrop.onkeydown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'Tab') {
        const controls = [...dialog.querySelectorAll('button:not(:disabled), select:not(:disabled), textarea')];
        if (event.shiftKey && event.target === controls[0]) {
          event.preventDefault();
          controls.at(-1)?.focus();
        } else if (!event.shiftKey && event.target === controls.at(-1)) {
          event.preventDefault();
          controls[0]?.focus();
        }
      }
    };
    (dialog.querySelector('textarea') || dialog.querySelector('.close')).focus({preventScroll:true});
    return backdrop;
  }

  function editNote(panel,student,day,opener,focusAttribute) {
    const record = recordFor(student,day);
    const currentStatus = progressContactStatus(record);
    openDialog(`${student.name} · 沟通备注`, `<p class="hint">${E(day)}</p>
      <label class="field" for="tp-contact-modal-status">沟通状态
        <select class="tp-contact-state" id="tp-contact-modal-status" data-status="${currentStatus}">${statusOptions(currentStatus)}</select>
      </label>
      <label class="field" for="tp-contact-note-text">备注
        <textarea id="tp-contact-note-text" rows="5" placeholder="记录聊了什么、家长反馈的问题或后续约定。">${E(noteText(record))}</textarea>
      </label>`, '保存', backdrop => {
      const chosenStatus = backdrop.querySelector('#tp-contact-modal-status').value;
      const note = backdrop.querySelector('#tp-contact-note-text').value.trim();
      if (!statuses.includes(chosenStatus) && !(chosenStatus === 'legacy' && currentStatus === 'legacy')) return;
      if (!storeRecord(student,day,chosenStatus,note)) return;
      backdrop.remove();
      if (panel.isConnected) repaint(panel,student.id,focusAttribute);
      toast('沟通记录已保存');
    }, opener);
    const statusPicker = document.getElementById('tp-contact-modal-status');
    statusPicker.onchange = () => { statusPicker.dataset.status = statusPicker.value; };
  }

  function showHistory(panel,student,opener) {
    const history = historyFor(student);
    if (!history.length) return;
    const body = `<ul class="tp-contact-history-list">${history.map(record => `
      <li>
        <div class="tp-contact-history-head">
          <div><strong>${E(record.date)}</strong> <span class="hint">${E(progressContactLabel(progressContactStatus(record)))}</span></div>
          <button type="button" class="smallbtn" data-tp-contact-history-date="${E(record.date)}" aria-label="编辑 ${E(record.date)} 沟通记录">编辑</button>
        </div>
        <p class="tp-contact-history-note">${E(noteText(record) || '暂无备注')}</p>
      </li>`).join('')}</ul>`;
    const backdrop = openDialog(`${student.name} · 沟通历史`,body,undefined,undefined,opener);
    backdrop.querySelectorAll('[data-tp-contact-history-date]').forEach(button => {
      button.onclick = () => {
        backdrop.remove();
        editNote(panel,student,button.dataset.tpContactHistoryDate,opener,'data-tp-contact-history');
      };
    });
  }

  function watchToday(root,panel,setDay) {
    stopWatching?.();
    let timeout;
    const observer = new MutationObserver(() => { if (!panel.isConnected) stop(); });
    const stop = () => {
      clearTimeout(timeout);
      observer.disconnect();
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      if (stopWatching === stop) stopWatching = null;
    };
    const refresh = () => {
      clearTimeout(timeout);
      if (!panel.isConnected) return stop();
      if (!followToday) return;
      const today = progressDay();
      if (today !== date) setDay(today);
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24,0,0,0);
      timeout = setTimeout(refresh, midnight - now + 50);
    };
    observer.observe(root.parentElement || root, {childList:true});
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    stopWatching = stop;
    refresh();
    return refresh;
  }

  function bind(root) {
    const panel = root.matches('.tp-contact-panel') ? root : root.querySelector('.tp-contact-panel');
    if (!panel) return;
    const picker = panel.querySelector('#tp-contact-date');
    const setDay = next => {
      const changed = next !== date;
      date = next;
      picker.value = date;
      if (changed) repaint(panel);
    };
    const refresh = watchToday(root,panel,setDay);
    picker.onchange = () => {
      if (!dateFormat.test(picker.value) || !picker.validity.valid) {
        picker.value = date;
        return;
      }
      followToday = picker.value === progressDay();
      setDay(picker.value);
      refresh();
    };
    panel.querySelector('[data-tp-contact-today]').onclick = () => {
      followToday = true;
      setDay(progressDay());
      refresh();
    };
    panel.onchange = event => {
      if (!event.target.matches('[data-tp-contact-state]')) return;
      const row = event.target.closest('[data-tp-contact-student]');
      const student = students.find(item => String(item.id) === row.dataset.tpContactStudent);
      if (student) updateStatus(panel,row,student,event.target);
    };
    panel.onclick = event => {
      const button = event.target.closest('[data-tp-contact-note], [data-tp-contact-history]');
      if (!button) return;
      const row = button.closest('[data-tp-contact-student]');
      const student = students.find(item => String(item.id) === row.dataset.tpContactStudent);
      if (!student) return;
      if (button.hasAttribute('data-tp-contact-note')) editNote(panel,student,date,button,'data-tp-contact-note');
      else showHistory(panel,student,button);
    };
  }

  return {view, bind};
})();

function progressContactsView(students) { return progressContacts.view(students); }
function progressContactsBind(root) { progressContacts.bind(root); }
