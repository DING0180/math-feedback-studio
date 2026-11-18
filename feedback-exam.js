/* Exam feedback reads linked score records and the teacher's question notes. */
const PF_EXAM_SERIES = {
  IG1: {tag: 'ig1-harvey-2026', ids: ['ig1-harvey-2026-oct-month', 'ig1-harvey-2026-midterm']},
  IGB: {tag: 'harvey-2026', ids: ['harvey-2026-first-question-scores', 'harvey-2026-midterm-question-scores']},
  IG3: {tag: 'ig3-alice-2026', ids: ['ig3-alice-2026-first', 'ig3-alice-2026-midterm']},
};

function pfExamOnly(matches) {
  return matches.length === 1 ? matches[0] : null;
}

function pfExamLinks(record) {
  if (!record) return [];
  const owners = Object.entries(pf.classes).filter(([, workspace]) => workspace.records.includes(record));
  const group = owners.length === 1 ? owners[0][0] : owners.length ? '' : pf.group;
  const series = PF_EXAM_SERIES[group];
  if (!series) return [];

  const roster = db.students.filter(profile => profile.group === group);
  const candidates = ssExams.filter(exam => {
    if (!Array.isArray(exam.students) || !exam.id || !exam.name) return false;
    return Object.entries(PF_EXAM_SERIES).every(([owner, definition]) =>
      owner === group || (definition.tag !== exam.importTag && !definition.ids.includes(exam.id)));
  });
  const direct = new Map(candidates.map(exam => [exam, pfExamOnly(exam.students.filter(person =>
    record.id && person.studentId === record.id && person.name === record.name))]));
  const profile = pfExamOnly(roster.filter(student => {
    if (record.profileId) return student.id === record.profileId;
    if (record.id && student.id === record.id && student.name === record.name) return true;
    return candidates.some(exam => direct.get(exam)?.id && student.profileLinks?.[exam.id] === direct.get(exam).id);
  }));

  return candidates.flatMap(exam => {
    const exact = direct.get(exam);
    const link = profile?.profileLinks?.[exam.id];
    const byProfile = link
      ? pfExamOnly(exam.students.filter(person => person.id === link))
      : profile?.name === record.name && (record.profileId || profile.id === record.id)
        ? pfExamOnly(exam.students.filter(person => person.studentId === profile.id && person.name === profile.name))
        : null;
    if (link && (!byProfile || (exact && byProfile !== exact))) return [];
    const person = exact || byProfile;
    if (!person) return [];
    const otherClaims = db.students.some(student => student !== profile && student.profileLinks?.[exam.id] === person.id);
    if (otherClaims) return [];

    const stage = series.ids.indexOf(exam.id);
    const date = pfExamDate(exam.date || exam.examDate) || (stage < 0 ? 0 : 20261000 + 100 * stage);
    return [{exam, person, profile, group, stage, date}];
  }).sort((a, b) => b.date - a.date);
}

function pfExamDate(value) {
  const date = /^(\d{4})[-/年](\d{1,2})(?:[-/月](\d{1,2}))?[月日]?(?:T.*)?$/.exec(String(value || '').trim());
  if (!date) return 0;
  const [year, month, day = 0] = date.slice(1).map(value => value === undefined ? 0 : Number(value));
  return month > 0 && month <= 12 && day <= 31 ? year * 10000 + month * 100 + day : 0;
}

function pfExamOptions(record) {
  return pfExamLinks(record).map(({exam}) => ({id: exam.id, label: exam.name}));
}

function pfExamName(exam) {
  return exam.name.replace(/^(?:IG1|IGB|IG3)\s*·\s*/i, '');
}

