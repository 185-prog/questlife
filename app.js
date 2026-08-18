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

const APP_DATA_VERSION=22;
const defaults={version:APP_DATA_VERSION,tasks:[],logs:{},weeklyFood:{},xp:0,level:1,gold:0,streak:0,inventory:['旅人の服'],equippedGear:{weapon:null,armor:'旅人の服',accessory:null},danger:[],lost:[],weights:[],goals:{},equipment:['mat','dumbbell'],nightShifts:[],vacation:null,gender:'male',receptionist:'blonde',receptionistDialogView:'full',adventure:{area:'beginner_forest',step:0,travelPoints:0,cleared:false,cycle:1,bossWins:0,history:[],rewarded:[]},lastClosed:null,firstClosedDate:null,closedCount:0,events:[],debugNow:null};

// RPGの見た目と内容はここに集約。image を画像パスへ変更すれば後から差し替え可能。
const GAME_CONTENT={
  hero:{default:{image:null,maleIcon:'⚔',femaleIcon:'⚔'}},
  receptionist:{
    blonde:{name:'受付嬢',image:'./assets/receptionist-blonde.png',faceImage:'./assets/receptionist-blonde-face.png',tone:'bright'},
    brunette:{name:'受付嬢',image:'./assets/receptionist-brunette.png',faceImage:'./assets/receptionist-brunette-face.png',tone:'soft'}
  },
  equipment:{
    '旅人の服':{image:null,icon:'◇',rarity:'★',slot:'armor',power:1,price:0},
    '木の剣':{image:null,icon:'🗡',rarity:'★',slot:'weapon',power:3,price:60},
    '革の鎧':{image:null,icon:'🛡',rarity:'★',slot:'armor',power:4,price:90},
    '幸運のお守り':{image:null,icon:'✦',rarity:'★★',slot:'accessory',power:2,price:120},
    '鉄の剣':{image:null,icon:'⚔',rarity:'★★',slot:'weapon',power:7,price:180},
    '森守りのお守り':{image:null,icon:'❈',rarity:'★★★',slot:'accessory',power:5,price:0}
  }
};
const GEAR_SLOTS={weapon:'武器',armor:'防具',accessory:'アクセサリー'};
const SHOP_CATALOG=['木の剣','革の鎧','幸運のお守り','鉄の剣'];
const ADVENTURE_AREAS={
  beginner_forest:{
    id:'beginner_forest',number:'AREA 01',name:'はじまりの森',subtitle:'ギルドの外に広がる、最初の遠征地。',
    nodes:[
      {name:'冒険者ギルド',short:'出発地点',icon:'⌂',x:16,y:88,event:'受付嬢に見送られ、遠征の準備が整った。'},
      {name:'風渡り草原',short:'草原',icon:'✧',x:72,y:76,event:'草原を抜け、森の入口が見えてきた。'},
      {name:'ささやきの森',short:'森の入口',icon:'♧',x:24,y:63,event:'木々の奥から、不思議な鳴き声が聞こえる。'},
      {name:'木漏れ日の宝箱',short:'宝箱',icon:'◇',x:76,y:50,event:'古い宝箱を発見した。中には冒険に役立つものがありそうだ。'},
      {name:'鍛錬の小径',short:'試練',icon:'⚔',x:26,y:37,event:'険しい小径を越えた。日々の鍛錬が、確かな力になっている。'},
      {name:'星明かりの野営地',short:'キャンプ',icon:'△',x:70,y:24,event:'森の奥で安全な野営地を見つけた。ボスの気配はすぐ近くだ。'},
      {name:'森の守護者',short:'BOSS',icon:'♛',x:50,y:8,event:'森の守護者との戦いを制し、はじまりの森を踏破した！'}
    ]
  }
};
function gameItemInfo(type,name){return GAME_CONTENT[type]?.[name]||{image:null,icon:'◇',rarity:'★'}}
function visualHtml(info,fallback){return info?.image?`<img src="${esc(info.image)}" alt="">`:`<span>${esc(info?.icon||fallback)}</span>`}
const MAX_LEVEL=50;
function levelXpRequirement(level=state.level){const lv=Math.max(1,Math.floor(+level||1));return lv>=MAX_LEVEL?0:60+(lv-1)*4}
function heroTitle(level=state.level){return level>=50?'ギルドの英雄':level>=41?'英雄候補':level>=31?'ギルドの精鋭':level>=21?'熟練冒険者':level>=11?'一人前の冒険者':level>=6?'駆け出し冒険者':'見習い冒険者'}
function receptionistBondStage(level=state.level){
  if(level>=50)return{key:'chapter1',name:'第1章・特別な絆',min:50,max:50,next:null};
  if(level>=41)return{key:'longtime',name:'長い付き合い',min:41,max:49,next:50};
  if(level>=31)return{key:'special',name:'特別な存在',min:31,max:40,next:41};
  if(level>=21)return{key:'close',name:'親しい冒険者',min:21,max:30,next:31};
  if(level>=11)return{key:'trust',name:'信頼',min:11,max:20,next:21};
  if(level>=6)return{key:'familiar',name:'顔なじみ',min:6,max:10,next:11};
  return{key:'newcomer',name:'新人冒険者',min:1,max:5,next:6};
}
function workoutStats(){
  const keys=Object.keys(state.logs||{}).filter(k=>state.logs[k]?.workout).sort();
  const total=keys.length,today=activityKey();let cursor=state.logs[today]?.workout?today:addDays(today,-1),streak=0;
  while(state.logs[cursor]?.workout&&streak<366){streak++;cursor=addDays(cursor,-1)}
  let recent7=0;for(let i=0;i<7;i++)if(state.logs[addDays(today,-i)]?.workout)recent7++;
  return{total,streak,recent7,last:keys.at(-1)||null};
}
function receptionistBondLine(){
  const stage=receptionistBondStage(),w=workoutStats();
  const lines={
    newcomer:`まだ始まったばかりですね。筋トレを重ねるたび、冒険者としての成長をちゃんと記録しています。`,
    familiar:`最近は受付でお顔を見る機会が増えましたね。運動を続けているのも、ちゃんと覚えていますよ。`,
    trust:`ここまで続けてきた回数は${w.total}回。最初の頃より、ずっと安定してきましたね。`,
    close:`今日も来るかなって、少し気にしていました。ここまで続けてきた姿を見ていると、応援にも力が入ります。`,
    special:`あなたの記録を見るのが、もう私の日課みたいになっています。積み重ねてきた時間は本物ですよ。`,
    longtime:`ずいぶん長い付き合いになりましたね。調子の良い日も難しい日も、ここまで続けてきたことを私は知っています。`,
    chapter1:`Lv.50到達、本当におめでとうございます。新人だった頃からここまで、ずっと成長を見届けられて嬉しいです。`
  };
  return lines[stage.key];
}
function receptionistLevelUpMessage(beforeLevel,afterLevel){
  const info=receptionistInfo(),soft=info?.tone==='soft',w=workoutStats(),lv=afterLevel;
  const milestone={
    5:soft?'Lv.5ですね。最初の頃より、少しずつ習慣になってきましたね。':'Lv.5です！少しずつですが、確実に強くなっていますよ！',
    10:soft?'Lv.10、おめでとうございます。最近はもう、受付でお顔を見ると少し安心するようになりました。':'Lv.10達成です！最近よく来てくれる冒険者さん、ってすっかり覚えましたよ！',
    20:soft?`Lv.20ですね。これまでの運動は${w.total}回。積み重ねって、こうして形になるんですね。`:`Lv.20です！運動${w.total}回分の積み重ね、ちゃんと強さになっています！`,
    30:soft?'Lv.30……ここまで来ると、ただの担当冒険者という感じではなくなってきましたね。これからも見届けさせてください。':'Lv.30！ここまで一緒に進んできたと思うと、私まで嬉しくなります。まだ先も見たいです！',
    40:soft?'Lv.40ですね。あなたが頑張ってきた日をたくさん知っているから、この数字は私にも特別に見えます。':'Lv.40です！簡単に届く場所じゃありません。ずっと続けてきたあなたの強さですよ！',
    50:soft?'Lv.50、本当におめでとうございます。新人だった頃から今日まで、ずっと成長を見られたことが嬉しいです。これで第1章は一区切りですね。':'Lv.50到達です！新人だった頃から、ここまでずっと見てきました。第1章クリア、本当におめでとうございます！'
  };
  const crossed=[50,40,30,20,10,5].find(m=>beforeLevel<m&&lv>=m);if(crossed)return milestone[crossed];
  const stage=receptionistBondStage(lv);
  const generic={newcomer:'レベルアップですね。今日の積み重ねも、ちゃんと力になっていますよ。',familiar:'また一つ強くなりましたね。最近の頑張り、受付から見ていても分かります。',trust:'レベルアップ、おめでとうございます。続けてきた分だけ、成長が安定してきましたね。',close:'またレベルが上がりましたね。こうして成長を見られるの、少し楽しみになっているんです。',special:'レベルアップですね。ここまで長く続けられる人は多くありません。あなたらしい強さだと思います。',longtime:'また一つ積み重なりましたね。数字以上に、続けてきた時間の重みを感じます。',chapter1:'Lv.50到達済みです。ここまでの積み重ねは、もう立派な冒険の記録ですよ。'};
  return generic[stage.key];
}
function receptionistInfo(){return GAME_CONTENT.receptionist?.[state.receptionist]||GAME_CONTENT.receptionist.blonde}
function receptionistGreeting(){const h=now().getHours();return h<11?'おはようございます':h<18?'こんにちは':'お疲れさまです'}
function receptionistCopy(log,c,percent){
  const info=receptionistInfo(),soft=info?.tone==='soft',greet=receptionistGreeting(),taskTotal=c.total,bond=receptionistBondLine();
  const wrap=text=>`${text}\n\n${bond}`;
  if(mode()==='vacation')return{short:'今日は冒険をお休みして、旅を楽しみましょう。',long:wrap(soft?'今日はギルドの依頼もお休みです。帰ってきたら、また一緒に続きを始めましょうね。':'今日は通常依頼はお休みです！しっかり楽しんで、帰ってきたらまた冒険を再開しましょう。')};
  if(log.closed)return{short:'今日の記録は確定済みです。ゆっくり休みましょう。',long:wrap(soft?'今日もお疲れさまでした。運動の記録もきちんと残っています。次の活動日に備えて休んでくださいね。':'今日もお疲れさまでした！今日の積み重ねはしっかり記録しました。次に備えて休みましょう！')};
  if(mode()==='night')return{short:'夜勤日です。無理せず、できることから進めましょう。',long:wrap(soft?`${greet}。今日は夜勤日ですね。筋トレも無理のない範囲で大丈夫ですよ。`:`${greet}！今日は夜勤日です。無理はせず、できる範囲のメニューで積み重ねましょう！`)};
  if(taskTotal===0&&!log.workout)return{short:'今日は運動から始めても大丈夫ですよ。',long:wrap(soft?`${greet}。毎日の依頼はまだ登録されていませんが、運動だけでも冒険者としての経験になりますよ。`:`${greet}！タスクがなくても筋トレはしっかり経験になります。まず今日のメニューを見てみましょう！`)};
  if(log.workout&&c.done===taskTotal&&taskTotal>0)return{short:'今日の筋トレ完了。とてもいい一日です！',long:wrap(soft?'筋トレも毎日の依頼も終わっています。今日の経験はしっかり積み上がりますよ。':'筋トレも依頼も完了です！「今日を終了する」でEXPと遠征結果を確定しましょう！')};
  if(log.workout)return{short:'筋トレ完了！ 今日も経験を積めましたね。',long:wrap(soft?'今日の運動はもう完了しています。こういう一日の積み重ねが、レベルにちゃんと表れていきますよ。':'今日の筋トレ、完了ですね！この積み重ねがそのまま冒険者EXPになりますよ！')};
  if(c.done===taskTotal&&taskTotal>0)return{short:'タスクは全達成。あとは今日の運動ですね。',long:wrap(soft?'毎日の依頼は全部終わりました。余力があれば、今日の運動も進めて経験を積みましょう。':'依頼は全達成です！あとは今日の筋トレを終えて、冒険者EXPを獲得しましょう！')};
  if(c.done===0)return{short:'まずは今日の筋トレを始めてみましょう。',long:wrap(soft?`${greet}。全部を一度にやらなくて大丈夫です。まずは今日の運動メニューから始めてみませんか？`:`${greet}！まずは今日の筋トレから始めましょう。終われば、ちゃんと成長につながります！`)};
  return{short:`${c.done}/${taskTotal}件完了。筋トレも忘れずに。`,long:wrap(soft?`今日は${c.done}/${taskTotal}件完了しています。次の一つか、今日の運動を選んで進めましょう。`:`今日は${c.done}/${taskTotal}件完了です！次の依頼か筋トレ、始めやすい方から進めましょう！`)};
}
function setReceptionistDialogView(view,{persist=false}={}){
  state.receptionistDialogView=view==='face'?'face':'full';
  const visual=$('#receptionistDialogVisual');if(visual)visual.dataset.view=state.receptionistDialogView;
  $$('.receptionist-view-btn').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.view===state.receptionistDialogView));
  renderReceptionistVisual('#receptionistDialogImage','#receptionistDialogVisual',state.receptionistDialogView);
  if(persist)localStorage.setItem('questlife',JSON.stringify(state));
}
function setReceptionistCharacter(kind,{persist=true}={}){
  if(!GAME_CONTENT.receptionist?.[kind])return;state.receptionist=kind;
  $$('.receptionist-character-btn').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.receptionist===kind));
  if(persist)save();else renderAll();
}
function renderReceptionistVisual(imageSelector,visualSelector,view='full'){
  const img=$(imageSelector),visual=$(visualSelector),info=receptionistInfo();if(!img||!visual)return;
  const src=view==='face'?(info?.faceImage||info?.image):info?.image;
  visual.dataset.receptionist=state.receptionist;visual.dataset.view=view;visual.classList.remove('has-receptionist-image');
  if(!src){img.removeAttribute('src');return}img.onload=()=>visual.classList.add('has-receptionist-image');img.onerror=()=>visual.classList.remove('has-receptionist-image');
  if(img.getAttribute('src')!==src)img.setAttribute('src',src);else if(img.complete&&img.naturalWidth)visual.classList.add('has-receptionist-image');
}
function renderReceptionist(log,c,percent){
  const info=receptionistInfo(),copy=receptionistCopy(log,c,percent),bond=receptionistBondStage();
  if($('#receptionistCardLabel'))$('#receptionistCardLabel').textContent=info?.name||'受付嬢';
  if($('#todaySummary'))$('#todaySummary').textContent=copy.short;
  if($('#guideLongMessage'))$('#guideLongMessage').textContent=copy.long;
  if($('#receptionistDialogTitle'))$('#receptionistDialogTitle').textContent='受付嬢からのご案内';
  if($('#receptionistBondBadge'))$('#receptionistBondBadge').textContent=`Lv.${state.level} · ${bond.name}`;
  $$('.receptionist-character-btn').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.receptionist===state.receptionist));
  renderReceptionistVisual('#receptionistCardImage','#receptionistCardVisual','face');renderReceptionistVisual('#receptionistDialogImage','#receptionistDialogVisual',state.receptionistDialogView||'full');setReceptionistDialogView(state.receptionistDialogView||'full');
}
function ownedGear(){return(state.inventory||[]).filter(name=>!!GAME_CONTENT.equipment?.[name])}
function gearPower(){return Object.values(state.equippedGear||{}).reduce((sum,name)=>sum+(name?toFiniteNumber(gameItemInfo('equipment',name).power)||0:0),0)}
function heroPower(){return Math.max(1,state.level)+gearPower()}
function adventurePower(){return heroPower()}
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
  ['tasks','inventory','danger','lost','weights','nightShifts','events'].forEach(k=>{if(!Array.isArray(s[k]))s[k]=clone(defaults[k])});
  ['logs','weeklyFood','goals'].forEach(k=>{if(!s[k]||typeof s[k]!=='object'||Array.isArray(s[k]))s[k]=clone(defaults[k])});
  s.equipment=Array.isArray(s.equipment)?s.equipment:['mat','dumbbell'];
  s.receptionist=GAME_CONTENT.receptionist?.[s.receptionist]?s.receptionist:'blonde';
  s.receptionistDialogView=s.receptionistDialogView==='face'?'face':'full';
  const rawAdventure=s.adventure&&typeof s.adventure==='object'&&!Array.isArray(s.adventure)?s.adventure:{};
  s.adventure={...clone(defaults.adventure),...rawAdventure};
  if(!ADVENTURE_AREAS[s.adventure.area])s.adventure.area='beginner_forest';
  const areaMax=ADVENTURE_AREAS[s.adventure.area].nodes.length-1;
  s.adventure.step=Math.max(0,Math.min(areaMax,Math.floor(toFiniteNumber(s.adventure.step)||0)));
  s.adventure.travelPoints=Math.max(0,Math.min(1,Math.floor(toFiniteNumber(s.adventure.travelPoints)||0)));
  s.adventure.cleared=!!s.adventure.cleared||s.adventure.step>=areaMax;
  s.adventure.cycle=Math.max(1,Math.floor(toFiniteNumber(s.adventure.cycle)||1));s.adventure.bossWins=Math.max(s.adventure.cleared?1:0,Math.floor(toFiniteNumber(s.adventure.bossWins)||0));
  s.adventure.history=Array.isArray(s.adventure.history)?s.adventure.history.slice(-60):[];
  s.adventure.rewarded=Array.isArray(s.adventure.rewarded)?[...new Set(s.adventure.rewarded.map(Number).filter(Number.isFinite))]:[];
  const rawEquipped=raw?.equippedGear;
  s.equippedGear=rawEquipped&&typeof rawEquipped==='object'&&!Array.isArray(rawEquipped)?{...clone(defaults.equippedGear),...rawEquipped}:clone(defaults.equippedGear);
  for(const slot of Object.keys(GEAR_SLOTS)){const name=s.equippedGear[slot];if(name&&(!s.inventory.includes(name)||gameItemInfo('equipment',name).slot!==slot))s.equippedGear[slot]=null}
  s.inventory=[...new Set(s.inventory.filter(name=>!!GAME_CONTENT.equipment?.[name]))];if(!s.inventory.includes('旅人の服'))s.inventory.unshift('旅人の服');delete s.party;
  s.danger=s.danger.filter(x=>x&&!/スライム|ドラゴン|精霊|ゴーレム|モンスター/.test(String(x.name||x)));s.lost=s.lost.filter(x=>x&&!/スライム|ドラゴン|精霊|ゴーレム|モンスター/.test(String(x.name||x)));
  s.level=Math.max(1,Math.min(MAX_LEVEL,Math.floor(toFiniteNumber(s.level)||1)));s.xp=s.level>=MAX_LEVEL?0:Math.max(0,Math.floor(toFiniteNumber(s.xp)||0));s.gold=Math.max(0,Math.floor(toFiniteNumber(s.gold)||0));s.streak=Math.max(0,Math.floor(toFiniteNumber(s.streak)||0));
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
function renderHero(){const next=levelXpRequirement();$('#level').textContent=state.level;$('#xp').textContent=state.level>=MAX_LEVEL?'MAX':state.xp;$('#xpNext').textContent=state.level>=MAX_LEVEL?'MAX':next;$('#xpBar').style.width=state.level>=MAX_LEVEL?'100%':Math.min(100,state.xp/next*100)+'%';$('#streakCount').textContent=state.streak;$('#avatar').textContent=state.gender==='female'?'👩':'🧑';$('#heroName').textContent=heroTitle()}
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
function updateBattle(){const log=dayLog(),c=completion(log),td=c.total?c.done/c.total:0;const chance=Math.round(20+td*35+(log.workout?40:0));$('#battleChance').textContent=`勝率 ${Math.max(5,Math.min(100,chance))}%`;$('#battlePreview').textContent=log.closed?'この活動日は確定済みです。':chance>=80?'鍛錬の成果が出ています。ボスにも十分挑めそうです。':chance>=50?'勝負になります。今日の筋トレでさらに力をつけましょう。':'まずは今日の筋トレを終えて、戦う準備を整えましょう。'}
function questSummary(log=dayLog()){
  const tasks=tasksForLog(log),taskDone=tasks.filter(t=>log.tasks?.[t.id]).length,taskTotal=tasks.length,workoutDone=!!log.workout;
  const questTotal=taskTotal+1,questDone=taskDone+(workoutDone?1:0),tasksAll=taskTotal>0&&taskDone===taskTotal,all=tasksAll&&workoutDone;
  return{taskDone,taskTotal,workoutDone,questDone,questTotal,tasksAll,all,ratio:questTotal?questDone/questTotal:0};
}
function questReward(log=dayLog(),key=activityKey()){
  const q=questSummary(log),recovery=planOfDate(key).focus==='recovery';
  const workoutXp=q.workoutDone?(recovery?10:20):0,taskXp=q.tasksAll?5:0,bonusXp=0;
  const taskGold=q.taskDone*8,workoutGold=q.workoutDone?20:0,bonusGold=q.all?30:0;
  const xp=workoutXp+taskXp,gold=taskGold+workoutGold+bonusGold;
  const grade=q.all?'S':q.ratio>=.8?'A':q.ratio>=.6?'B':q.questDone>0?'C':'D';
  return{...q,taskXp,taskGold,workoutXp,workoutGold,bonusXp,bonusGold,xp,gold,grade,recovery};
}
function adventureArea(){return ADVENTURE_AREAS[state.adventure?.area]||ADVENTURE_AREAS.beginner_forest}
function adventurePointsForReward(reward){return reward.workoutDone?(reward.tasksAll?2:1):0}
function adventureMilestoneReward(step){
  const adv=state.adventure;if(adv.rewarded.includes(step))return{text:'',xp:0,gold:0};adv.rewarded.push(step);
  if(step===3){state.gold+=50;return{text:'宝箱から 50G を手に入れた！',xp:0,gold:50}}
  if(step===4){state.gold+=30;return{text:'鍛錬の小径を突破。遠征報酬 30G！',xp:0,gold:30}}
  if(step===6){let parts=['BOSS撃破！ 討伐報酬 150G','+100 EXP'];state.adventure.bossWins=(state.adventure.bossWins||0)+1;state.gold+=150;if(!state.inventory.includes('森守りのお守り')){state.inventory.push('森守りのお守り');parts.push('「森守りのお守り」を入手')}return{text:parts.join(' / '),xp:100,gold:150}}
  return{text:'',xp:0,gold:0};
}
function processAdventureDay(key,reward){
  const adv=state.adventure,area=adventureArea(),last=area.nodes.length-1,points=adventurePointsForReward(reward);
  if(adv.cleared&&points===0)return{points:0,beforeStep:adv.step,afterStep:adv.step,advanced:0,cleared:true,event:`第${adv.cycle}遠征は踏破済みです。次の筋トレで新しい遠征が始まります。`,rewardText:'',bonusXp:0,cycle:adv.cycle};
  if(adv.cleared&&points>0){adv.cycle=(adv.cycle||1)+1;adv.step=0;adv.travelPoints=0;adv.cleared=false;adv.rewarded=[]}
  const beforeStep=adv.step,beforeCarry=adv.travelPoints,total=beforeCarry+points;
  const possibleAdvance=Math.floor(total/2),afterStep=Math.min(last,beforeStep+possibleAdvance);
  adv.travelPoints=afterStep>=last?0:total%2;adv.step=afterStep;
  const rewards=[];let bonusXp=0;for(let st=beforeStep+1;st<=afterStep;st++){const r=adventureMilestoneReward(st);if(r.text)rewards.push(r.text);bonusXp+=r.xp||0}
  if(afterStep>=last)adv.cleared=true;
  const node=area.nodes[afterStep];
  const event=points===0?'今日は遠征を進めず、ギルドで体を休めた。':afterStep>beforeStep?node.event:`筋トレで遠征力を${points}pt獲得。次の地点まで、あと${2-adv.travelPoints}pt。`;
  const outcome={key,cycle:adv.cycle,points,beforeStep,afterStep,advanced:afterStep-beforeStep,cleared:adv.cleared,event,rewardText:rewards.join(' / '),bonusXp,location:node.name};
  adv.history.push(outcome);adv.history=adv.history.slice(-60);return outcome;
}
function adventurePreview(reward){
  const adv=state.adventure,area=adventureArea(),last=area.nodes.length-1,points=adventurePointsForReward(reward);
  if(adv.cleared)return{points,afterStep:last,advanced:0,text:points?'次の遠征を開始できます':`第${adv.cycle}遠征 CLEAR`};
  const total=adv.travelPoints+points,afterStep=Math.min(last,adv.step+Math.floor(total/2));
  const advanced=afterStep-adv.step;
  return{points,afterStep,advanced,text:points===0?'筋トレ完了で遠征力を獲得できます':advanced?`筋トレの成果で ${advanced}マス進行予定`:`次の地点まであと ${2-(total%2)}pt`};
}
function renderAdventureScreen(log,reward){
  const adv=state.adventure,area=adventureArea(),last=area.nodes.length-1,preview=adventurePreview(reward),w=workoutStats(),bond=receptionistBondStage(),next=levelXpRequirement();
  const set=(id,text)=>{const e=$(id);if(e)e.textContent=text};
  set('#adventureAreaNo',area.number);set('#adventureAreaName',area.name);set('#adventureAreaSubtitle',area.subtitle);
  set('#adventureStatus',adv.cleared?`BOSS ×${adv.bossWins||0}`:`第${adv.cycle}遠征 ${adv.step}/${last}`);set('#adventureCurrentLocation',area.nodes[adv.step].name);
  const todayOutcome=log.closed?log.result?.adventure:null,points=log.closed?(todayOutcome?.points||0):preview.points;
  set('#adventureTodayPower',log.closed?`+${points}pt 確定`:`+${points}pt`);set('#adventureTodayText',log.closed?(todayOutcome?.event||'本日の遠征は確定済みです。'):preview.text);
  const nextNode=area.nodes[Math.min(last,adv.step+1)];set('#adventureNextHint',adv.cleared?`受付嬢「ボス討伐${adv.bossWins||0}回目です！ 次の筋トレで第${adv.cycle+1}遠征に出発できますよ。」`:`受付嬢「次は『${nextNode.name}』です。今日の鍛錬が遠征を進めますよ。」`);
  const powerBar=$('#adventureTodayBar');if(powerBar)powerBar.style.width=`${Math.min(100,points/2*100)}%`;
  const map=$('#adventureMap');if(map){const path=area.nodes.map(n=>`${n.x},${n.y}`).join(' ');map.innerHTML=`<svg class="adventure-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${path}"/></svg>`+area.nodes.map((n,i)=>{const status=adv.cleared&&i===last?'is-cleared':i<adv.step?'is-passed':i===adv.step?'is-current':'is-locked';return `<div class="adventure-node ${status}" style="--x:${n.x}%;--y:${n.y}%"><div class="adventure-node-icon">${esc(n.icon)}</div><div class="adventure-node-label"><b>${esc(n.short)}</b><span>${esc(n.name)}</span></div>${i===adv.step&&!adv.cleared?'<i class="adventure-here">現在地</i>':''}</div>`}).join('')}
  set('#adventureHeroLevel',`Lv.${state.level}`);set('#adventureHeroTitle',heroTitle());set('#adventureXpText',state.level>=MAX_LEVEL?'MAX':`${state.xp}/${next} EXP`);set('#adventureWorkoutCount',`${w.total}回`);set('#adventureWorkoutStreak',`${w.streak}日`);set('#adventureBossWins',`${adv.bossWins||0}回`);set('#adventureBondStage',bond.name);set('#adventureNextBond',bond.next?`次の変化 Lv.${bond.next}`:'第1章到達');
  const xpbar=$('#adventureXpBar');if(xpbar)xpbar.style.width=state.level>=MAX_LEVEL?'100%':`${Math.min(100,state.xp/next*100)}%`;
}
function gainXp(n){
  const gained=Math.max(0,Math.floor(toFiniteNumber(n)||0)),beforeLevel=state.level;let remaining=gained;
  if(state.level>=MAX_LEVEL)return{gained:0,beforeLevel,afterLevel:state.level,levelsGained:0};
  state.xp+=remaining;
  while(state.level<MAX_LEVEL){const need=levelXpRequirement(state.level);if(state.xp<need)break;state.xp-=need;state.level++}
  if(state.level>=MAX_LEVEL)state.xp=0;
  return{gained,beforeLevel,afterLevel:state.level,levelsGained:state.level-beforeLevel};
}
function showResult(icon,title,body){$('#resultVisual').textContent=icon;$('#resultTitle').textContent=title;$('#resultBody').style.whiteSpace='pre-line';$('#resultBody').textContent=body;$('#resultDialog').showModal()}
function showQuestResult(result,xpInfo){
  const icon={S:'★',A:'A',B:'B',C:'C',D:'—'}[result.grade]||'✓',info=receptionistInfo();
  $('#resultVisual').textContent=icon;$('#resultTitle').textContent='冒険結果';$('#resultBody').style.whiteSpace='normal';
  const levelUp=xpInfo.levelsGained>0?`<div class="quest-levelup">LEVEL UP！ Lv.${xpInfo.beforeLevel} → Lv.${xpInfo.afterLevel}</div><div class="levelup-receptionist"><img src="${esc(info.faceImage||info.image||'')}" alt=""><div><span>受付嬢</span><p>${esc(receptionistLevelUpMessage(xpInfo.beforeLevel,xpInfo.afterLevel))}</p></div></div>`:'';
  const adv=result.adventure;const adventureHtml=adv?`<div class="adventure-result-card"><span>本日の遠征</span><h3>${adv.cleared?'AREA CLEAR！':adv.advanced?`${adv.advanced}マス進んだ！`:`遠征力 +${adv.points}pt`}</h3><p>${esc(adv.event||'')}</p>${adv.rewardText?`<b>${esc(adv.rewardText)}</b>`:''}</div>`:'';
  const xpNote=result.bossXp?`<p class="quest-bonus boss-exp">ボス撃破ボーナス +${result.bossXp} EXP</p>`:result.workoutXp?`<p class="quest-bonus">筋トレEXP +${result.workoutXp}${result.taskXp?` / タスク全達成 +${result.taskXp}`:''}</p>`:'';
  $('#resultBody').innerHTML=`<div class="quest-result-grade"><span>評価</span><strong>${esc(result.grade)}</strong></div>${adventureHtml}<div class="quest-result-grid"><div><span>タスク</span><b>${result.taskDone}/${result.taskTotal}</b></div><div><span>筋トレ</span><b>${result.workoutDone?'達成':'未達成'}</b></div><div><span>累計筋トレ</span><b>${workoutStats().total}回</b></div></div><div class="quest-reward-row"><div><span>EXP</span><strong>+${result.xp}</strong></div><div><span>GOLD</span><strong>+${result.gold}G</strong></div></div>${xpNote}${levelUp}`;
  $('#resultDialog').showModal();
}
function finalizeDay(key,{automatic=false,show=true}={}){
  const log=dayLog(key);if(log.closed)return false;
  if(isVacationDate(key)){
    log.closed=true;log.closedAt=now().toISOString();log.result={vacation:true,all:null,done:0,total:0,xp:0,gold:0,grade:'休息'};
    addEvent('vacation','旅行記録を保存し、通常の鍛錬を一時停止',key);
    if(automatic)addEvent('auto-close','締切到達により自動確定',key);
    if(show)showResult('🏝️','旅の記録','今日は休息日です。連続記録は維持され、通常の鍛錬EXPや遠征進行はありません。');
    return true;
  }
  const reward=questReward(log,key);state.gold+=reward.gold;
  const adventureResult=processAdventureDay(key,reward),totalXp=reward.xp+(adventureResult.bonusXp||0),xpInfo=gainXp(totalXp);
  if(reward.all)state.streak++;else state.streak=0;
  log.closed=true;log.closedAt=now().toISOString();
  log.result={all:reward.all,done:reward.taskDone,total:reward.taskTotal,taskDone:reward.taskDone,taskTotal:reward.taskTotal,questDone:reward.questDone,questTotal:reward.questTotal,workout:reward.workoutDone,workoutDone:reward.workoutDone,workoutXp:reward.workoutXp,taskXp:reward.taskXp,bossXp:adventureResult.bonusXp||0,xp:totalXp,gold:reward.gold,grade:reward.grade,levelBefore:xpInfo.beforeLevel,levelAfter:xpInfo.afterLevel,adventure:adventureResult};
  state.lastClosed=key;state.firstClosedDate??=key;state.closedCount++;
  addEvent('quest',`評価${reward.grade} / 筋トレ${reward.workoutDone?'達成':'未達'} / +${totalXp}EXP / +${reward.gold}G`,key);
  if(reward.all)addEvent('complete','本日の全依頼を達成',key);
  if(xpInfo.levelsGained)addEvent('levelup',`Lv.${xpInfo.beforeLevel} → Lv.${xpInfo.afterLevel}`,key);
  if(automatic)addEvent('auto-close','締切到達により自動確定',key);
  if(show)showQuestResult(log.result,xpInfo);
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
    ok('必須UI要素',()=>{for(const id of ['today','workout','quest','record','settings','adventureHeroLevel','adventureBondStage'])expect(!!$('#'+id),`#${id} がありません`)});
    ok('仲間モンスターUI廃止',()=>{expect(!$('#openMonstersPanel')&&!$('#monstersDialog'),'仲間モンスターUIが残っています')});
    ok('旧モンスターデータ移行削除',()=>{state=normalizeState({inventory:['旅人の服','ひよこスライム','こぐまゴーレム'],party:['ひよこスライム']});expect(state.inventory.length===1&&state.inventory[0]==='旅人の服'&&!('party' in state),'旧モンスターデータが残っています')});
    ok('通常筋トレEXP',()=>{state=normalizeState({tasks:[{id:'a',name:'A'}],debugNow:parseLocal('2026-08-10','10:00').toISOString()});const l=dayLog();l.workout=true;const r=questReward(l,'2026-08-10');expect(r.workoutXp===20&&r.xp===20,'通常筋トレEXPが不正')});
    ok('全タスク補助EXP',()=>{state=normalizeState({tasks:[{id:'a',name:'A'}],debugNow:parseLocal('2026-08-10','10:00').toISOString()});const l=dayLog();l.tasks.a=true;l.workout=true;const r=questReward(l,'2026-08-10');expect(r.taskXp===5&&r.xp===25,'全タスク補助EXPが不正')});
    ok('回復日EXP',()=>{state=normalizeState({debugNow:parseLocal('2026-08-12','10:00').toISOString()});const l=dayLog();l.workout=true;const r=questReward(l,'2026-08-12');expect(planOfDate('2026-08-12').focus==='recovery'&&r.workoutXp===10,'回復日EXPが不正')});
    ok('Lv50上限',()=>{state=normalizeState({level:49,xp:levelXpRequirement(49)-1});const r=gainXp(500);expect(r.afterLevel===50&&state.level===50&&state.xp===0,'Lv50上限が不正')});
    ok('関係段階',()=>{expect(receptionistBondStage(1).name==='新人冒険者'&&receptionistBondStage(10).name==='顔なじみ'&&receptionistBondStage(50).key==='chapter1','受付嬢の関係段階が不正')});
    ok('装備切替',()=>{state=normalizeState({level:1,inventory:['旅人の服','木の剣'],equippedGear:{weapon:null,armor:'旅人の服',accessory:null}});expect(setEquippedGear('木の剣',{record:false})===true&&adventurePower()===5,'装備力計算が不正')});
    ok('終了時の二重報酬防止',()=>{state=normalizeState({tasks:[{id:'a',name:'A'}],debugNow:parseLocal('2026-08-10','10:00').toISOString()});const l=dayLog();l.tasks.a=true;l.workout=true;expect(finalizeDay('2026-08-10',{show:false})===true,'初回確定失敗');const g=state.gold,x=state.xp;expect(finalizeDay('2026-08-10',{show:false})===false&&state.gold===g&&state.xp===x,'二重報酬が発生')});
  }finally{
    state=normalizeState(snapshot);if(stored===null)localStorage.removeItem('questlife');else localStorage.setItem('questlife',stored);renderAll();
  }
  const passed=results.filter(x=>x.ok).length;
  if(output){output.textContent=`セルフテスト ${passed}/${results.length} PASS\n`+results.map(x=>`${x.ok?'PASS':'FAIL'}  ${x.name}${x.ok?'':`：${x.error}`}`).join('\n');output.dataset.status=passed===results.length?'pass':'fail'}
  return results;
}
function renderInventory(){const inv=$('#inventory');if(inv){inv.innerHTML='';ownedGear().forEach(x=>{const c=document.createElement('span');c.className='chip';c.textContent='🛡️ '+x;inv.appendChild(c)})}if($('#dangerList'))$('#dangerList').innerHTML=state.danger.length?state.danger.map(x=>`<span class="chip danger-chip">⚠️ ${esc(x.name)}：次の活動日に完全達成で救出</span>`).join(''):'危機にある装備はありません。';if($('#baseVisual'))$('#baseVisual').textContent=mode()==='vacation'?'🏝️':'⛺';if($('#baseName'))$('#baseName').textContent=mode()==='vacation'?'南国の休息地':'冒険者ギルド';if($('#partyVisual'))$('#partyVisual').textContent=state.gender==='female'?'👩':'🧑'}
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
  if(debugSummary)debugSummary.textContent=`現在判定：${now().toLocaleString('ja-JP')}\nカレンダー日：${currentCalendarKey()}\n活動日：${activityKey()}\nモード：${mode()}\n${nightDetail}\n現在の締切：${d.date.toLocaleString('ja-JP')}\n確定済み：${log.closed?'はい':'いいえ'}\n冒険者：Lv.${state.level} / EXP ${state.level>=MAX_LEVEL?'MAX':`${state.xp}/${levelXpRequirement()}`} / ${state.gold}G\n負荷補正：${progression()>0?'少し増加':progression()<0?'少し軽減':'標準'}\nデータ版：${state.version}`;
  if(eventLog){const visible=state.events.filter(e=>e.type!=='lost');eventLog.innerHTML=visible.length?visible.map(e=>`<div class="event-item"><b>${esc(e.key)}</b>［${esc(e.type)}］${esc(e.text)}</div>`).join(''):'まだ処理履歴はありません。'}
}



