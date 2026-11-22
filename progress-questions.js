(() => {
  let monday = '';
  let roster = [];

  function calendarDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(value + 'T00:00:00Z');
    if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0,10) !== value) return null;
    return date;
  }

  function daysFrom(value, offset) {
    const date = calendarDate(value);
    if (!date) return '';
    date.setUTCDate(date.getUTCDate() + offset);
    const day = date.toISOString().slice(0,10);
    return calendarDate(day) ? day : '';
  }

  function weekOf(value) {
    const date = calendarDate(value);
    return date ? daysFrom(value,-((date.getUTCDay() + 6) % 7)) : '';
  }

  function showDate(value, includeYear = false) {
    const [year,month,day] = value.split('-').map(Number);
    return `${includeYear ? year + '年' : ''}${month}月${day}日`;
  }

  function countOf(student) {
    const count = student.weeklyQuestionCounts?.[monday];
    return Number.isSafeInteger(count) && count >= 0 ? count : null;
  }

  function summary() {
    let completed = 0, total = 0n;
    for (const student of roster) {
      const count = countOf(student);
      if (count === null) continue;
      completed++;
      total += BigInt(count);
    }
    return `已登记 ${completed} / ${roster.length} 人 · 共 ${total.toLocaleString('zh-CN')} 次`;
  }

  function countRow(student) {
    const count = countOf(student);
    const name = E(student.name);
    const className = typeof caAdminName === 'function' ? caAdminName(student) : student.className;
    return `<tr data-tp-question-student="${E(student.id)}">
      <th scope="row"><div class="tp-person"><strong>${name}</strong>${className ? `<small>${E(className)}</small>` : ''}</div></th>
      <td>
        <div class="tp-count-controls">
          <input type="text" inputmode="numeric" autocomplete="off" placeholder="—" aria-label="${name}本周提问次数" data-tp-count value="${count ?? ''}">
          <button type="button" class="smallbtn" data-tp-add aria-label="给${name}的本周提问次数加一" ${count === Number.MAX_SAFE_INTEGER ? 'disabled' : ''}>+1</button>
        </div>
        <span class="tp-input-error" data-tp-count-error role="status" hidden></span>
      </td>
    </tr>`;
  }

  window.progressQuestionsView = function (students) {
    roster = students;
    monday ||= weekOf(progressDay());
    const sunday = daysFrom(monday,6) || monday;
    return `<section class="panel tp-panel tp-questions" aria-labelledby="tp-question-title">
      <div class="panel-head tp-section-head">
        <div>
          <h2 id="tp-question-title">每周提问</h2>
          <p class="muted">按周记录每位学生的提问次数。留空表示还没登记。</p>
        </div>
        <div class="tp-period-controls">
          <label class="field">选择一周中的任意日期<input id="tp-week-picker" type="date" value="${E(monday)}"></label>
          <div class="tp-week-nav" aria-label="切换周次">
            <button type="button" class="smallbtn" data-tp-week-step="-7" ${daysFrom(monday,-7) ? '' : 'disabled'}>上一周</button>
            <button type="button" class="smallbtn" data-tp-week-step="7" ${daysFrom(monday,7) ? '' : 'disabled'}>下一周</button>
          </div>
        </div>
      </div>
      <div class="tp-summary">
        <strong>${showDate(monday,true)} 至 ${showDate(sunday,sunday.slice(0,4)!==monday.slice(0,4))}</strong>
        <span data-tp-question-summary aria-live="polite">${summary()}</span>
      </div>
      ${students.length ? `<div class="tp-table-wrap"><table class="tp-table">
        <thead><tr><th scope="col">学生</th><th scope="col">本周提问次数</th></tr></thead>
        <tbody>${students.map(countRow).join('')}</tbody>
      </table></div>` : '<p class="empty">本班暂无在班学生</p>'}
    </section>`;
  };

  window.progressQuestionsBind = function (root) {
    const picker = root.querySelector('#tp-week-picker');
    if (!picker) return;
    function switchWeek(value, focusSelector, control) {
      const next = weekOf(value);
      if (!next || next === monday) {
        if (control === picker) picker.value = monday;
        return;
      }
      monday = next;
      render();
      document.querySelector(focusSelector)?.focus({preventScroll:true});
    }
    picker.addEventListener('change',() => switchWeek(picker.value,'#tp-week-picker',picker));
    for (const button of root.querySelectorAll('[data-tp-week-step]')) {
      const step = Number(button.dataset.tpWeekStep);
      button.addEventListener('click',() => switchWeek(daysFrom(monday,step),`[data-tp-week-step="${step}"]`,button));
    }

    const status = root.querySelector('[data-tp-question-summary]');
    for (const row of root.querySelectorAll('[data-tp-question-student]')) {
      const student = roster.find(entry => entry.id === row.dataset.tpQuestionStudent);
      if (!student) continue;
      const input = row.querySelector('[data-tp-count]');
      const add = row.querySelector('[data-tp-add]');
      const error = row.querySelector('[data-tp-count-error]');
      function setError(message) {
        input.setCustomValidity(message);
        input.setAttribute('aria-invalid',message ? 'true' : 'false');
        error.hidden = !message;
        error.textContent = message;
      }
      function store(count) {
        const current = countOf(student);
        if (current !== count) {
          const values = {...student.weeklyQuestionCounts};
          if (count === null) delete values[monday];
          else values[monday] = count;
          if (!progressSave(student,'weeklyQuestionCounts',values)) {
            input.value = current ?? '';
            return;
          }
        }
        add.disabled = count === Number.MAX_SAFE_INTEGER;
        status.textContent = summary();
      }
      input.addEventListener('input',() => {
        const text = input.value.trim().normalize('NFKC');
        const count = text === '' ? null : Number(text);
        if (count !== null && (!/^\d+$/.test(text) || !Number.isSafeInteger(count))) {
          setError('请输入 0 或正整数');
          return;
        }
        setError('');
        store(count);
      });
      input.addEventListener('blur',() => {
        if (input.validity.valid) input.value = countOf(student) ?? '';
      });
      add.addEventListener('click',() => {
        const count = (countOf(student) ?? 0) + 1;
        if (!Number.isSafeInteger(count)) return;
        setError('');
        input.value = count;
        store(count);
      });
    }
  };
})();
