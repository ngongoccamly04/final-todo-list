// --- 1. SETUP ---
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');
if (!token || !userStr) window.location.href = 'index.html';
const user = JSON.parse(userStr);
document.getElementById('userName').innerText = user.name;
document.getElementById('userAvatar').src = user.image ;
const hour = new Date().getHours();
document.getElementById('greetingTime').innerText = hour < 12 ? "Good morning," : hour < 18 ? "Good afternoon," : "Good evening,";

const html = document.documentElement;
const themeIcon = document.getElementById('themeIcon');
if(localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) { html.classList.add('dark'); themeIcon.classList.replace('fa-moon', 'fa-sun'); }
document.getElementById('themeToggleBtn').addEventListener('click', () => { html.classList.toggle('dark'); const isDark = html.classList.contains('dark'); localStorage.setItem('theme', isDark ? 'dark' : 'light'); themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon'; renderCurrentView(); renderGoals(); });

// DOM
const views = { list: document.getElementById('listViewContainer'), kanban: document.getElementById('kanbanView'), calendar: document.getElementById('calendarView') };
const listContent = document.getElementById('listContent');
const listFooter = document.getElementById('listFooter');
const tabBtns = document.querySelectorAll('.tab-btn');
const taskModal = document.getElementById('taskModal');

// STATE
let allTasks = [];
let currentFilter = 'general';
let calendarMode = 'month';
let currentDate = new Date();
let sortBy = 'deadline_asc';
let filterStatus = 'all';
let goalViewDate = new Date();

// DATA
async function loadTasks() {
    try {
        const search = document.getElementById('searchInput').value;
        const res = await fetch(`/api/tasks?search=${search}`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (res.status === 401) { localStorage.clear(); window.location.href = 'index.html'; return; }
        allTasks = await res.json();
        renderCurrentView();
        initMiniCalendar();
        renderGoals();
    } catch (e) { console.error(e); }
}

// --- SORT & FILTER ---
window.handleSort = (val) => { sortBy = val; renderCurrentView(); };
window.handleFilter = (val) => { filterStatus = val; renderCurrentView(); };
function applySortAndFilter(tasks) {
    let result = [...tasks];
    if (currentFilter !== 'status' && filterStatus !== 'all') result = result.filter(t => t.status === filterStatus);
    result.sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        if (sortBy === 'status') return (a.status === 'done' ? 1 : -1) - (b.status === 'done' ? 1 : -1);
        const dA = a.deadline ? new Date(a.deadline).getTime() : (sortBy === 'deadline_asc' ? 9e14 : 0);
        const dB = b.deadline ? new Date(b.deadline).getTime() : (sortBy === 'deadline_asc' ? 9e14 : 0);
        return sortBy === 'deadline_asc' ? dA - dB : dB - dA;
    });
    return result;
}

// VIEW CONTROLLER
window.switchView = (viewName) => {
    currentFilter = viewName;
    const toolbar = document.getElementById('toolbar');
    if (viewName === 'calendar' || viewName === 'status') toolbar.classList.add('hidden'); else toolbar.classList.remove('hidden');
    tabBtns.forEach(btn => {
        if (btn.dataset.tab === viewName) { btn.classList.add('tab-active'); btn.classList.remove('tab-inactive', 'border-transparent'); btn.classList.add('dark:bg-indigo-900/40', 'dark:text-indigo-300', 'dark:border-indigo-400'); } 
        else { btn.classList.remove('tab-active', 'dark:bg-indigo-900/40', 'dark:text-indigo-300', 'dark:border-indigo-400'); btn.classList.add('tab-inactive', 'border-transparent'); }
    });
    renderCurrentView();
};

function renderCurrentView() {
    Object.values(views).forEach(el => el.classList.add('hidden'));
    const today = new Date(); today.setHours(0,0,0,0);
    let filtered = [], title = "Overview";

    if (currentFilter === 'general') { filtered = [...allTasks]; title = "All Tasks"; }
    else if (currentFilter === 'status') { filtered = [...allTasks]; title = "Status"; views.kanban.classList.remove('hidden'); renderKanban(filtered); updateSidebarStats(filtered, title); return; }
    else if (currentFilter === 'upcoming') { filtered = allTasks.filter(t => t.status !== 'done' && (!t.deadline || new Date(t.deadline) >= today)); title = "Upcoming"; }
    else if (currentFilter === 'today') { filtered = allTasks.filter(t => t.deadline && new Date(t.deadline).toDateString() === today.toDateString()); title = "Today"; }
    else if (currentFilter === 'week') { const start = new Date(today); start.setDate(today.getDate() - today.getDay()); const end = new Date(today); end.setDate(today.getDate() + (6 - today.getDay())); filtered = allTasks.filter(t => t.deadline && new Date(t.deadline) >= start && new Date(t.deadline) <= end); title = "This Week"; }
    else if (currentFilter === 'calendar') { views.calendar.classList.remove('hidden'); renderCalendar(); filtered = filterTasksForCalendar(); title = calendarMode === 'month' ? "This Month" : "This Week"; updateSidebarStats(filtered, title); return; }

    filtered = applySortAndFilter(filtered);
    views.list.classList.remove('hidden');
    if (filtered.length === 0) listContent.innerHTML = `<div class="text-center py-10 text-gray-400 dark:text-gray-500">No tasks found.</div>`;
    else listContent.innerHTML = filtered.map(t => createTaskRowHTML(t)).join('');
    listFooter.innerHTML = createQuickAddBtnHTML(currentFilter);
    updateSidebarStats(filtered, title);
}

// STATS SIDEBAR
function updateSidebarStats(tasks, title) {
    const total = tasks.length, done = tasks.filter(t => t.status === 'done').length, pending = total - done;
    let percent = total === 0 ? 0 : Math.round((done / total) * 100);
    document.getElementById('sidebarTitle').innerText = title; document.getElementById('sidebarSubtitle').innerText = `Completed ${done}/${total}`;
    document.getElementById('sidebarTotal').innerText = total; document.getElementById('sidebarDone').innerText = done; document.getElementById('sidebarPending').innerText = pending;
    document.getElementById('progressPercent').innerText = `${percent}%`;
    document.getElementById('progressRing').style.background = `conic-gradient(#4F46E5 ${percent}%, ${html.classList.contains('dark') ? '#374151' : '#E5E7EB'} 0%)`;
}

// GOALS (Month & Year)
window.changeGoalTime=(type,delta)=>{if(type==='month')goalViewDate.setMonth(goalViewDate.getMonth()+delta);else goalViewDate.setFullYear(goalViewDate.getFullYear()+delta);renderGoals();};
function renderGoals(){
    const mm=goalViewDate.getMonth(), yy=goalViewDate.getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById('goalMonthTitle').innerText=`${monthNames[mm]} ${yy}`; document.getElementById('goalYearTitle').innerText=`Year ${yy}`;
    const mTasks=allTasks.filter(t=>{if(!t.deadline)return false;const d=new Date(t.deadline);return d.getMonth()===mm&&d.getFullYear()===yy;});
    const yTasks=allTasks.filter(t=>{if(!t.deadline)return false;return new Date(t.deadline).getFullYear()===yy;});
    renderGoalPanel(mTasks,'month'); renderGoalPanel(yTasks,'year');
}
function renderGoalPanel(tasks,type){
    const listEl=document.getElementById(`${type}GoalList`); listEl.innerHTML='';
    const done=tasks.filter(t=>t.status==='done').length, total=tasks.length, pending=total-done, percent=total===0?0:Math.round((done/total)*100);
    document.getElementById(`${type}DoneCount`).innerText=done; document.getElementById(`${type}PendingCount`).innerText=pending; document.getElementById(`${type}Percent`).innerText=`${percent}%`;
    document.getElementById(`${type}Ring`).style.background=`conic-gradient(${type==='month'?'#4F46E5':'#9333ea'} ${percent}%, ${html.classList.contains('dark')?'#374151':'#e5e7eb'} 0%)`;
    tasks.sort((a,b)=>(a.status==='done'?1:-1));
    if(tasks.length===0){listEl.innerHTML=`<div class="flex flex-col items-center justify-center h-full text-gray-300 dark:text-gray-600"><i class="fas fa-clipboard-list text-4xl mb-2 opacity-50"></i><p class="text-xs">No goals yet</p></div>`;return;}
    tasks.forEach(t=>{
        listEl.innerHTML+=`<div class="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl group hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition cursor-pointer" onclick="openTaskModal('${t._id}',null,event)"><div class="flex items-center gap-3 min-w-0"><button onclick="toggleStatus('${t._id}','${t.status}');event.stopPropagation()" class="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${t.status==='done'?'bg-green-500 border-green-500 text-white':'border-gray-300 text-transparent hover:border-indigo-500'}"><i class="fas fa-check text-[10px]"></i></button><span class="text-sm truncate font-medium ${t.status==='done'?'line-through text-gray-400':'text-gray-700 dark:text-gray-200'}">${t.text}</span></div><div class="text-[10px] font-mono text-gray-400 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-700 whitespace-nowrap">${new Date(t.deadline).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</div></div>`;
    });
}
window.addGoal=async(e,type)=>{e.preventDefault();const inp=document.getElementById(type==='month'?'inputMonthGoal':'inputYearGoal');if(!inp.value)return;let d=new Date(goalViewDate);if(type==='month'){d.setMonth(d.getMonth()+1);d.setDate(0);}else{d.setMonth(11);d.setDate(31);}try{await fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({text:inp.value,deadline:d.toISOString().split('T')[0],status:'pending'})});inp.value='';loadTasks();}catch(e){}};

