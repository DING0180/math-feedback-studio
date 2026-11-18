/* 将已选观察、措施和教师备注整理成可编辑的家长反馈草稿。 */
const pfDailyWording = new Map([
  [
    ['作业按时完成', '能按时完成作业'],
    ['作业书写规范', '作业书写规范'],
    ['作业正确率较高', '作业的正确率较高'],
    ['作业偶有遗漏', '作业偶尔有漏做'],
    ['作业完成质量较高', '作业完成质量较高'],
    ['作业完成质量不稳定', '作业完成质量有些波动'],
    ['作业有漏做或空题', '作业中有漏做或空着的题目'],
    ['作业书写较潦草', '作业书写有些潦草'],
    ['作业正确率有待提高', '作业的正确率还有提升空间'],
    ['作业未按要求完成', '作业还需要按要求完成'],
    ['作业提交不及时', '作业提交还不够及时'],
    ['经常迟交作业', '作业经常迟交'],
    ['偶尔未交作业', '偶尔有作业没有提交'],
    ['周作业经常迟交', '周作业经常迟交'],
    ['周作业完成不够认真', '周作业还需要完成得更认真一些'],
  ],
  [
    ['课堂积极发言', '课堂上发言积极'],
    ['听讲专注', '上课听讲专注'],
    ['善于提出问题', '善于提出问题'],
    ['课堂参与有待加强', '课堂参与还可以更主动一些'],
    ['能与同伴合作', '能与同伴合作'],
    ['课堂积极举手发言', '课堂上积极举手发言'],
    ['课堂主动分享解题思路', '愿意在课堂上主动分享解题思路'],
    ['课堂认真倾听并回应', '上课能认真倾听并回应'],
    ['课堂注意力不够集中', '上课时注意力还不够集中'],
    ['课堂容易走神', '上课时容易走神'],
    ['课堂经常与同学说话', '上课时经常和同学说话'],
    ['课堂有时影响同伴学习', '课堂上有时会影响同伴学习'],
    ['课堂纪律良好', '能遵守课堂纪律'],
    ['课堂纪律需要加强', '课堂纪律还需加强'],
    ['课堂参与不够主动', '课堂参与还可以更主动一些'],
    ['课堂较少回答问题', '课堂上回答问题较少'],
  ],
  [
    ['基础知识扎实', '基础知识掌握得较扎实'],
    ['计算认真细致', '计算时认真细致'],
    ['善于总结错题', '善于整理和总结错题'],
    ['审题需要更仔细', '审题时还可以更仔细一些'],
    ['运算准确率有待提高', '运算的准确率还有提升空间'],
    ['订正及时', '能及时订正错题'],
    ['错题能及时订正', '能及时订正错题'],
    ['错题订正不够及时', '错题订正还不够及时'],
    ['不愿意主动订正错题', '订正错题的主动性还不够'],
    ['订正时缺少原因分析', '订正时还缺少对错因的分析'],
    ['相同错误反复出现', '相同的错误还会反复出现'],
    ['缺少课后复习习惯', '课后复习习惯还需要养成'],
    ['课前预习不够充分', '课前预习还不够充分'],
    ['笔记记录不够完整', '笔记记录还不够完整'],
    ['做题缺少检查习惯', '做完题后还需要养成检查的习惯'],
    ['基础概念掌握不够扎实', '基础概念掌握得还不够扎实'],
  ],
  [
    ['学习态度认真', '平时学习态度认真'],
    ['面对困难有耐心', '遇到困难时有耐心'],
    ['能主动请教', '遇到问题能主动请教'],
    ['需要增强学习主动性', '学习的主动性还可以再加强'],
    ['学习态度积极认真', '对待数学学习积极认真'],
    ['能够主动请教老师', '能主动向老师请教'],
    ['遇到问题愿意主动提问', '遇到问题愿意主动提问'],
    ['学习主动性不足', '学习的主动性还可以再加强'],
    ['遇到困难容易放弃', '遇到困难时容易放弃'],
    ['很少主动向老师请教问题', '较少主动向老师请教问题'],
    ['尚未主动向老师提问', '目前还没有主动向老师提问'],
    ['需要老师多次提醒才能开始学习', '开始学习前需要老师多次提醒'],
    ['对待学习任务不够认真', '对待学习任务还需要更认真一些'],
    ['学习状态容易松懈', '学习时比较容易松懈'],
  ],
  [
    ['考试中注意力不够集中', '考试时注意力还不够集中'],
    ['考试期间容易东张西望', '考试时容易东张西望'],
    ['考试提前答完后画画', '考试提前答完后会画画'],
    ['考试答完后没有认真检查', '考试答完后检查得还不够认真'],
    ['考试中检查不够细致', '考试时检查还不够细致'],
    ['考试结束前较少复查计算与答案', '考试结束前较少复查计算和答案'],
    ['考试期间能够保持专注', '考试时能保持专注'],
    ['考试结束前主动检查答题与计算', '考试结束前会主动检查答题和计算'],
  ],
].flatMap((items, group) => items.map(([label, text]) => [label, {group, text}])));

