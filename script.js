const STORAGE_KEY  = "todoapp:data";
const SETTINGS_KEY = "todoapp:settings";

const LIST_COLORS = [
    { key: "indigo", hex: "#5b6bd6" },
    { key: "teal",   hex: "#3fa88f" },
    { key: "rose",   hex: "#d1616f" },
    { key: "amber",  hex: "#d99a3d" },
    { key: "sage",   hex: "#6a9955" },
    { key: "plum",   hex: "#8f6bc7" },
    { key: "slate",  hex: "#6b7a99" },
    { key: "coral",  hex: "#d97a55" }
];

const DAY_MS = 24 * 60 * 60 * 1000;

let state = loadState();
let settings = loadSettings();

let activeFilter = "all"; // all | active | completed
let editingTaskId = null;
let editingListId = null; // null = creating a new list
let selectedListColor = LIST_COLORS[0].hex;

let currentView = settings.currentView || "tasks";

let calState = { year: new Date().getFullYear(), month: new Date().getMonth(), selectedDate: todayStr() };

const listsContainer   = document.getElementById("listsContainer");
const addListBtn       = document.getElementById("addListBtn");
const activeListName   = document.getElementById("activeListName");
const activeListCount  = document.getElementById("activeListCount");
const activeListDot    = document.getElementById("activeListDot");

const addTaskForm      = document.getElementById("addTaskForm");
const taskInput        = document.getElementById("taskInput");
const taskDate         = document.getElementById("taskDate");
const taskTime         = document.getElementById("taskTime");
const taskPriority     = document.getElementById("taskPriority");
const taskRepeat       = document.getElementById("taskRepeat");

const taskContainer    = document.getElementById("taskContainer");
const emptyState       = document.getElementById("emptyState");

const filterBtns        = document.querySelectorAll(".filter-btn");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const groupToggleBtn    = document.getElementById("groupToggleBtn");

const ringFill          = document.getElementById("ringFill");
const ringPercent       = document.getElementById("ringPercent");
const progressCaption   = document.getElementById("progressCaption");
const RING_CIRCUMFERENCE = 2 * Math.PI * 52;

const themeBtn      = document.getElementById("themeBtn");
const menuBtn       = document.getElementById("menuBtn");
const sidebar       = document.getElementById("sidebar");
const overlay       = document.getElementById("overlay");

const editModal     = document.getElementById("editModal");
const editTitle     = document.getElementById("editTitle");
const editDate      = document.getElementById("editDate");
const editTime      = document.getElementById("editTime");
const editPriority  = document.getElementById("editPriority");
const editRepeat    = document.getElementById("editRepeat");
const editList      = document.getElementById("editList");
const saveEditBtn   = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const listModal        = document.getElementById("listModal");
const listModalTitle   = document.getElementById("listModalTitle");
const listNameInput    = document.getElementById("listNameInput");
const listColorSwatches= document.getElementById("listColorSwatches");
const saveListBtn      = document.getElementById("saveListBtn");

const colorWheelWrap = document.getElementById("colorWheelWrap");
const colorWheelCanvas = document.getElementById("colorWheel");
const wheelPointer   = document.getElementById("wheelPointer");
const lightnessSlider= document.getElementById("lightnessSlider");
const colorPreview   = document.getElementById("colorPreview");
const colorHexLabel  = document.getElementById("colorHexLabel");
const cancelListBtn    = document.getElementById("cancelListBtn");

const viewSwitch    = document.getElementById("viewSwitch");
const viewPanels    = document.querySelectorAll(".view-panel");

const searchBtn      = document.getElementById("searchBtn");
const searchPanel    = document.getElementById("searchPanel");
const searchInput    = document.getElementById("searchInput");
const searchResults  = document.getElementById("searchResults");
const closeSearchBtn = document.getElementById("closeSearchBtn");

const calPrevBtn      = document.getElementById("calPrevBtn");
const calNextBtn      = document.getElementById("calNextBtn");
const calTodayBtn     = document.getElementById("calTodayBtn");
const calMonthLabel   = document.getElementById("calMonthLabel");
const calendarGrid    = document.getElementById("calendarGrid");
const dayTasksTitle   = document.getElementById("dayTasksTitle");
const dayTasksContainer = document.getElementById("dayTasksContainer");