// MINI CALENDAR
function initMiniCalendar(){const g=document.getElementById('miniCalendarGrid');g.innerHTML='';const n=new Date();const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; document.getElementById('miniCalMonth').innerText=`${monthNames[n.getMonth()]}`;const y=n.getFullYear(),m=n.getMonth(),t=n.getDate();const f=new Date(y,m,1).getDay(),tm=new Date(y,m+1,0).getDate();for(let i=0;i<f;i++)g.innerHTML+=`<div></div>`;for(let d=1;d<=tm;d++)g.innerHTML+=`<div class="${d===t?'w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center mx-auto':'text-[10px] text-gray-600 dark:text-gray-400 py-1'}">${d}</div>`;}

// RENDERERS (Main)
function renderKanban(tasks){const cols={overdue:document.getElementById('colOverdue'),pending:document.getElementById('colPending'),done:document.getElementById('colDone')};Object.values(cols).forEach(c=>c.innerHTML='');const today=new Date();today.setHours(0,0,0,0);const c={overdue:0,pending:0,done:0};tasks.forEach(t=>{const card=createTaskCardHTML(t);if(t.status==='done'){cols.done.innerHTML+=card;c.done++;}else if(t.deadline&&new Date(t.deadline)<today){cols.overdue.innerHTML+=card;c.overdue++;}else{cols.pending.innerHTML+=card;c.pending++;}});document.getElementById('kanbanCountOverdue').innerText=c.overdue;document.getElementById('kanbanCountPending').innerText=c.pending;document.getElementById('kanbanCountDone').innerText=c.done;cols.pending.innerHTML+=createQuickAddBtnHTML('status_pending');cols.done.innerHTML+=createQuickAddBtnHTML('status_done');cols.overdue.innerHTML+=createQuickAddBtnHTML('status_pending','Add');}
function createTaskRowHTML(t){const isD=t.status==='done',dS=t.deadline?new Date(t.deadline).toLocaleDateString('en-US'):'-';const badge=isD?`<span class="px-2 py-1 rounded bg-green-100 text-green-700 text-[10px] font-bold dark:bg-green-900/30 dark:text-green-300">DONE</span>`:`<span class="px-2 py-1 rounded bg-yellow-100 text-yellow-700 text-[10px] font-bold dark:bg-yellow-900/30 dark:text-yellow-300">PENDING</span>`;return `<div class="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl mb-2 hover:shadow-md transition dark:bg-dark-card dark:border-dark-border cursor-pointer" onclick="openTaskModal('${t._id}',null,event)"><div class="flex items-center gap-4 flex-1"><button onclick="toggleStatus('${t._id}','${t.status}');event.stopPropagation()" class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${isD?'bg-green-500 border-green-500 text-white':'border-gray-300 text-transparent hover:border-indigo-500'}"><i class="fas fa-check text-xs"></i></button><div class="flex-1"><p class="font-medium text-gray-800 dark:text-gray-200 ${isD?'line-through text-gray-400 dark:text-gray-500':''}">${t.text}</p><p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5"><i class="far fa-calendar mr-1"></i>${dS}</p></div></div><div class="flex items-center gap-3">${badge}<button onclick="deleteTask('${t._id}');event.stopPropagation()" class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"><i class="fas fa-trash-alt"></i></button></div></div>`;}
function createTaskCardHTML(t){const isD=t.status==='done',dS=t.deadline?new Date(t.deadline).toLocaleDateString('en-US'):'';return `<div class="bg-white p-3 rounded-lg shadow-sm border border-gray-100 mb-2 group hover:shadow-md transition relative dark:bg-dark-card dark:border-gray-700" onclick="openTaskModal('${t._id}',null,event)"><div class="flex justify-between items-start gap-2"><p class="text-sm font-medium ${isD?'line-through text-gray-400 dark:text-gray-500':'text-gray-800 dark:text-gray-200'} mb-1">${t.text}</p><button onclick="toggleStatus('${t._id}','${t.status}');event.stopPropagation()" class="flex-shrink-0 ${isD?'text-green-500':'text-gray-300 hover:text-indigo-500'}"><i class="${isD?'fas fa-check-circle':'far fa-circle'}"></i></button></div>${dS?`<div class="text-xs text-gray-500 mt-1 dark:text-gray-400"><i class="far fa-clock mr-1"></i>${dS}</div>`:''}</div>`;}
function createQuickAddBtnHTML(ctx){return `<button onclick="openTaskModal(null,'${ctx}')" class="w-full py-2.5 mt-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-medium transition flex items-center justify-center gap-2 group hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"><i class="fas fa-plus"></i> Quick Add</button>`;}