const pfActionWording = new Map([
  ['每天进行 10 分钟基础运算练习，每周核对正确率', '每天用 10 分钟练习基础运算，并每周核对正确率'],
  ['每次作业完成后用 5 分钟检查计算和单位', '每次写完作业留出 5 分钟，检查计算和单位'],
  ['每周整理 3 道典型错题，并在一周后重做', '每周整理 3 道典型错题，一周后再重做'],
  ['每天复习当天数学笔记 10 分钟', '每天用 10 分钟复习当天的数学笔记'],
  ['每周针对薄弱知识点完成 5 道基础题', '每周围绕薄弱知识点做 5 道基础题'],
  ['解题前圈画已知条件和问题，每次作业至少坚持 3 题', '先圈出已知条件和要解决的问题再动笔，每次作业至少这样做 3 题'],
  ['每周主动向老师或同学请教至少 1 个问题', '每周至少主动向老师或同学请教 1 个问题'],
  ['每次考试后整理失分原因，并完成一次针对性订正', '每次考完先整理失分原因，再做一次有针对性的订正'],
  ['每周完成 2 次限时练习，记录用时和正确率', '每周做 2 次限时练习，记下用时和正确率'],
  ['课堂上每周至少主动表达或提问 1 次', '每周至少在课堂上主动表达或提问 1 次'],
]);

const pfEncouragingDaily = new Map([
  ['作业按时完成', '能够按时把作业完成'],
  ['作业正确率较高', '作业的正确率表现较好'],
  ['作业完成质量不稳定', '作业完成质量还可以再稳定一些'],
  ['作业正确率有待提高', '作业的正确率还可以再提高一些'],
  ['作业提交不及时', '交作业这一步还可以更及时一些'],
  ['课堂积极发言', '能积极参与课堂发言'],
  ['课堂积极举手发言', '能在课堂上积极举手发言'],
  ['课堂主动分享解题思路', '能主动在课堂上分享解题思路'],
  ['课堂注意力不够集中', '听课时还可以把注意力放得更集中一些'],
  ['课堂纪律需要加强', '遵守课堂纪律这方面还可以做得更好'],
  ['错题能及时订正', '能把做错的题及时订正'],
  ['错题订正不够及时', '还可以把错题订正得更及时一些'],
  ['学习态度积极认真', '能积极、认真地对待学习'],
  ['学习主动性不足', '还可以更主动地投入学习'],
]);

