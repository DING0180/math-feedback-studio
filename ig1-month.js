function ig1Rank(value) {
  return Number.isInteger(value) && value > 0 ? value : null;
}

const ig1PriorScores = caScores;
caScores = function (student) {
  if (student?.group !== 'IG1') return ig1PriorScores(student);

  const prior = student.ig1MonthTotals;
  const october = ssExams.find(exam => exam.id === CA_IG1_OCTOBER_ID);
  const november = ssExams.find(caIg1Midterm);
  const octoberResult = october && uResolve(student, october).person;
  const novemberResult = november && uResolve(student, november).person;
  if (!prior && !octoberResult && !novemberResult) return ig1PriorScores(student);

  return {
    names: [prior?.names?.[0] || '10月月度练习数1', '11月期中考试'],
    dates: [october?.date || '2026年10月', november?.date || '2026年11月'],
    scores: [
      caNumber(prior?.scores?.[0]) ?? caNumber(octoberResult?.sourceTotal),
      caNumber(novemberResult?.sourceTotal) ?? caNumber(prior?.scores?.[1])
    ],
    rankScope: 'grade',
    ranks: [
      ig1Rank(octoberResult?.gradeRank) ?? ig1Rank(novemberResult?.octoberGradeRank),
      ig1Rank(novemberResult?.gradeRank)
    ],
    adminRanks: [
      ig1Rank(octoberResult?.adminRank) ?? ig1Rank(novemberResult?.octoberAdminRank),
      ig1Rank(novemberResult?.adminRank)
    ]
  };
};

const ig1OldProfile = uProfile;
uProfile = function (student) {
  const history = ig1OldProfile(student);
  const result = student?.group === 'IG1' && caScores(student);
  if (result?.rankScope !== 'grade') return history;

  const rows = result.names.map((name, index) => `<tr><td>${E(name)}</td><td>${E(result.dates[index])}</td>
    <td>${result.scores[index] === null ? '—' : `${result.scores[index]} 分`}</td>
    <td>${result.ranks[index] ?? '—'}</td><td>${result.adminRanks[index] ?? '—'}</td></tr>`).join('');
  return `<div class="panel"><div class="panel-head ca-heading"><div><h2>考试总分与排名</h2><p class="muted">年级名次变化 ${caGradeRankDelta(result)}</p></div></div>
    <div class="scroll"><table><thead><tr><th scope="col">考试</th><th scope="col">时间</th><th scope="col">原表总分</th>
    <th scope="col">年级名次</th><th scope="col">行政班名次</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="hint">年级名次来自对应考试的年级数据，参考人数可能不同。“—”表示暂无可用记录。</p></div>${history}`;
};
const ig1OldExamPanel=uExamPanel;uExamPanel=function(s,e,i){if(e.importTag==='ig1-harvey-2026'&&s.group!=='IG1')return '';return ig1OldExamPanel(s,e,i)};
render();
/* 工作台统计补充 IG1、IG3 的原始总分记录，不重复计算对应逐题档案。 */
const ig1PriorDashboard=views.dashboard;views.dashboard=function(){let html=ig1PriorDashboard(),base=db.students.reduce((n,s)=>n+(s.exams||[]).length+(s.comparisonRecords||[]).reduce((a,r)=>a+r.scores.filter(v=>v!==null).length,0),0),extra=db.students.reduce((n,s)=>n+(s.group==='IG1'?(caScores(s)?.scores||[]):[]).filter(v=>v!==null).length+(s.ig3AliceTotals?.scores||[]).filter(v=>v!==null).length,0);return html.replace(`<span>考试记录</span><strong>${base}</strong>`,`<span>考试记录</span><strong>${base+extra}</strong>`)};
render();