// CALENDAR (BIG)
function filterTasksForCalendar(){const s=new Date(currentDate),e=new Date(currentDate);if(calendarMode==='month'){s.setDate(1);e.setMonth(e.getMonth()+1);e.setDate(0);}else{s.setDate(s.getDate()-s.getDay());e.setDate(s.getDate()+6);}return allTasks.filter(t=>t.deadline&&new Date(t.deadline)>=s&&new Date(t.deadline)<=e);}
window.setCalendarMode=(m)=>{calendarMode=m;document.getElementById('btnMonthMode').className=m==='month'?'px-3 py-1 text-xs font-bold rounded bg-indigo-600 text-white':'px-3 py-1 text-xs font-medium rounded bg-gray-100 text-gray-500';document.getElementById('btnWeekMode').className=m==='week'?'px-3 py-1 text-xs font-bold rounded bg-indigo-600 text-white':'px-3 py-1 text-xs font-medium rounded bg-gray-100 text-gray-500';renderCurrentView();};
window.changeCalendarTime=(d)=>{if(d===0)currentDate=new Date();else if(calendarMode==='month')currentDate.setMonth(currentDate.getMonth()+d);else currentDate.setDate(currentDate.getDate()+(d*7));renderCurrentView();};
function renderCalendar(){const g=document.getElementById('calendarGrid');g.innerHTML='';const ts=new Date().toDateString();if(calendarMode==='month'){const y=currentDate.getFullYear(),m=currentDate.getMonth();const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]; document.getElementById('calendarTitle').innerText=`${monthNames[m]} ${y}`;const f=new Date(y,m,1).getDay(),dm=new Date(y,m+1,0).getDate();for(let i=0;i<f;i++)g.innerHTML+=`<div class="bg-gray-50 min-h-[100px] dark:bg-gray-800/50"></div>`;for(let d=1;d<=dm;d++)renderCalendarCell(g,new Date(y,m,d),ts);}else{const s=new Date(currentDate);s.setDate(s.getDate()-s.getDay());const e=new Date(s);e.setDate(s.getDate()+6);document.getElementById('calendarTitle').innerText=`${s.getDate()}/${s.getMonth()+1} - ${e.getDate()}/${e.getMonth()+1}`;for(let i=0;i<7;i++){const d=new Date(s);d.setDate(s.getDate()+i);renderCalendarCell(g,d,ts);}}}
function renderCalendarCell(c,d,ts){const isT=d.toDateString()===ts,dIso=d.toISOString().split('T')[0],tks=allTasks.filter(t=>t.deadline&&new Date(t.deadline).toDateString()===d.toDateString()),h=tks.map(t=>`<div class="text-[10px] px-1 rounded truncate mt-0.5 ${t.status==='done'?'bg-green-100 text-green-700 line-through dark:bg-green-900/30 dark:text-green-300':'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'} cursor-pointer" onclick="openTaskModal('${t._id}',null,event)">${t.text}</div>`).join('');c.innerHTML+=`<div class="bg-white min-h-[100px] p-1 border-b border-r border-gray-100 hover:bg-gray-50 relative group cursor-pointer dark:bg-dark-card dark:border-dark-border dark:hover:bg-gray-800" onclick="openTaskModal(null,'calendar_${dIso}',event)"><span class="text-xs font-semibold ${isT?'bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center':'text-gray-700 dark:text-gray-300'}">${d.getDate()}</span><div class="mt-1 flex flex-col gap-0.5 overflow-hidden max-h-[80px] hover:max-h-none hover:bg-white hover:z-10 hover:absolute hover:shadow-lg hover:w-full hover:p-1 rounded dark:hover:bg-dark-card dark:hover:border-dark-border">${h}</div><div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"><i class="fas fa-plus-circle"></i></div></div>`;}

