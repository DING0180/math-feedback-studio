/* 一次性补充具体的日常观察标签，保留教师自定义标签及学生已选记录。 */
const observationPresets={
  '作业完成情况':['作业完成质量较高','作业完成质量不稳定','作业有漏做或空题','作业书写较潦草','作业正确率有待提高','作业未按要求完成','作业提交不及时','经常迟交作业','偶尔未交作业','周作业经常迟交','周作业完成不够认真'],
  '课堂表现':['课堂积极举手发言','课堂主动分享解题思路','课堂认真倾听并回应','课堂注意力不够集中','课堂容易走神','课堂经常与同学说话','课堂有时影响同伴学习','课堂纪律需要加强','课堂参与不够主动','课堂较少回答问题'],
  '学习习惯与基础':['错题能及时订正','错题订正不够及时','不愿意主动订正错题','订正时缺少原因分析','相同错误反复出现','缺少课后复习习惯','课前预习不够充分','笔记记录不够完整','做题缺少检查习惯','基础概念掌握不够扎实'],
  '学习态度与纪律':['学习态度积极认真','能够主动请教老师','遇到问题愿意主动提问','学习主动性不足','遇到困难容易放弃','很少主动向老师请教问题','尚未主动向老师提问','需要老师多次提醒才能开始学习','对待学习任务不够认真','学习状态容易松懈']
};
function addObservationPresets(){
 if(!db.observationPresets20261113){for(const [category,items] of Object.entries(observationPresets)){db.tags[category]??=[];for(const item of items)if(!Object.values(db.tags).flat().includes(item))db.tags[category].push(item)}db.observationPresets20261113=true;save()}
 if(!pf.observationPresets20261113){for(const item of Object.values(observationPresets).flat())if(!pf.library.daily.includes(item))pf.library.daily.push(item);pf.observationPresets20261113=true;pfSave()}
}
addObservationPresets();render();
/* 考试态度和检查习惯：一次性增加可选观察，不自动选择。 */
const examHabitPresets=['考试中注意力不够集中','考试期间容易东张西望','考试提前答完后画画','考试答完后没有认真检查','考试中检查不够细致','考试结束前较少复查计算与答案','考试期间能够保持专注','考试结束前主动检查答题与计算'];
if(!db.examHabitPresets20261114){for(const t of examHabitPresets)if(!Object.values(db.tags).flat().includes(t))db.tags['学习态度与纪律'].push(t);db.examHabitPresets20261114=true;save()}
if(!pf.examHabitPresets20261114){for(const t of examHabitPresets)if(!pf.library.daily.includes(t))pf.library.daily.push(t);pf.examHabitPresets20261114=true;pfSave()}
render();
