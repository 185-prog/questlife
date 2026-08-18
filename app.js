const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const pad=n=>String(n).padStart(2,'0');
const localDateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseLocal=(date,time='00:00')=>new Date(`${date}T${time}:00`);
const addDays=(date,n)=>{const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+n);return localDateKey(d)};
const clone=x=>JSON.parse(JSON.stringify(x));
const toFiniteNumber=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(+v)?+v:null;
const newId=()=>globalThis.crypto?.randomUUID?.()||`ql-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const toDateTimeLocalValue=d=>`${localDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const parseDateTimeLocalValue=v=>{const [date,time='00:00']=String(v||'').split('T');return parseLocal(date,time)};

const APP_DATA_VERSION=20;
const defaults={version:APP_DATA_VERSION,tasks:[],logs:{},weeklyFood:{},xp:0,level:1,gold:0,streak:0,inventory:['旅人の服','ひよこスライム'],equippedGear:{weapon:null,armor:'旅人の服',accessory:null},party:['ひよこスライム'],danger:[],lost:[],weights:[],goals:{},equipment:['mat','dumbbell'],nightShifts:[],vacation:null,gender:'male',receptionist:'blonde',receptionistDialogView:'full',lastClosed:null,firstClosedDate:null,closedCount:0,events:[],debugNow:null};

// RPGの見た目と内容はここに集約。image を画像パスへ変更すれば後から差し替え可能。
const GAME_CONTENT={
  hero:{default:{image:null,maleIcon:'⚔',femaleIcon:'⚔'}},
  receptionist:{
    blonde:{name:'受付嬢',image:'./assets/receptionist-blonde.png',faceImage:'./assets/receptionist-blonde-face.png',tone:'bright'},
    brunette:{name:'受付嬢',image:'./assets/receptionist-brunette.png',faceImage:'./assets/receptionist-brunette-face.png',tone:'soft'}
  },
  monsters:{
    'ひよこスライム':{image:null,icon:'🟢',rarity:'★',power:2,recruitPrice:0,description:'小さくて元気な最初の仲間。'},
    'こぐまゴーレム':{image:null,icon:'🪨',rarity:'★',power:3,recruitPrice:80,description:'ころころした岩の体で前に立つ仲間。'},
    '火花ドラゴン':{image:null,icon:'🔥',rarity:'★★',power:6,recruitPrice:160,description:'火花をまとった小さなドラゴン。'},
    '月光の精霊':{image:null,icon:'✨',rarity:'★★',power:5,recruitPrice:140,description:'静かな光で旅を支える精霊。'}
  },
  equipment:{
    '旅人の服':{image:null,icon:'◇',rarity:'★',slot:'armor',power:1,price:0},
    '木の剣':{image:null,icon:'🗡',rarity:'★',slot:'weapon',power:3,price:60},
    '革の鎧':{image:null,icon:'🛡',rarity:'★',slot:'armor',power:4,price:90},
    '幸運のお守り':{image:null,icon:'✦',rarity:'★★',slot:'accessory',power:2,price:120},
    '鉄の剣':{image:null,icon:'⚔',rarity:'★★',slot:'weapon',power:7,price:180}
  }
};
const GEAR_SLOTS={weapon:'武器',armor:'防具',accessory:'アクセサリー'};
const SHOP_CATALOG=['木の剣','革の鎧','幸運のお守り','鉄の剣'];
const MONSTER_CATALOG=['ひよこスライム','こぐまゴーレム','火花ドラゴン','月光の精霊'];
function gameItemInfo(type,name){return GAME_CONTENT[type]?.[name]||{image:null,icon:type==='monsters'?'◉':'◇',rarity:'★'}}
function visualHtml(info,fallback){return info?.image?`<img src="${esc(info.image)}" alt="">`:`<span>${esc(info?.icon||fallback)}</span>`}
function receptionistInfo(){return GAME_CONTENT.receptionist?.[state.receptionist]||GAME_CONTENT.receptionist.blonde}
function receptionistGreeting(){const h=now().getHours();return h<11?'おはようございます':h<18?'こんにちは':'お疲れさまです'}
function receptionistCopy(log,c,percent){
  const info=receptionistInfo(),soft=info?.tone==='soft',greet=receptionistGreeting(),taskTotal=c.total;
  if(mode()==='vacation')return{short:'今日は冒険をお休みして、旅を楽しみましょう。',long:soft?'今日はギルドの依頼もお休みです。帰ってきたら、また一緒に続きを始めましょうね。':'今日は通常依頼はお休みです！しっかり楽しんで、帰ってきたらまた冒険を再開しましょう。'};
  if(log.closed)return{short:'今日の冒険は確定済みです。ゆっくり休みましょう。',long:soft?'今日もお疲れさまでした。もう十分頑張りましたよ。次の活動日に備えて、ゆっくり休んでくださいね。':'今日もお疲れさまでした！本日の冒険は無事に確定しています。次に備えて、今日はしっかり休みましょう！'};
  if(mode()==='night')return{short:'夜勤日です。無理せず、できる依頼から進めましょう。',long:soft?`${greet}。今日は夜勤日ですね。締切はいつもと違うので、焦らずできるものから進めてください。`:`${greet}！今日は夜勤日です。いつもの24時締切ではありません。無理せず、まずは一つだけ片づけましょう！`};
  if(taskTotal===0)return{short:'最初に毎日のタスクを登録しましょう。',long:soft?`${greet}。毎日の依頼がまだ登録されていません。設定から一つだけ登録してみませんか？`:`${greet}！まずは毎日の依頼を一つ登録しましょう。最初からたくさん作らなくて大丈夫です！`};
  if(c.done===taskTotal&&log.workout)return{short:'本日の依頼、すべて達成です！',long:soft?'すべての依頼と運動が終わっています。今日は完璧です。あとは「今日を終了する」で冒険を確定できますよ。':'すべて達成です！タスクも運動も完了しました。あとは「今日を終了する」で報酬を確定しましょう！'};
  if(c.done===taskTotal)return{short:'タスクは全達成です。あとは運動だけ！',long:soft?'毎日の依頼は全部終わりました。とてもいいペースです。余力があれば、今日の運動も確認してみましょう。':'毎日の依頼は全達成です！あとは今日の運動を終えれば、最高の結果を狙えます！'};
  if(c.done===0)return{short:'まず1件だけ。最初のクエストを終わらせましょう。',long:soft?`${greet}。まだ始まったばかりです。全部を見なくて大丈夫なので、いちばん小さい依頼を一つだけ終わらせましょう。`:`${greet}！まずは1件だけでOKです。最初のクエストを終わらせて、勢いをつけましょう！`};
  if(percent>=50)return{short:`${c.done}/${taskTotal}件完了。いいペースです！`,long:soft?`もう${c.done}/${taskTotal}件まで進んでいます。ここまで来たら、次の一つだけに集中すれば大丈夫ですよ。`:`${c.done}/${taskTotal}件完了です！いいペースですよ。このまま次の一つを片づけましょう！`};
  return{short:`${c.done}/${taskTotal}件完了。次の一歩を進めましょう。`,long:soft?`今日は${c.done}/${taskTotal}件完了しています。焦らず、次に終わらせやすい依頼を一つ選びましょう。`:`今日は${c.done}/${taskTotal}件完了しています！次に終わらせやすい依頼を一つ選んで進めましょう。`};
}
function setReceptionistDialogView(view,{persist=false}={}){
  state.receptionistDialogView=view==='face'?'face':'full';
  const visual=$('#receptionistDialogVisual');
  if(visual)visual.dataset.view=state.receptionistDialogView;
  $$('.receptionist-view-btn').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.view===state.receptionistDialogView));
  renderReceptionistVisual('#receptionistDialogImage','#receptionistDialogVisual',state.receptionistDialogView);
  if(persist)localStorage.setItem('questlife',JSON.stringify(state));
}
function setReceptionistCharacter(kind,{persist=true}={}){
  if(!GAME_CONTENT.receptionist?.[kind])return;
  state.receptionist=kind;
  $$('.receptionist-character-btn').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.receptionist===kind));
  if(persist)save();else renderAll();
}
function renderReceptionistVisual(imageSelector,visualSelector,view='full'){
  const img=$(imageSelector),visual=$(visualSelector),info=receptionistInfo();if(!img||!visual)return;
  const src=view==='face'?(info?.faceImage||info?.image):info?.image;
  visual.dataset.receptionist=state.receptionist;visual.dataset.view=view;visual.classList.remove('has-receptionist-image');
  if(!src){img.removeAttribute('src');return}
  img.onload=()=>visual.classList.add('has-receptionist-image');
  img.onerror=()=>visual.classList.remove('has-receptionist-image');
  if(img.getAttribute('src')!==src)img.setAttribute('src',src);else if(img.complete&&img.naturalWidth)visual.classList.add('has-receptionist-image');
}
function renderReceptionist(log,c,percent){
  const info=receptionistInfo(),copy=receptionistCopy(log,c,percent);
  if($('#receptionistCardLabel'))$('#receptionistCardLabel').textContent=info?.name||'受付嬢';
  if($('#todaySummary'))$('#todaySummary').textContent=copy.short;
  if($('#guideLongMessage'))$('#guideLongMessage').textContent=copy.long;
  if($('#receptionistDialogTitle'))$('#receptionistDialogTitle').textContent='受付嬢からのご案内';
  $$('.receptionist-character-btn').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.receptionist===state.receptionist));
  renderReceptionistVisual('#receptionistCardImage','#receptionistCardVisual','face');
  renderReceptionistVisual('#receptionistDialogImage','#receptionistDialogVisual',state.receptionistDialogView||'full');
  setReceptionistDialogView(state.receptionistDialogView||'full');
}
function isMonsterName(name){return !!GAME_CONTENT.monsters?.[name]||/スライム|竜|ドラゴン|精霊|ゴーレム|モンスター/.test(String(name))}
function ownedGear(){return(state.inventory||[]).filter(name=>!isMonsterName(name)&&GAME_CONTENT.equipment?.[name])}
function gearPower(){return Object.values(state.equippedGear||{}).reduce((sum,name)=>sum+(name?toFiniteNumber(gameItemInfo('equipment',name).power)||0:0),0)}
function heroPower(){return Math.max(1,state.level)+gearPower()}
function ownedMonsters(){return(state.inventory||[]).filter(isMonsterName)}
function partyMonsters(){const owned=new Set(ownedMonsters());return(state.party||[]).filter(name=>owned.has(name)).slice(0,3)}
function monsterPower(name){return Math.max(0,toFiniteNumber(gameItemInfo('monsters',name).power)||0)}
function partyPower(){return partyMonsters().reduce((sum,name)=>sum+monsterPower(name),0)}
function adventurePower(){return heroPower()+partyPower()}
function recruitMonster(name,{record=true}={}){
  const info=GAME_CONTENT.monsters?.[name],price=toFiniteNumber(info?.recruitPrice);
  if(!info||price===null||price<0)return{ok:false,reason:'invalid'};
  if((state.inventory||[]).includes(name))return{ok:false,reason:'owned'};
  if(state.gold<price)return{ok:false,reason:'gold'};
  state.gold-=price;state.inventory.push(name);
  state.party=partyMonsters();
  if(state.party.length<3)state.party.push(name);
  if(record)addEvent('monster',`${name} が仲間になった${price?`（${price}G）`:''}`);
  return{ok:true,price};
}
function addMonsterToParty(name,{record=true}={}){
  if(!GAME_CONTENT.monsters?.[name]||!(state.inventory||[]).includes(name))return{ok:false,reason:'not-owned'};
  state.party=partyMonsters();
  if(state.party.includes(name))return{ok:false,reason:'already'};
  if(state.party.length>=3)return{ok:false,reason:'full'};
  state.party.push(name);if(record)addEvent('party',`${name} をパーティに編成`);return{ok:true};
}
function removeMonsterFromParty(name,{record=true}={}){
  state.party=partyMonsters();
  if(!state.party.includes(name))return false;
  state.party=state.party.filter(x=>x!==name);if(record)addEvent('party',`${name} をパーティから外した`);return true
}
function purchaseGear(name,{record=true}={}){
  const info=GAME_CONTENT.equipment?.[name],price=toFiniteNumber(info?.price);
  if(!info||price===null||price<0)return{ok:false,reason:'invalid'};
  if((state.inventory||[]).includes(name))return{ok:false,reason:'owned'};
  if(state.gold<price)return{ok:false,reason:'gold'};
  state.gold-=price;state.inventory.push(name);if(record)addEvent('shop',`${name} を ${price}G で購入`);
  return{ok:true,price};
}
function setEquippedGear(name,{record=true}={}){
  const info=GAME_CONTENT.equipment?.[name],slot=info?.slot;
  if(!slot||!GEAR_SLOTS[slot]||!(state.inventory||[]).includes(name))return false;
  state.equippedGear={...(state.equippedGear||{}),[slot]:name};if(record)addEvent('equipment',`${name} を装備`);
  return true;
}
function clearEquippedGear(slot,{record=true}={}){
  if(!GEAR_SLOTS[slot])return false;
  const current=state.equippedGear?.[slot];state.equippedGear={...(state.equippedGear||{}),[slot]:null};
  if(current&&record)addEvent('equipment',`${current} を外した`);return true;
}

