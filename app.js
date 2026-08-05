const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const pad=n=>String(n).padStart(2,'0');
const localDateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseLocal=(date,time='00:00')=>new Date(`${date}T${time}:00`);
const addDays=(date,n)=>{const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+n);return localDateKey(d)};
const clone=x=>JSON.parse(JSON.stringify(x));

const defaults={version:8,tasks:[],logs:{},weeklyFood:{},xp:0,level:1,streak:0,inventory:['旅人の服','ひよこスライム'],danger:[],lost:[],weights:[],goals:{},equipment:['mat','dumbbell'],nightShifts:[],vacation:null,gender:'male',lastClosed:null,firstClosedDate:null,closedCount:0,events:[],debugNow:null};
let loaded={};try{loaded=JSON.parse(localStorage.getItem('questlife')||'{}')}catch{}
let state=Object.assign({},defaults,loaded,{version:9});
state.equipment??=['mat','dumbbell'];
// v6.9: old food labels are migrated to the final three choices.
for(const k of Object.keys(state.weeklyFood||{})){if(state.weeklyFood[k]==='good')state.weeklyFood[k]='restrained';if(state.weeklyFood[k]==='over')state.weeklyFood[k]='overeat';}
state.notificationSettings??={enabled:false,morning:'09:00',night:'21:00',lastMorning:null,lastNight:null};
['tasks','logs','weeklyFood','inventory','danger','lost','weights','goals','nightShifts','events'].forEach(k=>{if(!state[k])state[k]=clone(defaults[k])});

