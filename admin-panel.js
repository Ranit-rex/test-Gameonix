(function(){
  const approved=["firegamingugw@gmail.com","mranit66@gmail.com"];
  let functionsApi=null, currentAdmin=false;
  const el=id=>document.getElementById(id);
  const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function call(name,data={}){if(!functionsApi)throw new Error("Admin functions are still connecting.");return functionsApi.httpsCallable(name)(data).then(x=>x.data)}
  function showAdmin(){currentAdmin=true;window.playHubAdminEnabled=true;el("adminNav")?.classList.remove("hidden");el("adminHomeCard")?.classList.remove("hidden");}
  function hideAdmin(){currentAdmin=false;window.playHubAdminEnabled=false;el("adminNav")?.classList.add("hidden");el("adminHomeCard")?.classList.add("hidden");if(location.hash==="#admin")location.hash="";}
  async function init(user){
    hideAdmin();
    if(!user)return;
    try{
      functionsApi=firebase.app().functions("asia-south1");
      if(!approved.includes(String(user.email||"").toLowerCase()))return;
      try{await call("bootstrapAdmin");await user.getIdToken(true)}catch(e){console.warn("Admin claim bootstrap:",e.message);return}
      const token=await user.getIdTokenResult(true);
      if(token.claims.admin===true){showAdmin();if(window.setPage&&document.getElementById("adminPage")?.classList.contains("active"))load()}
    }catch(e){console.warn("Admin initialization:",e.message)}
  }
  function panelMessage(msg,error=false){const n=el("adminStatus");if(n){n.textContent=msg;n.className="status "+(error?"error":"ok")}}
  async function stats(){
    const d=await call("adminOverview");
    el("adminStats").innerHTML=[["Users",d.users],["Banned",d.bannedUsers],["Open reports",d.openReports],["Announcements",d.announcements],["Managed games",d.games]].map(([k,v])=>'<div class="panel"><span class="muted">'+k+'</span><h2>'+v+'</h2></div>').join("");
  }
  async function users(){
    const d=await call("adminListUsers",{pageSize:200});
    el("adminUsers").innerHTML=d.users.length?d.users.map(u=>'<div class="row" style="flex-wrap:wrap"><div style="min-width:180px;flex:1"><strong>'+safe(u.displayName||u.username||"Player")+'</strong><div class="muted">'+safe(u.email)+'</div><small class="muted">'+safe(u.uid)+'</small></div><span>'+safe(u.currencyBalance)+' coins</span><span>'+(u.banned?'<badge>':'')+(u.banned?"BANNED":"Active")+'</span><div class="formrow"><button class="logout" data-ban="'+safe(u.uid)+'" data-value="'+(!u.banned)+'">'+(u.banned?"Unban":"Ban")+'</button><button class="login" data-currency="'+safe(u.uid)+'" data-email="'+safe(u.email)+'">Currency</button></div></div>').join(""):'<div class="empty">No users found.</div>';
  }
  async function reports(){
    const d=await call("adminListReports");
    el("adminReports").innerHTML=d.reports.length?d.reports.map(r=>'<div class="panel"><strong>'+safe(r.type||"User report")+'</strong><p>'+safe(r.description||r.reason||"No description")+'</p><small class="muted">Reporter: '+safe(r.reporterUid||"Unknown")+' · '+safe(r.status||"open")+'</small></div>').join(""):'<div class="empty">No reports found.</div>';
  }
  async function announcements(){
    const snap=await firebase.firestore().collection("announcements").orderBy("createdAt","desc").limit(50).get();
    el("adminAnnouncements").innerHTML=snap.empty?'<div class="empty">No announcements yet.</div>':snap.docs.map(d=>{const a=d.data();return '<div class="row"><div style="flex:1"><strong>'+safe(a.title)+'</strong><p class="muted">'+safe(a.body)+'</p></div><button class="logout" data-delete-announcement="'+safe(d.id)+'">Delete</button></div>'}).join("");
  }
  async function games(){
    const base=window.getPlayHubGames?.()||[];
    const snap=await firebase.firestore().collection("games").get();
    const overrides={};snap.forEach(d=>overrides[d.id]=d.data());
    const select=el("adminGameSlug");
    select.innerHTML=base.length?base.map(g=>'<option value="'+safe(g.slug)+'">'+safe(g.title)+' ('+safe(g.slug)+')</option>').join(""):'<option value="">No game folders found</option>';
    function fill(){
      const slug=select.value,g=base.find(x=>x.slug===slug)||{},o=overrides[slug]||{};
      el("adminGameTitle").value=o.title||g.title||"";
      el("adminGameCategory").value=o.category||g.category||"Games";
      el("adminGameDescription").value=o.description||g.description||"";
      el("adminGameEnabled").checked=o.enabled!==false;
    }
    select.onchange=fill;fill();
    el("adminGameList").innerHTML=base.map(g=>'<div class="row"><span>'+safe(g.title)+'</span><span class="muted">'+(overrides[g.slug]?.enabled===false?'Hidden':'Visible')+'</span></div>').join("");
  }
  async function load(){
    if(!currentAdmin)return;
    panelMessage("Loading admin data…");
    try{await Promise.all([stats(),users(),reports(),announcements()]);panelMessage("Admin data loaded.");}
    catch(e){panelMessage(e.message,true)}
  }
  function switchTab(tab){
    ["overview","users","reports","announcements","games"].forEach(k=>{const p=el("adminTab"+k[0].toUpperCase()+k.slice(1));if(p)p.classList.toggle("hidden",k!==tab)});
    document.querySelectorAll("[data-admin-tab]").forEach(b=>b.classList.toggle("active",b.dataset.adminTab===tab));
    if(tab==="overview")stats().catch(e=>panelMessage(e.message,true));
    if(tab==="users")users().catch(e=>panelMessage(e.message,true));
    if(tab==="reports")reports().catch(e=>panelMessage(e.message,true));
    if(tab==="announcements")announcements().catch(e=>panelMessage(e.message,true));
    if(tab==="games")games().catch(e=>panelMessage(e.message,true));
  }
  document.addEventListener("click",async e=>{
    const tab=e.target.closest("[data-admin-tab]");if(tab){switchTab(tab.dataset.adminTab);return}
    const ban=e.target.closest("[data-ban]");if(ban){const reason=ban.dataset.value==="true"?prompt("Reason for ban (optional):")||"":"";try{await call("adminSetUserBan",{uid:ban.dataset.ban,banned:ban.dataset.value==="true",reason});panelMessage("User status updated.");await users();await stats()}catch(x){panelMessage(x.message,true)}return}
    const cur=e.target.closest("[data-currency]");if(cur){const op=prompt("Action: add, remove, or set","add");if(!["add","remove","set"].includes(op))return;const amount=Number(prompt("Whole-number amount"));const reason=prompt("Reason for this adjustment");if(!Number.isSafeInteger(amount)||amount<=0||!reason)return;try{const result=await call("adminAdjustCurrency",{uid:cur.dataset.currency,operation:op,amount,reason});panelMessage("Balance updated: "+result.previousBalance+" → "+result.newBalance);await users()}catch(x){panelMessage(x.message,true)}return}
    const del=e.target.closest("[data-delete-announcement]");if(del){if(!confirm("Delete this announcement?"))return;try{await call("adminDeleteAnnouncement",{id:del.dataset.deleteAnnouncement});await announcements();panelMessage("Announcement deleted.")}catch(x){panelMessage(x.message,true)}}
  });
  el("adminGameForm")?.addEventListener("submit",async e=>{e.preventDefault();try{await call("adminSaveGame",{slug:el("adminGameSlug").value,title:el("adminGameTitle").value,category:el("adminGameCategory").value,description:el("adminGameDescription").value,enabled:el("adminGameEnabled").checked});panelMessage("Game settings saved. Refresh the public catalogue to see the changes.");await games()}catch(x){panelMessage(x.message,true)}});
  el("adminGameReset")?.addEventListener("click",async()=>{const slug=el("adminGameSlug").value;if(!slug)return;try{await call("adminDeleteGameOverride",{slug});panelMessage("Game override reset.");await games()}catch(x){panelMessage(x.message,true)}});
  el("adminAnnouncementForm")?.addEventListener("submit",async e=>{e.preventDefault();try{await call("adminManageAnnouncement",{title:el("announcementTitle").value,body:el("announcementBody").value,active:true});el("adminAnnouncementForm").reset();await announcements();panelMessage("Announcement published.")}catch(x){panelMessage(x.message,true)}});
  window.initializePlayHubAdmin=init;window.loadPlayHubAdmin=load;
  window.checkPlayHubAccount=async user=>{functionsApi=firebase.app().functions('asia-south1');return call('checkAccountStatus')};
})();