const statCompleted = document.getElementById("statCompleted");
const statPending   = document.getElementById("statPending");
const statOverdue   = document.getElementById("statOverdue");
const statLists     = document.getElementById("statLists");
const donutChart     = document.getElementById("donutChart");
const donutLegend    = document.getElementById("donutLegend");
const barChart       = document.getElementById("barChart");

function loadState(){

    const raw = localStorage.getItem(STORAGE_KEY);

    if(raw){
        try{
            const data = JSON.parse(raw);
            data.lists.forEach((l, i) => {
                if(!l.color) l.color = LIST_COLORS[i % LIST_COLORS.length].hex;
            });
            data.tasks.forEach(t => {
                if(!t.repeat) t.repeat = "none";
                if(t.completedAt === undefined) t.completedAt = t.done ? Date.now() : null;
                if(!t.createdAt) t.createdAt = Date.now();
            });
            return data;
        }catch(e){
            console.warn("Could not parse saved to-do data, starting fresh.");
        }
    }

    const defaultListId = "list-" + Date.now();

    return {
        lists: [{ id: defaultListId, name: "General", color: LIST_COLORS[0].hex }],
        tasks: [],
        activeListId: defaultListId
    };
}

function saveState(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadSettings(){
    const raw = localStorage.getItem(SETTINGS_KEY);
    const defaults = { theme: "dark", groupByDate: false, currentView: "tasks" };
    if(!raw) return defaults;
    try{
        return Object.assign(defaults, JSON.parse(raw));
    }catch(e){
        return defaults;
    }
}

function saveSettings(){
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function uid(prefix){
    return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

function todayStr(){
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}

function getActiveList(){
    return state.lists.find(l => l.id === state.activeListId) || state.lists[0];
}

function getListById(id){
    return state.lists.find(l => l.id === id);
}

function tasksForActiveList(){
    return state.tasks.filter(t => t.listId === state.activeListId);
}

function hexToRgb(hex){
    const m = hex.replace("#","").match(/.{1,2}/g);
    return m.map(x => parseInt(x, 16)).join(", ");
}

function hslToHex(h, s, l){
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = x => Math.round(255 * x).toString(16).padStart(2, "0");
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function hexToHsl(hex){
    let r = parseInt(hex.slice(1,3), 16) / 255;
    let g = parseInt(hex.slice(3,5), 16) / 255;
    let b = parseInt(hex.slice(5,7), 16) / 255;

    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h, s, l = (max + min) / 2;

    if(max === min){
        h = s = 0;
    }else{
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            default: h = (r - g) / d + 4;
        }
        h *= 60;
    }

    return { h, s: s * 100, l: l * 100 };
}

function formatDue(date, time){
    if(!date && !time) return null;

    const opts = { day: "numeric", month: "short" };
    let label = "";

    if(date){
        const d = new Date(date + "T00:00:00");
        label = d.toLocaleDateString(undefined, opts);
    }

    if(time){
        label += (label ? ", " : "") + formatTimeOnly(time);
    }

    return label;
}

function formatTimeOnly(time){
    if(!time) return "";
    const [h, m] = time.split(":");
    const d = new Date();
    d.setHours(h, m);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
}

function isOverdue(task){
    if(task.done || !task.date) return false;
    const due = new Date(task.date + "T" + (task.time || "23:59"));
    return due.getTime() < Date.now();
}

function escapeHtml(str){
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function dateGroupLabel(dateStr){
    if(!dateStr) return "No date";

    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(dateStr + "T00:00:00");
    const diffDays = Math.round((target - today) / DAY_MS);

    if(diffDays < 0) return "Overdue";
    if(diffDays === 0) return "Today";
    if(diffDays === 1) return "Tomorrow";
    if(diffDays > 1 && diffDays <= 7) return "This Week";
    return "Later";
}

function nextRepeatDate(dateStr, repeat){
    const base = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
    if(repeat === "daily") base.setDate(base.getDate() + 1);
    else if(repeat === "weekly") base.setDate(base.getDate() + 7);
    else if(repeat === "monthly") base.setMonth(base.getMonth() + 1);
    return base.getFullYear() + "-" + String(base.getMonth()+1).padStart(2,"0") + "-" + String(base.getDate()).padStart(2,"0");
}

function renderLists(){

    listsContainer.innerHTML = "";

    state.lists.forEach(list => {

        const count = state.tasks.filter(t => t.listId === list.id && !t.done).length;
        const isActive = list.id === state.activeListId;

        const item = document.createElement("div");
        item.className = "list-item" + (isActive ? " active" : "");
        item.style.setProperty("--list-color", list.color);
        item.style.setProperty("--list-rgb", hexToRgb(list.color));

        item.innerHTML = `
            <span class="list-dot"></span>
            <span class="list-name">${escapeHtml(list.name)}</span>
            <span class="list-count">${count}</span>
            <i class="fa-solid fa-pen list-edit" title="Edit list"></i>
            ${state.lists.length > 1 ? '<i class="fa-solid fa-xmark delete-list" title="Delete list"></i>' : ""}
        `;

        item.addEventListener("click", (e) => {
            if(e.target.closest(".delete-list") || e.target.closest(".list-edit")) return;
            state.activeListId = list.id;
            saveState();
            renderAll();
            closeSidebarOnMobile();
        });

        item.querySelector(".list-edit").addEventListener("click", (e) => {
            e.stopPropagation();
            openListModal(list.id);
        });

        const deleteBtn = item.querySelector(".delete-list");
        if(deleteBtn){
            deleteBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                deleteList(list.id);
            });
        }

        listsContainer.appendChild(item);
    });

    const activeList = getActiveList();
    if(activeList){
        activeListDot.style.background = activeList.color;
    }
}

function deleteList(listId){

    if(state.lists.length <= 1) return;

    const list = state.lists.find(l => l.id === listId);
    if(!confirm(`Delete "${list.name}" and all its tasks?`)) return;

    state.lists = state.lists.filter(l => l.id !== listId);
    state.tasks = state.tasks.filter(t => t.listId !== listId);

    if(state.activeListId === listId){
        state.activeListId = state.lists[0].id;
    }

    saveState();
    renderAll();
}

// hue/saturation wheel (angle = hue, distance from center = saturation)
// plus a shade slider that controls lightness, so any colour is reachable,
// including pastels, near-black and near-white

const WHEEL_CENTER = 90;
const WHEEL_RADIUS  = 82;

let wheelHue = 231, wheelSat = 68, wheelLight = 58;
let wheelDragging = false;

function drawColorWheel(){

    const ctx = colorWheelCanvas.getContext("2d");
    ctx.clearRect(0, 0, 180, 180);

    if(ctx.createConicGradient){
        const grad = ctx.createConicGradient(0, WHEEL_CENTER, WHEEL_CENTER);
        for(let i = 0; i <= 360; i += 30){
            grad.addColorStop(i / 360, `hsl(${i},100%,50%)`);
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(WHEEL_CENTER, WHEEL_CENTER, WHEEL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }else{
        for(let angle = 0; angle < 360; angle++){
            ctx.beginPath();
            ctx.moveTo(WHEEL_CENTER, WHEEL_CENTER);
            ctx.arc(WHEEL_CENTER, WHEEL_CENTER, WHEEL_RADIUS, (angle - 1) * Math.PI / 180, (angle + 1) * Math.PI / 180);
            ctx.closePath();
            ctx.fillStyle = `hsl(${angle},100%,50%)`;
            ctx.fill();
        }
    }

    // fade toward white near the centre so pastel shades are reachable
    const radGrad = ctx.createRadialGradient(WHEEL_CENTER, WHEEL_CENTER, 0, WHEEL_CENTER, WHEEL_CENTER, WHEEL_RADIUS);
    radGrad.addColorStop(0, "rgba(255,255,255,1)");
    radGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(WHEEL_CENTER, WHEEL_CENTER, WHEEL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
}

function setWheelPointerPosition(hue, sat){
    const angleRad = hue * Math.PI / 180;
    const radius = (sat / 100) * WHEEL_RADIUS;
    const x = WHEEL_CENTER + radius * Math.cos(angleRad);
    const y = WHEEL_CENTER + radius * Math.sin(angleRad);
    wheelPointer.style.left = x + "px";
    wheelPointer.style.top = y + "px";
}

function updateColorPreview(){
    selectedListColor = hslToHex(wheelHue, wheelSat, wheelLight);
    colorPreview.style.background = selectedListColor;
    colorHexLabel.textContent = selectedListColor.toUpperCase();
    listColorSwatches.querySelectorAll(".swatch").forEach(s => {
        s.classList.toggle("selected", s.dataset.hex.toLowerCase() === selectedListColor.toLowerCase());
    });
}

function pickFromEvent(e){
    const rect = colorWheelWrap.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left - WHEEL_CENTER;
    const y = clientY - rect.top - WHEEL_CENTER;

    const radius = Math.min(Math.hypot(x, y), WHEEL_RADIUS);
    let angle = Math.atan2(y, x);
    if(angle < 0) angle += Math.PI * 2;

    wheelHue = angle * 180 / Math.PI;
    wheelSat = (radius / WHEEL_RADIUS) * 100;

    setWheelPointerPosition(wheelHue, wheelSat);
    updateColorPreview();
}

colorWheelWrap.addEventListener("mousedown", (e) => { wheelDragging = true; pickFromEvent(e); });
document.addEventListener("mousemove", (e) => { if(wheelDragging) pickFromEvent(e); });
document.addEventListener("mouseup", () => { wheelDragging = false; });

colorWheelWrap.addEventListener("touchstart", (e) => { wheelDragging = true; pickFromEvent(e); }, { passive: true });
colorWheelWrap.addEventListener("touchmove", (e) => { if(wheelDragging){ pickFromEvent(e); e.preventDefault(); } }, { passive: false });
colorWheelWrap.addEventListener("touchend", () => { wheelDragging = false; });

lightnessSlider.addEventListener("input", () => {
    wheelLight = parseInt(lightnessSlider.value, 10);
    updateColorPreview();
});

function setWheelFromHex(hex){
    const { h, s, l } = hexToHsl(hex);
    wheelHue = h;
    wheelSat = s;
    wheelLight = Math.max(4, Math.min(96, Math.round(l)));
    lightnessSlider.value = wheelLight;
    setWheelPointerPosition(wheelHue, wheelSat);
    updateColorPreview();
}

drawColorWheel();

function openListModal(listId){

    editingListId = listId || null;
    const list = listId ? getListById(listId) : null;

    listModalTitle.textContent = list ? "Edit list" : "New list";
    listNameInput.value = list ? list.name : "";

    const startColor = list ? list.color : LIST_COLORS[state.lists.length % LIST_COLORS.length].hex;

    listColorSwatches.innerHTML = LIST_COLORS.map(c => `
        <span class="swatch" data-hex="${c.hex}" style="background:${c.hex}" title="${c.key}"></span>
    `).join("");

    listColorSwatches.querySelectorAll(".swatch").forEach(sw => {
        sw.addEventListener("click", () => setWheelFromHex(sw.dataset.hex));
    });

    setWheelFromHex(startColor);

    listModal.classList.add("open");
    listNameInput.focus();
}

function closeListModal(){
    listModal.classList.remove("open");
    editingListId = null;
}

addListBtn.addEventListener("click", () => openListModal(null));
cancelListBtn.addEventListener("click", closeListModal);

listModal.addEventListener("click", (e) => {
    if(e.target === listModal) closeListModal();
});

saveListBtn.addEventListener("click", () => {

    const name = listNameInput.value.trim();
    if(!name){
        listNameInput.focus();
        return;
    }

    if(editingListId){
        const list = getListById(editingListId);
        list.name = name;
        list.color = selectedListColor;
    }else{
        const newList = { id: uid("list"), name, color: selectedListColor };
        state.lists.push(newList);
        state.activeListId = newList.id;
    }

    saveState();
    closeListModal();
    renderAll();
});

function buildTaskCard(task, opts){

    opts = opts || {};
    const list = getListById(task.listId);
    const due = formatDue(task.date, task.time);
    const overdue = isOverdue(task);
    const priority = task.priority || "medium";

    const card = document.createElement("div");
    card.className = `task-card priority-${priority}` + (task.done ? " completed" : "");
    if(list) card.style.borderLeftColor = task.done ? "" : "";

    card.innerHTML = `
        <button class="task-check" title="Mark ${task.done ? "incomplete" : "complete"}">
            <i class="fa-solid fa-check"></i>
        </button>
        <div class="task-body">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-meta${overdue ? " overdue" : ""}">
                <span class="priority-tag priority-${priority}">${priority}</span>
                ${opts.showListTag && list ? `<span class="list-tag" style="background:${list.color}">${escapeHtml(list.name)}</span>` : ""}
                ${due ? `<span><i class="fa-regular fa-clock"></i> ${due}${overdue ? " · overdue" : ""}</span>` : ""}
                ${task.repeat && task.repeat !== "none" ? `<span class="repeat-tag"><i class="fa-solid fa-repeat"></i> ${task.repeat}</span>` : ""}
            </div>
        </div>
        <div class="task-actions">
            <button class="edit-task" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="delete-task" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
    `;

    card.querySelector(".task-check").addEventListener("click", () => toggleTask(task.id));
    card.querySelector(".edit-task").addEventListener("click", () => openEditModal(task.id));
    card.querySelector(".delete-task").addEventListener("click", () => deleteTask(task.id));

    return card;
}

function sortTasks(tasks){
    const priorityWeight = { high: 0, medium: 1, low: 2 };

    return [...tasks].sort((a, b) => {
        if(a.done !== b.done) return a.done ? 1 : -1;

        const pa = priorityWeight[a.priority] ?? 1;
        const pb = priorityWeight[b.priority] ?? 1;
        if(pa !== pb) return pa - pb;

        const da = a.date ? a.date + (a.time || "") : "9999";
        const db = b.date ? b.date + (b.time || "") : "9999";
        return da.localeCompare(db);
    });
}

function renderTasks(){

    const list = getActiveList();
    activeListName.textContent = list.name;

    let tasks = tasksForActiveList();

    activeListCount.textContent = tasks.filter(t => !t.done).length;

    if(activeFilter === "active"){
        tasks = tasks.filter(t => !t.done);
    }else if(activeFilter === "completed"){
        tasks = tasks.filter(t => t.done);
    }

    tasks = sortTasks(tasks);

    taskContainer.innerHTML = "";

    if(settings.groupByDate){

        const groupOrder = ["Overdue", "Today", "Tomorrow", "This Week", "Later", "No date"];
        const groups = {};
        groupOrder.forEach(g => groups[g] = []);

        tasks.forEach(t => {
            const label = t.done ? "Completed" : dateGroupLabel(t.date);
            if(!groups[label]) groups[label] = [];
            groups[label].push(t);
        });

        const finalOrder = [...groupOrder, "Completed"];

        finalOrder.forEach(groupName => {
            const groupTasks = groups[groupName];
            if(!groupTasks || groupTasks.length === 0) return;

            const header = document.createElement("div");
            header.className = "task-group-header" + (groupName === "Overdue" ? " overdue-header" : "");
            header.textContent = `${groupName} (${groupTasks.length})`;
            taskContainer.appendChild(header);

            groupTasks.forEach(t => taskContainer.appendChild(buildTaskCard(t)));
        });

    }else{
        tasks.forEach(t => taskContainer.appendChild(buildTaskCard(t)));
    }

    emptyState.classList.toggle("show", tasks.length === 0);
}

addTaskForm.addEventListener("submit", (e) => {

    e.preventDefault();

    const title = taskInput.value.trim();
    if(!title) return;

    state.tasks.push({
        id: uid("task"),
        title,
        date: taskDate.value || null,
        time: taskTime.value || null,
        priority: taskPriority.value || "medium",
        repeat: taskRepeat.value || "none",
        done: false,
        completedAt: null,
        createdAt: Date.now(),
        listId: state.activeListId
    });

    taskInput.value = "";
    taskDate.value = "";
    taskTime.value = "";
    taskPriority.value = "medium";
    taskRepeat.value = "none";
    taskInput.focus();

    saveState();
    renderAll();
});

function toggleTask(id){
    const task = state.tasks.find(t => t.id === id);
    if(!task) return;

    task.done = !task.done;
    task.completedAt = task.done ? Date.now() : null;

    if(task.done && task.repeat && task.repeat !== "none"){
        state.tasks.push({
            id: uid("task"),
            title: task.title,
            date: nextRepeatDate(task.date, task.repeat),
            time: task.time,
            priority: task.priority,
            repeat: task.repeat,
            done: false,
            completedAt: null,
            createdAt: Date.now(),
            listId: task.listId
        });
    }

    saveState();
    renderAll();
}

function deleteTask(id){
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveState();
    renderAll();
}

clearCompletedBtn.addEventListener("click", () => {
    state.tasks = state.tasks.filter(t => !(t.listId === state.activeListId && t.done));
    saveState();
    renderAll();
});

groupToggleBtn.addEventListener("click", () => {
    settings.groupByDate = !settings.groupByDate;
    groupToggleBtn.classList.toggle("active", settings.groupByDate);
    saveSettings();
    renderTasks();
});

function openEditModal(id){

    const task = state.tasks.find(t => t.id === id);
    if(!task) return;

    editingTaskId = id;

    editTitle.value = task.title;
    editDate.value = task.date || "";
    editTime.value = task.time || "";
    editPriority.value = task.priority || "medium";
    editRepeat.value = task.repeat || "none";

    editList.innerHTML = state.lists
        .map(l => `<option value="${l.id}" ${l.id === task.listId ? "selected" : ""}>${escapeHtml(l.name)}</option>`)
        .join("");

    editModal.classList.add("open");
    editTitle.focus();
}

function closeEditModal(){
    editModal.classList.remove("open");
    editingTaskId = null;
}

saveEditBtn.addEventListener("click", () => {

    if(!editingTaskId) return;

    const task = state.tasks.find(t => t.id === editingTaskId);
    if(!task) return;

    const title = editTitle.value.trim();
    if(!title){
        editTitle.focus();
        return;
    }

    task.title = title;
    task.date = editDate.value || null;
    task.time = editTime.value || null;
    task.priority = editPriority.value || "medium";
    task.repeat = editRepeat.value || "none";
    task.listId = editList.value;

    saveState();
    closeEditModal();
    renderAll();
});

cancelEditBtn.addEventListener("click", closeEditModal);

editModal.addEventListener("click", (e) => {
    if(e.target === editModal) closeEditModal();
});

document.addEventListener("keydown", (e) => {
    if(e.key !== "Escape") return;
    if(editModal.classList.contains("open")) closeEditModal();
    if(listModal.classList.contains("open")) closeListModal();
    if(searchPanel.classList.contains("open")) closeSearch();
});

filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = btn.dataset.filter;
        renderTasks();
    });
});

function renderProgress(){

    const tasks = tasksForActiveList();
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    const offset = RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE;
    ringFill.style.strokeDashoffset = offset;

    const list = getActiveList();
    if(list){
        ringFill.style.stroke = list.color;
        ringPercent.style.color = list.color;
    }

    ringPercent.textContent = percent + "%";
    progressCaption.textContent = `${done} of ${total} task${total === 1 ? "" : "s"} complete`;
}

themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("light");
    settings.theme = document.body.classList.contains("light") ? "light" : "dark";
    themeBtn.innerHTML = settings.theme === "light"
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';
    saveSettings();
});

