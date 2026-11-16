/* Playovia per-game remote controller profiles. Mappings reflect each game's keyboard handlers. */
(function(){
 const make=(name,actions,tip='')=>({name,tip,actions});
 window.PLAYOVIA_CONTROLLER_PROFILES={
  'dungeon-hunter':make('Dungeon Hunter',[
   {slot:'a',label:'Attack',key:'j',code:'KeyJ',role:'Primary attack'},
   {slot:'b',label:'Heavy',key:'k',code:'KeyK',role:'Heavy attack'},
   {slot:'x',label:'Special',key:'l',code:'KeyL',role:'Special attack'},
   {slot:'y',label:'Jump',key:' ',code:'Space',role:'Jump'},
   {slot:'l1',label:'Dash',key:'Shift',code:'ShiftLeft',role:'Dash / evade'},
   {slot:'r1',label:'Block',key:'b',code:'KeyB',role:'Block'},
   {slot:'l2',label:'Heal',key:'q',code:'KeyQ',role:'Use healing'},
   {slot:'r2',label:'Mana',key:'e',code:'KeyE',role:'Use mana'},
   {slot:'start',label:'Pause',key:'p',code:'KeyP',role:'Pause menu'},
   {slot:'select',label:'Inventory',key:'i',code:'KeyI',role:'Inventory'}
  ],'Primary attack is on A; extra combat actions use the shoulder buttons.'),
  'city-rush':make('City Rush',[
   {slot:'a',label:'Jump',key:' ',code:'Space',role:'Jump over obstacles'},
   {slot:'b',label:'Slide',key:'ArrowDown',code:'ArrowDown',role:'Slide under obstacles'},
   {slot:'start',label:'Pause',key:'Escape',code:'Escape',role:'Pause / menu'}
  ]),
  'obby-rush':make('Obby Rush',[
   {slot:'a',label:'Jump',key:' ',code:'Space',role:'Jump'},
   {slot:'b',label:'Slide',key:'Shift',code:'ShiftLeft',role:'Slide'}
  ]),
  'ashgrave':make('Ashgrave',[
   {slot:'a',label:'Attack',key:'j',code:'KeyJ',role:'Primary strike'},
   {slot:'b',label:'Dash',key:' ',code:'Space',role:'Dash / evade'}
  ]),
  'last-lantern':make('Ghost Night',[
   {slot:'a',label:'Dash',key:' ',code:'Space',role:'Dash'},
   {slot:'b',label:'Reroll',key:'r',code:'KeyR',role:'Reroll'},
   {slot:'start',label:'Pause',key:'Escape',code:'Escape',role:'Pause menu'}
  ]),
  'antarctic-the-last-signal':make('Antarctic: The Last Signal',[
   {slot:'a',label:'Flare',key:' ',code:'Space',role:'Fire flare'},
   {slot:'b',label:'Interact',key:'e',code:'KeyE',role:'Interact with objects'},
   {slot:'l1',label:'Run',key:'Shift',code:'ShiftLeft',role:'Run faster'}
  ]),
  'bomb-tag':make('Bomb Tag',[],'Movement only; no extra action keys are defined.')
 };
 window.PLAYOVIA_CONTROLLER_SLOTS=['a','b','x','y','l1','r1','l2','r2','start','select'];
 window.PLAYOVIA_RESOLVE_CONTROLLER_PROFILE=(slug,title)=>{
  const clean=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
  const direct=String(slug||'').toLowerCase();
  if(window.PLAYOVIA_CONTROLLER_PROFILES[direct])return direct;
  const directClean=clean(direct);
  if(directClean.includes('dungeonhunter'))return 'dungeon-hunter';
  const t=clean(title);
  if(t.includes('dungeon')&&t.includes('hunter'))return 'dungeon-hunter';
  const aliases={
   'dungeon-hunter':['dungeonhunter','dungeon hunter'],
   'city-rush':['cityrush','city rush'],
   'obby-rush':['obbyrush','obby rush'],
   'ashgrave':['ashgrave'],
   'last-lantern':['ghostnight','ghost night','lastlantern','last lantern'],
   'antarctic-the-last-signal':['antarctic','the last signal','antarctic the last signal'],
   'bomb-tag':['bombtag','bomb tag']
  };
  for(const [key,names] of Object.entries(aliases))if(names.some(n=>t.includes(clean(n))))return key;
  for(const [key,value] of Object.entries(window.PLAYOVIA_CONTROLLER_PROFILES))if(t.includes(clean(value.name)))return key;
  return '';
 };
})();