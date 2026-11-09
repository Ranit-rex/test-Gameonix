(function(){
  const approved=["firegamingugw@gmail.com","mranit66@gmail.com"];
  let functionsApi=null,currentAdmin=false;
  const el=id=>document.getElementById(id);
  const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function errorText(e){const code=e?.code?String(e.code)+": ":"";return code+(e?.message||String(e||"Unknown error"))}
  function panelMessage(msg,error=false){const n=el("adminStatus");if(n){n.textContent=msg;n.className="status "+(error?"error":"ok")}}
  function targetError(id,e){const n=el(id);if(n)n.innerHTML='<div class="notice" style="color:#ff9aa8">Could not load this section: '+safe(errorText(e))+'</div>';panelMessage(errorText(e),true)}
  function call(name,data={}){
    if(!functionsApi)return Promise.reject(new Error("Firebase Functions is not connected. Check that the Functions SDK is loaded and deployed in asia-south1."));
    return functionsApi.httpsCallable(name)(data).then(x=>x.data);
  }
  function showAdmin(){currentAdmin=true;window.playHubAdminEnabled=true;el("adminNav")?.classList.remove("hidden")}
  function hideAdmin(){currentAdmin=false;window.playHubAdminEnabled=false;el("adminNav")?.classList.add("hidden");if(location.hash==="#admin")location.hash=""}
  async function init(user){
    hideAdmin();
    if(!user)return;
    if(!approved.includes(String(user.email||"").toLowerCase()))return;
    showAdmin();
    try{
      if(!window.firebase?.app)throw new Error("Firebase app is not initialized.");
      functionsApi=firebase.app().functions("asia-south1");
      await call("bootstrapAdmin");
      await user.getIdToken(true);
      const token=await user.getIdTokenResult(true);
      if(token.claims.admin!==true)throw new Error("Admin claim was not issued. Verify the Google account and deploy bootstrapAdmin.");
      panelMessage("Admin access verified.");
      if(el("adminPage")?.classList.contains("active"))await load();
    }catch(e){
      console.error("Admin initialization:",e);
      panelMessage("Admin menu is visible, but backend access failed: "+errorText(e),true);
    }
  }
  async function stats(){
    try{
      const d=await call("adminOverview");
      el("adminStats").innerHTML=[["Users",d.users],["Banned",d.bannedUsers],["Open reports",d.openReports],["Announcements",d.announcements],["Managed games",d.games]].map(([k,v])=>'<div class="panel"><span class="muted">'+k+'</span><h2>'+safe(v??0)+'</h2></div>').join("");
    }catch(e){targetError("adminStats",e);throw e}
  }
  async function users(){
    try{
      const d=await call("adminListUsers",{pageSize:200});
      el("adminUsers").innerHTML=d.users?.length?d.users.map(u=>'<div class="row" style="flex-wrap:wrap"><div style="min-width:180px;flex:1"><strong>'+safe(u.displayName||u.username||"Player")+'</strong><div class="muted">'+safe(u.email)+'</div><small class="muted">'+safe(u.uid)+'</small></div><span>'+safe(u.currencyBalance??0)+' coins</span><span>'+(u.banned?"BANNED":"Active")+'</span><div class="formrow"><button class="logout" data-ban="'+safe(u.uid)+'" data-value="'+(!u.banned)+'">'+(u.banned?"Unban":"Ban")+'</button><button class="login" data-currency="'+safe(u.uid)+'">Currency</button></div></div>').join(""):'<div class="empty">No users found.</div>';
    }catch(e){targetError("adminUsers",e);throw e}
  }
  async function reports(){
    try{
      const d=await call("adminListReports");
      el("adminReports").innerHTML=d.reports?.length?d.reports.map(r=>'<div class="panel"><strong>'+safe(r.type||"User report")+'</strong><p>'+safe(r.description||r.reason||"No description")+'</p><small class="muted">Reporter: '+safe(r.reporterUid||"Unknown")+' · '+safe(r.status||"open")+'</small></div>').join(""):'<div class="empty">No reports found.</div>';
    }catch(e){targetError("adminReports",e);throw e}
  }
  async function announcements(){
    try{
      const snap=await firebase.firestore().collection("announcements").orderBy("createdAt","desc").limit(50).get();
      el("adminAnnouncements").innerHTML=snap.empty?'<div class="empty">No announcements yet.</div>':snap.docs.map(d=>{const a=d.data();return '<div class="row"><div style="flex:1"><strong>'+safe(a.title)+'</strong><p class="muted">'+safe(a.body)+'</p></div><button class="logout" data-delete-announcement="'+safe(d.id)+'">Delete</button></div>'}).join("");
    }catch(e){targetError("adminAnnouncements",e);throw e}
  }
  async function games(){
    try{
      const base=window.getPlayHubGames?.()||[];
      const snap=await firebase.firestore().collection("games").get();
      const overrides={};snap.forEach(d=>overrides[d.id]=d.data());
      const select=el("adminGameSlug");
      select.innerHTML=base.length?base.map(g=>'<option value="'+safe(g.slug)+'">'+safe(g.title)+' ('+safe(g.slug)+')</option>').join(""):'<option value="">No game folders found</option>';
      function fill(){const slug=select.value,g=base.find(x=>x.slug===slug)||{},o=overrides[slug]||{};el("adminGameTitle").value=o.title||g.title||"";el("adminGameCategory").value=o.category||g.category||"Games";el("adminGameDescription").value=o.description||g.description||"";el("adminGameEnabled").checked=o.enabled!==false}
      select.onchange=fill;fill();
      el("adminGameList").innerHTML=base.length?base.map(g=>'<div class="row"><span>'+safe(g.title)+'</span><span class="muted">'+(overrides[g.slug]?.enabled===false?"Hidden":"Visible")+'</span></div>').join(""):'<div class="empty">No games were discovered in the game catalogue.</div>';
    }catch(e){targetError("adminGameList",e);throw e}
  }
  async function load(){
    if(!currentAdmin)return;
    panelMessage("Loading admin data…");
    const results=await Promise.allSettled([stats(),users(),reports(),announcements()]);
    const failed=results.filter(x=>x.status==="rejected");
    if(failed.length)panelMessage(failed.length+" admin section(s) failed. Open each tab to see its exact error.",true);
    else panelMessage("Admin data loaded.");
  }
  function switchTab(tab){
    ["overview","users","reports","announcements","games"].forEach(k=>{const p=el("adminTab"+k[0].toUpperCase()+k.slice(1));if(p)p.classList.toggle("hidden",k!==tab)});
    document.querySelectorAll("[data-admin-tab]").forEach(b=>b.classList.toggle("active",b.dataset.adminTab===tab));
    const tasks={overview:stats,users,reports,announcements,games};
    const target={overview:"adminStats",users:"adminUsers",reports:"adminReports",announcements:"adminAnnouncements",games:"adminGameList"}[tab];
    if(target&&el(target))el(target).innerHTML='<div class="empty">Loading '+safe(tab)+'…</div>';
    tasks[tab]?.().catch(e=>console.error("Admin tab load failed:",tab,e));
  }
  document.addEventListener("click",async e=>{
    const tab=e.target.closest("[data-admin-tab]");if(tab){switchTab(tab.dataset.adminTab);return}
    const ban=e.target.closest("[data-ban]");if(ban){const reason=ban.dataset.value==="true"?(prompt("Reason for ban (optional):")||""):"";try{await call("adminSetUserBan",{uid:ban.dataset.ban,banned:ban.dataset.value==="true",reason});panelMessage("User status updated.");await users();await stats()}catch(x){panelMessage(errorText(x),true)}return}
    const cur=e.target.closest("[data-currency]");if(cur){const op=prompt("Action: add, remove, or set","add");if(!["add","remove","set"].includes(op))return;const amount=Number(prompt("Whole-number amount"));const reason=prompt("Reason for this adjustment");if(!Number.isSafeInteger(amount)||amount<=0||!reason)return;try{const result=await call("adminAdjustCurrency",{uid:cur.dataset.currency,operation:op,amount,reason});panelMessage("Balance updated: "+result.previousBalance+" → "+result.newBalance);await users()}catch(x){panelMessage(errorText(x),true)}return}
    const del=e.target.closest("[data-delete-announcement]");if(del){if(!confirm("Delete this announcement?"))return;try{await call("adminDeleteAnnouncement",{id:del.dataset.deleteAnnouncement});await announcements();panelMessage("Announcement deleted.")}catch(x){panelMessage(errorText(x),true)}}
  });
  el("adminGameForm")?.addEventListener("submit",async e=>{e.preventDefault();try{await call("adminSaveGame",{slug:el("adminGameSlug").value,title:el("adminGameTitle").value,category:el("adminGameCategory").value,description:el("adminGameDescription").value,enabled:el("adminGameEnabled").checked});panelMessage("Game settings saved.");await games()}catch(x){panelMessage(errorText(x),true)}});
  el("adminGameReset")?.addEventListener("click",async()=>{const slug=el("adminGameSlug").value;if(!slug)return;try{await call("adminDeleteGameOverride",{slug});panelMessage("Game override reset.");await games()}catch(x){panelMessage(errorText(x),true)}});
  el("adminAnnouncementForm")?.addEventListener("submit",async e=>{e.preventDefault();try{await call("adminManageAnnouncement",{title:el("announcementTitle").value,body:el("announcementBody").value,active:true});el("adminAnnouncementForm").reset();await announcements();panelMessage("Announcement published.")}catch(x){panelMessage(errorText(x),true)}});
  window.initializePlayHubAdmin=init;window.loadPlayHubAdmin=load;
  window.checkPlayHubAccount=async user=>{functionsApi=firebase.app().functions("asia-south1");return call("checkAccountStatus")};
})();