function applySavedTheme(){
    if(settings.theme === "light"){
        document.body.classList.add("light");
        themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
}

menuBtn.addEventListener("click", () => {
    sidebar.classList.add("open");
    overlay.classList.add("show");
});

overlay.addEventListener("click", closeSidebarOnMobile);

function closeSidebarOnMobile(){
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
}

viewSwitch.addEventListener("click", (e) => {
    const btn = e.target.closest(".view-btn");
    if(!btn) return;
    switchView(btn.dataset.view);
});

function switchView(view){
    currentView = view;
    settings.currentView = view;
    saveSettings();

    viewSwitch.querySelectorAll(".view-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.view === view);
    });

    viewPanels.forEach(p => p.classList.remove("active"));
    document.getElementById(view + "View").classList.add("active");

    if(view === "calendar") renderCalendar();
    if(view === "analytics") renderAnalytics();
}

searchBtn.addEventListener("click", () => {
    searchPanel.classList.toggle("open");
    if(searchPanel.classList.contains("open")){
        searchInput.focus();
        renderSearchResults("");
    }
});

closeSearchBtn.addEventListener("click", closeSearch);

function closeSearch(){
    searchPanel.classList.remove("open");
    searchInput.value = "";
    searchResults.innerHTML = "";
}

searchInput.addEventListener("input", () => {
    renderSearchResults(searchInput.value.trim().toLowerCase());
});

