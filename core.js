(function(g){
function matchStudent(students,id,name){id=String(id||'').trim();name=String(name||'').trim();let a=id?students.filter(s=>s.id===id):students.filter(s=>s.name===name);return a.length===1?a[0]:null}
function validScore(s,t){return s!==''&&t!==''&&Number.isFinite(+s)&&Number.isFinite(+t)&&+t>0&&+s>=0&&+s<=+t}
function analysis(exams){let a=exams.filter(e=>validScore(e.score,e.total));let last=a.at(-1),prev=a.at(-2);return {last,prev,trend:prev?Math.round((last.score/last.total-prev.score/prev.total)*1000)/10:null}}
let api={matchStudent,validScore,analysis};if(typeof module!=='undefined')module.exports=api;g.Core=api;
})(typeof window==='undefined'?globalThis:window);
