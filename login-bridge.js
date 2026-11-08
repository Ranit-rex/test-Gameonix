/* Independent Playovia sign-in safety net. Runs even if the main app script fails. */
(function(){
 'use strict';
 const CONFIG={apiKey:'AIzaSyB_pZ9WfVSx2XHuDeSZ7VrwEr-Pz_m_2QM',authDomain:'play-hub-688e8.firebaseapp.com',databaseURL:'https://play-hub-688e8-default-rtdb.asia-southeast1.firebasedatabase.app',projectId:'play-hub-688e8',storageBucket:'play-hub-688e8.firebasestorage.app',messagingSenderId:'195222206861',appId:'1:195222206861:web:828a8cf16991f982a925c4'};
 let fallbackPromise=null;
 function message(text,error){const el=document.getElementById('gateStatus');if(el){el.textContent=text;el.className='gate-status'+(error?' error':' ok')}}
 function load(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('Unable to load Firebase sign-in library'));document.head.appendChild(s)})}
 async function ensureAuth(){
  if(!window.firebase||!firebase.initializeApp)await load('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
  if(!window.firebase||!firebase.auth)await load('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js');
  if(!window.firebase||!firebase.auth)throw new Error('Firebase Authentication library did not load. Check internet/content blockers.');
  if(!firebase.apps.length)firebase.initializeApp(CONFIG);
  return firebase.auth();
 }
 async function fallbackLogin(){
  if(!fallbackPromise)fallbackPromise=(async()=>{
   message('Starting secure Google sign-in…');
   const auth=await ensureAuth();
   const provider=new firebase.auth.GoogleAuthProvider();
   provider.setCustomParameters({prompt:'select_account'});
   await auth.signInWithRedirect(provider);
  })().catch(e=>{fallbackPromise=null;message('Google sign-in error: '+(e.message||e),true);throw e});
  return fallbackPromise;
 }
 document.addEventListener('click',function(e){
  const btn=e.target&&e.target.closest&&e.target.closest('#gateLoginBtn,#loginBtn');
  if(!btn)return;
  e.preventDefault();
  message('Button tapped. Starting Google sign-in…');
  if(btn.dataset.bridgeBusy==='1')return;
  btn.dataset.bridgeBusy='1';
  Promise.resolve().then(()=>{
   if(typeof window.startGoogleLogin==='function')return window.startGoogleLogin();
   return fallbackLogin();
  }).catch(err=>{console.error('Playovia login bridge:',err);message('Login could not start: '+(err.message||err),true)})
    .finally(()=>{btn.dataset.bridgeBusy='0'});
 },true);
 window.__playoviaLoginBridge=true;
})();