function normalizeState(raw={}){
  const s=Object.assign({},clone(defaults),raw||{},{version:APP_DATA_VERSION});
  ['tasks','inventory','party','danger','lost','weights','nightShifts','events'].forEach(k=>{if(!Array.isArray(s[k]))s[k]=clone(defaults[k])});
  ['logs','weeklyFood','goals'].forEach(k=>{if(!s[k]||typeof s[k]!=='object'||Array.isArray(s[k]))s[k]=clone(defaults[k])});
  s.equipment=Array.isArray(s.equipment)?s.equipment:['mat','dumbbell'];
  s.receptionist=GAME_CONTENT.receptionist?.[s.receptionist]?s.receptionist:'blonde';
  s.receptionistDialogView=s.receptionistDialogView==='face'?'face':'full';
  const rawEquipped=raw?.equippedGear;
  s.equippedGear=rawEquipped&&typeof rawEquipped==='object'&&!Array.isArray(rawEquipped)?{...clone(defaults.equippedGear),...rawEquipped}:clone(defaults.equippedGear);
  for(const slot of Object.keys(GEAR_SLOTS)){const name=s.equippedGear[slot];if(name&&(!s.inventory.includes(name)||gameItemInfo('equipment',name).slot!==slot))s.equippedGear[slot]=null}
  s.party=[...new Set(s.party.filter(name=>s.inventory.includes(name)&&!!GAME_CONTENT.monsters?.[name]))].slice(0,3);if(!raw?.party&&s.inventory.includes('ひよこスライム'))s.party=['ひよこスライム'];
  s.level=Math.max(1,Math.floor(toFiniteNumber(s.level)||1));s.xp=Math.max(0,Math.floor(toFiniteNumber(s.xp)||0));s.gold=Math.max(0,Math.floor(toFiniteNumber(s.gold)||0));s.streak=Math.max(0,Math.floor(toFiniteNumber(s.streak)||0));
  s.notificationSettings={enabled:false,morning:'09:00',night:'21:00',lastMorning:null,lastNight:null,...(s.notificationSettings||{})};
  s.goals={...(s.goals||{})};s.goals.maxMinutes=Math.max(30,Math.min(60,+s.goals.maxMinutes||60));s.goals.weeklyTargets=s.goals.weeklyTargets&&typeof s.goals.weeklyTargets==='object'?s.goals.weeklyTargets:{};
  for(const k of Object.keys(s.weeklyFood||{})){if(s.weeklyFood[k]==='good')s.weeklyFood[k]='restrained';if(s.weeklyFood[k]==='over')s.weeklyFood[k]='overeat';}
  const byDate=new Map();for(const w of s.weights){if(w&&/^\d{4}-\d{2}-\d{2}$/.test(String(w.date))&&toFiniteNumber(w.value)!==null)byDate.set(String(w.date),{...w,value:toFiniteNumber(w.value)})}s.weights=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
  return s;
}
let loaded={};try{loaded=JSON.parse(localStorage.getItem('questlife')||'{}')}catch{}
let state=normalizeState(loaded);

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
  // 1) 前日の夜勤が締切前なら、その前日を活動日として優先する。
  const previousMatches=state.nightShifts.map(n=>({n,w:nightShiftWindow(n)}))
    .filter(x=>x.n.date<localDateKey(at)&&at>=x.w.start&&at<x.w.deadline)
    .sort((a,b)=>b.w.start-a.w.start);
  if(previousMatches.length)return previousMatches[0].n;

  // 2) 当日に夜勤予定が登録されている場合は、開始前でもその日を夜勤活動日として扱う。
  const todayKey=localDateKey(at);
  const todayShift=state.nightShifts.find(n=>n.date===todayKey);
  if(todayShift)return todayShift;

  // 3) 開始済みかつ締切前の夜勤を拾う。
  const matches=state.nightShifts.map(n=>({n,w:nightShiftWindow(n)}))
    .filter(x=>at>=x.w.start&&at<x.w.deadline)
    .sort((a,b)=>b.w.start-a.w.start);
  return matches[0]?.n||null;
}
function activityKey(){const cal=currentCalendarKey();if(isVacationDate(cal))return cal;return activeNightShift()?.date||cal}
function deadlineInfo(){if(isVacationDate(currentCalendarKey())){const d=parseLocal(addDays(currentCalendarKey(),1),'00:00');return{date:d,label:'締切 24:00'}}const n=activeNightShift();if(n){const d=nightShiftWindow(n).deadline;return{date:d,label:`夜勤締切 ${localDateKey(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`}}const d=parseLocal(addDays(activityKey(),1),'00:00');return{date:d,label:'締切 24:00'}}
function isVacationDate(date=currentCalendarKey()){return !!(state.vacation&&date>=state.vacation.start&&date<=state.vacation.end)}
function mode(){if(isVacationDate())return'vacation';if(activeNightShift())return'night';return'normal'}
function dayLog(key=activityKey()){
  state.logs[key]??={tasks:{},taskSnapshot:clone(state.tasks),checkin:{condition:'普通',motivation:'普通',soreness:'なし',back:'痛くない',duration:30},workoutPlan:[],exerciseChecks:{},workout:false,workoutRpe:null,loadAdjustment:null,closed:false,closedAt:null,result:null};
  const l=state.logs[key];l.tasks??={};l.taskSnapshot??=clone(state.tasks);l.checkin??={condition:'普通',motivation:'普通',soreness:'なし',back:'痛くない',duration:30};l.workoutPlan??=[];l.exerciseChecks??={};l.loadAdjustment??=null;return l;
}
function tasksForLog(log){return Array.isArray(log?.taskSnapshot)?log.taskSnapshot:state.tasks}
function syncCurrentTaskSnapshot(){const l=dayLog();if(!l.closed)l.taskSnapshot=clone(state.tasks)}
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
function recentRpe(){return Object.values(state.logs).filter(l=>l.workout&&toFiniteNumber(l.workoutRpe)!==null).sort((a,b)=>(a.closedAt||'').localeCompare(b.closedAt||'')).slice(-3).map(l=>toFiniteNumber(l.workoutRpe))}
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

