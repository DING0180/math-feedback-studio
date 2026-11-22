const THREE_CLASS_KEY='三班两次数学成绩_2026_11';

function threeClassPanel(s){let rec=(s?.comparisonRecords||[]).find(x=>x.key===THREE_CLASS_KEY);if(!rec)return '';
 let diff=rec.ranks[0]-rec.ranks[1],scoreDiff=rec.scores[1]-rec.scores[0],result=diff>0?`上升 ${diff} 名`:diff<0?`下降 ${Math.abs(diff)} 名`:'排名不变',scoreResult=scoreDiff>0?`提高 ${scoreDiff} 分`:scoreDiff<0?`下降 ${Math.abs(scoreDiff)} 分`:'成绩不变';
 return `<div class="panel"><div class="panel-head"><div><h2>三班成绩与排名变化</h2><p class="muted">${E(rec.cohort)} · 按每次有效成绩合并排名</p></div></div><div class="scroll"><table><thead><tr><th>考试</th><th>成绩</th><th>三班总排名</th><th>参与排名人数</th></tr></thead><tbody>${rec.examNames.map((n,i)=>`<tr><td>${E(n)}</td><td>${E(String(rec.scores[i]))} 分</td><td>第 ${rec.ranks[i]} 名</td><td>${rec.participants[i]} 人</td></tr>`).join('')}</tbody></table></div><p><strong>排名${result}，成绩${scoreResult}。</strong></p><p class="hint">同分并列，名次按高于该分数的人数加 1 计算；缺少成绩者不计入该次排名。原表的名次为全年级排名，这里为重新计算的三班排名。原表未注明满分，因此未计算得分率。</p></div>`
}
const threeOldProfile=uProfile;uProfile=function(s){return threeClassPanel(s)+threeOldProfile(s)};
const threeOldExams=views.exams;views.exams=function(){return threeClassPanel(student())+threeOldExams()};
render();

const threeOldStudents=views.students;views.students=function(){let html=threeOldStudents(),s=student();if(s?.comparisonRecords?.length){let existing=(s.exams||[]).length+ssExams.filter(e=>uResolve(s,e).person).length;let extra=s.comparisonRecords.reduce((n,r)=>n+r.scores.filter(x=>x!==null).length,0)-ssExams.filter(e=>e.importTag==='harvey-2026'&&uResolve(s,e).person).length;html=html.replace(`<div class="metric"><small>考试记录</small><b>${existing}</b>`,`<div class="metric"><small>考试记录</small><b>${existing+extra}</b>`);html=html.replace('完整的成绩数据录入后，可查看得分率变化。','已有两次三班成绩；原表未提供满分，暂不绘制得分率。')}return html};
const threeOldDashboard=views.dashboard;views.dashboard=function(){let html=threeOldDashboard(),roster=activeStudentRoster(),old=roster.reduce((n,s)=>n+s.exams.length,0),extra=roster.reduce((n,s)=>n+(s.comparisonRecords||[]).reduce((a,r)=>a+r.scores.filter(v=>v!==null).length,0),0);return html.replace(`<span>考试记录</span><strong>${old}</strong>`,`<span>考试记录</span><strong>${old+extra}</strong>`)};
render();

