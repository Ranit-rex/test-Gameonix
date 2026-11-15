/* Playovia per-game remote controller profiles.
   Every mapping below is taken from the game's own keyboard handlers. */
(function(){
 const slots=['a','b','x','y','l1','r1','l2','r2','start','select'];
 const make=(name,actions)=>({name,actions:actions.map((a,i)=>({...a,slot:a.slot||slots[i]}))});
 window.PLAYOVIA_CONTROLLER_PROFILES={
  'dungeon-hunter':make('Dungeon Hunter',[
   {label:'Attack',key:'j',code:'KeyJ'},
   {label:'Heavy',key:'k',code:'KeyK'},
   {label:'Special',key:'l',code:'KeyL'},
   {label:'Jump',key:' ',code:'Space'},
   {label:'Dash',key:'Shift',code:'ShiftLeft'},
   {label:'Block',key:'b',code:'KeyB'},
   {label:'Heal',key:'q',code:'KeyQ'},
   {label:'Mana',key:'e',code:'KeyE'},
   {label:'Pause',key:'p',code:'KeyP'},
   {label:'Inventory',key:'i',code:'KeyI'}
  ]),
  'city-rush':make('City Rush',[
   {label:'Jump',key:' ',code:'Space'},
   {label:'Slide',key:'ArrowDown',code:'ArrowDown'},
   {label:'Pause',key:'Escape',code:'Escape'}
  ]),
  'obby-rush':make('Obby Rush',[
   {label:'Jump',key:' ',code:'Space'},
   {label:'Slide',key:'Shift',code:'ShiftLeft'}
  ]),
  'ashgrave':make('Ashgrave',[
   {label:'Attack',key:'j',code:'KeyJ'},
   {label:'Dash',key:' ',code:'Space'}
  ]),
  'last-lantern':make('Ghost Night',[
   {label:'Dash',key:' ',code:'Space'},
   {label:'Reroll',key:'r',code:'KeyR'},
   {label:'Pause',key:'Escape',code:'Escape',slot:'start'}
  ]),
  'antarctic-the-last-signal':make('Antarctic: The Last Signal',[
   {label:'Flare',key:' ',code:'Space'},
   {label:'Interact',key:'e',code:'KeyE'},
   {label:'Run',key:'Shift',code:'ShiftLeft',slot:'l1'}
  ]),
  'bomb-tag':make('Bomb Tag',[])
 };
 window.PLAYOVIA_CONTROLLER_SLOTS=slots;
})();