function weightRecords(){
  const byDate=new Map();for(const w of state.weights||[]){if(w&&toFiniteNumber(w.value)!==null&&/^\d{4}-\d{2}-\d{2}$/.test(String(w.date)))byDate.set(String(w.date),{...w,value:toFiniteNumber(w.value)})}return[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function latestWeightValue(asOfKey=null){
  const valid=weightRecords()
    .filter(x=>toFiniteNumber(x.value)!==null&&(!asOfKey||x.date<=asOfKey))
    .sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  return valid.length?toFiniteNumber(valid.at(-1).value):toFiniteNumber(state.goals.current);
}
function weightGoalAdjustmentInfo(at=now(),currentOverride=null){
  const current=toFiniteNumber(currentOverride)??latestWeightValue();
  const goal=toFiniteNumber(state.goals.goal),date=state.goals.date;
  const maxMinutes=Math.max(30,Math.min(60,+state.goals.maxMinutes||60));
  if(!current||!goal||!date)return{valid:false,current,goal,date,maxMinutes,label:'標準',reason:'現在体重・目標体重・目標日を設定してください'};
  if(goal>=current)return{valid:false,achieved:true,current,goal,date,maxMinutes,label:'目標達成',reason:'目標体重に到達しています'};
  const target=parseLocal(date,'23:59'),days=Math.ceil((target-at)/86400000);
  const remaining=Math.max(0,current-goal);
  if(days<=0)return{valid:true,expired:true,current,goal,date,days,remaining,maxMinutes,weeklyKg:null,label:'期限超過',reason:'目標日を過ぎています。目標日を見直してください'};
  const weeks=days/7,weeklyKg=remaining/weeks;
  const reason=weeklyKg>0.90
    ?`残り${remaining.toFixed(1)}kgを${days}日で進めるには週${weeklyKg.toFixed(2)}kgが必要です。運動だけで無理に埋め合わせない設定にします`
    :`残り${remaining.toFixed(1)}kg・${days}日、必要ペースは週${weeklyKg.toFixed(2)}kgです`;
  return{valid:true,current,goal,date,days,remaining,weeks,weeklyKg,maxMinutes,label:weeklyKg>0.90?'期限が厳しい':'標準',reason};
}
function weeklyMinutesFromGoalPace(weeklyKg){
  // 150〜300分/週の公的ガイドラインを土台にしたQuestLife内の運用目標。
  // 「この分数をやれば必ずこの体重が減る」という換算ではない。
  if(!Number.isFinite(+weeklyKg)||weeklyKg<=0)return 150;
  if(weeklyKg<=0.25)return 150;
  if(weeklyKg<=0.45)return 180;
  if(weeklyKg<=0.65)return 220;
  if(weeklyKg<=0.90)return 260;
  return 300;
}
function averageWeightBetween(startKey,endKeyExclusive){
  const vals=weightRecords().filter(x=>x.date>=startKey&&x.date<endKeyExclusive).map(x=>+x.value);
  return{count:vals.length,avg:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null};
}
function weightTrendInfo(weekKey=weekStartKey()){
  const recentStart=addDays(weekKey,-7),previousStart=addDays(weekKey,-14);
  const previous=averageWeightBetween(previousStart,recentStart),recent=averageWeightBetween(recentStart,weekKey);
  if(previous.count<3||recent.count<3)return{valid:false,previous,recent,lossPerWeek:null,reason:'直近2週間の各週に3回以上の体重記録がないため、トレンド補正はまだ行いません'};
  const lossPerWeek=previous.avg-recent.avg;
  return{valid:true,previous,recent,lossPerWeek,reason:`前週平均 ${previous.avg.toFixed(1)}kg → 直近週平均 ${recent.avg.toFixed(1)}kg（${lossPerWeek>=0?'-':'+'}${Math.abs(lossPerWeek).toFixed(2)}kg/週）`};
}
function weeklyTargetSignature(){return `${state.goals.goal||''}|${state.goals.date||''}|${state.goals.maxMinutes||60}`}
function ensureWeeklyExerciseTarget(weekKey=weekStartKey()){
  state.goals.weeklyTargets??={};
  const signature=weeklyTargetSignature(),existing=state.goals.weeklyTargets[weekKey];
  if(existing&&existing.signature===signature&&existing.valid)return existing;
  const asOfKey=addDays(weekKey,-1),current=latestWeightValue(asOfKey)??latestWeightValue();
  const goal=weightGoalAdjustmentInfo(parseLocal(weekKey,'12:00'),current);
  if(!goal.valid||goal.expired){
    const out={valid:false,weekKey,signature,goal,baseMinutes:null,targetMinutes:null,trend:weightTrendInfo(weekKey),trendBonusPercent:0,reason:goal.reason};
    state.goals.weeklyTargets[weekKey]=out;localStorage.setItem('questlife',JSON.stringify(state));return out;
  }
  const baseMinutes=weeklyMinutesFromGoalPace(goal.weeklyKg),trend=weightTrendInfo(weekKey);
  let trendBonusPercent=0;
  // 日々の水分変動ではなく、前週平均と直近週平均を比較。遅れている週だけ翌週を約10%増やす。
  if(trend.valid&&goal.weeklyKg>=0.15&&trend.lossPerWeek<goal.weeklyKg*0.75)trendBonusPercent=10;
  const rawTargetMinutes=Math.min(300,Math.round((baseMinutes*(1+trendBonusPercent/100))/5)*5);
  const capacityMinutes=goal.maxMinutes*7,targetMinutes=Math.min(rawTargetMinutes,capacityMinutes),capacityLimited=targetMinutes<rawTargetMinutes;
  const out={valid:true,weekKey,signature,goal,baseMinutes,targetMinutes,rawTargetMinutes,capacityMinutes,capacityLimited,trend,trendBonusPercent,
    reason:trendBonusPercent?`体重トレンドが目標ペースより遅いため、今週の運動目標を約10%増やします`:`今週は基本の運動目標を維持します`};
  state.goals.weeklyTargets[weekKey]=out;localStorage.setItem('questlife',JSON.stringify(state));return out;
}
function workoutMinutesForLog(l){return l?.workout?(l.workoutPlan||[]).reduce((a,x)=>a+(+x.minutes||0),0):0}
function weeklyCompletedMinutes(weekKey=weekStartKey()){
  let total=0;
  for(let i=0;i<7;i++)total+=workoutMinutesForLog(state.logs?.[addDays(weekKey,i)]);
  return total;
}
function weeklyExerciseProgress(checkin=null){
  const week=ensureWeeklyExerciseTarget(),completed=weeklyCompletedMinutes(week.weekKey),remaining=week.valid?Math.max(0,week.targetMinutes-completed):0;
  const d=activityDate(),dayIndex=(d.getDay()+6)%7,daysLeft=Math.max(1,7-dayIndex);
  const maxMinutes=Math.max(30,Math.min(60,+state.goals.maxMinutes||60));
  const requested=Math.max(5,+(checkin?.duration??dayLog().checkin?.duration??30)||30);
  let dailyNeeded=week.valid?Math.ceil((remaining/daysLeft)/5)*5:requested;
  const recovery=checkin&&(checkin.condition==='悪い'||checkin.back==='痛みがある'||checkin.soreness==='全身'||planOfDate(activityKey()).focus==='recovery');
  if(recovery)dailyNeeded=Math.min(dailyNeeded,30);
  let targetToday=Math.min(maxMinutes,Math.max(requested,dailyNeeded));
  if(recovery)targetToday=Math.min(targetToday,30);
  const possibleThisWeek=completed+targetToday+Math.max(0,daysLeft-1)*maxMinutes;
  return{week,completed,remaining,daysLeft,dailyNeeded,targetToday,maxMinutes,recovery,possibleThisWeek};
}
function effectiveWorkoutAdjustment(checkin){
  const rpe=rpeAdjustmentInfo(),weekly=weeklyExerciseProgress(checkin);
  const recovery=checkin.condition==='悪い'||checkin.back==='痛みがある'||checkin.soreness==='全身'||planOfDate(activityKey()).focus==='recovery';
  const motivationDelta=checkin.motivation==='低い'?-1:0;
  // 体重目標は筋トレの回数・セット数を増やさず、週間運動時間の配分だけに使う。
  const doseDelta=(rpe.delta||0)+motivationDelta;
  let targetMinutes=weekly.targetToday;
  if(checkin.condition==='悪い'||checkin.back==='痛みがある')targetMinutes=Math.min(Math.max(5,+checkin.duration||30),30);
  return{rpe,weekly,goal:weekly.week.goal,recovery,motivationDelta,doseDelta,targetMinutes,maxMinutes:weekly.maxMinutes};
}
function renderGoalAnalysis(){
  const el=$('#goalAnalysis');if(!el)return;
  const w=ensureWeeklyExerciseTarget();
  if(!w.valid){el.textContent=w.goal?.achieved?'目標体重に到達しています。現在の状態を維持しましょう。':w.goal?.expired?`目標日を過ぎています。目標日を更新してください。`:'現在体重・目標体重・目標日を設定すると、週間運動量を自動調整します。';return}
  const trend=w.trend.valid?`14日傾向 ${w.trend.lossPerWeek>=0?'-':'+'}${Math.abs(w.trend.lossPerWeek).toFixed(2)}kg/週`:'14日傾向 まだ判定なし';
  const bonus=w.trendBonusPercent?` / トレンド補正 +${w.trendBonusPercent}%`:'';
  const limited=w.capacityLimited?' / 1日上限で調整':'';
  el.textContent=`必要 ${w.goal.weeklyKg.toFixed(2)}kg/週 / 今週 ${w.targetMinutes}分 / ${trend}${bonus}${limited}`;
}

function adjustedDose(base,delta){
  if(base.includes('分')){const n=parseInt(base);return `${Math.max(2,n+delta*2)}分`}
  const m=base.match(/(左右)?(\d+)回×(\d+)/);if(!m)return base;return `${m[1]||''}${Math.max(4,+m[2]+delta*2)}回×${Math.max(1,+m[3]+(delta>0?1:0))}`
}
function chooseWorkout(checkin){
  const {condition,soreness,back}=checkin;const focus=planOfDate(activityKey()).focus;
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
  const adjustment=effectiveWorkoutAdjustment(checkin),delta=adjustment.doseDelta,targetDuration=adjustment.targetMinutes;
  let total=0,out=[];
  for(const id of ids){const e=EX[id];if(total+e.minutes>targetDuration&&out.length>=1)continue;out.push({...e,dose:adjustedDose(e.base,delta),originalDose:e.base});total+=e.minutes}
  // 週間目標で必要な追加分は、筋トレのセット数ではなく静かな有酸素時間へ配分する。
  // 体調不良・腰痛時は追加しない。回復日は30分以内の軽い活動に留める。
  if(!recovery&&condition!=='悪い'&&back!=='痛みがある'&&targetDuration-total>=5){
    const extra=Math.min(targetDuration-total,Math.max(5,targetDuration));
    const march=out.find(x=>x.id==='march');
    if(march){march.minutes+=extra;march.dose=`${march.minutes}分`;total+=extra}
    else{out.push({...EX.march,minutes:extra,dose:`${extra}分`,originalDose:EX.march.base});total+=extra}
  }
  if(out.length===1&&targetDuration>=10&&out[0].id!=='stretch')out.push({...EX.stretch,dose:'5分',minutes:5});
  return out;
}

function renderAll(){renderMode();renderHero();renderTasks();renderCheckin();renderWeeklyPlan();renderWorkout();renderWeeklyFood();renderInventory();renderWeights();renderHomeWeight();renderSchedule();renderDebug();updateBattle();renderDashboard();renderGameStatus();renderQuestHub();renderHistory();renderNotificationSettings();renderEquipment();renderGoalAnalysis()}
function renderMode(){const m=mode();document.body.classList.toggle('vacation',m==='vacation');$('#modeLabel').textContent=m==='vacation'?'🏝️ バケーション':m==='night'?'🌙 夜勤日':'通常日';$('#deadlineLabel').textContent=`活動日 ${activityKey()} / ${deadlineInfo().label}`;$('#checkinCard').style.display=m==='vacation'?'none':'';$('#finishDay').textContent=m==='vacation'?'今日の旅の記録を残す':'今日を終了する'}
function renderHero(){const next=state.level*100;$('#level').textContent=state.level;$('#xp').textContent=state.xp;$('#xpNext').textContent=next;$('#xpBar').style.width=Math.min(100,state.xp/next*100)+'%';$('#streakCount').textContent=state.streak;$('#avatar').textContent=state.gender==='female'?'👩':'🧑';$('#heroName').textContent=state.level>=10?'王国の守護者':state.level>=5?'ギルドの剣士':'名もなき旅人'}
function renderTasks(){const log=dayLog(),wrap=$('#todayTasks'),edit=$('#taskEditor'),dayTasks=tasksForLog(log);wrap.innerHTML='';edit.innerHTML='';if(mode()==='vacation'){wrap.innerHTML='<p class="muted">バケーション中は通常タスクを休止しています。</p>';$('#taskProgressText').textContent='一時停止';return}dayTasks.forEach((t)=>{const row=document.createElement('div');row.className='task '+(log.tasks[t.id]?'done':'');row.innerHTML=`<input type="checkbox" ${log.tasks[t.id]?'checked':''} ${log.closed?'disabled':''}><div class="task-main"><strong>${esc(t.name)}</strong>${t.minutes?`<div class="timer">⏱ ${t.minutes}分タイマー</div>`:''}</div>${t.minutes?'<button class="small-btn">開始</button>':''}`;row.querySelector('input').onchange=e=>{log.tasks[t.id]=e.target.checked;save()};if(t.minutes){const b=row.querySelector('button');b.disabled=log.closed;b.onclick=()=>startTimer(t,b)}wrap.appendChild(row)});state.tasks.forEach((t,i)=>{const er=document.createElement('div');er.className='editor-row';er.innerHTML=`<span>${esc(t.name)}${t.minutes?`（${t.minutes}分）`:''}</span><button class="small-btn">削除</button>`;er.querySelector('button').onclick=()=>{state.tasks.splice(i,1);syncCurrentTaskSnapshot();save()};edit.appendChild(er)});const done=dayTasks.filter(t=>log.tasks[t.id]).length;$('#taskProgressText').textContent=`${done}/${dayTasks.length}${log.closed?'（確定済み）':''}`;if($('#taskCountLabel'))$('#taskCountLabel').textContent=`${state.tasks.length}/5`}
function startTimer(t,btn){const storageKey=`timer_${activityKey()}_${t.id}`;let end=+(localStorage.getItem(storageKey)||0);if(!end){end=Date.now()+t.minutes*60000;localStorage.setItem(storageKey,String(end))}btn.disabled=true;const tick=()=>{const sec=Math.max(0,Math.ceil((end-Date.now())/1000)),m=Math.floor(sec/60),s=sec%60;btn.textContent=`${m}:${pad(s)}`;if(sec<=0){localStorage.removeItem(storageKey);dayLog().tasks[t.id]=true;addEvent('timer',`${t.name} のタイマーを完了`);save();alert(`${t.name} を達成しました！`);return}setTimeout(tick,1000)};tick()}
function renderCheckin(){const l=dayLog(),c=l.checkin;$('#condition').value=c.condition||'普通';$('#motivation').value=c.motivation||'普通';$('#soreness').value=c.soreness||'なし';$('#back').value=c.back||'痛くない';$('#duration').value=String(c.duration||30);$('#dayTheme').textContent=planOfDate(activityKey()).label}
function readCheckin(){return{condition:$('#condition').value,motivation:$('#motivation').value,soreness:$('#soreness').value,back:$('#back').value,duration:+$('#duration').value}}
function buildWorkout(){
  const l=dayLog();l.checkin=readCheckin();const adj=effectiveWorkoutAdjustment(l.checkin),w=adj.weekly.week;
  l.loadAdjustment={...adj.rpe,motivationDelta:adj.motivationDelta,weeklyTarget:w.valid?w.targetMinutes:null,weeklyCompleted:adj.weekly.completed,weeklyRemaining:adj.weekly.remaining,trendBonusPercent:w.trendBonusPercent||0,trendLossPerWeek:w.trend?.lossPerWeek??null,goalWeeklyKg:w.goal?.weeklyKg??null,targetMinutes:adj.targetMinutes,generatedAt:now().toISOString()};
  l.workoutPlan=chooseWorkout(l.checkin);l.exerciseChecks={};
  const weeklyText=w.valid?`、週間目標 ${w.targetMinutes}分`:'';addEvent('plan',`${planOfDate(activityKey()).label}メニューを生成（負荷：${adj.rpe.label}${weeklyText}）`);save()
}
function renderWeeklyPlan(){const wrap=$('#weeklyPlan');if(!wrap)return;wrap.innerHTML='';const key=activityKey();for(let i=0;i<7;i++){const d=addDays(key,i-(activityDate().getDay()+6)%7),p=planOfDate(d),el=document.createElement('div');el.className='week-day '+(d===key?'today':'');el.innerHTML=`<b>${['月','火','水','木','金','土','日'][i]}</b><span>${p.short}</span>`;wrap.appendChild(el)}$('#weeklyFocus').textContent=planOfDate(key).label}
function renderWorkoutRecommendation(){
  const l=dayLog(),check=l.checkin||readCheckin(),plan=planOfDate(activityKey());
  const calc=effectiveWorkoutAdjustment(check),info=l.loadAdjustment||{};
  const totalDelta=l.workoutPlan.length?((info.delta||0)+(info.motivationDelta||0)):calc.doseDelta;
  const targetMinutes=l.workoutPlan.length?(info.targetMinutes||calc.targetMinutes):calc.targetMinutes;
  const plannedMinutes=l.workoutPlan.length?l.workoutPlan.reduce((a,x)=>a+(x.minutes||0),0):targetMinutes;
  const week=calc.weekly.week;
  let intensity=plan.focus==='recovery'?'回復':totalDelta>0?'高め':totalDelta<0?'軽め':'標準';
  if(check.condition==='悪い'||check.back==='痛みがある')intensity='安全優先';
  const title=plan.focus==='recovery'?'回復とコンディショニング':plan.label;
  let comment='';
  if(check.back==='痛みがある')comment='腰への負担を避け、痛みを悪化させない回復メニューを優先します。鋭い痛みがある場合は中止してください。';
  else if(check.condition==='悪い')comment='今日は体調を優先します。週間目標より安全を優先し、運動量は増やしません。';
  else if(plan.focus==='recovery')comment='今日は回復日です。筋トレ強度は上げず、軽い活動を含めても30分以内を目安にします。';
  else if(check.soreness!=='なし')comment=`${check.soreness}の筋肉痛を避けながら、動ける部位を中心に進めます。`;
  else if(week.valid){
    const trendText=week.trendBonusPercent?' 直近2週間の体重トレンドが目標より遅かったため、今週は運動目標を約10%増やしています。':'';
    comment=`今週の運動目標は${week.targetMinutes}分、完了済み${calc.weekly.completed}分です。残りを日数で配分し、今日は${Math.max(5,Math.min(calc.maxMinutes,plannedMinutes))}分を目安にします。${trendText}`.trim();
  }
  else if(totalDelta>0)comment='直近の記録に余裕があるため、筋トレは少しだけ強度を上げます。フォームを崩さない範囲で進めましょう。';
  else if(totalDelta<0)comment='直近の負荷が高めだったため、今日は強度を下げて継続を優先します。';
  else comment='今日は標準強度です。決めた時間を丁寧にやり切ることを優先しましょう。';
  if(week.valid&&week.goal.weeklyKg>0.90&&check.condition!=='悪い'&&check.back!=='痛みがある')comment+=` 目標期限はかなり厳しいため、週間目標は${week.targetMinutes}分を上限とし、運動だけで無理に埋め合わせません。`;
  if($('#recommendTitle'))$('#recommendTitle').textContent=title;
  if($('#recommendIntensity')){$('#recommendIntensity').textContent=intensity;$('#recommendIntensity').dataset.level=intensity;}
  if($('#recommendMinutes'))$('#recommendMinutes').textContent=`${Math.max(5,Math.min(calc.maxMinutes,plannedMinutes))}分`;
  if($('#recommendFocus'))$('#recommendFocus').textContent=plan.label;
  if($('#aiWorkoutComment'))$('#aiWorkoutComment').textContent=comment;
}
function renderWorkout(){const l=dayLog(),w=$('#workoutPlan'),adj=$('#loadAdjustment');w.innerHTML='';const info=l.loadAdjustment||rpeAdjustmentInfo();const totalDelta=(info.delta||0)+(info.motivationDelta||0);if(adj){adj.className='load-adjustment '+(totalDelta>0?'up':totalDelta<0?'down':'standard');adj.textContent=`負荷調整：${totalDelta>0?'少し増加':totalDelta<0?'少し軽減':'標準'}｜${info.reason||'現在の記録から判定'}${info.motivationDelta<0?'＋やる気「低い」のため追加で軽減':''}`;}if(!l.workoutPlan.length){w.innerHTML=''}else{const mins=l.workoutPlan.reduce((a,x)=>a+(x.minutes||0),0);const summary=document.createElement('div');summary.className='workout-summary';summary.textContent=`${planOfDate(activityKey()).label}／目安 ${mins}分／${l.checkin.back==='痛くない'?'通常調整':'腰の状態に合わせて調整済み'}`;w.appendChild(summary);l.workoutPlan.forEach((x,i)=>{const e=document.createElement('div');e.className='exercise '+(l.exerciseChecks[i]?'done':'');const changed=x.originalDose&&x.originalDose!==x.dose?`<span class="dose-change">標準 ${esc(x.originalDose)} → 調整後 ${esc(x.dose)}</span>`:'';e.innerHTML=`<input class="exercise-check" type="checkbox" ${l.exerciseChecks[i]?'checked':''} ${l.closed?'disabled':''}><h3>${esc(x.name)}</h3><div class="exercise-meta"><span>${esc(x.part)}</span><span>${esc(x.dose||x.base)}${changed}</span></div><p><b>効果：</b>${esc(x.effect)}</p><a href="${x.url}" target="_blank" rel="noreferrer">フォーム動画を探す ↗</a>`;e.querySelector('input').onchange=ev=>{l.exerciseChecks[i]=ev.target.checked;save()};w.appendChild(e)})}$('#workoutStatus').textContent=l.workout?'完了':l.workoutPlan.length?'提案済み':'未生成';$('#workoutRpe').value=String(l.workoutRpe||6);$('#completeWorkout').disabled=!l.workoutPlan.length||l.workout||l.closed;renderWorkoutRecommendation()}

function foodLabel(value){return value==='normal'?'普通':value==='overeat'?'食べ過ぎ':value==='restrained'?'抑えた':'未入力'}
function foodAiComment(value){
  if(value==='restrained')return '今週は食事を抑えられました。無理な制限を続けるより、再現できる範囲を来週も維持しましょう。';
  if(value==='overeat')return '運動を罰として増やす必要はありません。来週は飲み物か間食のどちらか一つだけ整えてみましょう。';
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
function completion(log=dayLog()){const tasks=tasksForLog(log),done=tasks.filter(t=>log.tasks[t.id]).length;return{done,total:tasks.length,tasksAll:tasks.length>0&&done===tasks.length,all:tasks.length>0&&done===tasks.length&&log.workout}}
function updateBattle(){const log=dayLog(),c=completion(log),td=c.total?c.done/c.total:0;const chance=Math.round(20+td*50+(log.workout?25:0));$('#battleChance').textContent=`勝率 ${Math.max(5,Math.min(100,chance))}%`;$('#battlePreview').textContent=log.closed?'この活動日は確定済みです。':chance>=80?'勝機は十分です。全達成でレア報酬が狙えます。':chance>=50?'勝負になります。あと一歩進めましょう。':'このままでは仲間が危険です。締切までに立て直してください。'}
function questSummary(log=dayLog()){
  const tasks=tasksForLog(log),taskDone=tasks.filter(t=>log.tasks?.[t.id]).length,taskTotal=tasks.length,workoutDone=!!log.workout;
  const questTotal=taskTotal+1,questDone=taskDone+(workoutDone?1:0),tasksAll=taskTotal>0&&taskDone===taskTotal,all=tasksAll&&workoutDone;
  return{taskDone,taskTotal,workoutDone,questDone,questTotal,tasksAll,all,ratio:questTotal?questDone/questTotal:0};
}
function questReward(log=dayLog()){
  const q=questSummary(log);
  const taskXp=q.taskDone*12,taskGold=q.taskDone*8,workoutXp=q.workoutDone?30:0,workoutGold=q.workoutDone?20:0;
  const bonusXp=q.all?30:0,bonusGold=q.all?30:0,xp=taskXp+workoutXp+bonusXp,gold=taskGold+workoutGold+bonusGold;
  const grade=q.all?'S':q.ratio>=.8?'A':q.ratio>=.6?'B':q.questDone>0?'C':'D';
  return{...q,taskXp,taskGold,workoutXp,workoutGold,bonusXp,bonusGold,xp,gold,grade};
}
function gainXp(n){
  const gained=Math.max(0,Math.floor(toFiniteNumber(n)||0)),beforeLevel=state.level;state.xp+=gained;
  while(state.xp>=state.level*100){state.xp-=state.level*100;state.level++}
  return{gained,beforeLevel,afterLevel:state.level,levelsGained:state.level-beforeLevel};
}
function showResult(icon,title,body){$('#resultVisual').textContent=icon;$('#resultTitle').textContent=title;$('#resultBody').style.whiteSpace='pre-line';$('#resultBody').textContent=body;$('#resultDialog').showModal()}
function showQuestResult(result,xpInfo){
  const icon={S:'★',A:'A',B:'B',C:'C',D:'—'}[result.grade]||'✓';
  $('#resultVisual').textContent=icon;$('#resultTitle').textContent='冒険結果';$('#resultBody').style.whiteSpace='normal';
  const levelUp=xpInfo.levelsGained>0?`<div class="quest-levelup">LEVEL UP！ Lv.${xpInfo.beforeLevel} → Lv.${xpInfo.afterLevel}</div>`:'';
  $('#resultBody').innerHTML=`<div class="quest-result-grade"><span>評価</span><strong>${esc(result.grade)}</strong></div><div class="quest-result-grid"><div><span>クエスト</span><b>${result.questDone}/${result.questTotal}</b></div><div><span>タスク</span><b>${result.taskDone}/${result.taskTotal}</b></div><div><span>運動</span><b>${result.workoutDone?'達成':'未達成'}</b></div></div><div class="quest-reward-row"><div><span>EXP</span><strong>+${result.xp}</strong></div><div><span>GOLD</span><strong>+${result.gold}G</strong></div></div>${result.bonusGold?`<p class="quest-bonus">全達成ボーナス +${result.bonusXp} EXP / +${result.bonusGold}G</p>`:''}${levelUp}`;
  $('#resultDialog').showModal();
}
function finalizeDay(key,{automatic=false,show=true}={}){
  const log=dayLog(key);if(log.closed)return false;
  if(isVacationDate(key)){
    log.closed=true;log.closedAt=now().toISOString();log.result={vacation:true,all:null,done:0,total:0,xp:0,gold:0,grade:'休息'};
    addEvent('vacation','旅行記録を保存し、通常クエストを一時停止',key);
    if(automatic)addEvent('auto-close','締切到達により自動確定',key);
    if(show)showResult('🏝️','旅の記録','今日は休息日です。連続記録は維持され、通常クエストの報酬・ペナルティはありません。');
    return true;
  }
  const reward=questReward(log),xpInfo=gainXp(reward.xp);state.gold+=reward.gold;
  if(reward.all)state.streak++;else state.streak=0;
  log.closed=true;log.closedAt=now().toISOString();
  log.result={all:reward.all,done:reward.taskDone,total:reward.taskTotal,questDone:reward.questDone,questTotal:reward.questTotal,workout:reward.workoutDone,xp:reward.xp,gold:reward.gold,grade:reward.grade,levelBefore:xpInfo.beforeLevel,levelAfter:xpInfo.afterLevel};
  state.lastClosed=key;state.firstClosedDate??=key;state.closedCount++;
  addEvent('quest',`評価${reward.grade} / ${reward.questDone}/${reward.questTotal} / +${reward.xp}EXP / +${reward.gold}G`,key);
  if(reward.all)addEvent('complete','本日の全クエストを達成',key);
  if(xpInfo.levelsGained)addEvent('levelup',`Lv.${xpInfo.beforeLevel} → Lv.${xpInfo.afterLevel}`,key);
  if(automatic)addEvent('auto-close','締切到達により自動確定',key);
  if(show)showQuestResult(reward,xpInfo);
  return true;
}
function closeDay(){const key=activityKey(),log=dayLog(key);if(log.closed)return alert('この活動日はすでに終了しています。');finalizeDay(key,{automatic:false,show:true});save()}
function autoFinalizeExpiredLogs(){
  const current=activityKey();let changed=false;
  const keys=Object.keys(state.logs||{}).filter(k=>k<current&&!state.logs[k]?.closed).sort();
  for(const key of keys)changed=finalizeDay(key,{automatic:true,show:false})||changed;
  if(changed)localStorage.setItem('questlife',JSON.stringify(state));
  return changed;
}
let lastRenderedActivityKey=null,lastRenderedCalendarKey=null;
function reconcileClock(){
  const auto=autoFinalizeExpiredLogs(),a=activityKey(),c=currentCalendarKey();
  if(auto||a!==lastRenderedActivityKey||c!==lastRenderedCalendarKey){lastRenderedActivityKey=a;lastRenderedCalendarKey=c;renderAll()}
}
function runSelfTests(){
  const output=$('#selfTestResults'),snapshot=clone(state),stored=localStorage.getItem('questlife'),results=[];
  const ok=(name,fn)=>{try{fn();results.push({name,ok:true})}catch(err){results.push({name,ok:false,error:err?.message||String(err)})}};
  const expect=(condition,message)=>{if(!condition)throw new Error(message)};
  try{
    ok('必須UI要素',()=>{for(const id of ['today','workout','quest','record','settings','calendarGrid','goalAnalysis','debugSummary'])expect(!!$('#'+id),`#${id} がありません`) });
    ok('クエスト画面UI',()=>{expect(!!$('#openHeroPanel')&&!!$('#openMonstersPanel')&&!!$('#openShopPanel'),'クエスト画面の入口が不足しています');expect(!!$('#shopItems')&&!!$('#heroEquipmentSlots')&&!!$('#monsterPartySlots')&&!!$('#monsterRecruitList'),'ショップ・装備・仲間UIが不足しています');expect($$('.bottom-nav button').some(b=>b.dataset.tab==='quest'),'クエストタブがありません')});
    ok('通常日の締切',()=>{state=normalizeState({debugNow:parseLocal('2026-08-10','10:00').toISOString()});const d=deadlineInfo().date;expect(localDateKey(d)==='2026-08-11'&&d.getHours()===0&&d.getMinutes()===0,'24:00境界が不正')});
    ok('夜勤の活動日境界',()=>{state=normalizeState({nightShifts:[{date:'2026-08-10',start:'22:00',end:'07:00',deadline:'12:00'}]});state.debugNow=parseLocal('2026-08-10','10:00').toISOString();expect(activityKey()==='2026-08-10','開始前');state.debugNow=parseLocal('2026-08-11','11:59').toISOString();expect(activityKey()==='2026-08-10','締切前');state.debugNow=parseLocal('2026-08-11','12:00').toISOString();expect(activityKey()==='2026-08-11','締切後')});
    ok('バケーション優先',()=>{state=normalizeState({nightShifts:[{date:'2026-08-10',start:'22:00',end:'07:00',deadline:'12:00'}],vacation:{start:'2026-08-11',end:'2026-08-12'}});state.debugNow=parseLocal('2026-08-11','01:00').toISOString();expect(mode()==='vacation'&&activityKey()==='2026-08-11','夜勤がバケーションより優先されています')});
    ok('週間運動量マッピング',()=>{expect([weeklyMinutesFromGoalPace(.2),weeklyMinutesFromGoalPace(.3),weeklyMinutesFromGoalPace(.5),weeklyMinutesFromGoalPace(.7),weeklyMinutesFromGoalPace(1)].join(',')==='150,180,220,260,300','週間目標の段階が不正')});
    ok('14日トレンド補正',()=>{state=normalizeState({debugNow:parseLocal('2026-08-10','10:00').toISOString(),goals:{goal:65,date:'2026-10-19',current:70,maxMinutes:60},weights:[{date:'2026-07-27',value:70},{date:'2026-07-29',value:70},{date:'2026-08-01',value:70},{date:'2026-08-03',value:69.9},{date:'2026-08-05',value:69.9},{date:'2026-08-08',value:69.9}]});const w=ensureWeeklyExerciseTarget();expect(w.trendBonusPercent===10,'遅れたトレンドで+10%になりません')});
    ok('同日体重の重複除外',()=>{state=normalizeState({weights:[{date:'2026-08-01',value:70},{date:'2026-08-01',value:80},{date:'2026-08-02',value:70}]});const a=averageWeightBetween('2026-08-01','2026-08-03');expect(a.count===2&&Math.abs(a.avg-75)<.001,'同じ日を複数回カウントしています')});
    ok('体調不良時の安全上限',()=>{state=normalizeState({debugNow:parseLocal('2026-08-10','10:00').toISOString(),goals:{goal:60,date:'2026-09-10',current:70,maxMinutes:60}});const a=effectiveWorkoutAdjustment({condition:'悪い',motivation:'普通',soreness:'なし',back:'痛くない',duration:30});expect(a.targetMinutes<=30,'体調不良でも30分を超えています')});
    ok('目標達成判定',()=>{state=normalizeState({debugNow:parseLocal('2026-08-10','10:00').toISOString(),goals:{goal:65,date:'2026-09-10',current:65,maxMinutes:60}});expect(weightGoalAdjustmentInfo().achieved===true,'達成済み目標を判定できません')});
    ok('食べ過ぎコメント',()=>{expect(foodAiComment('overeat').includes('間食'),'食べ過ぎ用コメントが選ばれません')});
    ok('タスク履歴スナップショット',()=>{state=normalizeState({tasks:[{id:'a',name:'A'}],debugNow:parseLocal('2026-08-10','10:00').toISOString()});const l=dayLog();l.tasks.a=true;state.tasks=[{id:'b',name:'B'}];const c=completion(l);expect(c.done===1&&c.total===1,'過去日のタスク内容が現在設定に置き換わります')});
    ok('クエスト報酬計算',()=>{state=normalizeState({tasks:[{id:'a',name:'A'},{id:'b',name:'B'}],debugNow:parseLocal('2026-08-10','10:00').toISOString()});const l=dayLog();l.tasks.a=true;l.tasks.b=true;l.workout=true;const r=questReward(l);expect(r.all&&r.xp===84&&r.gold===66&&r.grade==='S','全達成報酬が不正')});
    ok('部分達成報酬',()=>{state=normalizeState({tasks:[{id:'a',name:'A'},{id:'b',name:'B'}],debugNow:parseLocal('2026-08-10','10:00').toISOString()});const l=dayLog();l.tasks.a=true;const r=questReward(l);expect(!r.all&&r.xp===12&&r.gold===8&&r.grade==='C','部分達成報酬が不正')});
    ok('ショップ購入',()=>{state=normalizeState({gold:100,inventory:['旅人の服']});const r=purchaseGear('木の剣',{record:false});expect(r.ok&&state.gold===40&&state.inventory.includes('木の剣'),'購入またはゴールド減算が不正');const second=purchaseGear('木の剣',{record:false});expect(!second.ok&&state.gold===40,'同じ装備を二重購入できています')});
    ok('装備切替',()=>{state=normalizeState({level:1,inventory:['旅人の服','木の剣'],equippedGear:{weapon:null,armor:'旅人の服',accessory:null},party:[]});expect(setEquippedGear('木の剣',{record:false})===true&&state.equippedGear.weapon==='木の剣','武器を装備できません');expect(adventurePower()===5,'冒険力の計算が不正');clearEquippedGear('weapon',{record:false});expect(state.equippedGear.weapon===null,'装備を外せません')});
    ok('モンスター加入',()=>{state=normalizeState({gold:200,inventory:['旅人の服','ひよこスライム'],party:['ひよこスライム']});const r=recruitMonster('こぐまゴーレム',{record:false});expect(r.ok&&state.gold===120&&state.inventory.includes('こぐまゴーレム'),'仲間加入またはゴールド減算が不正');expect(state.party.includes('こぐまゴーレム'),'空き枠への自動編成が不正')});
    ok('パーティ上限',()=>{state=normalizeState({inventory:['旅人の服','ひよこスライム','こぐまゴーレム','火花ドラゴン','月光の精霊'],party:['ひよこスライム','こぐまゴーレム','火花ドラゴン']});const r=addMonsterToParty('月光の精霊',{record:false});expect(!r.ok&&r.reason==='full'&&state.party.length===3,'パーティ3体上限が不正')});
    ok('総合冒険力',()=>{state=normalizeState({level:2,inventory:['旅人の服','木の剣','ひよこスライム','火花ドラゴン'],equippedGear:{weapon:'木の剣',armor:'旅人の服',accessory:null},party:['ひよこスライム','火花ドラゴン']});expect(heroPower()===6&&partyPower()===8&&adventurePower()===14,'主人公・仲間の冒険力合算が不正')});
    ok('終了時の二重報酬防止',()=>{state=normalizeState({tasks:[{id:'a',name:'A'}],debugNow:parseLocal('2026-08-10','10:00').toISOString()});const l=dayLog();l.tasks.a=true;l.workout=true;expect(finalizeDay('2026-08-10',{show:false})===true,'初回確定失敗');const g=state.gold,x=state.xp;expect(finalizeDay('2026-08-10',{show:false})===false&&state.gold===g&&state.xp===x,'二重報酬が発生')});
    ok('締切後の自動確定',()=>{state=normalizeState({tasks:[{id:'a',name:'A'}],debugNow:parseLocal('2026-08-10','01:00').toISOString(),logs:{'2026-08-09':{tasks:{a:false},taskSnapshot:[{id:'a',name:'A'}],checkin:{condition:'普通',motivation:'普通',soreness:'なし',back:'痛くない',duration:30},workoutPlan:[],exerciseChecks:{},workout:false,closed:false}}});expect(autoFinalizeExpiredLogs()===true&&state.logs['2026-08-09'].closed===true,'古い活動日が自動確定されません')});
  }finally{
    state=normalizeState(snapshot);localStorage.setItem('questlife',JSON.stringify(state));renderAll();
  }
  const passed=results.filter(x=>x.ok).length;
  if(output){output.textContent=`セルフテスト ${passed}/${results.length} PASS\n`+results.map(x=>`${x.ok?'PASS':'FAIL'}  ${x.name}${x.ok?'':`：${x.error}`}`).join('\n');output.dataset.status=passed===results.length?'pass':'fail'}
  return results;
}
function renderInventory(){const inv=$('#inventory');inv.innerHTML='';state.inventory.forEach(x=>{const c=document.createElement('span');c.className='chip';c.textContent=(x.includes('竜')||x.includes('スライム')?'🐲 ':'🛡️ ')+x;inv.appendChild(c)});$('#dangerList').innerHTML=state.danger.length?state.danger.map(x=>`<span class="chip danger-chip">⚠️ ${esc(x.name)}：次の活動日に完全達成で救出</span>`).join(''):'危機にある仲間や装備はありません。';const count=state.inventory.length;$('#baseVisual').textContent=mode()==='vacation'?'🏝️':count>=8?'🏰':count>=5?'🏡':'⛺';$('#baseName').textContent=mode()==='vacation'?'南国の休息地':count>=8?'英雄ギルド城塞':count>=5?'冒険者ギルド':'旅人の野営地';$('#partyVisual').textContent=(state.gender==='female'?'👩':'🧑')+' '+state.inventory.filter(x=>x.includes('竜')||x.includes('スライム')).map(()=>'🐲').join(' ')}
let recordWeightPeriod=7;
function recordWeightValues(){
  if(recordWeightPeriod==='all')return weightRecords();
  const days=Number(recordWeightPeriod)||7,base=activityDate(),vals=[];
  for(let i=days-1;i>=0;i--){const d=new Date(base);d.setDate(base.getDate()-i);const key=localDateKey(d);const rec=[...weightRecords()].reverse().find(w=>w.date===key);vals.push(rec?{date:key,value:rec.value}:{date:key,value:null})}
  return vals;
}
function renderWeights(){
  drawWeightLine($('#weightChart'),recordWeightValues(),false);
  const valid=weightRecords(),latest=valid.at(-1),prev=valid.at(-2);
  if($('#recordWeightLatest'))$('#recordWeightLatest').textContent=latest?`${(+latest.value).toFixed(1)}kg`:'未記録';
  if($('#recordWeightDelta'))$('#recordWeightDelta').textContent=latest&&prev?`前回比 ${latest.value-prev.value>0?'+':''}${(+latest.value-(+prev.value)).toFixed(1)}kg`:'前回比 —';
  if($('#recordWeightGoal')){const g=toFiniteNumber(state.goals.goal),diff=latest&&g!==null?(+latest.value)-g:null;$('#recordWeightGoal').textContent=diff===null?'目標まで —':diff<=0?'目標達成':`目標まで ${diff.toFixed(1)}kg`;}
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
  const base=activityDate(),vals=[];
  for(let i=6;i>=0;i--){const d=new Date(base);d.setDate(base.getDate()-i);const key=localDateKey(d);const rec=[...weightRecords()].reverse().find(w=>w.date===key);vals.push(rec?{date:key,value:rec.value}:{date:key,value:null})}
  drawWeightLine($('#homeWeightChart'),vals,true);
  const valid=vals.filter(x=>Number.isFinite(x.value)),latest=valid.at(-1),prev=valid.at(-2);
  const latestEl=$('#homeWeightLatest'),deltaEl=$('#homeWeightDelta'),goalEl=$('#homeWeightGoal');
  if(!latest){latestEl.textContent='未記録';if(deltaEl)deltaEl.textContent='前回比 —';if(goalEl)goalEl.textContent=state.goals.goal?`目標 ${state.goals.goal}kg`:'目標まで —';return}
  latestEl.textContent=`${latest.value.toFixed(1)}kg`;
  if(deltaEl)deltaEl.textContent=prev?`前回比 ${latest.value-prev.value>0?'+':''}${(latest.value-prev.value).toFixed(1)}kg`:'前回比 —';
  if(goalEl){const g=toFiniteNumber(state.goals.goal),diff=g!==null?latest.value-g:null;goalEl.textContent=diff===null?'目標まで —':diff<=0?'目標達成':`目標まで ${diff.toFixed(1)}kg`;}
}
function renderEquipment(){
  $$('input[name="equipment"]').forEach(x=>x.checked=(state.equipment||[]).includes(x.value));
  if($('#equipmentStatus'))$('#equipmentStatus').textContent=`選択中：${(state.equipment||[]).length}種類`;
}

function renderSchedule(){}
function renderDebug(){
  const debugNow=$('#debugNow'),debugSummary=$('#debugSummary'),eventLog=$('#eventLog');
  if(!debugNow&&!debugSummary&&!eventLog)return;
  if(state.debugNow&&debugNow)debugNow.value=toDateTimeLocalValue(now());
  const log=dayLog(),d=deadlineInfo(),n=activeNightShift();
  let nightDetail='夜勤判定：なし';
  if(n){
    const w=nightShiftWindow(n),at=now();
    const reason=n.date===currentCalendarKey()&&at<w.start?'当日の夜勤予定（開始前）':n.date<currentCalendarKey()&&at<w.deadline?'前日の夜勤を締切まで継続':'夜勤時間中';
    nightDetail=`夜勤判定：${reason}\n夜勤活動日：${n.date}\n夜勤開始：${w.start.toLocaleString('ja-JP')}\n夜勤終了：${w.end.toLocaleString('ja-JP')}\n夜勤締切：${w.deadline.toLocaleString('ja-JP')}`;
  }
  if(debugSummary)debugSummary.textContent=`現在判定：${now().toLocaleString('ja-JP')}\nカレンダー日：${currentCalendarKey()}\n活動日：${activityKey()}\nモード：${mode()}\n${nightDetail}\n現在の締切：${d.date.toLocaleString('ja-JP')}\n確定済み：${log.closed?'はい':'いいえ'}\n冒険者：Lv.${state.level} / EXP ${state.xp}/${state.level*100} / ${state.gold}G\n負荷補正：${progression()>0?'少し増加':progression()<0?'少し軽減':'標準'}\nデータ版：${state.version}`;
  if(eventLog){const visible=state.events.filter(e=>e.type!=='lost');eventLog.innerHTML=visible.length?visible.map(e=>`<div class="event-item"><b>${esc(e.key)}</b>［${esc(e.type)}］${esc(e.text)}</div>`).join(''):'まだ処理履歴はありません。'}
}



function renderGameStatus(){
  const log=dayLog(),q=questSummary(log),reward=questReward(log),next=state.level*100;
  const set=(id,text)=>{const el=$(id);if(el)el.textContent=text};
  set('#guideLevel',`Lv.${state.level}`);set('#guideXp',`${state.xp}/${next}`);set('#guideGold',`${state.gold}G`);
  set('#guideQuestProgress',mode()==='vacation'?'休息日':`${q.questDone}/${q.questTotal}`);
  const bar=$('#guideXpBar');if(bar)bar.style.width=`${Math.min(100,state.xp/next*100)}%`;
  const hint=$('#guideRewardHint');if(hint){
    if(mode()==='vacation')hint.textContent='今日は通常クエストを休止しています。';
    else if(log.closed)hint.textContent=`本日の報酬は確定済みです。評価 ${log.result?.grade||'—'} / +${log.result?.gold||0}G`;
    else if(q.all)hint.textContent=`全達成！終了すると +${reward.xp} EXP / +${reward.gold}G が確定します。`;
    else hint.textContent=`現在の確定予定：+${reward.xp} EXP / +${reward.gold}G。全達成で追加ボーナス。`;
  }
}

function renderQuestHub(){
  if(!$('#quest'))return;
  const log=dayLog(),q=questSummary(log),reward=questReward(log),next=state.level*100;
  const heroName=state.level>=10?'王国の守護者':state.level>=5?'ギルドの剣士':'名もなき旅人';
  const pct=Math.min(100,state.xp/next*100);
  const monsters=ownedMonsters(),party=partyMonsters(),gear=ownedGear();
  const set=(id,text)=>{const e=$(id);if(e)e.textContent=text};
  set('#questGold',`${state.gold}G`);set('#questHeroName',heroName);set('#questHeroLevel',`Lv.${state.level}`);set('#questHeroXp',`EXP ${state.xp}/${next}`);
  set('#questMonsterSummary',monsters.length?`${monsters.length}体 / 編成${party.length}体`:'仲間はまだいません');set('#questShopSummary',`${SHOP_CATALOG.length}商品 / ${state.gold}G`);set('#questPartyPower',`総合冒険力 ${adventurePower()}`);
  set('#questDailyProgress',mode()==='vacation'?'休息日':`${q.questDone}/${q.questTotal}`);set('#questDailyReward',log.closed?`確定 +${log.result?.xp||0} EXP / +${log.result?.gold||0}G`:`+${reward.xp} EXP / +${reward.gold}G`);set('#questDailyGrade',log.closed?`評価 ${log.result?.grade||'—'}`:q.all?'全達成':'進行中');
  const hp=$('#questHeroXpBar');if(hp)hp.style.width=`${pct}%`;const dp=$('#questDailyBar');if(dp)dp.style.width=`${q.questTotal?Math.round(q.questDone/q.questTotal*100):0}%`;
  const heroVisual=GAME_CONTENT.hero.default;for(const id of ['#questHeroVisual','#heroDialogVisual']){const e=$(id);if(e)e.innerHTML=visualHtml(heroVisual,'⚔')}
  set('#heroDialogName',heroName);set('#heroDialogLevel',`Lv.${state.level}`);set('#heroDialogXp',`${state.xp}/${next}`);set('#heroDialogPower',String(heroPower()));set('#heroDialogGold',`${state.gold}G`);set('#heroGearPower',`装備力 +${gearPower()}`);set('#heroOwnedGearCount',`${gear.length}個`);set('#shopGold',`${state.gold}G`);set('#monsterPartyCount',`${party.length}/3`);set('#monsterPartyPower',`仲間力 +${partyPower()}`);

  const slots=$('#heroEquipmentSlots');
  if(slots){
    slots.innerHTML=Object.entries(GEAR_SLOTS).map(([slot,label])=>{
      const name=state.equippedGear?.[slot],info=name?gameItemInfo('equipment',name):null;
      return `<div class="gear-slot-row"><span class="gear-slot-label">${esc(label)}</span>${name?`<div class="gear-slot-item"><div class="quest-item-visual">${visualHtml(info,'◇')}</div><div><b>${esc(name)}</b><span>${esc(info.rarity||'★')} / 冒険力 +${info.power||0}</span></div></div><button class="small-btn unequip-gear" data-slot="${esc(slot)}" type="button">外す</button>`:`<div class="gear-slot-empty">未装備</div>`}</div>`;
    }).join('');
    slots.querySelectorAll('.unequip-gear').forEach(b=>b.onclick=()=>{clearEquippedGear(b.dataset.slot);save()});
  }

  const equip=$('#heroEquipmentPreview');
  if(equip){
    equip.innerHTML=gear.length?gear.map(name=>{const info=gameItemInfo('equipment',name),equipped=state.equippedGear?.[info.slot]===name;return `<div class="quest-item gear-owned-item"><div class="quest-item-visual">${visualHtml(info,'◇')}</div><div class="quest-item-main"><b>${esc(name)}</b><span>${esc(info.rarity||'★')} ${esc(GEAR_SLOTS[info.slot]||'装備')} / 冒険力 +${info.power||0}</span></div><button class="small-btn equip-gear" data-gear="${esc(name)}" type="button" ${equipped?'disabled':''}>${equipped?'装備中':'装備する'}</button></div>`}).join(''):'<div class="quest-empty">装備はまだありません。</div>';
    equip.querySelectorAll('.equip-gear').forEach(b=>b.onclick=()=>{if(setEquippedGear(b.dataset.gear))save()});
  }

  const preview=$('#questPartyPreview');if(preview)preview.innerHTML=party.length?party.map(name=>{const info=gameItemInfo('monsters',name);return `<div class="party-preview-unit"><div class="quest-item-visual">${visualHtml(info,'◉')}</div><span>${esc(name)}</span><b>+${monsterPower(name)}</b></div>`}).join(''):'<div class="quest-empty">仲間を編成するとここに表示されます。</div>';
  const monsterSlots=$('#monsterPartySlots');if(monsterSlots)monsterSlots.innerHTML=[0,1,2].map(i=>{const name=party[i],info=name?gameItemInfo('monsters',name):null;return `<div class="monster-party-slot ${name?'is-filled':''}"><span class="party-slot-number">${i+1}</span>${name?`<div class="quest-item-visual">${visualHtml(info,'◉')}</div><div class="party-slot-copy"><b>${esc(name)}</b><span>${esc(info.rarity||'★')} / 冒険力 +${monsterPower(name)}</span></div><button type="button" class="small-btn remove-party-monster" data-monster="${esc(name)}">外す</button>`:`<div class="party-slot-empty">空き枠</div>`}</div>`}).join('');
  const coll=$('#monsterCollection');if(coll)coll.innerHTML=monsters.length?monsters.map(name=>{const info=gameItemInfo('monsters',name),inParty=party.includes(name);return `<div class="quest-item monster-owned-item"><div class="quest-item-visual">${visualHtml(info,'◉')}</div><div class="quest-item-main"><b>${esc(name)}</b><span>${esc(info.rarity||'★')} / 冒険力 +${monsterPower(name)}</span><small>${esc(info.description||'仲間モンスター')}</small></div><button class="small-btn ${inParty?'remove-party-monster':'add-party-monster'}" data-monster="${esc(name)}" type="button" ${!inParty&&party.length>=3?'disabled':''}>${inParty?'外す':party.length>=3?'満員':'編成'}</button></div>`}).join(''):'<div class="quest-empty">仲間モンスターはまだいません。</div>';
  const recruit=$('#monsterRecruitList');if(recruit)recruit.innerHTML=MONSTER_CATALOG.filter(name=>!monsters.includes(name)).map(name=>{const info=gameItemInfo('monsters',name),price=info.recruitPrice||0,afford=state.gold>=price;return `<div class="monster-recruit-card"><div class="quest-item-visual">${visualHtml(info,'◉')}</div><div class="quest-item-main"><b>${esc(name)}</b><span>${esc(info.rarity||'★')} / 冒険力 +${monsterPower(name)}</span><small>${esc(info.description||'')}</small></div><button class="shop-action recruit-monster" type="button" data-monster="${esc(name)}" ${afford?'':'disabled'}>${afford?`${price}Gで仲間に`:'G不足'}</button></div>`}).join('')||'<div class="quest-empty">テスト用の仲間は全員加入済みです。</div>';
  document.querySelectorAll('.add-party-monster').forEach(b=>b.onclick=()=>{const r=addMonsterToParty(b.dataset.monster);if(!r.ok){alert(r.reason==='full'?'パーティは3体までです。':'編成できません。');return}save()});
  document.querySelectorAll('.remove-party-monster').forEach(b=>b.onclick=()=>{if(removeMonsterFromParty(b.dataset.monster))save()});
  document.querySelectorAll('.recruit-monster').forEach(b=>b.onclick=()=>{const name=b.dataset.monster,info=gameItemInfo('monsters',name);if(!confirm(`${name} を ${info.recruitPrice||0}G で仲間にしますか？`))return;const r=recruitMonster(name);if(!r.ok){alert(r.reason==='gold'?'ゴールドが足りません。':'仲間にできません。');return}save()});

  const shop=$('#shopItems');
  if(shop){
    shop.innerHTML=SHOP_CATALOG.map(name=>{const info=gameItemInfo('equipment',name),owned=state.inventory.includes(name),equipped=state.equippedGear?.[info.slot]===name,afford=state.gold>=info.price;let action='';
      if(equipped)action='<button class="shop-action" type="button" disabled>装備中</button>';
      else if(owned)action=`<button class="shop-action equip-shop-gear" type="button" data-gear="${esc(name)}">装備する</button>`;
      else action=`<button class="shop-action buy-gear" type="button" data-gear="${esc(name)}" ${afford?'':'disabled'}>${afford?`${info.price}Gで購入`:'G不足'}</button>`;
      return `<div class="shop-item-card"><div class="shop-item-top"><div class="quest-item-visual">${visualHtml(info,'◇')}</div><div class="shop-item-copy"><span class="shop-rarity">${esc(info.rarity||'★')} ${esc(GEAR_SLOTS[info.slot]||'装備')}</span><h3>${esc(name)}</h3><p>冒険力 +${info.power||0}</p></div><b class="shop-price">${info.price}G</b></div>${action}</div>`;
    }).join('');
    shop.querySelectorAll('.buy-gear').forEach(b=>b.onclick=()=>{const name=b.dataset.gear,info=gameItemInfo('equipment',name);if(!confirm(`${name} を ${info.price}G で購入しますか？`))return;const r=purchaseGear(name);if(!r.ok){alert(r.reason==='gold'?'ゴールドが足りません。':'購入できません。');return}save();});
    shop.querySelectorAll('.equip-shop-gear').forEach(b=>b.onclick=()=>{if(setEquippedGear(b.dataset.gear))save()});
  }
}
function renderDashboard(){
  const log=dayLog(), c=completion(log);
  const taskTotal=c.total;
  const taskRatio=taskTotal?c.done/taskTotal:0;
  const workoutRatio=log.workout?1:0;
  const percent=Math.round((taskRatio*.7+workoutRatio*.3)*100);
  if($('#dayPercent'))$('#dayPercent').textContent=`${percent}%`;
  const finishButton=$('#finishDay');if(finishButton){finishButton.hidden=false;finishButton.disabled=!!log.closed;finishButton.textContent=log.closed?'今日の記録は確定済み':'今日を終了する'}const finishCaption=$('#finishDayCaption');if(finishCaption)finishCaption.textContent=log.closed?'この活動日の記録は確定されています':'今日の記録を確定します';
  if($('#dayRing'))$('#dayRing').style.setProperty('--progress',`${percent}%`); if($('#guideProgressBar'))$('#guideProgressBar').style.width=`${percent}%`; if($('#homeStreakCount'))$('#homeStreakCount').textContent=state.streak||0;
  if($('#todayHeading'))$('#todayHeading').textContent=log.closed?'今日の記録は確定済み':percent===100?'今日の予定を達成しました':percent>=50?'あと少しです':'今日を整える';
  renderReceptionist(log,c,percent);
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
    const l=state.logs[date],logTasks=l?tasksForLog(l):state.tasks,done=l?logTasks.filter(t=>l.tasks?.[t.id]).length:0,total=logTasks.length;
    if(date<=today){taskDone+=done;taskPossible+=total;if(l?.workout)workoutDays++}
    const d=parseLocal(date,'12:00'),weekday=['日','月','火','水','木','金','土'][d.getDay()],isToday=date===today,isFuture=date>today,p=planOfDate(date),icon=iconFor(p,date);
    const foot=isToday?'今日':!isFuture&&l?.workout?'✓':'';
    return `<button type="button" class="week-plan-day ${isToday?'is-today':''} ${!isFuture&&l?.workout?'is-done':''}" data-plan-date="${date}"><span class="week-plan-date">${weekday}</span><span class="week-plan-icon" aria-label="${esc(p.label)}">${icon}</span><span class="week-plan-status">${foot}</span></button>`;
  }).join('');
  $$('#historyList [data-plan-date]').forEach(b=>b.onclick=()=>renderPlanDayDetail(b.dataset.planDate));
  $('#weeklyTaskRate').textContent=taskPossible?`${Math.round(taskDone/taskPossible*100)}%`:'0%';
  $('#weeklyWorkoutCount').textContent=`${workoutDays}日`;
  $('#weightRecordCount').textContent=`${weightRecords().length}回`;
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
function sendNotification(title,body){if('Notification'in window&&Notification.permission==='granted')new Notification(title,{body});else alert(`${title}\n${body}`)}
function checkInAppReminders(){
  const n=state.notificationSettings;if(!n?.enabled)return;
  const at=now(), key=currentCalendarKey(), hm=`${pad(at.getHours())}:${pad(at.getMinutes())}`;
  if(hm===n.morning&&n.lastMorning!==key){n.lastMorning=key;sendNotification('QuestLife','今日のタスクを確認して、最初の1つを始めましょう。');save(false)}
  if(hm===n.night&&n.lastNight!==key){n.lastNight=key;const c=completion();sendNotification('QuestLife',c.all?'今日はすべて完了しています。お疲れさまでした。':'締切前です。未完了の項目を確認しましょう。');save(false)}
}
setInterval(checkInAppReminders,30000);
function switchTab(id){$$('.bottom-nav button').forEach(x=>x.classList.toggle('active',x.dataset.tab===id));$$('.tab').forEach(x=>x.classList.toggle('active',x.id===id));window.scrollTo({top:0,behavior:'smooth'})}
$$('.bottom-nav button').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
[['#openHeroPanel','#heroDialog'],['#openMonstersPanel','#monstersDialog'],['#openShopPanel','#shopDialog']].forEach(([button,dialog])=>{const b=$(button),d=$(dialog);if(b&&d)b.onclick=()=>{renderQuestHub();d.showModal()}});
$$('.close-quest-detail').forEach(b=>b.onclick=()=>b.closest('dialog')?.close());
$$('.quest-detail-dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));
$$('.jump-tab').forEach(b=>b.onclick=()=>switchTab(b.dataset.target));
$('#taskForm').onsubmit=e=>{e.preventDefault();if(state.tasks.length>=5)return alert('タスクは最大5個です。');state.tasks.push({id:newId(),name:$('#taskName').value.trim(),minutes:+$('#taskMinutes').value||0});syncCurrentTaskSnapshot();e.target.reset();$('#taskMinutes').value=0;save()};
$('#generateWorkout').onclick=buildWorkout;
$('#saveWeeklyFood').onclick=()=>{const key=weekStartKey(),value=$('#weeklyFoodCheck').value;if(value==='none')delete state.weeklyFood[key];else state.weeklyFood[key]=value;addEvent('food',`週次の食生活振り返りを保存（${foodLabel(value)}）`,key);save();};
$('#openFoodHistory').onclick=()=>{renderFoodHistory();$('#foodHistoryEditor').hidden=true;$('#foodHistoryDialog').showModal()};
$$('.close-food-history').forEach(b=>b.onclick=()=>$('#foodHistoryDialog').close());
$('#foodHistoryEditValue').onchange=()=>{$('#foodHistoryAiComment').textContent=foodAiComment($('#foodHistoryEditValue').value)};
$('#saveFoodHistoryEdit').onclick=()=>{if(!selectedFoodHistoryKey)return;state.weeklyFood[selectedFoodHistoryKey]=$('#foodHistoryEditValue').value;addEvent('food',`過去の食生活振り返りを更新（${foodLabel(state.weeklyFood[selectedFoodHistoryKey])}）`,selectedFoodHistoryKey);save();renderFoodHistory();openFoodHistoryEditor(selectedFoodHistoryKey)};
$('#completeWorkout').onclick=()=>{const log=dayLog();const checked=Object.values(log.exerciseChecks).filter(Boolean).length;if(checked<log.workoutPlan.length&&!confirm(`未チェックの種目が${log.workoutPlan.length-checked}件あります。完了にしますか？`))return;log.workout=true;log.workoutRpe=+$('#workoutRpe').value;addEvent('workout',`運動を完了（きつさ ${log.workoutRpe}/10）`);save();alert('運動完了。今日を終了すると、クエスト報酬としてEXPとゴールドが確定します。')};
$('#finishDay').onclick=()=>{if(dayLog().closed)return;if(confirm('今日を終了しますか？\n今日のタスクと運動記録を確定します。'))closeDay()};$('#closeResult').onclick=()=>$('#resultDialog').close();
$('#weightForm').onsubmit=e=>{e.preventDefault();const v=+$('#weightInput').value,key=activityKey();state.weights=weightRecords().filter(w=>w.date!==key);state.weights.push({date:key,value:v});state.weights.sort((a,b)=>a.date.localeCompare(b.date));state.goals.current=v;if($('#currentWeight'))$('#currentWeight').value=String(v);$('#weightInput').value='';addEvent('weight',`体重 ${v}kg を記録`);save()};
$('#saveGoals').onclick=()=>{const maxMinutes=parseInt($('#maxWorkoutMinutes').value)||60;state.goals={...state.goals,current:+$('#currentWeight').value||null,goal:+$('#goalWeight').value||null,date:$('#goalDate').value,maxMinutes:Math.max(30,Math.min(60,maxMinutes)),weeklyTargets:{}};save();alert('目標を保存しました。必要ペースと体重トレンドから週間運動目標を計算します。')};
$('#saveEquipment').onclick=()=>{state.equipment=$$('input[name="equipment"]:checked').map(x=>x.value);save();$('#equipmentStatus').textContent='器具設定を保存しました。';};
$('#addNight').onclick=()=>{if(!$('#nightDate').value){alert('夜勤日を選んでください。');return false}state.nightShifts=state.nightShifts.filter(n=>n.date!==$('#nightDate').value);state.nightShifts.push({date:$('#nightDate').value,start:$('#nightStart').value,end:$('#nightEnd').value,deadline:$('#nightDeadline').value});state.nightShifts.sort((a,b)=>a.date.localeCompare(b.date));save();return true};
$('#saveVacation').onclick=()=>{const start=$('#vacStart').value,end=$('#vacEnd').value;if(!start||!end){alert('開始日と終了日を選んでください。');return false}if(end<start){alert('旅行終了日は開始日以降にしてください。');return false}state.vacation={start,end};save();return true};

$('#saveNotifications').onclick=async()=>{
  if($('#notificationsEnabled').checked&&'Notification'in window&&Notification.permission==='default')await Notification.requestPermission();
  state.notificationSettings={...state.notificationSettings,enabled:$('#notificationsEnabled').checked,morning:$('#morningTime').value,night:$('#nightTime').value};save();
};
$('#testNotification').onclick=async()=>{if('Notification'in window&&Notification.permission==='default')await Notification.requestPermission();sendNotification('QuestLife テスト','通知の表示確認です。')};
$('#applyDebugNow').onclick=()=>{const value=$('#debugNow').value;if(!value)return alert('テスト日時を入力してください。');const d=parseDateTimeLocalValue(value);if(Number.isNaN(d.getTime()))return alert('日時を正しく入力してください。');state.debugNow=d.toISOString();autoFinalizeExpiredLogs();save()};
$('#clearDebugNow').onclick=()=>{state.debugNow=null;$('#debugNow').value='';autoFinalizeExpiredLogs();save()};
$('#addTestRewards').onclick=()=>{state.gold+=500;gainXp(90);addEvent('debug','RPGテスト用に500Gと90EXPを追加');save()};
$('#resetToday').onclick=()=>{if(!confirm(`活動日 ${activityKey()} の記録を消しますか？`))return;delete state.logs[activityKey()];state.events=state.events.filter(e=>e.key!==activityKey());save()};
if($('#runSelfTests'))$('#runSelfTests').onclick=runSelfTests;
$('#exportData').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`QuestLife-backup-${currentCalendarKey()}.json`;a.click();URL.revokeObjectURL(a.href);$('#backupStatus').textContent='バックアップを書き出しました。'};
$('#importDataButton').onclick=()=>$('#importDataFile').click();
$('#importDataFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!data||typeof data!=='object'||!data.logs||!data.tasks)throw new Error('形式が違います');if(!confirm('現在のデータをバックアップ内容で置き換えますか？'))return;state=normalizeState(data);save();$('#backupStatus').textContent='バックアップを復元しました。'}catch(err){alert(`読み込みに失敗しました：${err.message}`)}finally{e.target.value=''}};

$$('.period-tab').forEach(b=>b.onclick=()=>{recordWeightPeriod=b.dataset.days==='all'?'all':Number(b.dataset.days);$$('.period-tab').forEach(x=>x.classList.toggle('active',x===b));renderWeights()});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
$('#currentWeight').value=state.goals.current||'';$('#goalWeight').value=state.goals.goal||'';$('#goalDate').value=state.goals.date||'';if($('#maxWorkoutMinutes'))$('#maxWorkoutMinutes').value=String(state.goals.maxMinutes||60);
autoFinalizeExpiredLogs();lastRenderedActivityKey=activityKey();lastRenderedCalendarKey=currentCalendarKey();
renderAll();

// v6 guide card interactions
(()=>{
  const open=document.querySelector('#openGuide'), dialog=document.querySelector('#guideDialog'), close=document.querySelector('#closeGuide');
  if(open&&dialog) open.addEventListener('click',()=>{setReceptionistDialogView(state.receptionistDialogView||'full');dialog.showModal()});
  if(close&&dialog) close.addEventListener('click',()=>dialog.close());
  if(dialog) dialog.addEventListener('click',e=>{if(e.target===dialog) dialog.close()});
  const finish=document.querySelector('#guideFinishDay');
  if(finish) finish.addEventListener('click',()=>{dialog?.close();document.querySelector('#finishDay')?.click()});
  document.querySelectorAll('#guideDialog .jump-tab').forEach(b=>b.addEventListener('click',()=>dialog?.close()));
  document.querySelectorAll('.receptionist-view-btn').forEach(b=>b.addEventListener('click',()=>setReceptionistDialogView(b.dataset.view,{persist:true})));
  document.querySelectorAll('.receptionist-character-btn').forEach(b=>b.addEventListener('click',()=>setReceptionistCharacter(b.dataset.receptionist)));
})();

// v6.1 settings hub and interactive calendar
(()=>{
  let calendarCursor=new Date(now().getFullYear(),now().getMonth(),1);
  let selectedCalendarDate=activityKey();
  let lastCalendarCurrentKey=currentCalendarKey(),lastCalendarActivityKey=activityKey();
  let editingNightDate=null;
  let editingVacationRange=null;
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
  function setScheduleTab(tab='night'){
    $$('.schedule-tab').forEach(x=>x.classList.toggle('active',x.dataset.scheduleTab===tab));
    $('#nightSchedulePanel')?.classList.toggle('active',tab==='night');
    $('#vacationSchedulePanel')?.classList.toggle('active',tab==='vacation');
  }
  function renderCalendarDetail(k){
    const box=$('#calendarDayDetail');if(!box)return;
    const l=state.logs[k],logTasks=l?tasksForLog(l):state.tasks,done=l?logTasks.filter(t=>l.tasks?.[t.id]).length:0;
    const weight=[...weightRecords()].reverse().find(w=>w.date===k);
    const n=nightForKey(k),vac=isVacationKey(k);
    const extras=[];
    if(n)extras.push(`夜勤 ${n.start}〜翌${n.end}（締切 ${n.deadline}）`);
    if(vac)extras.push('バケーション');
    box.innerHTML=`<b>${k.replaceAll('-','/')}</b><br>タスク ${done}/${logTasks.length}・運動 ${l?.workout?'完了':'未完了'}${weight?`・体重 ${weight.value}kg`:''}${extras.length?`<br>${extras.join(' / ')}`:''}`;
    if(n||vac){
      const actions=document.createElement('div');actions.className='calendar-detail-actions';
      if(n){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='夜勤を編集・取り消し';b.onclick=()=>openSchedule(k,'night');actions.appendChild(b)}
      if(vac){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='バケーションを編集・取り消し';b.onclick=()=>openSchedule(k,'vacation');actions.appendChild(b)}
      box.appendChild(actions);
    }
  }
  function openSchedule(date=selectedCalendarDate,preferredTab=null){
    const d=$('#scheduleDialog');if(!d)return;
    const existingNight=nightForKey(date);
    editingNightDate=existingNight?.date||null;
    $('#nightDate').value=date;
    $('#nightStart').value=existingNight?.start||'22:00';
    $('#nightEnd').value=existingNight?.end||'07:00';
    $('#nightDeadline').value=existingNight?.deadline||'12:00';
    $('#addNight').textContent=existingNight?'夜勤を更新':'夜勤を登録';
    const deleteNight=$('#deleteNight');if(deleteNight){deleteNight.hidden=!existingNight;deleteNight.style.display=existingNight?'':'none'}

    const existingVacation=isVacationKey(date)?state.vacation:null;
    editingVacationRange=existingVacation?{...existingVacation}:null;
    $('#vacStart').value=existingVacation?.start||date;
    $('#vacEnd').value=existingVacation?.end||date;
    $('#saveVacation').textContent=existingVacation?'バケーションを更新':'バケーションを登録';
    const deleteVacation=$('#deleteVacation');if(deleteVacation){deleteVacation.hidden=!existingVacation;deleteVacation.style.display=existingVacation?'':'none'}

    setScheduleTab(preferredTab||(existingNight?'night':existingVacation?'vacation':'night'));
    $('#scheduleDialogTitle').textContent=`${date.replaceAll('-','/')} の予定`;
    d.showModal()
  }
  $('#calendarPrev')?.addEventListener('click',()=>{calendarCursor.setMonth(calendarCursor.getMonth()-1);renderCalendar()});
  $('#calendarNext')?.addEventListener('click',()=>{calendarCursor.setMonth(calendarCursor.getMonth()+1);renderCalendar()});
  $('#openSchedule')?.addEventListener('click',()=>openSchedule());
  $$('.settings-tile').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.settingsDialog)?.showModal()));
  $$('.close-settings').forEach(b=>b.addEventListener('click',()=>b.closest('dialog')?.close()));
  $$('.settings-dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));
  $$('.schedule-tab').forEach(b=>b.addEventListener('click',()=>setScheduleTab(b.dataset.scheduleTab)));
  $('#nightDate')?.addEventListener('change',()=>{
    const date=$('#nightDate').value,existing=nightForKey(date);
    editingNightDate=existing?.date||null;
    if(existing){$('#nightStart').value=existing.start;$('#nightEnd').value=existing.end;$('#nightDeadline').value=existing.deadline}
    $('#addNight').textContent=existing?'夜勤を更新':'夜勤を登録';
    const del=$('#deleteNight');if(del){del.hidden=!existing;del.style.display=existing?'':'none'}
  });
  const oldRenderAll=renderAll; renderAll=function(){const ck=currentCalendarKey(),ak=activityKey();if(ck!==lastCalendarCurrentKey){calendarCursor=new Date(now().getFullYear(),now().getMonth(),1);lastCalendarCurrentKey=ck}if(ak!==lastCalendarActivityKey){selectedCalendarDate=ak;lastCalendarActivityKey=ak}oldRenderAll();renderCalendar()};
  const oldAddNight=$('#addNight')?.onclick;if($('#addNight'))$('#addNight').onclick=()=>{const ok=oldAddNight?.();renderCalendar();if(ok!==false)$('#scheduleDialog')?.close();return ok};
  const oldSaveVacation=$('#saveVacation')?.onclick;if($('#saveVacation'))$('#saveVacation').onclick=()=>{const ok=oldSaveVacation?.();renderCalendar();if(ok!==false)$('#scheduleDialog')?.close();return ok};
  if($('#deleteNight'))$('#deleteNight').onclick=()=>{
    const date=editingNightDate||$('#nightDate').value;
    const existing=nightForKey(date);
    if(!existing){alert('取り消せる夜勤登録が見つかりません。カレンダーで🌙の日を選んでください。');return}
    if(!confirm(`${date.replaceAll('-','/')} の夜勤登録を取り消しますか？`))return;
    state.nightShifts=state.nightShifts.filter(n=>n.date!==date);
    editingNightDate=null;
    addEvent('schedule',`夜勤登録を取り消し（${date}）`,date);
    save(false);renderAll();$('#scheduleDialog')?.close();
  };
  if($('#deleteVacation'))$('#deleteVacation').onclick=()=>{
    const v=editingVacationRange||state.vacation;
    if(!v||!state.vacation){alert('取り消せるバケーション登録が見つかりません。カレンダーで🌴の日を選んでください。');return}
    if(!confirm(`${v.start.replaceAll('-','/')}〜${v.end.replaceAll('-','/')} のバケーション登録を取り消しますか？`))return;
    state.vacation=null;
    editingVacationRange=null;
    addEvent('schedule',`バケーション登録を取り消し（${v.start}〜${v.end}）`,v.start);
    save(false);renderAll();$('#scheduleDialog')?.close();
  };
  const rm=$('#reduceMotion'),cm=$('#compactMode');
  const ui=JSON.parse(localStorage.getItem('questlife-ui')||'{}');if(rm){rm.checked=!!ui.reduceMotion;document.body.classList.toggle('reduce-motion',!!ui.reduceMotion);rm.onchange=()=>{ui.reduceMotion=rm.checked;localStorage.setItem('questlife-ui',JSON.stringify(ui));document.body.classList.toggle('reduce-motion',rm.checked)}}if(cm){cm.checked=!!ui.compact;document.body.classList.toggle('compact',!!ui.compact);cm.onchange=()=>{ui.compact=cm.checked;localStorage.setItem('questlife-ui',JSON.stringify(ui));document.body.classList.toggle('compact',cm.checked)}}
  renderCalendar();
})();
setInterval(reconcileClock,30000);
