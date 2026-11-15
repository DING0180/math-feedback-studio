const ig1PriorScores=caScores;caScores=function(s){return s?.ig1MonthTotals||ig1PriorScores(s)};
const ig1OldProfile=uProfile;uProfile=function(s){let r=s?.ig1MonthTotals;if(!r)return ig1OldProfile(s);return `<div class="panel"><div class="panel-head"><h2>考试成绩</h2></div><div class="scroll"><table><thead><tr><th>考试</th><th>成绩</th></tr></thead><tbody><tr><td>10月月度练习数1</td><td>${E(String(r.scores[0]))} 分</td></tr><tr><td>期中考试</td><td>尚未导入</td></tr></tbody></table></div><p class="hint">成绩来自初一月度练习成绩表；期中成绩尚未提供。</p></div>`+ig1OldProfile(s)};
const ig1OldExamPanel=uExamPanel;uExamPanel=function(s,e,i){if(e.importTag==='ig1-harvey-2026'&&s.group!=='IG1')return '';return ig1OldExamPanel(s,e,i)};
render();
/* 工作台统计补充 IG1、IG3 的原始总分记录，不重复计算对应逐题档案。 */
const ig1PriorDashboard=views.dashboard;views.dashboard=function(){let html=ig1PriorDashboard(),base=db.students.reduce((n,s)=>n+(s.exams||[]).length+(s.comparisonRecords||[]).reduce((a,r)=>a+r.scores.filter(v=>v!==null).length,0),0),extra=db.students.reduce((n,s)=>n+(s.ig1MonthTotals?.scores||[]).filter(v=>v!==null).length+(s.ig3AliceTotals?.scores||[]).filter(v=>v!==null).length,0);return html.replace(`<span>考试记录</span><strong>${base}</strong>`,`<span>考试记录</span><strong>${base+extra}</strong>`)};
render();
