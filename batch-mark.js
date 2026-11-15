/* 按题目批量标记当前教学班的有效成绩。 */
let batchSelectedExam='',batchSelectedQuestion='';
function batchMarkToolbar(){
 const bar=document.querySelector('.quick-mark-bar'),exam=ssExams.find(e=>e.id===caExamId);
 if(!bar||!exam||!exam.questions.length)return;
 const panel=document.createElement('div');panel.className='batch-mark-bar';panel.setAttribute('role','group');panel.setAttribute('aria-label','按题批量标记');
 panel.innerHTML=`<div class="batch-mark-title"><strong>按题批量标记</strong><span>作用于当前班级全部学生，缺考和未录入不参与。</span></div><div class="batch-mark-controls"><label>选择题目<select data-batch-question>${exam.questions.map((q,i)=>`<option value="${i}">${E(q.id)}</option>`).join('')}</select></label><label>该题满分<input data-batch-max type="number" min="0.01" step="any" placeholder="请填写满分"></label><button type="button" class="batch-red" data-batch-color="red">未满分一键标红</button><button type="button" class="batch-yellow" data-batch-color="amber">满分一键标黄</button></div><p class="batch-mark-status" aria-live="polite"></p>`;
 bar.after(panel);
 const select=panel.querySelector('[data-batch-question]'),input=panel.querySelector('[data-batch-max]'),status=panel.querySelector('.batch-mark-status');
 if(batchSelectedExam!==exam.id){batchSelectedExam=exam.id;batchSelectedQuestion=''};const previous=exam.questions.findIndex(q=>q.id===batchSelectedQuestion);if(previous>=0)select.value=String(previous);
 const people=()=>{let seen=new Set();return db.students.filter(s=>s.group===caGroup).map(s=>uResolve(s,exam).person).filter(p=>{if(!p||seen.has(p))return false;seen.add(p);return true})};
 function populate(){const q=exam.questions[+select.value];input.value=q.max??'';preview()}
 function preview(){let q=exam.questions[+select.value],max=Number(input.value);if(!input.value||!Number.isFinite(max)||max<=0){status.textContent='请先填写该题满分；确认标记时会保存满分。';return}let ps=people(),invalid=ps.filter(p=>{let s=p.scores?.[q.id];return s?.status==='有分数'&&typeof s.value==='number'&&(s.value>max||s.value<0)}).length;if(invalid){status.textContent=`有 ${invalid} 人的分数超出 0～${max} 分，请核对满分或成绩后再标记。`;return}let red=planBatchMarks(ps,q.id,max,'red').length,yellow=planBatchMarks(ps,q.id,max,'amber').length;status.textContent=`${q.id}：未满分 ${red} 人，满分 ${yellow} 人。已有不同颜色的标记会在确认后替换。`}
 select.onchange=()=>{batchSelectedQuestion=exam.questions[+select.value].id;populate()};input.oninput=preview;
 panel.querySelectorAll('[data-batch-color]').forEach(button=>button.onclick=async()=>{
  const q=exam.questions[+select.value],max=Number(input.value),color=button.dataset.batchColor,ps=people();
  if(!input.value||!Number.isFinite(max)||max<=0){alert('请填写大于 0 的题目满分。');return}
  if(ps.some(p=>{let s=p.scores?.[q.id];return s?.status==='有分数'&&typeof s.value==='number'&&(s.value>max||s.value<0)})){alert('该题有学生得分超出满分范围，请核对后再操作。');return}
  const changes=planBatchMarks(ps,q.id,max,color);if(!changes.length){toast('没有符合条件的有效成绩');return}
  const conflicting=changes.filter(x=>x.before&&x.before!==color).length;
  if(conflicting&&!confirm(`将为 ${changes.length} 人标${color==='red'?'红':'黄'}，其中 ${conflicting} 人的已有其他颜色标记会被替换。确定继续吗？`))return;
  const oldMax=q.max; q.max=max; changes.forEach(({person})=>{person.scoreMarks??={};person.scoreMarks[q.id]=color});
  panel.querySelectorAll('button').forEach(x=>x.disabled=true);
  if(await ssSave(exam)){render();toast(`已为 ${changes.length} 人标${color==='red'?'红':'黄'}`)}else{q.max=oldMax;changes.forEach(({person,before})=>{if(before)person.scoreMarks[q.id]=before;else delete person.scoreMarks[q.id]});panel.querySelectorAll('button').forEach(x=>x.disabled=false)}
 });populate();
}
const batchMarkPriorBind=bind;bind=function(){batchMarkPriorBind();if(page==='exams'&&!caIndividual)batchMarkToolbar()};
render();