function renderSearchResults(query){

    searchResults.innerHTML = "";

    if(!query){
        searchResults.innerHTML = '<p class="search-empty">Type to search tasks across every list.</p>';
        return;
    }

    const matches = state.tasks.filter(t => t.title.toLowerCase().includes(query));

    if(matches.length === 0){
        searchResults.innerHTML = '<p class="search-empty">No tasks match your search.</p>';
        return;
    }

    sortTasks(matches).forEach(task => {
        const list = getListById(task.listId);
        const due = formatDue(task.date, task.time);

        const row = document.createElement("div");
        row.className = "search-result-item";
        row.innerHTML = `
            <span class="srch-list-tag" style="background:${list ? list.color : "#5b6bd6"}">${list ? escapeHtml(list.name) : ""}</span>
            <span class="srch-title">${escapeHtml(task.title)}${task.done ? " (done)" : ""}</span>
            <span class="repeat-tag">${due || ""}</span>
        `;
        row.addEventListener("click", () => {
            state.activeListId = task.listId;
            saveState();
            switchView("tasks");
            renderAll();
            closeSearch();
        });

        searchResults.appendChild(row);
    });
}

function renderCalendar(){

    const { year, month } = calState;
    const monthStart = new Date(year, month, 1);
    const monthLabel = monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    calMonthLabel.textContent = monthLabel;

    const startWeekday = monthStart.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    for(let i = startWeekday - 1; i >= 0; i--){
        cells.push({ day: daysInPrevMonth - i, outside: true, dateStr: null });
    }
    for(let d = 1; d <= daysInMonth; d++){
        const dateStr = year + "-" + String(month+1).padStart(2,"0") + "-" + String(d).padStart(2,"0");
        cells.push({ day: d, outside: false, dateStr });
    }
    while(cells.length % 7 !== 0 || cells.length < 42){
        const overflowDay = cells.length - (startWeekday + daysInMonth) + 1;
        cells.push({ day: overflowDay, outside: true, dateStr: null });
        if(cells.length >= 42) break;
    }

    const today = todayStr();

    calendarGrid.innerHTML = "";

    cells.forEach(cell => {

        const div = document.createElement("div");
        div.className = "cal-day" + (cell.outside ? " outside" : "");

        if(cell.dateStr === today) div.classList.add("today");
        if(cell.dateStr && cell.dateStr === calState.selectedDate) div.classList.add("selected");

        const dayTasks = cell.dateStr ? state.tasks.filter(t => t.date === cell.dateStr) : [];
        if(dayTasks.length > 0) div.classList.add("has-tasks");

        const dots = dayTasks.slice(0, 4).map(t => {
            const list = getListById(t.listId);
            return `<span style="background:${list ? list.color : "#5b6bd6"}"></span>`;
        }).join("");

        div.innerHTML = `<span>${cell.day}</span><span class="cal-day-dots">${dots}</span>`;

        if(cell.dateStr){
            div.addEventListener("click", () => {
                calState.selectedDate = cell.dateStr;
                renderCalendar();
                renderDayTasks(cell.dateStr);
            });
        }

        calendarGrid.appendChild(div);
    });

    renderDayTasks(calState.selectedDate);
}