// UTILS
function initClock(){const u=()=>{const n=new Date(),p=x=>x.toString().padStart(2,'0');document.getElementById('clockH').innerText=p(n.getHours());document.getElementById('clockM').innerText=p(n.getMinutes());document.getElementById('clockS').innerText=p(n.getSeconds());document.getElementById('clockDate').innerText=n.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });};setInterval(u,1000);u();}
async function initWeather(){try{const r=await fetch('https://api.open-meteo.com/v1/forecast?latitude=21.02&longitude=105.83&current_weather=true');const d=await r.json();document.getElementById('weatherTemp').innerText=`${d.current_weather.temperature}°`;}catch(e){}}
let pi,pt=25*60,ir=false;
window.pomoStart=()=>{if(ir)return;ir=true;document.getElementById('btnPomoStart').innerText="Run";pi=setInterval(()=>{if(pt>0){pt--;up();}else{window.pomoPause();alert("Done!");}},1000);};
window.pomoPause=()=>{clearInterval(pi);ir=false;document.getElementById('btnPomoStart').innerText="Start";};
window.pomoReset=()=>{window.pomoPause();pt=25*60;up();};
function up(){const m=Math.floor(pt/60).toString().padStart(2,'0'),s=(pt%60).toString().padStart(2,'0');document.getElementById('pomoTimer').innerText=`${m}:${s}`;}
window.changeMotivationImage=()=>{const i=["https://images.unsplash.com/photo-1497561813398-8fcc7a37b567","https://images.unsplash.com/photo-1519834785169-98be25ec3f84"];document.getElementById('motivationalImg').src=i[Math.floor(Math.random()*i.length)];};