function now(){return state.debugNow?new Date(state.debugNow):new Date()}
function currentCalendarKey(){return localDateKey(now())}
function nightShiftWindow(n){
  const start=parseLocal(n.date,n.start||'22:00');
  let end=parseLocal(n.date,n.end||'07:00');
  if(end<=start)end.setDate(end.getDate()+1);
  const endKey=localDateKey(end);
  let deadline=parseLocal(endKey,n.deadline||'12:00');
  if(deadline<end)deadline=new Date(end);
  return{start,end,deadline};
}
function activeNightShift(at=now()){
  const matches=state.nightShifts.map(n=>({n,w:nightShiftWindow(n)})).filter(x=>at>=x.w.start&&at<x.w.deadline).sort((a,b)=>b.w.start-a.w.start);
  return matches[0]?.n||null;
}
function activityKey(){return activeNightShift()?.date||currentCalendarKey()}
function deadlineInfo(){const n=activeNightShift();if(n){const d=nightShiftWindow(n).deadline;return{date:d,label:`夜勤締切 ${localDateKey(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`}}const d=parseLocal(activityKey(),'23:59');return{date:d,label:'締切 24:00'}}
function isVacationDate(date=currentCalendarKey()){return !!(state.vacation&&date>=state.vacation.start&&date<=state.vacation.end)}
function mode(){if(isVacationDate())return'vacation';if(activeNightShift())return'night';return'normal'}
function dayLog(key=activityKey()){
  state.logs[key]??={tasks:{},checkin:{condition:'普通',motivation:'普通',soreness:'なし',back:'痛くない',duration:30},workoutPlan:[],exerciseChecks:{},workout:false,workoutRpe:null,loadAdjustment:null,closed:false,closedAt:null,result:null};
  const l=state.logs[key];l.tasks??={};l.checkin??={condition:'普通',motivation:'普通',soreness:'なし',back:'痛くない',duration:30};l.workoutPlan??=[];l.exerciseChecks??={};l.loadAdjustment??=null;return l;
}
function save(render=true){localStorage.setItem('questlife',JSON.stringify(state));if(render)renderAll()}
function addEvent(type,text,key=activityKey()){state.events.unshift({at:now().toISOString(),key,type,text});state.events=state.events.slice(0,120)}
function esc(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

const EX={
 warm:{id:'warm',name:'関節をほぐすウォームアップ',part:'全身',effect:'体温を上げて動きやすくする',base:'4分',minutes:4,url:'https://www.youtube.com/results?search_query=初心者+全身+ウォームアップ+静か',tags:['warm','safe']},
 squat:{id:'squat',name:'椅子スクワット',part:'太もも・お尻',effect:'下半身を鍛え、日常の消費量を支える',base:'10回×2',minutes:5,url:'https://www.youtube.com/results?search_query=椅子スクワット+初心者+正しいフォーム',tags:['lower']},
 goblet:{id:'goblet',name:'ゴブレットスクワット',part:'太もも・お尻',effect:'下半身の筋力と全身の消費量を高める',base:'8回×2',minutes:6,url:'https://www.youtube.com/results?search_query=ゴブレットスクワット+初心者+フォーム',tags:['lower','dumbbell']},
 bridge:{id:'bridge',name:'ヒップリフト',part:'お尻・体幹',effect:'臀部を鍛え、腰を支える力を高める',base:'12回×2',minutes:5,url:'https://www.youtube.com/results?search_query=ヒップリフト+初心者+腰を反らさない',tags:['lower','core','backsafe']},
 sideleg:{id:'sideleg',name:'横向き脚上げ',part:'お尻の横・太もも',effect:'骨盤周囲を安定させる',base:'左右10回×2',minutes:5,url:'https://www.youtube.com/results?search_query=横向き脚上げ+初心者+フォーム',tags:['lower','backsafe']},
 floorpress:{id:'floorpress',name:'ダンベルフロアプレス',part:'胸・二の腕',effect:'上半身を引き締め、押す力を鍛える',base:'10回×2',minutes:6,url:'https://www.youtube.com/results?search_query=ダンベルフロアプレス+初心者+フォーム',tags:['upper','dumbbell','backsafe']},
 row:{id:'row',name:'片手ダンベルロー',part:'背中・腕',effect:'背中を鍛え、姿勢を支える',base:'左右8回×2',minutes:6,url:'https://www.youtube.com/results?search_query=片手ダンベルロー+腰に優しい+初心者',tags:['upper','dumbbell']},
 curl:{id:'curl',name:'ダンベルカール',part:'二の腕前面',effect:'腕の筋力と見た目を整える',base:'10回×2',minutes:5,url:'https://www.youtube.com/results?search_query=ダンベルカール+初心者+フォーム',tags:['upper','dumbbell','backsafe']},
 triceps:{id:'triceps',name:'仰向けトライセプスエクステンション',part:'二の腕後面',effect:'二の腕を重点的に鍛える',base:'8回×2',minutes:5,url:'https://www.youtube.com/results?search_query=ライイング+トライセプスエクステンション+初心者',tags:['upper','dumbbell','backsafe']},
 deadbug:{id:'deadbug',name:'デッドバグ',part:'お腹・体幹',effect:'腰を反らさず腹部の安定性を高める',base:'左右6回×2',minutes:5,url:'https://www.youtube.com/results?search_query=デッドバグ+初心者+腰を反らさない',tags:['core','backsafe']},
 birddog:{id:'birddog',name:'バードドッグ',part:'背中・体幹',effect:'腰回りの安定性とバランスを高める',base:'左右6回×2',minutes:5,url:'https://www.youtube.com/results?search_query=バードドッグ+初心者+フォーム',tags:['core','backsafe']},
 march:{id:'march',name:'静かな室内足踏み',part:'全身・有酸素',effect:'飛び跳ねずに消費量と持久力を高める',base:'5分',minutes:5,url:'https://www.youtube.com/results?search_query=静か+室内+有酸素+足踏み',tags:['cardio','safe']},
 stretch:{id:'stretch',name:'全身リカバリーストレッチ',part:'全身',effect:'疲労を整え、可動域を保つ',base:'10分',minutes:10,url:'https://www.youtube.com/results?search_query=初心者+全身+ストレッチ+10分',tags:['recovery','safe']},
 backcare:{id:'backcare',name:'腰まわり回復ルーティン',part:'股関節・体幹',effect:'腰に負担をかけにくい範囲で周辺を整える',base:'8分',minutes:8,url:'https://www.youtube.com/results?search_query=腰痛+やさしい+ストレッチ+初心者',tags:['recovery','backsafe']}
};
const WEEK=[
 {short:'下半身',focus:'lower',label:'下半身・お尻'},
 {short:'上半身',focus:'upper',label:'上半身・二の腕'},
 {short:'回復',focus:'recovery',label:'回復ストレッチ'},
 {short:'下半身',focus:'lowercore',label:'下半身・体幹'},
 {short:'上＋有酸素',focus:'uppercardio',label:'上半身・静かな有酸素'},
 {short:'全身',focus:'full',label:'全身トレーニング'},
 {short:'回復',focus:'recovery',label:'回復ストレッチ'}
];
function activityDate(){return parseLocal(activityKey(),'12:00')}
function planOfDate(date){const d=parseLocal(date,'12:00');return WEEK[(d.getDay()+6)%7]}
function recentRpe(){return Object.values(state.logs).filter(l=>l.workout&&Number.isFinite(+l.workoutRpe)).sort((a,b)=>(a.closedAt||'').localeCompare(b.closedAt||'')).slice(-3).map(l=>+l.workoutRpe)}
function progression(){return rpeAdjustmentInfo().delta}

function weekStartKey(date=activityKey()){
  const d=parseLocal(date,'12:00');
  const diff=(d.getDay()+6)%7;
  d.setDate(d.getDate()-diff);
  return localDateKey(d);
}
function rpeAdjustmentInfo(){
  const r=recentRpe();
  if(r.length<2)return{delta:0,avg:null,label:'標準',reason:`過去のきつさ記録が${r.length}回のため、まだ自動調整しません`};
  const avg=r.reduce((a,b)=>a+b,0)/r.length;
  if(avg<=5)return{delta:1,avg,label:'少し増加',reason:`直近${r.length}回の平均が${avg.toFixed(1)}/10で余裕があったため`};
  if(avg>=8)return{delta:-1,avg,label:'少し軽減',reason:`直近${r.length}回の平均が${avg.toFixed(1)}/10で負荷が高かったため`};
  return{delta:0,avg,label:'標準',reason:`直近${r.length}回の平均が${avg.toFixed(1)}/10で適正範囲のため`};
}

function adjustedDose(base,delta){
  if(base.includes('分')){const n=parseInt(base);return `${Math.max(2,n+delta*2)}分`}
  const m=base.match(/(左右)?(\d+)回×(\d+)/);if(!m)return base;return `${m[1]||''}${Math.max(4,+m[2]+delta*2)}回×${Math.max(1,+m[3]+(delta>0?1:0))}`
}
function chooseWorkout(checkin){
  const {condition,motivation,soreness,back,duration}=checkin;const focus=planOfDate(activityKey()).focus;
  const recovery=condition==='悪い'||back==='痛みがある'||soreness==='全身';
  let ids;
  if(recovery)ids=['stretch','backcare','deadbug'];
  else if(focus==='lower')ids=['warm','goblet','bridge','sideleg','march'];
  else if(focus==='upper')ids=['warm','floorpress','row','curl','triceps'];
  else if(focus==='lowercore')ids=['warm','squat','bridge','deadbug','birddog'];
  else if(focus==='uppercardio')ids=['warm','floorpress','row','triceps','march'];
  else if(focus==='full')ids=['warm','goblet','floorpress','bridge','deadbug','march'];
  else ids=['stretch','backcare','march'];
  const equipment=state.equipment||[];
  ids=ids.filter(id=>!EX[id].tags.includes('dumbbell')||equipment.includes('dumbbell'));
  if(soreness==='上半身')ids=ids.filter(id=>!EX[id].tags.includes('upper'));
  if(soreness==='下半身')ids=ids.filter(id=>!EX[id].tags.includes('lower'));
  if(back==='少し違和感')ids=ids.filter(id=>!['goblet','row'].includes(id));
  if(back==='痛みがある')ids=ids.filter(id=>EX[id].tags.includes('backsafe')||EX[id].tags.includes('recovery')||EX[id].tags.includes('safe'));
  if(!ids.length)ids=['stretch','backcare'];
  const rpeInfo=rpeAdjustmentInfo();const motivationDelta=motivation==='低い'?-1:0;const delta=motivationDelta+rpeInfo.delta;
  let total=0,out=[];
  for(const id of ids){const e=EX[id];if(total+e.minutes>duration&&out.length>=1)continue;out.push({...e,dose:adjustedDose(e.base,delta),originalDose:e.base});total+=e.minutes}
  if(out.length===1&&duration>=10&&out[0].id!=='stretch')out.push({...EX.stretch,dose:'5分',minutes:5});
  return out;
}

function renderAll(){renderMode();renderHero();renderTasks();renderCheckin();renderWeeklyPlan();renderWorkout();renderWeeklyFood();renderInventory();renderWeights();renderHomeWeight();renderSchedule();renderDebug();updateBattle();renderDashboard();renderHistory();renderNotificationSettings();renderEquipment()}
function renderMode(){const m=mode();document.body.classList.toggle('vacation',m==='vacation');$('#modeLabel').textContent=m==='vacation'?'🏝️ バケーション':m==='night'?'🌙 夜勤日':'通常日';$('#deadlineLabel').textContent=`活動日 ${activityKey()} / ${deadlineInfo().label}`;$('#checkinCard').style.display=m==='vacation'?'none':'';$('#finishDay').textContent=m==='vacation'?'今日の旅の記録を残す':'今日を終了する'}
function renderHero(){const next=state.level*100;$('#level').textContent=state.level;$('#xp').textContent=state.xp;$('#xpNext').textContent=next;$('#xpBar').style.width=Math.min(100,state.xp/next*100)+'%';$('#streakCount').textContent=state.streak;$('#avatar').textContent=state.gender==='female'?'👩':'🧑';$('#heroName').textContent=state.level>=10?'王国の守護者':state.level>=5?'ギルドの剣士':'名もなき旅人'}
function renderTasks(){const log=dayLog(),wrap=$('#todayTasks'),edit=$('#taskEditor');wrap.innerHTML='';edit.innerHTML='';if(mode()==='vacation'){wrap.innerHTML='<p class="muted">バケーション中は通常タスクを休止しています。</p>';$('#taskProgressText').textContent='一時停止';return}state.tasks.forEach((t,i)=>{const row=document.createElement('div');row.className='task '+(log.tasks[t.id]?'done':'');row.innerHTML=`<input type="checkbox" ${log.tasks[t.id]?'checked':''} ${log.closed?'disabled':''}><div class="task-main"><strong>${esc(t.name)}</strong>${t.minutes?`<div class="timer">⏱ ${t.minutes}分タイマー</div>`:''}</div>${t.minutes?'<button class="small-btn">開始</button>':''}`;row.querySelector('input').onchange=e=>{log.tasks[t.id]=e.target.checked;save()};if(t.minutes){const b=row.querySelector('button');b.disabled=log.closed;b.onclick=()=>startTimer(t,b)}wrap.appendChild(row);const er=document.createElement('div');er.className='editor-row';er.innerHTML=`<span>${esc(t.name)}${t.minutes?`（${t.minutes}分）`:''}</span><button class="small-btn">削除</button>`;er.querySelector('button').onclick=()=>{state.tasks.splice(i,1);save()};edit.appendChild(er)});const done=state.tasks.filter(t=>log.tasks[t.id]).length;$('#taskProgressText').textContent=`${done}/${state.tasks.length}${log.closed?'（確定済み）':''}`;if($('#taskCountLabel'))$('#taskCountLabel').textContent=`${state.tasks.length}/5`}
function startTimer(t,btn){const storageKey=`timer_${activityKey()}_${t.id}`;let end=+(localStorage.getItem(storageKey)||0);if(!end){end=Date.now()+t.minutes*60000;localStorage.setItem(storageKey,String(end))}btn.disabled=true;const tick=()=>{const sec=Math.max(0,Math.ceil((end-Date.now())/1000)),m=Math.floor(sec/60),s=sec%60;btn.textContent=`${m}:${pad(s)}`;if(sec<=0){localStorage.removeItem(storageKey);dayLog().tasks[t.id]=true;addEvent('timer',`${t.name} のタイマーを完了`);save();alert(`${t.name} を達成しました！`);return}setTimeout(tick,1000)};tick()}
function renderCheckin(){const l=dayLog(),c=l.checkin;$('#condition').value=c.condition||'普通';$('#motivation').value=c.motivation||'普通';$('#soreness').value=c.soreness||'なし';$('#back').value=c.back||'痛くない';$('#duration').value=String(c.duration||30);$('#dayTheme').textContent=planOfDate(activityKey()).label}
function readCheckin(){return{condition:$('#condition').value,motivation:$('#motivation').value,soreness:$('#soreness').value,back:$('#back').value,duration:+$('#duration').value}}
function buildWorkout(){const l=dayLog();l.checkin=readCheckin();const info=rpeAdjustmentInfo();l.loadAdjustment={...info,motivationDelta:l.checkin.motivation==='低い'?-1:0,generatedAt:now().toISOString()};l.workoutPlan=chooseWorkout(l.checkin);l.exerciseChecks={};addEvent('plan',`${planOfDate(activityKey()).label}メニューを生成（負荷：${info.label}）`);save()}
function renderWeeklyPlan(){const wrap=$('#weeklyPlan');if(!wrap)return;wrap.innerHTML='';const key=activityKey();for(let i=0;i<7;i++){const d=addDays(key,i-(activityDate().getDay()+6)%7),p=planOfDate(d),el=document.createElement('div');el.className='week-day '+(d===key?'today':'');el.innerHTML=`<b>${['月','火','水','木','金','土','日'][i]}</b><span>${p.short}</span>`;wrap.appendChild(el)}$('#weeklyFocus').textContent=planOfDate(key).label}
function renderWorkoutRecommendation(){
  const l=dayLog(),check=l.checkin||readCheckin(),plan=planOfDate(activityKey());
  const info=l.loadAdjustment||rpeAdjustmentInfo();
  const motivationDelta=check.motivation==='低い'?-1:0;
  const totalDelta=(info.delta||0)+(info.motivationDelta??motivationDelta);
  const plannedMinutes=l.workoutPlan.length?l.workoutPlan.reduce((a,x)=>a+(x.minutes||0),0):(+check.duration||30);
  let intensity=plan.focus==='recovery'?'回復':totalDelta>0?'高め':totalDelta<0?'軽め':'標準';
  if(check.condition==='悪い'||check.back==='痛みがある')intensity='安全優先';
  const title=plan.focus==='recovery'?'回復とコンディショニング':plan.label;
  let comment='';
  if(check.back==='痛みがある')comment='腰への負担を避け、痛みを悪化させない回復メニューを優先します。鋭い痛みがある場合は中止してください。';
  else if(check.condition==='悪い')comment='今日は体調を優先します。短時間の軽い運動かストレッチに切り替えましょう。';
  else if(plan.focus==='recovery')comment='今日は回復日です。疲労を抜き、次の高負荷日に備えましょう。';
  else if(check.soreness!=='なし')comment=`${check.soreness}の筋肉痛を避けながら、動ける部位を中心に進めます。`;
  else if(totalDelta>0)comment='直近の記録に余裕があるため、今日は少しだけ強度を上げます。フォームを崩さない範囲で進めましょう。';
  else if(totalDelta<0)comment='直近の負荷が高めだったため、今日は強度を下げて継続を優先します。';
  else comment='今日は標準強度です。決めた時間を丁寧にやり切ることを優先しましょう。';
  if($('#recommendTitle'))$('#recommendTitle').textContent=title;
  if($('#recommendIntensity')){$('#recommendIntensity').textContent=intensity;$('#recommendIntensity').dataset.level=intensity;}
  if($('#recommendMinutes'))$('#recommendMinutes').textContent=`${Math.max(5,Math.min(60,plannedMinutes))}分`;
  if($('#recommendFocus'))$('#recommendFocus').textContent=plan.label;
  if($('#aiWorkoutComment'))$('#aiWorkoutComment').textContent=comment;
}
function renderWorkout(){const l=dayLog(),w=$('#workoutPlan'),adj=$('#loadAdjustment');w.innerHTML='';const info=l.loadAdjustment||rpeAdjustmentInfo();const totalDelta=(info.delta||0)+(info.motivationDelta||0);if(adj){adj.className='load-adjustment '+(totalDelta>0?'up':totalDelta<0?'down':'standard');adj.textContent=`負荷調整：${totalDelta>0?'少し増加':totalDelta<0?'少し軽減':'標準'}｜${info.reason||'現在の記録から判定'}${info.motivationDelta<0?'＋やる気「低い」のため追加で軽減':''}`;}if(!l.workoutPlan.length){w.innerHTML=''}else{const mins=l.workoutPlan.reduce((a,x)=>a+(x.minutes||0),0);const summary=document.createElement('div');summary.className='workout-summary';summary.textContent=`${planOfDate(activityKey()).label}／目安 ${mins}分／${l.checkin.back==='痛くない'?'通常調整':'腰の状態に合わせて調整済み'}`;w.appendChild(summary);l.workoutPlan.forEach((x,i)=>{const e=document.createElement('div');e.className='exercise '+(l.exerciseChecks[i]?'done':'');const changed=x.originalDose&&x.originalDose!==x.dose?`<span class="dose-change">標準 ${esc(x.originalDose)} → 調整後 ${esc(x.dose)}</span>`:'';e.innerHTML=`<input class="exercise-check" type="checkbox" ${l.exerciseChecks[i]?'checked':''} ${l.closed?'disabled':''}><h3>${esc(x.name)}</h3><div class="exercise-meta"><span>${esc(x.part)}</span><span>${esc(x.dose||x.base)}${changed}</span></div><p><b>効果：</b>${esc(x.effect)}</p><a href="${x.url}" target="_blank" rel="noreferrer">フォーム動画を探す ↗</a>`;e.querySelector('input').onchange=ev=>{l.exerciseChecks[i]=ev.target.checked;save()};w.appendChild(e)})}$('#workoutStatus').textContent=l.workout?'完了':l.workoutPlan.length?'提案済み':'未生成';$('#workoutRpe').value=String(l.workoutRpe||6);$('#completeWorkout').disabled=!l.workoutPlan.length||l.workout||l.closed;renderWorkoutRecommendation()}

function foodLabel(value){return value==='normal'?'普通':value==='overeat'?'食べ過ぎ':value==='restrained'?'抑えた':'未入力'}
function foodAiComment(value){
  if(value==='restrained')return '今週は食事を抑えられました。無理な制限を続けるより、再現できる範囲を来週も維持しましょう。';
  if(value==='over')return '運動を罰として増やす必要はありません。来週は飲み物か間食のどちらか一つだけ整えてみましょう。';
  return '大きく変える必要はありません。来週も無理なく続け、体重の傾向と合わせて確認しましょう。';
}
function previousWeekKey(key=weekStartKey()){return addDays(key,-7)}
function renderWeeklyFood(){
  const key=weekStartKey(),previous=previousWeekKey(key);
  const value=state.weeklyFood[key]||'none';
  $('#foodWeekLabel').textContent=`${key.slice(5).replace('-','/')}〜`;
  $('#weeklyFoodCheck').value=value;
  $('#foodCurrentSummary').textContent=foodLabel(value);
  $('#foodPreviousSummary').textContent=foodLabel(state.weeklyFood[previous]||'none');
  $('#weeklyFoodStatus').textContent=value==='none'?'未入力でもペナルティはありません。':'週次アドバイスの補助として保存されています。';
}
let selectedFoodHistoryKey=null;
function renderFoodHistory(){
  const wrap=$('#foodHistoryList');if(!wrap)return;wrap.innerHTML='';
  const current=weekStartKey(),rows=[];
  for(let i=0;i<12;i++){const key=addDays(current,-7*i),value=state.weeklyFood[key];if(value&&value!=='none')rows.push({key,value})}
  if(!rows.length){wrap.innerHTML='<p class="muted">過去の入力はまだありません。</p>';return}
  rows.forEach(({key,value})=>{const b=document.createElement('button');b.type='button';b.className='food-history-row';b.innerHTML=`<span>${key}〜${addDays(key,6).slice(5).replace('-','/')}</span><b>${foodLabel(value)} ›</b>`;b.onclick=()=>openFoodHistoryEditor(key);wrap.appendChild(b)})
}
function openFoodHistoryEditor(key){selectedFoodHistoryKey=key;const value=state.weeklyFood[key]||'normal';$('#foodHistoryEditor').hidden=false;$('#foodHistoryEditorTitle').textContent=`${key}〜${addDays(key,6)}`;$('#foodHistoryEditValue').value=value;$('#foodHistoryAiComment').textContent=foodAiComment(value)}
function completion(log=dayLog()){const done=state.tasks.filter(t=>log.tasks[t.id]).length;return{done,tasksAll:state.tasks.length>0&&done===state.tasks.length,all:state.tasks.length>0&&done===state.tasks.length&&log.workout}}
function updateBattle(){const log=dayLog(),c=completion(log),td=state.tasks.length?c.done/state.tasks.length:0;const chance=Math.round(20+td*50+(log.workout?25:0));$('#battleChance').textContent=`勝率 ${Math.max(5,Math.min(100,chance))}%`;$('#battlePreview').textContent=log.closed?'この活動日は確定済みです。':chance>=80?'勝機は十分です。全達成でレア報酬が狙えます。':chance>=50?'勝負になります。あと一歩進めましょう。':'このままでは仲間が危険です。締切までに立て直してください。'}
function gainXp(n){state.xp+=n;while(state.xp>=state.level*100){state.xp-=state.level*100;state.level++}}
function showResult(icon,title,body){$('#resultVisual').textContent=icon;$('#resultTitle').textContent=title;$('#resultBody').style.whiteSpace='pre-line';$('#resultBody').textContent=body;$('#resultDialog').showModal()}
function closeDay(){const key=activityKey(),log=dayLog(key);if(log.closed)return alert('この活動日はすでに終了しています。');if(mode()==='vacation'){log.closed=true;log.closedAt=now().toISOString();const reward='南国の小竜';if(!state.inventory.includes(reward))state.inventory.push(reward);addEvent('vacation','旅行記録を保存し、通常記録を一時停止',key);showResult('🏝️','旅の記録','穏やかな一日を記録しました。旅行専用モンスター「南国の小竜」が加わりました。');save();return}const c=completion(log),messages=[];const oldDanger=state.danger.filter(x=>x.failedOn!==key);if(oldDanger.length){if(c.all){messages.push(`救出成功：「${oldDanger.map(x=>x.name).join('、')}」が帰還しました。`);addEvent('rescue',`${oldDanger.map(x=>x.name).join('、')}を救出`,key)}else{for(const x of oldDanger){state.inventory=state.inventory.filter(i=>i!==x.name);state.lost.push({...x,lostOn:key});addEvent('lost','離脱処理を実行',key)}messages.push(`救出作戦は失敗しました。仲間たちはボスとの戦いで帰らぬ者となりました。`)}state.danger=state.danger.filter(x=>x.failedOn===key)}if(c.all){state.streak++;gainXp(80);const rewards=['鉄の剣','革の盾','森のスライム','見習い竜'];const r=rewards[Math.floor(Math.random()*rewards.length)];if(!state.inventory.includes(r))state.inventory.push(r);messages.push(`完全達成。ボスを撃破し「${r}」を獲得しました。`);addEvent('win',`完全達成。${r}を獲得`,key);showResult('✓','今日の記録を確定しました',messages.join('\n'))}else{state.streak=0;const protectedPeriod=state.closedCount<7,candidates=state.inventory.filter(x=>x!=='旅人の服'&&!state.danger.some(d=>d.name===x));if(candidates.length&&!protectedPeriod){const target=candidates[Math.floor(Math.random()*candidates.length)];state.danger.push({name:target,failedOn:key});messages.push(`ボス戦で敗北。「${target}」が危機状態です。次の活動日を完全達成すれば救出できます。`);addEvent('danger',`${target}が危機状態`,key)}else if(protectedPeriod){messages.push('ボス戦で敗北しましたが、開始7活動日の保護期間が適用されました。');addEvent('protected','初心者保護が適用',key)}else messages.push('ボス戦で敗北しました。');showResult('!','今日の記録を確定しました',messages.join('\n'))}log.closed=true;log.closedAt=now().toISOString();log.result={all:c.all,done:c.done};state.lastClosed=key;state.firstClosedDate??=key;state.closedCount++;save()}
function renderInventory(){const inv=$('#inventory');inv.innerHTML='';state.inventory.forEach(x=>{const c=document.createElement('span');c.className='chip';c.textContent=(x.includes('竜')||x.includes('スライム')?'🐲 ':'🛡️ ')+x;inv.appendChild(c)});$('#dangerList').innerHTML=state.danger.length?state.danger.map(x=>`<span class="chip danger-chip">⚠️ ${esc(x.name)}：次の活動日に完全達成で救出</span>`).join(''):'危機にある仲間や装備はありません。';const count=state.inventory.length;$('#baseVisual').textContent=mode()==='vacation'?'🏝️':count>=8?'🏰':count>=5?'🏡':'⛺';$('#baseName').textContent=mode()==='vacation'?'南国の休息地':count>=8?'英雄ギルド城塞':count>=5?'冒険者ギルド':'旅人の野営地';$('#partyVisual').textContent=(state.gender==='female'?'👩':'🧑')+' '+state.inventory.filter(x=>x.includes('竜')||x.includes('スライム')).map(()=>'🐲').join(' ')}
let recordWeightPeriod=7;
function recordWeightValues(){
  if(recordWeightPeriod==='all')return state.weights.slice();
  const days=Number(recordWeightPeriod)||7,base=now(),vals=[];
  for(let i=days-1;i>=0;i--){const d=new Date(base);d.setDate(base.getDate()-i);const key=localDateKey(d);const rec=[...state.weights].reverse().find(w=>w.date===key);vals.push(rec?{date:key,value:rec.value}:{date:key,value:null})}
  return vals;
}
function renderWeights(){
  drawWeightLine($('#weightChart'),recordWeightValues(),false);
  const valid=state.weights.filter(x=>Number.isFinite(+x.value)),latest=valid.at(-1),prev=valid.at(-2);
  if($('#recordWeightLatest'))$('#recordWeightLatest').textContent=latest?`${(+latest.value).toFixed(1)}kg`:'未記録';
  if($('#recordWeightDelta'))$('#recordWeightDelta').textContent=latest&&prev?`前回比 ${latest.value-prev.value>0?'+':''}${(+latest.value-(+prev.value)).toFixed(1)}kg`:'前回比 —';
  if($('#recordWeightGoal'))$('#recordWeightGoal').textContent=latest&&Number.isFinite(+state.goals.goal)?`目標まで ${Math.abs((+latest.value)-(+state.goals.goal)).toFixed(1)}kg`:'目標まで —';
}
function drawWeightLine(canvas,vals,compact=false){
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const W=canvas.width,H=canvas.height;
  const valid=vals.filter(x=>x&&Number.isFinite(x.value));
  if(!valid.length){
    ctx.fillStyle='#8a93a6';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=compact?'22px sans-serif':'18px sans-serif';
    ctx.fillText('体重を記録するとグラフが表示されます',W/2,H/2);return;
  }
  const rawMin=Math.min(...valid.map(x=>x.value)),rawMax=Math.max(...valid.map(x=>x.value));
  const padValue=Math.max(.4,(rawMax-rawMin)*.22);
  const min=Math.floor((rawMin-padValue)*2)/2,max=Math.ceil((rawMax+padValue)*2)/2,range=Math.max(1,max-min);
  const left=compact?52:70,right=compact?14:24,top=compact?14:22,bottom=compact?34:48,w=W-left-right,h=H-top-bottom;
  const yTicks=compact?3:5;
  ctx.font=compact?'15px sans-serif':'15px sans-serif';ctx.textBaseline='middle';ctx.textAlign='right';
  for(let i=0;i<yTicks;i++){
    const ratio=i/(yTicks-1),y=top+ratio*h,value=max-ratio*range;
    ctx.strokeStyle=i===yTicks-1?'#c6ccd8':'#e8ebf2';ctx.lineWidth=i===yTicks-1?1.5:1;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(left+w,y);ctx.stroke();
    ctx.fillStyle='#788196';ctx.fillText(`${value.toFixed(1)}`,left-7,y);
  }
  if(!compact){ctx.save();ctx.translate(16,top+h/2);ctx.rotate(-Math.PI/2);ctx.fillStyle='#788196';ctx.textAlign='center';ctx.font='14px sans-serif';ctx.fillText('体重 (kg)',0,0);ctx.restore()}
  const points=vals.map((item,i)=>item&&Number.isFinite(item.value)?{x:left+i*(w/Math.max(1,vals.length-1)),y:top+h-(item.value-min)/range*h,item}:null);
  let drawing=false;
  ctx.strokeStyle='#5b66e8';ctx.lineWidth=compact?4:4;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  points.forEach(p=>{if(!p){drawing=false;return}if(!drawing){ctx.moveTo(p.x,p.y);drawing=true}else ctx.lineTo(p.x,p.y)});
  ctx.stroke();
  points.forEach((p,i)=>{if(!p)return;const latest=i===points.length-1;ctx.fillStyle=latest?'#5b66e8':'#fff';ctx.strokeStyle='#5b66e8';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,latest?(compact?6.5:6):(compact?5:5),0,Math.PI*2);ctx.fill();ctx.stroke()});
  ctx.fillStyle='#788196';ctx.textAlign='center';ctx.textBaseline='top';ctx.font=compact?'13px sans-serif':'14px sans-serif';
  const indexes=compact?[0,3,6]:Array.from({length:Math.min(6,vals.length)},(_,i)=>Math.round(i*(vals.length-1)/Math.max(1,Math.min(6,vals.length)-1)));
  [...new Set(indexes)].forEach(i=>{if(i<0||i>=vals.length)return;const d=vals[i]?.date||'';const label=d.slice(5).replace('-','/');ctx.fillText(label,left+i*(w/Math.max(1,vals.length-1)),top+h+8)});
  if(!compact){ctx.fillStyle='#788196';ctx.textAlign='center';ctx.font='13px sans-serif';ctx.fillText('日付',left+w/2,H-4)}
}
function renderHomeWeight(){
  const base=now(),vals=[];
  for(let i=6;i>=0;i--){const d=new Date(base);d.setDate(base.getDate()-i);const key=localDateKey(d);const rec=[...state.weights].reverse().find(w=>w.date===key);vals.push(rec?{date:key,value:rec.value}:{date:key,value:null})}
  drawWeightLine($('#homeWeightChart'),vals,true);
  const valid=vals.filter(x=>Number.isFinite(x.value)),latest=valid.at(-1),prev=valid.at(-2);
  const latestEl=$('#homeWeightLatest'),deltaEl=$('#homeWeightDelta'),goalEl=$('#homeWeightGoal');
  if(!latest){latestEl.textContent='未記録';if(deltaEl)deltaEl.textContent='前回比 —';if(goalEl)goalEl.textContent=state.goals.goal?`目標 ${state.goals.goal}kg`:'目標まで —';return}
  latestEl.textContent=`${latest.value.toFixed(1)}kg`;
  if(deltaEl)deltaEl.textContent=prev?`前回比 ${latest.value-prev.value>0?'+':''}${(latest.value-prev.value).toFixed(1)}kg`:'前回比 —';
  if(goalEl)goalEl.textContent=Number.isFinite(+state.goals.goal)?`目標まで ${Math.abs(latest.value-(+state.goals.goal)).toFixed(1)}kg`:'目標まで —';
}
function renderEquipment(){
  $$('input[name="equipment"]').forEach(x=>x.checked=(state.equipment||[]).includes(x.value));
  if($('#equipmentStatus'))$('#equipmentStatus').textContent=`選択中：${(state.equipment||[]).length}種類`;
}