function pfExamNumber(value) {
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function pfExamRank(value) {
  return Number.isInteger(value) && value > 0 ? value : null;
}

function pfExamFormat(value) {
  return String(Math.round(value * 100) / 100);
}

function pfExamData({exam, person, profile, group, stage}) {
  const history = profile && stage >= 0 ? caScores(profile) : null;
  const questions = (exam.questions || []).map(question => {
    const score = person.scores?.[question.id];
    const max = pfExamNumber(question.max) || null;
    const value = score?.status === '有分数' ? pfExamNumber(score.value) : null;
    return {
      id: question.id, max, value: max !== null && value > max ? null : value,
      mark: person.scoreMarks?.[question.id], note: String(person.notes?.[question.id] || '').trim(),
    };
  });
  const supplied = pfExamNumber(person.sourceTotal) ?? pfExamNumber(history?.scores?.[stage]);
  const total = supplied ?? (questions.length && questions.every(question => question.value !== null)
    ? questions.reduce((sum, question) => sum + question.value, 0) : null);
  const full = pfExamNumber(exam.full) || (questions.length && questions.every(question => question.max !== null)
    ? questions.reduce((sum, question) => sum + question.max, 0) : null);
  const gradeRank = pfExamRank(person.gradeRank) ?? (history?.rankScope === 'grade' ? pfExamRank(history.ranks?.[stage]) : null);
  const adminRank = pfExamRank(person.adminRank) ?? pfExamRank(history?.adminRanks?.[stage]);
  const combinedRank = group === 'IGB' && history?.rankScope !== 'grade' ? pfExamRank(history?.ranks?.[stage]) : null;
  return {total, full, supplied, questions, ranks: {'年级': gradeRank, '三班': combinedRank, '行政班': adminRank}};
}

function pfExamEarlier(previous, current) {
  if (!previous.date || previous.date >= current.date) return false;
  return Math.floor(previous.date / 100) !== Math.floor(current.date / 100) ||
    (previous.date % 100 > 0 && current.date % 100 > 0);
}

function pfExamQuestionText(questions, style) {
  const format = question => `${question.id}得 ${pfExamFormat(question.value)}/${pfExamFormat(question.max)} 分`;
  const full = questions.filter(question => question.max !== null && question.value === question.max)
    .sort((a, b) => Number(['amber','green'].includes(b.mark)) - Number(['amber','green'].includes(a.mark)) || b.max - a.max);
  const incomplete = questions.filter(question => question.value !== null && question.max !== null && question.value < question.max)
    .sort((a, b) => Number(b.mark === 'red') - Number(a.mark === 'red') || b.max - b.value - (a.max - a.value));
  const marked = questions.filter(question => question.max === null && ['red','amber','green','blue'].includes(question.mark));
  const notes = questions.filter(question => question.note).slice(0, 2);
  const text = [];

  if (full.length) text.push(`${full.slice(0, 2).map(format).join('，')}${style === 'concise' ? '，均为满分。' : '，取得了满分。'}`);
  if (incomplete.length) {
    const ending = style === 'encouraging' ? '，接下来可先把这几题再练一遍。'
      : style === 'direct' ? '，建议优先订正这几题。'
        : style === 'concise' ? '，有失分。' : '，这些题还有得分空间。';
    text.push(incomplete.slice(0, 2).map(format).join('，') + ending);
  }
  if (marked.length) text.push(`教师标注了${marked.slice(0, 2).map(question => {
    const score = question.value === null ? '' : `得 ${pfExamFormat(question.value)} 分`;
    const label = {red: '需关注', amber: '表现突出', green: '表现突出', blue: '有备注'}[question.mark];
    return question.id + score + `（${label}）`;
  }).join('、')}。`);
  if (!text.length) {
    const scored = questions.filter(question => question.value !== null).sort((a, b) => b.value - a.value);
    const examples = scored.length > 1 ? [scored[0], scored.at(-1)] : scored;
    if (examples.length) text.push(`逐题得分中，${examples.map(question => `${question.id}得 ${pfExamFormat(question.value)} 分`).join('，')}。`);
  }
  for (const question of notes) text.push(`我在${question.id}的批注中记录了“${question.note.replace(/[。！？；\s]+$/u, '')}”。`);
  if (incomplete.length && !notes.length) text.push('具体失分原因可结合答题卡进一步核对。');
  return text;
}

function pfExamFeedback(record, examId, style = 'natural') {
  const links = pfExamLinks(record);
  const current = links.find(entry => entry.exam.id === examId);
  if (!current) return null;
  const data = pfExamData(current);
  const questionText = pfExamQuestionText(data.questions, style);
  const ranks = Object.entries(data.ranks).filter(([, rank]) => rank !== null)
    .map(([scope, rank]) => `${scope}第 ${rank} 名`);
  if (data.total === null && !ranks.length && !questionText.length) return null;

  const totals = data.total === null ? '' : `${data.supplied === null ? '逐题得分合计' : '总分'} ${pfExamFormat(data.total)} 分` +
    (data.full !== null && data.total <= data.full ? `（满分 ${pfExamFormat(data.full)} 分）` : '');
  const opening = [totals, ...ranks].filter(Boolean).join('，');
  const name = pfExamName(current.exam);
  const prefix = style === 'encouraging' ? `从${record.name}这次${name}的得分来看`
    : style === 'direct' ? `${record.name}的${name}成绩记录`
      : style === 'concise' ? `${record.name}这次${name}` : `${record.name}本次${name}`;
  const text = [opening ? `${prefix}，${opening}。` : `${record.name}本次${name}的部分题目已有记录。`];
  const previous = links.find(entry => pfExamEarlier(entry, current));
  if (previous) {
    const prior = pfExamData(previous);
    if (prior.total !== null && data.total !== null) {
      const delta = Math.round((data.total - prior.total) * 100) / 100;
      const sameScale = data.full !== null && data.full === prior.full && data.total <= data.full && prior.total <= prior.full;
      const change = !sameScale ? '' : delta === 0 ? '，两次同分' : `，本次${delta > 0 ? '提高' : '下降'} ${pfExamFormat(Math.abs(delta))} 分`;
      text.push(`上次${pfExamName(previous.exam)}为 ${pfExamFormat(prior.total)} 分${change}。`);
    }
    const comparable = Object.keys(data.ranks).find(scope => data.ranks[scope] !== null && prior.ranks[scope] !== null);
    if (comparable) text.push(`${comparable}名次由第 ${prior.ranks[comparable]} 名到第 ${data.ranks[comparable]} 名。`);
  }
  const summary = '总分和名次以已关联的成绩记录为准。无总分记录时使用完整的逐题合计。答题卡切片可供教师复核，具体错因只引用教师备注。';
  return {text: [...text, ...questionText].join(''), summary};
}