// ACTIONS
window.openTaskModal=(id,ctx,e)=>{if(e)e.stopPropagation();document.getElementById('taskForm').reset();document.getElementById('taskModal').classList.remove('hidden');if(id){const t=allTasks.find(x=>x._id===id);document.getElementById('taskId').value=id;document.getElementById('taskTextInput').value=t.text;document.getElementById('taskDeadlineInput').value=t.deadline?new Date(t.deadline).toISOString().split('T')[0]:'';document.getElementById('taskStatusInput').value=t.status;}else{document.getElementById('taskId').value='';document.getElementById('taskStatusInput').value='pending';if(ctx==='today')document.getElementById('taskDeadlineInput').value=new Date().toISOString().split('T')[0];else if(ctx&&ctx.startsWith('calendar_'))document.getElementById('taskDeadlineInput').value=ctx.split('_')[1];}document.getElementById('taskTextInput').focus();};
window.closeTaskModal=()=>document.getElementById('taskModal').classList.add('hidden');
document.getElementById('taskForm').addEventListener('submit',async(e)=>{e.preventDefault();const id=document.getElementById('taskId').value;await fetch(id?`/api/tasks/${id}`:'/api/tasks',{method:id?'PUT':'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({text:document.getElementById('taskTextInput').value,deadline:document.getElementById('taskDeadlineInput').value,status:document.getElementById('taskStatusInput').value})});closeTaskModal();loadTasks();});
window.deleteTask=async(id)=>{if(confirm('Delete this task?')){await fetch(`/api/tasks/${id}`,{method:'DELETE',headers:{'Authorization':`Bearer ${token}`}});loadTasks();}};
window.toggleStatus=async(id,s)=>{await fetch(`/api/tasks/${id}`,{method:'PUT',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({status:s==='pending'?'done':'pending'})});loadTasks();};
document.getElementById('searchInput').addEventListener('input',()=>setTimeout(loadTasks,300));
document.getElementById('logoutBtn').addEventListener('click',()=>localStorage.clear()||(window.location.href='index.html'));

// INIT
loadTasks(); initClock(); initWeather();