function renderSchedule(){}
function renderDebug(){
  const debugNow=$('#debugNow'),debugSummary=$('#debugSummary'),eventLog=$('#eventLog');
  if(!debugNow&&!debugSummary&&!eventLog)return;
  if(state.debugNow&&debugNow)debugNow.value=state.debugNow.slice(0,16);
  const log=dayLog(),d=deadlineInfo();
  if(debugSummary)debugSummary.textContent=`現在判定：${now().toLocaleString('ja-JP')}\nカレンダー日：${currentCalendarKey()}\n活動日：${activityKey()}\nモード：${mode()}\n締切：${d.date.toLocaleString('ja-JP')}\n確定済み：${log.closed?'はい':'いいえ'}\n保護期間：${state.closedCount<7?`有効（${state.closedCount}/7活動日）`:'終了'}\n負荷補正：${progression()>0?'少し増加':progression()<0?'少し軽減':'標準'}`;
  if(eventLog){const visible=state.events.filter(e=>e.type!=='lost');eventLog.innerHTML=visible.length?visible.map(e=>`<div class="event-item"><b>${esc(e.key)}</b>［${esc(e.type)}］${esc(e.text)}</div>`).join(''):'まだ処理履歴はありません。'}
}



function renderDashboard(){
  const log=dayLog(), c=completion(log);
  const taskTotal=state.tasks.length;
  const taskRatio=taskTotal?c.done/taskTotal:0;
  const workoutRatio=log.workout?1:0;
  const percent=Math.round((taskRatio*.7+workoutRatio*.3)*100);
  if($('#dayPercent'))$('#dayPercent').textContent=`${percent}%`;
  const finishButton=$('#finishDay');if(finishButton){finishButton.hidden=false;finishButton.disabled=!!log.closed;finishButton.textContent=log.closed?'今日の記録は確定済み':'今日を終了する'}const finishCaption=$('#finishDayCaption');if(finishCaption)finishCaption.textContent=log.closed?'この活動日の記録は確定されています':'今日の記録を確定します';
  if($('#dayRing'))$('#dayRing').style.setProperty('--progress',`${percent}%`); if($('#guideProgressBar'))$('#guideProgressBar').style.width=`${percent}%`; if($('#homeStreakCount'))$('#homeStreakCount').textContent=state.game?.streak||0;
  if($('#todayHeading'))$('#todayHeading').textContent=log.closed?'今日の記録は確定済み':percent===100?'今日の予定を達成しました':percent>=50?'あと少しです':'今日を整える';
  if($('#todaySummary'))$('#todaySummary').textContent=log.closed?'今日の記録は確定済みです。ゆっくり休みましょう。':taskTotal===0?'最初に毎日のタスクを登録しましょう。':c.done===0?'まず1つだけ終わらせましょう。':c.done===taskTotal&&log.workout?'今日の予定はすべて完了しました。':`${c.done}/${taskTotal}件完了。次の一歩を進めましょう。`; if($('#guideLongMessage'))$('#guideLongMessage').textContent=log.closed?'今日もお疲れさまでした。次の活動日に備えて、今夜はしっかり休みましょう。':taskTotal===0?'毎日のタスクを登録すると、今日の案内を始められます。':c.done===taskTotal&&log.workout?'今日の予定はすべて完了しています。最後までやり切りましたね。':`今日はタスクが${c.done}/${taskTotal}件完了しています。焦らず、次の一つに集中しましょう。`; 
  if($('#todayWorkoutBadge'))$('#todayWorkoutBadge').textContent=log.workout?'完了':log.workoutPlan.length?'提案済み':'未生成';
  if($('#todayWorkoutSummary')){
    if(log.workout)$('#todayWorkoutSummary').textContent=`完了済み・きつさ ${log.workoutRpe||6}/10`;
    else if(log.workoutPlan.length){const mins=log.workoutPlan.reduce((a,x)=>a+(x.minutes||0),0);$('#todayWorkoutSummary').textContent=`${planOfDate(activityKey()).label}・目安${mins}分・${log.workoutPlan.length}種目`;}
    else $('#todayWorkoutSummary').textContent='状態を入力してメニューを作成してください。';
  }
}

