/* 快捷颜色标记：选中颜色后直接点击成绩，同色再点取消。 */
let quickMarkMode='';
function quickMarkToolbar(){
 const table=document.querySelector('.ca-matrix');if(!table)return;let wrap=table.closest('.ca-table-wrap');if(!wrap)return;
 let bar=document.createElement('div');bar.className='quick-mark-bar';bar.setAttribute('role','group');bar.setAttribute('aria-label','成绩快捷标记');
 bar.innerHTML='<span class="quick-mark-label">快捷标记</span><button type="button" class="quick-mark-button red" data-quick-mode="red" aria-pressed="false"><span class="quick-dot" aria-hidden="true"></span>红色标记</button><button type="button" class="quick-mark-button amber" data-quick-mode="amber" aria-pressed="false"><span class="quick-dot" aria-hidden="true"></span>黄色标记</button><span class="quick-mark-help" aria-live="polite"></span>';
 wrap.before(bar);
 function showMode(){bar.querySelectorAll('[data-quick-mode]').forEach(x=>{let active=x.dataset.quickMode===quickMarkMode;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active))});bar.querySelector('.quick-mark-help').textContent=quickMarkMode?`已选择${quickMarkMode==='red'?'红色':'黄色'}：点击成绩标记，再点相同成绩取消；再点颜色按钮退出。`:'选择颜色后点击成绩；未选颜色时点击成绩可编辑分数。'}
 bar.querySelectorAll('[data-quick-mode]').forEach(x=>x.onclick=()=>{quickMarkMode=quickMarkMode===x.dataset.quickMode?'':x.dataset.quickMode;showMode()});showMode();
}
async function quickMarkScore(el){
 let s=db.students.find(x=>x.id===el.dataset.caScoreStudent),e=ssExams.find(x=>x.id===caExamId),p=s&&e&&uResolve(s,e).person,q=el.dataset.caScoreQ;if(!p||!e)return alert('未找到关联的逐题成绩，请先确认学生关联。');
 let before=p.scoreMarks?.[q]||'',after=before===quickMarkMode?'':quickMarkMode;p.scoreMarks??={};if(after)p.scoreMarks[q]=after;else delete p.scoreMarks[q];el.disabled=true;
 if(await ssSave(e)){el.classList.remove('red','green','blue','amber');if(after)el.classList.add(after);let label=el.getAttribute('aria-label').replace(/，(?:红色|绿色|蓝色|黄色)标记$/,'');el.setAttribute('aria-label',label+(after?`，${{red:'红色',green:'绿色',blue:'蓝色',amber:'黄色'}[after]}标记`:''));toast(after?'标记已保存':'标记已取消')}else{if(before)p.scoreMarks[q]=before;else delete p.scoreMarks[q]}el.disabled=false;
}
const quickMarkPriorBind=bind;bind=function(){quickMarkPriorBind();if(page!=='exams'||caIndividual)return;quickMarkToolbar();document.querySelectorAll('[data-ca-score-student]').forEach(el=>{el.onclick=()=>{if(quickMarkMode)quickMarkScore(el);else caEditScore(el.dataset.caScoreStudent,el.dataset.caScoreQ)}})};
render();