const pfConciseActions = new Map([
  ['每天进行 10 分钟基础运算练习，每周核对正确率', '每天练 10 分钟基础运算，每周核对正确率'],
  ['每次作业完成后用 5 分钟检查计算和单位', '每次写完作业用 5 分钟检查计算和单位'],
  ['每周整理 3 道典型错题，并在一周后重做', '每周整理 3 道典型错题，一周后重做'],
  ['每天复习当天数学笔记 10 分钟', '每天花 10 分钟复习当天数学笔记'],
  ['每周针对薄弱知识点完成 5 道基础题', '每周做 5 道薄弱知识点的基础题'],
  ['解题前圈画已知条件和问题，每次作业至少坚持 3 题', '动笔前圈出已知条件和问题，每次作业至少 3 题这样做'],
  ['每周主动向老师或同学请教至少 1 个问题', '每周主动向老师或同学至少问 1 个问题'],
  ['每次考试后整理失分原因，并完成一次针对性订正', '每次考完整理失分原因，再针对性订正一次'],
  ['每周完成 2 次限时练习，记录用时和正确率', '每周做 2 次限时练习，记下用时和正确率'],
  ['课堂上每周至少主动表达或提问 1 次', '每周课上至少主动表达或提问 1 次'],
]);

function pfFeedbackStyle(style) {
  return ['natural', 'direct', 'encouraging', 'concise'].includes(style) ? style : 'natural';
}

function pfWritingFragment(value) {
  return typeof value === 'string' ? value.trim().replace(/[。！？!?，、；;]+$/u, '').trim() : '';
}

function pfWritingSentence(value) {
  const text = typeof value === 'string' ? value.trim().replace(/[，、；;]+$/u, '').trim() : '';
  return text && !/[。！？.!?…]$/u.test(text) ? text + '。' : text;
}

function pfWritingNote(note) {
  if (typeof note !== 'string') return '';
  return note.split(/\r?\n+/u).map(pfWritingSentence).filter(Boolean).join('');
}

function pfWriteDaily(record, style = 'natural') {
  const tone = pfFeedbackStyle(style);
  const limit = tone === 'direct' ? 44 : tone === 'concise' ? 72 : 56;
  const name = typeof record?.name === 'string' ? record.name.trim() : '';
  const labels = Array.isArray(record?.daily) ? record.daily : [];
  const sentences = [];
  const seen = new Set();
  let current = '';
  let group;
  for (const label of labels) {
    const key = pfWritingFragment(label);
    if (!key) continue;
    const phrase = pfDailyWording.get(key);
    const text = tone === 'encouraging' && pfEncouragingDaily.has(key)
      ? pfEncouragingDaily.get(key)
      : tone === 'natural' || tone === 'encouraging'
        ? phrase?.text || key
        : key;
    if (seen.has(text)) continue;
    seen.add(text);

    const sameArea = phrase && group === phrase.group;
    if (current && (sameArea || (phrase && group !== undefined && tone === 'concise')) && current.length + text.length <= limit) {
      const continuation = sameArea && group === 0 && current.includes('作业')
        ? text.replace(/^作业(?:的|中)?(?=书写|正确率|完成质量|提交|偶尔|经常|有漏做)/u, '')
        : text;
      current += '，' + continuation;
      continue;
    }
    if (current) sentences.push(pfWritingSentence(current));
    const prefix = phrase && !sentences.length && name
      ? name + (name.endsWith('同学') ? '' : '同学') + (/^作业/u.test(text) ? '的' : '')
      : '';
    current = prefix + text;
    group = phrase?.group;
  }
  if (current) sentences.push(pfWritingSentence(current));
  sentences.push(pfWritingNote(record?.dailyNote));
  return sentences.join('');
}

function pfWriteActions(record, style = 'natural') {
  const tone = pfFeedbackStyle(style);
  const name = typeof record?.name === 'string' ? record.name.trim() : '';
  const openings = {natural:'建议', direct:'请', encouraging:name ? '可以请' : '可以', concise:'建议'};
  const labels = Array.isArray(record?.action) ? record.action : [];
  const sentences = [];
  const seen = new Set();
  for (const label of labels) {
    const key = pfWritingFragment(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const phrase = pfActionWording.get(key);
    const opening = phrase && !sentences.length ? openings[tone] + name : '';
    const text = tone === 'direct' ? key
      : tone === 'concise' ? pfConciseActions.get(key) || phrase || key
        : phrase || key;
    sentences.push(pfWritingSentence(opening + text));
  }
  sentences.push(pfWritingNote(record?.actionNote));
  return sentences.join('');
}