function renderDayTasks(dateStr){

    const d = new Date(dateStr + "T00:00:00");
    dayTasksTitle.textContent = d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

    const tasks = sortTasks(state.tasks.filter(t => t.date === dateStr));

    dayTasksContainer.innerHTML = "";

    if(tasks.length === 0){
        dayTasksContainer.innerHTML = '<p class="day-tasks-empty">No tasks due this day.</p>';
        return;
    }

    tasks.forEach(t => dayTasksContainer.appendChild(buildTaskCard(t, { showListTag: true })));
}

calPrevBtn.addEventListener("click", () => {
    calState.month--;
    if(calState.month < 0){ calState.month = 11; calState.year--; }
    renderCalendar();
});

calNextBtn.addEventListener("click", () => {
    calState.month++;
    if(calState.month > 11){ calState.month = 0; calState.year++; }
    renderCalendar();
});

calTodayBtn.addEventListener("click", () => {
    const now = new Date();
    calState.year = now.getFullYear();
    calState.month = now.getMonth();
    calState.selectedDate = todayStr();
    renderCalendar();
});

function renderAnalytics(){

    const allTasks = state.tasks;
    const completed = allTasks.filter(t => t.done).length;
    const pending = allTasks.filter(t => !t.done).length;
    const overdue = allTasks.filter(t => isOverdue(t)).length;

    statCompleted.textContent = completed;
    statPending.textContent = pending;
    statOverdue.textContent = overdue;
    statLists.textContent = state.lists.length;

    renderDonutChart();
    renderBarChart();
}

