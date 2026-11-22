/* 按当前考试的总分排序；同分并列，未知总分排最后。 */
function matrixTotal(s, exam) {
  const person = uResolve(s, exam).person;
  if (caIg1Midterm(exam)) return caNumber(person?.sourceTotal);

  const index = caExamIndex(exam);
  const recorded = caNumber(caScores(s)?.scores?.[index]);
  if (recorded !== null) return recorded;
  if (!person || !exam.questions.length) return null;
  const scores = exam.questions.map(question => person.scores?.[question.id]);
  return scores.every(score => score?.status === '有分数' && Number.isFinite(score.value))
    ? scores.reduce((sum, score) => sum + score.value, 0)
    : null;
}
caMatrix=function(list,ex){if(!ex)return '<div class="empty">该班暂无已关联的逐题成绩，可在逐题分析中导入。</div>';let all=activeStudentRoster(caGroup),qs=ex.questions,totals=new Map(all.map(s=>[s.id,matrixTotal(s,ex)]));let sorted=[...list].sort((a,b)=>{let x=totals.get(a.id),y=totals.get(b.id);return x===null&&y===null?a.name.localeCompare(b.name,'zh-CN'):x===null?1:y===null?-1:y-x||a.name.localeCompare(b.name,'zh-CN')});let nums=[...totals.values()].filter(v=>v!==null),avg=nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:null;return `<div class="ca-table-wrap"><table class="ca-table ca-matrix"><thead><tr><th scope="col">学生</th><th scope="col">本班名次</th><th scope="col">总分</th>${qs.map(q=>`<th scope="col">${E(q.id)}${q.max!=null?`<small>满分 ${q.max}</small>`:''}</th>`).join('')}</tr><tr class="ca-average-row"><th scope="row">班级均分</th><td>—</td><td>${avg===null?'—':avg.toFixed(2)}<small>${nums.length} 人</small></td>${qs.map(q=>{let a=caQuestionAverage(all,ex,q);return `<td>${a.mean===null?'—':a.mean.toFixed(2)}<small>${a.count} 人</small></td>`}).join('')}</tr></thead><tbody>${sorted.map(s=>{let p=uResolve(s,ex).person,t=totals.get(s.id),rank=t===null?'—':'第 '+(1+nums.filter(x=>x>t).length)+' 名';return `<tr><th scope="row"><button class="ca-name" data-ca-profile="${E(s.id)}">${E(s.name)}</button></th><td>${rank}</td><td><strong>${t===null?'—':E(String(t))}</strong></td>${qs.map(q=>{let v=p?.scores?.[q.id],mark=p?.scoreMarks?.[q.id]||'',value=v?.status==='有分数'?v.value:v?.status==='缺考'?'缺考':'—';return `<td>${p?`<button type="button" class="ca-score ca-edit-score ${E(mark)}" data-ca-score-student="${E(s.id)}" data-ca-score-q="${E(q.id)}" aria-label="${E(s.name)} ${E(q.id)} ${E(String(value))}，编辑分数和标注">${E(String(value))}</button>`:`<span class="ca-score">—</span>`}</td>`}).join('')}</tr>`}).join('')}</tbody></table></div><p class="hint">表中按本次考试总分由高到低排列，同分并列；总分为原表记录，本班名次不同于三班或全年级排名。小分修改不会自动更改原表总分及其排序。</p>`};
render();

