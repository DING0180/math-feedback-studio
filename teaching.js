/* Keep the teaching planner mounted while the workbench switches sections. */
(() => {
  const sections = [
    { page: 'teaching-week', view: 'plan', icon: '周', label: '周教学计划', description: '按周安排课次和当天作业', shortcut: '备课与教学进度' },
    { page: 'teaching-seats', view: 'seat', icon: '座', label: '座位表', description: '按教学班管理学生座位', shortcut: '排座与调整' },
    { page: 'teaching-homework', view: 'hw', icon: '作', label: '作业登记', description: '按章节登记各班的作业完成情况', shortcut: '记录各章作业完成情况' },
  ];
  const groups = ['IG1', 'IGB', 'IG3'];
  const module = $('#teaching-module');
  const frameSlot = $('#teaching-frame-slot');
  const syncButton = $('#teaching-sync');
  const localFile = location.protocol === 'file:';
  const receiveOrigin = localFile ? 'null' : location.origin;
  const sendOrigin = localFile ? '*' : location.origin;

  let frame;
  let ready = false;

  function teachingGroup(value) {
    const text = String(value ?? '').normalize('NFKC').trim().toUpperCase();
    if (/^IGB[1-3]$/.test(text)) return 'IGB';
    return /^(IG1|IGB|IG3)(?=$|[.\s\-(])/.exec(text)?.[1] || '';
  }

  function teachingRoster() {
    const roster = Object.fromEntries(groups.map(group => [group, []]));
    for (const student of db.students) {
      const group = teachingGroup(student.group) || teachingGroup(student.className);
      const name = String(student.name ?? '').trim();
      if (!group || !name) continue;

      const tag = typeof caAdminName === 'function'
        ? caAdminName({ group, className: student.className })
        : String(student.className ?? '').trim();

      roster[group].push({ name, tag, schoolId: String(student.id ?? '').trim(), archived: student.archived === true });
    }

    for (const group of groups) {
      if (typeof pf !== 'object') continue;
      const schoolRows = (pf.classes?.[group]?.records || []).flatMap(student => {
        const name = String(student.name ?? '').trim();
        return name ? [{ name, tag: String(student.cls ?? '').trim(), schoolId: String(student.id ?? '').trim() }] : [];
      });
      if (!roster[group].length) {
        roster[group] = schoolRows;
        continue;
      }
      for (const student of roster[group]) {
        if (roster[group].filter(row => row.name === student.name).length !== 1) continue;
        const candidates = schoolRows.filter(row => row.name === student.name && row.schoolId);
        if (candidates.length === 1) student.schoolId = candidates[0].schoolId;
      }
    }
    return roster;
  }

  function sendView() {
    const section = sections.find(section => section.page === page);
    if (!section || !ready) return;

    const roster = teachingRoster();
    syncButton.disabled = !Object.values(roster).some(students => students.some(student => !student.archived));
    frame.contentWindow.postMessage({ type: 'math-teaching:set-view', view: section.view, roster }, sendOrigin);
  }

  function syncSection() {
    const section = sections.find(section => section.page === page);
    module.hidden = !section;
    if (!section) return;
    syncButton.hidden = section.view === 'plan';

    if (!frame) {
      frame = document.createElement('iframe');
      frame.className = 'teaching-frame';
      frame.title = '数学走班教学记录';
      frame.addEventListener('load', () => {
        ready = true;
        sendView();
      });
      frame.src = `teaching-workspace.html?view=${section.view}`;
      frameSlot.append(frame);
    }
    sendView();
  }

  function updateFeedbackCount() {
    const stat = [...document.querySelectorAll('.home-stat')].find(card =>
      card.querySelector('span')?.textContent.trim() === '评语已完成');
    if (!stat || typeof pf !== 'object') return;
    const completed = [];
    for (const group of groups) {
      const roster = db.students.filter(student => teachingGroup(student.group) === group);
      for (const row of pf.classes?.[group]?.records || []) {
        if (profileForRosterRow(row, roster)?.archived === true) continue;
        if (['daily', 'exam', 'action'].every(part => String(row.draft?.[part] || '').trim())) {
          completed.push({ group, id: row.id, name: row.name });
        }
      }
    }
    const legacy = activeStudentRoster().filter(student => {
      if (!parts.every(([part]) => student.feedback?.[part]?.text?.trim())) return false;
      const group = teachingGroup(student.group) || teachingGroup(student.className);
      return !completed.some(row => row.group === group &&
        ((row.id && row.id === student.id) || row.name === student.name));
    });
    stat.querySelector('strong').textContent = completed.length + legacy.length;
  }

  syncButton.onclick = () => {
    if (!ready || module.hidden) return;
    frame.contentWindow.postMessage({ type: 'math-teaching:sync-roster', roster: teachingRoster() }, sendOrigin);
  };

  window.addEventListener('message', event => {
    if (!frame || module.hidden || event.source !== frame.contentWindow || event.origin !== receiveOrigin) return;
    const message = event.data;
    if (!message || typeof message !== 'object') return;

    if (message.type === 'math-teaching:route') {
      const section = sections.find(section => section.view === message.view);
      if (section && section.page !== page) switchPage(section.page);
    }
    if (message.type === 'math-teaching:roster-synced') {
      const { added, matched, ambiguous } = message;
      if (![added, matched, ambiguous].every(count => Number.isInteger(count) && count >= 0)) return;
      if (ambiguous) toast(`名单已同步：新增 ${added} 人，匹配 ${matched} 人，另有 ${ambiguous} 条待核对`);
      else toast(added ? `名单已同步，新增 ${added} 人` : '已核对名单，无需新增');
    }
  });

  menus.splice(1, 0, ...sections.map(({ page, icon, label, description }) => [page, icon, label, description]));
  for (const section of sections) views[section.page] = () => '';

  const previousDashboard = views.dashboard;
  views.dashboard = () => {
    const shortcuts = sections.map(({ page, icon, label, shortcut }) =>
      `<button class="home-action" data-go="${page}"><span class="home-action-icon" aria-hidden="true">${icon}</span><span><strong>${label}</strong><small>${shortcut}</small></span><b aria-hidden="true">↗</b></button>`
    ).join('');
    return previousDashboard()
      .replace('让每一份反馈，<br>都有温度和依据。', '数学教学工作台')
      .replace('把日常观察、考试记录与成长建议整理在一起，让家校沟通更清晰。', '从周计划、座位表和作业登记，到考试分析和家校反馈。')
      .replace('data-go="platform">开始整理反馈', 'data-go="teaching-week">打开周教学计划')
      .replace('<div class="home-actions">', `<div class="home-actions">${shortcuts}`);
  };

  const previousBind = bind;
  bind = function () {
    previousBind();
    syncSection();
    if (page === 'dashboard') updateFeedbackCount();
  };
  render();
})();
