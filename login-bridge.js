/* Reliable standalone click bridge for Playovia Google sign-in. */
(function(){
 'use strict';
 const CONFIG={apiKey:'AIzaSyB_pZ9WfVSx2XHuDeSZ7VrwEr-Pz_m_2QM',authDomain:'play-hub-688e.firebaseapp.com',databaseURL:'https://play-hub-688e-default-rtdb.asia-southeast1.firebasedatabase.app',projectId:'play-hub-688e',storageBucket:'play-hub-688e.firebasestorage.app',messagingSenderId:'195222206861',appId:'1:195222206861:web:828a8cf16991f982a925c4'};
 let busy=false;
 const say=(v,bad)=>{const n=document.getElementById('gateStatus');if(n){n.textContent=v;n.className='gate-status'+(bad?' error':' ok')}};
 const load=src=>new Promise((ok,no)=>{const x=document.createElement('script');x.src=src;x.onload=ok;x.onerror=()=>no(new Error('Could not load Firebase Auth SDK'));document.head.appendChild(x)});
 async function fallback(){
  if(!window.firebase||!firebase.initializeApp)await load('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
  if(!window.firebase||!firebase.auth)await load('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js');
  if(!firebase.apps.length)firebase.initializeApp(CONFIG);
  const auth=firebase.auth();const provider=new firebase.auth.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
  await auth.signInWithPopup(provider);
 }
 document.addEventListener('click',function(e){
  const btn=e.target&&e.target.closest&&e.target.closest('#gateLoginBtn,#loginBtn');if(!btn)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  if(busy)return;busy=true;btn.disabled=true;say('Tap detected. Starting Google sign-in…',false);
  Promise.resolve().then(()=>{
   if(typeof window.startGoogleLogin==='function')return window.startGoogleLogin();
   return fallback();
  }).catch(err=>{console.error('Playovia login bridge:',err);say('Login error: '+(err.code||err.message||String(err)),true)})
    .finally(()=>{busy=false;btn.disabled=false});
 },true);
 window.__playoviaLoginBridge=true;
})();