function renderHistory(){
  if(!$('#historyList'))return;
  const today=activityKey(),dates=[];for(let i=-3;i<=3;i++)dates.push(addDays(today,i));
  let taskDone=0,taskPossible=0,workoutDays=0;
  const iconFor=(plan,date)=>{if(state.nightShifts.some(n=>n.date===date))return'🌙';if(plan.focus==='recovery')return'🌿';if(plan.focus==='full')return'✦';if(plan.focus.includes('lower')||plan.focus.includes('cardio'))return'🔥';return'💪'};
  $('#historyList').innerHTML=dates.map(date=>{
    const l=state.logs[date],done=l?state.tasks.filter(t=>l.tasks?.[t.id]).length:0,total=state.tasks.length;
    if(date<=today){taskDone+=done;taskPossible+=total;if(l?.workout)workoutDays++}
    const d=parseLocal(date,'12:00'),weekday=['日','月','火','水','木','金','土'][d.getDay()],isToday=date===today,isFuture=date>today,p=planOfDate(date),icon=iconFor(p,date);
    const foot=isToday?'今日':!isFuture&&l?.workout?'✓':'';
    return `<button type="button" class="week-plan-day ${isToday?'is-today':''} ${!isFuture&&l?.workout?'is-done':''}" data-plan-date="${date}"><span class="week-plan-date">${weekday}</span><span class="week-plan-icon" aria-label="${esc(p.label)}">${icon}</span><span class="week-plan-status">${foot}</span></button>`;
  }).join('');
  $$('#historyList [data-plan-date]').forEach(b=>b.onclick=()=>renderPlanDayDetail(b.dataset.planDate));
  $('#weeklyTaskRate').textContent=taskPossible?`${Math.round(taskDone/taskPossible*100)}%`:'0%';
  $('#weeklyWorkoutCount').textContent=`${workoutDays}日`;
  $('#weightRecordCount').textContent=`${state.weights.length}回`;
  $('#historyRange').textContent=`${dates[0].slice(5).replace('-','/')}〜${dates.at(-1).slice(5).replace('-','/')}`;
  renderPlanDayDetail(today);
  renderWorkoutHistory();
}
function renderPlanDayDetail(date){
  const box=$('#planDayDetail');if(!box)return;const p=planOfDate(date),l=state.logs[date],d=parseLocal(date,'12:00');
  const mins=l?.workoutPlan?.length?l.workoutPlan.reduce((a,x)=>a+(x.minutes||0),0):30;
  const status=date===activityKey()?'今日':date<activityKey()?(l?.workout?'完了':'未完了'):'予定';
  box.innerHTML=`<b>${d.getMonth()+1}/${d.getDate()}（${['日','月','火','水','木','金','土'][d.getDay()]}） ${esc(p.label)}</b><span>${status}・目安 ${mins}分${l?.workoutRpe?`・きつさ ${l.workoutRpe}/10`:''}</span>`;
}
function renderWorkoutHistory(){
  const wrap=$('#workoutHistoryList');if(!wrap)return;
  const rows=Object.entries(state.logs).filter(([,l])=>l?.workout).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,5);
  wrap.innerHTML=rows.length?rows.map(([date,l])=>{const mins=l.workoutPlan?.reduce((a,x)=>a+(x.minutes||0),0)||0;return `<div class="workout-history-row"><div><b>${date.slice(5).replace('-','/')}</b><span>${esc(planOfDate(date).label)}</span></div><strong>${mins}分</strong><small>きつさ ${l.workoutRpe||6}/10</small></div>`}).join(''):'';
}
function renderNotificationSettings(){
  if(!$('#morningTime'))return;
  const n=state.notificationSettings;
  $('#morningTime').value=n.morning||'09:00';$('#nightTime').value=n.night||'21:00';$('#notificationsEnabled').checked=!!n.enabled;
  const permission=('Notification'in window)?Notification.permission:'unsupported';
  $('#notificationStatus').textContent=permission==='granted'?'通知は許可されています。閉じた状態での確実な予約通知は、公開後にPush通知サーバーを追加して対応します。':permission==='denied'?'ブラウザ設定で通知が拒否されています。':'通知を有効にすると許可画面が表示されます。';
}
function sendNotification(title,body){if('Notification'in window&&Notification.permission==='granted')new Notification(title,{body,icon:'./icon-192.png'});else alert(`${title}\n${body}`)}
function checkInAppReminders(){
  const n=state.notificationSettings;if(!n?.enabled)return;
  const at=now(), key=currentCalendarKey(), hm=`${pad(at.getHours())}:${pad(at.getMinutes())}`;
  if(hm===n.morning&&n.lastMorning!==key){n.lastMorning=key;sendNotification('QuestLife','今日のタスクを確認して、最初の1つを始めましょう。');save(false)}
  if(hm===n.night&&n.lastNight!==key){n.lastNight=key;const c=completion();sendNotification('QuestLife',c.all?'今日はすべて完了しています。お疲れさまでした。':'締切前です。未完了の項目を確認しましょう。');save(false)}
}
setInterval(checkInAppReminders,30000);
function switchTab(id){$$('.bottom-nav button').forEach(x=>x.classList.toggle('active',x.dataset.tab===id));$$('.tab').forEach(x=>x.classList.toggle('active',x.id===id));window.scrollTo({top:0,behavior:'smooth'})}
$$('.bottom-nav button').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
$$('.jump-tab').forEach(b=>b.onclick=()=>switchTab(b.dataset.target));
$('#taskForm').onsubmit=e=>{e.preventDefault();if(state.tasks.length>=5)return alert('タスクは最大5個です。');state.tasks.push({id:crypto.randomUUID(),name:$('#taskName').value.trim(),minutes:+$('#taskMinutes').value||0});e.target.reset();$('#taskMinutes').value=0;save()};
$('#generateWorkout').onclick=buildWorkout;
$('#saveWeeklyFood').onclick=()=>{const key=weekStartKey(),value=$('#weeklyFoodCheck').value;if(value==='none')delete state.weeklyFood[key];else state.weeklyFood[key]=value;addEvent('food',`週次の食生活振り返りを保存（${foodLabel(value)}）`,key);save();};
$('#openFoodHistory').onclick=()=>{renderFoodHistory();$('#foodHistoryEditor').hidden=true;$('#foodHistoryDialog').showModal()};
$$('.close-food-history').forEach(b=>b.onclick=()=>$('#foodHistoryDialog').close());
$('#foodHistoryEditValue').onchange=()=>{$('#foodHistoryAiComment').textContent=foodAiComment($('#foodHistoryEditValue').value)};
$('#saveFoodHistoryEdit').onclick=()=>{if(!selectedFoodHistoryKey)return;state.weeklyFood[selectedFoodHistoryKey]=$('#foodHistoryEditValue').value;addEvent('food',`過去の食生活振り返りを更新（${foodLabel(state.weeklyFood[selectedFoodHistoryKey])}）`,selectedFoodHistoryKey);save();renderFoodHistory();openFoodHistoryEditor(selectedFoodHistoryKey)};
$('#completeWorkout').onclick=()=>{const log=dayLog();const checked=Object.values(log.exerciseChecks).filter(Boolean).length;if(checked<log.workoutPlan.length&&!confirm(`未チェックの種目が${log.workoutPlan.length-checked}件あります。完了にしますか？`))return;log.workout=true;log.workoutRpe=+$('#workoutRpe').value;gainXp(30);addEvent('workout',`運動を完了（きつさ ${log.workoutRpe}/10）`);save();alert('運動完了。きつさを保存しました。2回以上の記録から、次回メニューに具体的な増減として表示します。')};
$('#finishDay').onclick=()=>{if(dayLog().closed)return;if(confirm('今日を終了しますか？\n今日のタスクと運動記録を確定します。'))closeDay()};$('#closeResult').onclick=()=>$('#resultDialog').close();
$('#weightForm').onsubmit=e=>{e.preventDefault();const v=+$('#weightInput').value;state.weights.push({date:activityKey(),value:v});state.goals.current=v;$('#weightInput').value='';addEvent('weight',`体重 ${v}kg を記録`);save()};
$('#saveGoals').onclick=()=>{state.goals={...state.goals,current:+$('#currentWeight').value||null,goal:+$('#goalWeight').value||null,date:$('#goalDate').value};save();alert('目標を保存しました。')};
$('#saveEquipment').onclick=()=>{state.equipment=$$('input[name="equipment"]:checked').map(x=>x.value);save();$('#equipmentStatus').textContent='器具設定を保存しました。';};
$('#addNight').onclick=()=>{if(!$('#nightDate').value)return alert('夜勤日を選んでください。');state.nightShifts=state.nightShifts.filter(n=>n.date!==$('#nightDate').value);state.nightShifts.push({date:$('#nightDate').value,start:$('#nightStart').value,end:$('#nightEnd').value,deadline:$('#nightDeadline').value});state.nightShifts.sort((a,b)=>a.date.localeCompare(b.date));save()};
$('#saveVacation').onclick=()=>{if(!$('#vacStart').value||!$('#vacEnd').value)return alert('開始日と終了日を選んでください。');state.vacation={start:$('#vacStart').value,end:$('#vacEnd').value};save()};

