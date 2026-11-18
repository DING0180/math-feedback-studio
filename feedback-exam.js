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

function pfExamNumber(value) {
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function pfExamRank(value) {
  return Number.isInteger(value) && value > 0 ? value : null;
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

const PF_IG1_MIDTERM_TOPICS = [
  ['选择题', Array.from({length:10},(_,index)=>`第${index+1}题`), '订正时看清每个选项成立的条件'],
  ['填空题', ['第11-16题','第17-20题'], '重做填空时把中间的推算写在草稿上'],
  ['有理数运算', ['第21题'], '把不同运算按顺序写开，算完逐步核对'],
  ['数轴上的有理数比较', ['第22题'], '试着先在数轴上标出几个数，再按位置比较'],
  ['合并同类项', ['第23题'], '先找出字母部分相同的项，再合并它们的系数'],
  ['化简后求值', ['第24题'], '把化简后的式子单独写出来，再代入数值核对'],
  ['产量和计件工资应用题', ['第25题'], '先区分实际产量和增减量，再按计件条件列式'],
  ['整式综合题', ['第26题'], '先化简整式，再把需要满足的系数关系列清楚'],
  ['数轴动点题', ['第27题'], '先写出两个点的位置，再用坐标表示它们之间的距离'],
];

function pfExamQualitativeNotes(note) {
  const quantitative = /[\p{N}％%]|总分|得分|扣分|失分|满分|排名|名次|位次|名列|年级第|全班第|班级第|全校第|第\s*[零〇一二两三四五六七八九十百千]+\s*名|[零〇一二两三四五六七八九十百千半]+\s*分(?!钟)|(?:考了|只拿了|卷面|分数为|分数是)\s*[零〇一二两三四五六七八九十百千]{2,}/u;
  const sentences = String(note ?? '').split(/[。！？!?；;\n\r]+/u).map(sentence=>sentence.trim()).filter(Boolean);
  return sentences.filter(sentence=>!quantitative.test(sentence));
}

function pfExamTopicGroups(exam, questions) {
  const rows = new Map(questions.map(question=>[question.id,question]));
  let topics;
  if (exam.id === PF_EXAM_SERIES.IG1.ids[1]) {
    topics = PF_IG1_MIDTERM_TOPICS;
  } else {
    const labels = new Map();
    for (const question of exam.questions || []) {
      const label = [question.topic,question.knowledgePoint,question.type,question.category]
        .find(value=>typeof value==='string'&&value.trim());
      if (!label || !/^[\p{Script=Han}A-Za-z\s]{2,24}$/u.test(label.trim()) || !pfExamQualitativeNotes(label).length) continue;
      const normalized = label.trim();
      if (!labels.has(normalized)) labels.set(normalized,[]);
      labels.get(normalized).push(question.id);
    }
    topics = [...labels].map(([label,ids])=>[label,ids,'']);
  }
  return topics.flatMap(([label,ids,review])=>{
    const entries = ids.map(id=>rows.get(id));
    if (!entries.length || entries.some(entry=>!entry||entry.value===null||entry.max===null)) return [];
    const earned = entries.reduce((sum,item)=>sum+item.value,0);
    const possible = entries.reduce((sum,item)=>sum+item.max,0);
    return [{label,review,ratio:earned/possible,missed:possible-earned,possible}];
  });
}

function pfExamFeedback(record, examId, style = 'natural') {
  const current = pfExamLinks(record).find(entry=>entry.exam.id===examId);
  if (!current) return null;
  const data = pfExamData(current);
  const topics = pfExamTopicGroups(current.exam,data.questions);
  const notes = [...new Set(data.questions.flatMap(question=>pfExamQualitativeNotes(question.note)))].slice(0,2);
  if (!topics.length && !notes.length) return null;

  const strongest = [...topics].sort((a,b)=>b.ratio-a.ratio||b.possible-a.possible)[0];
  const gaps = topics.filter(topic=>topic.ratio<0.75)
    .sort((a,b)=>a.ratio-b.ratio||b.missed-a.missed);
  const strong = strongest?.ratio>=0.8 || (strongest?.ratio>=0.6 && !gaps.slice(0,2).includes(strongest)) ? strongest : null;
  const weak = gaps.slice(0,2);
  if (strong && !weak.length) {
    const practice = topics.filter(topic=>topic!==strong && topic.missed>0)
      .sort((a,b)=>b.missed-a.missed||a.ratio-b.ratio)[0];
    if (practice) weak.push(practice);
  }

  const observations = [];
  const label = weak.map(topic=>topic.label).join('和');
  const strongText=strong ? `${strong.label}${strong.ratio>=0.8?'做得比较稳':'已经有一定把握'}` : '';
  const weakText=label ? `${label}${weak[0].ratio<0.6?'还需要多练':'还有提升空间'}` : '';
  if (strongText && weakText) {
    if (style==='direct') observations.push(`${record.name}复习时应先抓${label}，${strongText}。`);
    else if (style==='encouraging') observations.push(`${record.name}${strongText}，接下来可以把重点放在${label}上。`);
    else if (style==='concise') observations.push(`${record.name}${strongText}，可以再练练${label}。`);
    else observations.push(`${record.name}这次${strongText}，${weakText}。`);
  } else if (strongText || weakText) {
    observations.push(`${record.name}这次${strongText || weakText}。`);
  }
  if (notes.length) {
    const opening = observations.length ? '复看答卷时也留意到，' : `复看${record.name}的答卷时发现，`;
    observations.push(opening+notes.join('，')+'。');
  }
  if (weak.length) {
    const review = weak.find(topic=>topic.review);
    if (review) observations.push(`复盘${review.label}时，${review.review}。`);
    else if (!notes.length) observations.push(`订正时可以先重做${weak[0].label}，写出推导过程，再对照原来的解法。`);
  }
  return {
    text:observations.join(''),
    summary:'评语根据有依据的题型或知识点表现生成。切片可供复核，具体错因只采用教师备注。',
  };
}
