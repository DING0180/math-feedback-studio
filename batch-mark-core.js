(function(root){
 function planBatchMarks(people, question, max, color){
  if(!Number.isFinite(max)||max<=0) throw Error('满分必须大于 0');
  if(!['red','amber'].includes(color)) throw Error('无效颜色');
  return people.filter(p=>{const s=p.scores?.[question]; return s?.status==='有分数'&&typeof s.value==='number'&&Number.isFinite(s.value)&&s.value>=0&&s.value<=max&&(color==='red'?s.value<max:s.value===max)}).map(person=>({person,before:person.scoreMarks?.[question]||''}));
 }
 if(typeof module!=='undefined'&&module.exports) module.exports={planBatchMarks};
 else root.planBatchMarks=planBatchMarks;
})(globalThis);