$('#saveNotifications').onclick=async()=>{
  if($('#notificationsEnabled').checked&&'Notification'in window&&Notification.permission==='default')await Notification.requestPermission();
  state.notificationSettings={...state.notificationSettings,enabled:$('#notificationsEnabled').checked,morning:$('#morningTime').value,night:$('#nightTime').value};save();
};
$('#testNotification').onclick=async()=>{if('Notification'in window&&Notification.permission==='default')await Notification.requestPermission();sendNotification('QuestLife テスト','通知の表示確認です。')};
$('#exportData').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`QuestLife-backup-${currentCalendarKey()}.json`;a.click();URL.revokeObjectURL(a.href);$('#backupStatus').textContent='バックアップを書き出しました。'};
$('#importDataButton').onclick=()=>$('#importDataFile').click();
$('#importDataFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!data||typeof data!=='object'||!data.logs||!data.tasks)throw new Error('形式が違います');if(!confirm('現在のデータをバックアップ内容で置き換えますか？'))return;state=Object.assign({},defaults,data,{version:9});state.equipment??=['mat','dumbbell'];state.notificationSettings??={enabled:false,morning:'09:00',night:'21:00'};save();$('#backupStatus').textContent='バックアップを復元しました。'}catch(err){alert(`読み込みに失敗しました：${err.message}`)}finally{e.target.value=''}};

$$('.period-tab').forEach(b=>b.onclick=()=>{recordWeightPeriod=b.dataset.days==='all'?'all':Number(b.dataset.days);$$('.period-tab').forEach(x=>x.classList.toggle('active',x===b));renderWeights()});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
$('#currentWeight').value=state.goals.current||'';$('#goalWeight').value=state.goals.goal||'';$('#goalDate').value=state.goals.date||'';
renderAll();

// v6 guide card interactions
(()=>{
  const open=document.querySelector('#openGuide'), dialog=document.querySelector('#guideDialog'), close=document.querySelector('#closeGuide');
  if(open&&dialog) open.addEventListener('click',()=>dialog.showModal());
  if(close&&dialog) close.addEventListener('click',()=>dialog.close());
  if(dialog) dialog.addEventListener('click',e=>{if(e.target===dialog) dialog.close()});
  const finish=document.querySelector('#guideFinishDay');
  if(finish) finish.addEventListener('click',()=>{dialog?.close();document.querySelector('#finishDay')?.click()});
  document.querySelectorAll('#guideDialog .jump-tab').forEach(b=>b.addEventListener('click',()=>dialog?.close()));
})();

// v6.1 settings hub and interactive calendar
(()=>{
  let calendarCursor=new Date(now().getFullYear(),now().getMonth(),1);
  let selectedCalendarDate=activityKey();
  const keyFor=(y,m,d)=>`${y}-${pad(m+1)}-${pad(d)}`;
  function isVacationKey(k){return !!(state.vacation&&k>=state.vacation.start&&k<=state.vacation.end)}
  function nightForKey(k){return state.nightShifts.find(n=>n.date===k)}
  function renderCalendar(){
    const grid=$('#calendarGrid'); if(!grid)return;
    const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth();
    $('#calendarMonthLabel').textContent=`${y}年 ${m+1}月`;
    const first=new Date(y,m,1), offset=(first.getDay()+6)%7;
    const start=new Date(y,m,1-offset);
    grid.innerHTML='';
    for(let i=0;i<42;i++){
      const d=new Date(start);d.setDate(start.getDate()+i);const k=localDateKey(d),log=state.logs[k];
      const b=document.createElement('button');b.type='button';b.className='calendar-day';
      if(d.getMonth()!==m)b.classList.add('outside');if(k===currentCalendarKey())b.classList.add('today');if(k===selectedCalendarDate)b.classList.add('selected');
      if(isVacationKey(k))b.classList.add('status-vacation');
      else if(log?.closed){const done=state.tasks.filter(t=>log.tasks?.[t.id]).length;if(log.result?.all)b.classList.add('status-full');else if(done||log.workout)b.classList.add('status-partial');else b.classList.add('status-missed')}
      let marks='';
      if(nightForKey(k))marks+='<span>🌙</span>';if(isVacationKey(k))marks+='<span>🌴</span>';
      b.innerHTML=`<span>${d.getDate()}</span><span class="marks">${marks}</span>`;
      b.onclick=()=>{selectedCalendarDate=k;renderCalendar();renderCalendarDetail(k)};
      let hold; b.addEventListener('pointerdown',()=>hold=setTimeout(()=>openSchedule(k),550));['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>clearTimeout(hold)));
      grid.appendChild(b)
    }
    renderCalendarDetail(selectedCalendarDate)
  }
  function renderCalendarDetail(k){const box=$('#calendarDayDetail');if(!box)return;const l=state.logs[k],done=l?state.tasks.filter(t=>l.tasks?.[t.id]).length:0;const weight=[...state.weights].reverse().find(w=>w.date===k);const extras=[];const n=nightForKey(k);if(n)extras.push(`夜勤 ${n.start}〜翌${n.end}（締切 ${n.deadline}）`);if(isVacationKey(k))extras.push('バケーション');box.innerHTML=`<b>${k.replaceAll('-','/')}</b><br>タスク ${done}/${state.tasks.length}・運動 ${l?.workout?'完了':'未完了'}${weight?`・体重 ${weight.value}kg`:''}${extras.length?`<br>${extras.join(' / ')}`:''}`}
  function openSchedule(date=selectedCalendarDate){const d=$('#scheduleDialog');if(!d)return;$('#nightDate').value=date;$('#vacStart').value=date;$('#vacEnd').value=date;$('#scheduleDialogTitle').textContent=`${date.replaceAll('-','/')} の予定`;d.showModal()}
  $('#calendarPrev')?.addEventListener('click',()=>{calendarCursor.setMonth(calendarCursor.getMonth()-1);renderCalendar()});
  $('#calendarNext')?.addEventListener('click',()=>{calendarCursor.setMonth(calendarCursor.getMonth()+1);renderCalendar()});
  $('#openSchedule')?.addEventListener('click',()=>openSchedule());
  $$('.settings-tile').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.settingsDialog)?.showModal()));
  $$('.close-settings').forEach(b=>b.addEventListener('click',()=>b.closest('dialog')?.close()));
  $$('.settings-dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));
  $$('.schedule-tab').forEach(b=>b.addEventListener('click',()=>{$$('.schedule-tab').forEach(x=>x.classList.toggle('active',x===b));$('#nightSchedulePanel').classList.toggle('active',b.dataset.scheduleTab==='night');$('#vacationSchedulePanel').classList.toggle('active',b.dataset.scheduleTab==='vacation')}));
  const oldRenderAll=renderAll; renderAll=function(){oldRenderAll();renderCalendar()};
  const oldAddNight=$('#addNight')?.onclick;if($('#addNight'))$('#addNight').onclick=()=>{oldAddNight?.();renderCalendar();$('#scheduleDialog')?.close()};
  const oldSaveVacation=$('#saveVacation')?.onclick;if($('#saveVacation'))$('#saveVacation').onclick=()=>{oldSaveVacation?.();renderCalendar();$('#scheduleDialog')?.close()};
  const rm=$('#reduceMotion'),cm=$('#compactMode');
  const ui=JSON.parse(localStorage.getItem('questlife-ui')||'{}');if(rm){rm.checked=!!ui.reduceMotion;document.body.classList.toggle('reduce-motion',!!ui.reduceMotion);rm.onchange=()=>{ui.reduceMotion=rm.checked;localStorage.setItem('questlife-ui',JSON.stringify(ui));document.body.classList.toggle('reduce-motion',rm.checked)}}if(cm){cm.checked=!!ui.compact;document.body.classList.toggle('compact',!!ui.compact);cm.onchange=()=>{ui.compact=cm.checked;localStorage.setItem('questlife-ui',JSON.stringify(ui));document.body.classList.toggle('compact',cm.checked)}}
  renderCalendar();
})();
