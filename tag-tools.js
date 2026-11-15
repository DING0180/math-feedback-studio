/* Tag library tools: preserves existing student selections when a library item is removed. */
let tagSpeech = null;
function tagVoice(target, button, multi=false){
  const Rec=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Rec){target.focus();alert('当前浏览器不支持网页语音识别。请在输入框中按 Win + H 使用系统语音输入，或使用支持语音识别的浏览器。');return}
  if(tagSpeech){tagSpeech.stop();return}
  if(!confirm('浏览器语音识别可能需要联网，并将语音发送到浏览器的识别服务。确认开始语音输入吗？'))return;
  const rec=new Rec(); tagSpeech=rec; rec.lang='zh-CN'; rec.continuous=false; rec.interimResults=false;
  button.textContent='停止听写';
  rec.onresult=e=>{const text=Array.from(e.results).map(r=>r[0].transcript).join('').trim();if(!text)return; target.value+=(target.value?(multi?'\n':'，'):'')+text;target.dispatchEvent(new Event('input',{bubbles:true}));target.focus()};
  rec.onerror=e=>{const msg={'not-allowed':'请允许麦克风权限','service-not-allowed':'语音识别服务不可用','network':'语音识别需要网络','no-speech':'没有检测到语音','audio-capture':'未找到麦克风'};alert((msg[e.error]||'语音识别未完成')+'。请点击备注输入框，然后按 Win + H 使用 Windows 语音输入；Windows 听写可能需要网络和麦克风权限。');target.focus()};
  rec.onend=()=>{tagSpeech=null;button.textContent='🎙 语音输入'};
  try{rec.start();toast('正在听写，请开始说话')}catch(e){tagSpeech=null;button.textContent='🎙 语音输入';alert('无法启动语音识别，可使用 Win + H：'+e.message)}
}
function tagLibrary(kind,category){if(kind==='pf-daily')return pf.library.daily;if(kind==='pf-action')return pf.library.action;if(kind==='measures')return db.measures;return db.tags[category]||[]}
function tagStore(kind){if(kind.startsWith('pf-'))pfSave();else save()}
function tagBulk(kind,category){
  const cats=kind==='tags'?`<label class="field">标签分类<select id="bulk-category">${Object.keys(db.tags).map(c=>`<option ${c===category?'selected':''}>${E(c)}</option>`).join('')}</select></label>`:'';
  modal('批量添加标签',`${cats}<p class="hint">每行一条；语音输入一次添加一行，也可以粘贴多行。重复标签会跳过。添加前可修改识别文字。</p><div class="row"><button type="button" class="smallbtn" id="bulk-voice">🎙 语音输入</button><span class="hint">也可以在输入框按 Win + H</span></div><textarea id="bulk-text" rows="9" placeholder="每行一条，例如：&#10;作业认真，订正及时&#10;课堂上积极提问"></textarea>`,'添加到标签库',d=>{let text=d.querySelector('#bulk-text').value,lines=text.split(/\r?\n|[；;]/).map(x=>x.trim()).filter(Boolean);if(!lines.length){alert('请先输入至少一条标签。');return}let cat=d.querySelector('#bulk-category')?.value,lib=tagLibrary(kind,cat),count=0,skip=0;for(const t of lines){const duplicate=kind==='tags'?Object.values(db.tags).some(arr=>arr.includes(t)):lib.includes(t);if(duplicate){skip++;continue}lib.push(t);count++}tagStore(kind);d.remove();render();toast(`已添加 ${count} 条，跳过重复 ${skip} 条`)});
  let d=document.querySelector('.modalback:last-child'),btn=d.querySelector('#bulk-voice');btn.onclick=()=>tagVoice(d.querySelector('#bulk-text'),btn,true);
}
function tagManage(kind,category){
 const cats=kind==='tags'?`<label class="field">标签分类<select id="manage-category">${Object.keys(db.tags).map(c=>`<option ${c===category?'selected':''}>${E(c)}</option>`).join('')}</select></label>`:'';
 let list=tagLibrary(kind,category);
 modal('批量删除标签',`${cats}<p class="hint">勾选要从当前标签库删除的内容。学生已经选择的标签和历史评价会保留；如需移除某位学生的已选内容，请在该生页面操作。</p><div class="row"><button type="button" class="smallbtn" id="tag-select-all">全选</button><button type="button" class="smallbtn" id="tag-select-none">取消全选</button><span class="hint" id="tag-selected-count">已选 0 条</span></div><div id="tag-delete-list" class="tag-delete-list">${list.map((v,i)=>`<label class="checkline"><input type="checkbox" data-del-tag="${i}"><span>${E(v)}</span></label>`).join('')||'<p class="hint">此分类暂无标签。</p>'}</div>`,'删除选中标签',d=>{let chosen=[...d.querySelectorAll('[data-del-tag]:checked')].map(x=>+x.dataset.delTag),cat=d.querySelector('#manage-category')?.value,lib=tagLibrary(kind,cat);if(!chosen.length){alert('请先勾选要删除的标签。');return}if(!confirm(`确定从标签库删除选中的 ${chosen.length} 条？学生已有选择和历史记录将保留。`))return;for(let i of chosen.sort((a,b)=>b-a))lib.splice(i,1);tagStore(kind);d.remove();render();toast(`已从标签库删除 ${chosen.length} 条`)});
 let d=document.querySelector('.modalback:last-child'), update=()=>{d.querySelector('#tag-selected-count').textContent=`已选 ${d.querySelectorAll('[data-del-tag]:checked').length} 条`};d.querySelector('#tag-select-all').onclick=()=>{d.querySelectorAll('[data-del-tag]').forEach(x=>x.checked=true);update()};d.querySelector('#tag-select-none').onclick=()=>{d.querySelectorAll('[data-del-tag]').forEach(x=>x.checked=false);update()};d.addEventListener('change',update);let sel=d.querySelector('#manage-category');if(sel)sel.onchange=()=>{let v=sel.value;d.remove();tagManage(kind,v)};
}
function tagControls(input,kind,category){if(!input)return;const row=input.parentElement;let voice=document.createElement('button');voice.type='button';voice.className='smallbtn';voice.textContent='🎙 语音输入';voice.onclick=()=>tagVoice(input,voice);row.append(voice);for(let [label,fn] of [['批量添加',()=>tagBulk(kind,category?.())],['批量删除',()=>tagManage(kind,category?.())]]){let b=document.createElement('button');b.type='button';b.className='smallbtn';b.textContent=label;b.onclick=fn;row.append(b)}}
const tagPriorBind=bind;bind=function(){tagPriorBind();if(page==='tags')tagControls($('#newTag'),'tags',()=>$('#tagCat').value);if(page==='measures')tagControls($('#newMeasure'),'measures');if(page==='platform'){for(const type of ['daily','action']){let input=$(`#pf-new-${type}`);if(!input)continue;let row=input.parentElement,voice=document.createElement('button');voice.className='smallbtn';voice.textContent='🎙 语音输入';voice.onclick=()=>tagVoice(input,voice);row.append(voice);row.querySelector(`[data-pf-bulk="${type}"]`).onclick=()=>tagBulk(`pf-${type}`);let del=document.createElement('button');del.className='smallbtn';del.textContent='批量删除';del.onclick=()=>tagManage(`pf-${type}`);row.append(del)}}};
render();