function renderDonutChart(){

    const total = state.tasks.length;

    if(total === 0){
        donutChart.innerHTML = "";
        donutLegend.innerHTML = '<p class="chart-empty">Add tasks to see this chart.</p>';
        return;
    }

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let offsetAcc = 0;

    let circles = "";
    let legend = "";

    state.lists.forEach(list => {
        const count = state.tasks.filter(t => t.listId === list.id).length;
        if(count === 0) return;

        const fraction = count / total;
        const dash = fraction * circumference;

        circles += `
            <circle cx="100" cy="100" r="${radius}" fill="none" stroke="${list.color}"
                stroke-width="26" stroke-dasharray="${dash} ${circumference - dash}"
                stroke-dashoffset="${-offsetAcc}" transform="rotate(-90 100 100)"></circle>
        `;

        offsetAcc += dash;

        legend += `
            <div class="legend-row">
                <span class="legend-dot" style="background:${list.color}"></span>
                <span class="legend-name">${escapeHtml(list.name)}</span>
                <span class="legend-count">${count}</span>
            </div>
        `;
    });

    donutChart.innerHTML = `
        <circle cx="100" cy="100" r="${radius}" fill="none" stroke="var(--border)" stroke-width="26"></circle>
        ${circles}
    `;

    donutLegend.innerHTML = legend;
}