function renderGameStatus(){
  const log=dayLog(),q=questSummary(log),reward=questReward(log,activityKey()),next=levelXpRequirement();
  const set=(id,text)=>{const el=$(id);if(el)el.textContent=text};
  set('#guideLevel',`Lv.${state.level}`);set('#guideXp',state.level>=MAX_LEVEL?'MAX':`${state.xp}/${next}`);set('#guideGold',`${state.gold}G`);set('#guideQuestProgress',mode()==='vacation'?'休息日':`${q.questDone}/${q.questTotal}`);
  const bar=$('#guideXpBar');if(bar)bar.style.width=state.level>=MAX_LEVEL?'100%':`${Math.min(100,state.xp/next*100)}%`;
  const hint=$('#guideRewardHint');if(hint){if(mode()==='vacation')hint.textContent='今日は通常の鍛錬を休止しています。';else if(log.closed)hint.textContent=`本日の記録は確定済みです。評価 ${log.result?.grade||'—'} / +${log.result?.xp||0} EXP`;else if(q.workoutDone)hint.textContent=`筋トレ完了。終了すると +${reward.xp} EXP が確定します。`;else hint.textContent=`今日の筋トレ完了で ${reward.recovery?10:20} EXP。タスク全達成で +5 EXP。`;}
}

function renderQuestHub(){
  if(!$('#quest'))return;
  const log=dayLog(),reward=questReward(log,activityKey()),next=levelXpRequirement(),gear=ownedGear(),heroName=heroTitle();renderAdventureScreen(log,reward);
  const set=(id,text)=>{const e=$(id);if(e)e.textContent=text};
  set('#questGold',`${state.gold}G`);set('#questHeroName',heroName);set('#questHeroLevel',`Lv.${state.level}`);set('#questHeroXp',state.level>=MAX_LEVEL?'EXP MAX':`EXP ${state.xp}/${next}`);
  const heroVisual=GAME_CONTENT.hero.default;for(const id of ['#questHeroVisual','#heroDialogVisual']){const e=$(id);if(e)e.innerHTML=visualHtml(heroVisual,'⚔')}
  set('#heroDialogName',heroName);set('#heroDialogLevel',`Lv.${state.level}`);set('#heroDialogXp',state.level>=MAX_LEVEL?'MAX':`${state.xp}/${next}`);set('#heroDialogPower',String(heroPower()));set('#heroDialogGold',`${state.gold}G`);set('#heroGearPower',`装備力 +${gearPower()}`);set('#heroOwnedGearCount',`${gear.length}個`);set('#shopGold',`${state.gold}G`);
  const slots=$('#heroEquipmentSlots');if(slots){slots.innerHTML=Object.entries(GEAR_SLOTS).map(([slot,label])=>{const name=state.equippedGear?.[slot],info=name?gameItemInfo('equipment',name):null;return `<div class="gear-slot-row"><span class="gear-slot-label">${esc(label)}</span>${name?`<div class="gear-slot-item"><div class="quest-item-visual">${visualHtml(info,'◇')}</div><div><b>${esc(name)}</b><span>${esc(info.rarity||'★')} / 冒険力 +${info.power||0}</span></div></div><button class="small-btn unequip-gear" data-slot="${esc(slot)}" type="button">外す</button>`:`<div class="gear-slot-empty">未装備</div>`}</div>`}).join('');slots.querySelectorAll('.unequip-gear').forEach(b=>b.onclick=()=>{clearEquippedGear(b.dataset.slot);save()})}
  const equip=$('#heroEquipmentPreview');if(equip){equip.innerHTML=gear.length?gear.map(name=>{const info=gameItemInfo('equipment',name),equipped=state.equippedGear?.[info.slot]===name;return `<div class="quest-item gear-owned-item"><div class="quest-item-visual">${visualHtml(info,'◇')}</div><div class="quest-item-main"><b>${esc(name)}</b><span>${esc(info.rarity||'★')} ${esc(GEAR_SLOTS[info.slot]||'装備')} / 冒険力 +${info.power||0}</span></div><button class="small-btn equip-gear" data-gear="${esc(name)}" type="button" ${equipped?'disabled':''}>${equipped?'装備中':'装備する'}</button></div>`}).join(''):'<div class="quest-empty">装備はまだありません。</div>';equip.querySelectorAll('.equip-gear').forEach(b=>b.onclick=()=>{if(setEquippedGear(b.dataset.gear))save()})}
  const shop=$('#shopItems');if(shop){shop.innerHTML=SHOP_CATALOG.map(name=>{const info=gameItemInfo('equipment',name),owned=state.inventory.includes(name),equipped=state.equippedGear?.[info.slot]===name,afford=state.gold>=info.price;let action='';if(equipped)action='<button class="shop-action" type="button" disabled>装備中</button>';else if(owned)action=`<button class="shop-action equip-shop-gear" type="button" data-gear="${esc(name)}">装備する</button>`;else action=`<button class="shop-action buy-gear" type="button" data-gear="${esc(name)}" ${afford?'':'disabled'}>${afford?`${info.price}Gで購入`:'G不足'}</button>`;return `<div class="shop-item-card"><div class="shop-item-top"><div class="quest-item-visual">${visualHtml(info,'◇')}</div><div class="shop-item-copy"><span class="shop-rarity">${esc(info.rarity||'★')} ${esc(GEAR_SLOTS[info.slot]||'装備')}</span><h3>${esc(name)}</h3><p>冒険力 +${info.power||0}</p></div><b class="shop-price">${info.price}G</b></div>${action}</div>`}).join('');shop.querySelectorAll('.buy-gear').forEach(b=>b.onclick=()=>{const name=b.dataset.gear,info=gameItemInfo('equipment',name);if(!confirm(`${name} を ${info.price}G で購入しますか？`))return;const r=purchaseGear(name);if(!r.ok){alert(r.reason==='gold'?'ゴールドが足りません。':'購入できません。');return}save()});shop.querySelectorAll('.equip-shop-gear').forEach(b=>b.onclick=()=>{if(setEquippedGear(b.dataset.gear))save()})}
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
[['#openHeroPanel','#heroDialog'],['#openShopPanel','#shopDialog']].forEach(([button,dialog])=>{const b=$(button),d=$(dialog);if(b&&d)b.onclick=()=>{renderQuestHub();d.showModal()}});
$$('.close-quest-detail').forEach(b=>b.onclick=()=>b.closest('dialog')?.close());
$$('[data-adventure-dialog]').forEach(b=>b.onclick=()=>{renderQuestHub();const d=$('#'+b.dataset.adventureDialog);if(d)d.showModal()});
$$('.quest-detail-dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));
$$('.jump-tab').forEach(b=>b.onclick=()=>switchTab(b.dataset.target));
$('#taskForm').onsubmit=e=>{e.preventDefault();if(state.tasks.length>=5)return alert('タスクは最大5個です。');state.tasks.push({id:newId(),name:$('#taskName').value.trim(),minutes:+$('#taskMinutes').value||0});syncCurrentTaskSnapshot();e.target.reset();$('#taskMinutes').value=0;save()};
$('#generateWorkout').onclick=buildWorkout;
$('#saveWeeklyFood').onclick=()=>{const key=weekStartKey(),value=$('#weeklyFoodCheck').value;if(value==='none')delete state.weeklyFood[key];else state.weeklyFood[key]=value;addEvent('food',`週次の食生活振り返りを保存（${foodLabel(value)}）`,key);save();};
$('#openFoodHistory').onclick=()=>{renderFoodHistory();$('#foodHistoryEditor').hidden=true;$('#foodHistoryDialog').showModal()};
$$('.close-food-history').forEach(b=>b.onclick=()=>$('#foodHistoryDialog').close());
$('#foodHistoryEditValue').onchange=()=>{$('#foodHistoryAiComment').textContent=foodAiComment($('#foodHistoryEditValue').value)};
$('#saveFoodHistoryEdit').onclick=()=>{if(!selectedFoodHistoryKey)return;state.weeklyFood[selectedFoodHistoryKey]=$('#foodHistoryEditValue').value;addEvent('food',`過去の食生活振り返りを更新（${foodLabel(state.weeklyFood[selectedFoodHistoryKey])}）`,selectedFoodHistoryKey);save();renderFoodHistory();openFoodHistoryEditor(selectedFoodHistoryKey)};
$('#completeWorkout').onclick=()=>{const log=dayLog();const checked=Object.values(log.exerciseChecks).filter(Boolean).length;if(checked<log.workoutPlan.length&&!confirm(`未チェックの種目が${log.workoutPlan.length-checked}件あります。完了にしますか？`))return;log.workout=true;log.workoutRpe=+$('#workoutRpe').value;addEvent('workout',`運動を完了（きつさ ${log.workoutRpe}/10）`);save();alert('筋トレ完了。今日を終了するとEXPと遠征結果が確定します。')};
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