function renderBarChart(){

    const days = [];
    for(let i = 6; i >= 0; i--){
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
        days.push({ key, label: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0,3), count: 0 });
    }

    state.tasks.forEach(t => {
        if(!t.completedAt) return;
        const d = new Date(t.completedAt);
        const key = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
        const day = days.find(x => x.key === key);
        if(day) day.count++;
    });

    const max = Math.max(1, ...days.map(d => d.count));
    const chartH = 150;
    const barW = 28;
    const gap = (300 - barW * 7) / 8;

    let bars = "";
    days.forEach((day, i) => {
        const h = day.count === 0 ? 2 : (day.count / max) * chartH;
        const x = gap + i * (barW + gap);
        const y = chartH - h + 10;

        bars += `
            <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="6" fill="var(--accent)"></rect>
            <text x="${x + barW/2}" y="${chartH + 26}" text-anchor="middle">${day.label}</text>
            ${day.count > 0 ? `<text x="${x + barW/2}" y="${y - 6}" text-anchor="middle">${day.count}</text>` : ""}
        `;
    });

    barChart.innerHTML = bars;
}

function renderAll(){
    renderLists();
    renderTasks();
    renderProgress();
    if(currentView === "calendar") renderCalendar();
    if(currentView === "analytics") renderAnalytics();
}

applySavedTheme();
groupToggleBtn.classList.toggle("active", settings.groupByDate);
switchView(currentView);
renderAll();