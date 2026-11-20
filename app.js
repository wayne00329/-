(() => {
  const STORAGE_KEY = 'daily-schedule-manager-v1';
  const $ = (selector) => document.querySelector(selector);
  const todayISO = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  const dateFromISO = (value) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  const formatISO = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const readTasks = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      console.warn('無法讀取已儲存的行程。', error);
      return [];
    }
  };
  let tasks = readTasks();
  let selectedDate = todayISO();
  let activeView = 'today';
  let activeFilter = 'all';
  let toastTimer;

  const persist = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
    catch (error) { showToast('無法儲存資料，請確認瀏覽器儲存空間。'); console.error(error); }
  };
  const sameDateTasks = () => tasks.filter((task) => task.date === selectedDate);
  const visibleTasks = () => {
    let list = activeView === 'done' ? tasks.filter((task) => task.completed) : activeView === 'all' ? tasks : sameDateTasks();
    if (activeFilter === 'pending') list = list.filter((task) => !task.completed);
    if (activeFilter === 'done') list = list.filter((task) => task.completed);
    return [...list].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  };
  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const render = () => {
    const current = sameDateTasks();
    const completed = current.filter((task) => task.completed).length;
    const pending = current.length - completed;
    const high = current.filter((task) => task.priority === 'high' && !task.completed).length;
    const date = dateFromISO(selectedDate);
    $('#today-label').textContent = new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());
    $('#selected-weekday').textContent = new Intl.DateTimeFormat('zh-TW', { weekday: 'long' }).format(date);
    $('#selected-date').textContent = new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
    $('#pending-count').textContent = pending;
    $('#completed-count').textContent = completed;
    $('#priority-count').textContent = high;
    $('#sidebar-count').textContent = pending;
    $('#progress-label').textContent = `${completed} / ${current.length}`;
    $('#progress-bar').style.width = `${current.length ? Math.round(completed / current.length * 100) : 0}%`;
    const title = activeView === 'all' ? '所有行程' : activeView === 'done' ? '已完成行程' : selectedDate === todayISO() ? '今天的行程' : `${date.getMonth() + 1} 月 ${date.getDate()} 日的行程`;
    $('#page-title').textContent = title;
    $('#page-subtitle').textContent = activeView === 'today' ? '把想做的事一件件完成。' : activeView === 'done' ? '看看一路完成的每一件事。' : '所有安排都在這裡。';
    $('#list-heading').textContent = activeView === 'all' ? '所有行程' : activeView === 'done' ? '完成紀錄' : '行程清單';
    $('#list-hint').textContent = activeView === 'all' || activeView === 'done' ? '依日期與時間排序' : '依時間排序';
    const filtered = visibleTasks();
    const list = $('#task-list');
    if (!filtered.length) {
      const emptyTitle = activeFilter === 'done' ? '還沒有完成的行程' : activeFilter === 'pending' ? '太棒了，沒有待完成行程' : activeView === 'all' ? '還沒有任何行程' : activeView === 'done' ? '完成的行程會出現在這裡' : '今天還沒有安排';
      const emptyMessage = activeView === 'today' ? '點擊「新增行程」，開始規劃你的一天。' : '安排一件小事，讓今天更有方向。';
      list.innerHTML = `<div class="empty-state"><div class="empty-illustration" aria-hidden="true">✧</div><strong>${emptyTitle}</strong><p>${emptyMessage}</p></div>`;
      return;
    }
    list.innerHTML = filtered.map((task) => {
      const priority = task.priority === 'high' ? '<span class="tag priority-tag high">高優先</span>' : task.priority === 'low' ? '<span class="tag priority-tag low">低優先</span>' : '';
      const time = task.time ? escapeHTML(task.time) : '未定時間';
      return `<article class="task-row ${task.completed ? 'is-done' : ''}" data-id="${escapeHTML(task.id)}">
        <button class="check-button" type="button" aria-label="${task.completed ? '標記為未完成' : '標記為已完成'}" aria-pressed="${task.completed}">${task.completed ? '✓' : ''}</button>
        <time class="task-time">${time}</time>
        <div class="task-details"><div class="task-title">${escapeHTML(task.title)}</div>${task.note ? `<div class="task-note">${escapeHTML(task.note)}</div>` : ''}</div>
        <div class="task-tags"><span class="tag">${escapeHTML(task.category || '個人')}</span>${priority}</div>
        <button class="delete-button" type="button" aria-label="刪除行程">×</button>
      </article>`;
    }).join('');
  };
  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
  }
  const dialog = $('#task-dialog');
  const closeDialog = () => dialog.close();
  $('#open-form').addEventListener('click', () => { $('#task-form').reset(); $('#task-time').value = '09:00'; dialog.showModal(); $('#task-title').focus(); });
  $('#close-form').addEventListener('click', closeDialog);
  $('#cancel-form').addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
  $('#task-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') || '').trim();
    if (!title) return;
    tasks.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, title, date: selectedDate, time: String(form.get('time') || ''), category: String(form.get('category') || '個人'), priority: String(form.get('priority') || 'normal'), note: String(form.get('note') || '').trim(), completed: false, createdAt: Date.now() });
    persist(); closeDialog(); render(); showToast('行程已新增');
  });
  $('#task-list').addEventListener('click', (event) => {
    const row = event.target.closest('.task-row');
    if (!row) return;
    const index = tasks.findIndex((task) => task.id === row.dataset.id);
    if (index < 0) return;
    if (event.target.closest('.check-button')) {
      tasks[index].completed = !tasks[index].completed;
      persist(); render();
    } else if (event.target.closest('.delete-button')) {
      tasks.splice(index, 1); persist(); render(); showToast('行程已刪除');
    }
  });
  $('#previous-day').addEventListener('click', () => { const date = dateFromISO(selectedDate); date.setDate(date.getDate() - 1); selectedDate = formatISO(date); activeView = 'today'; updateNav(); render(); });
  $('#next-day').addEventListener('click', () => { const date = dateFromISO(selectedDate); date.setDate(date.getDate() + 1); selectedDate = formatISO(date); activeView = 'today'; updateNav(); render(); });
  $('#jump-today').addEventListener('click', () => { selectedDate = todayISO(); activeView = 'today'; updateNav(); render(); });
  function updateNav() {
    document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === activeView));
    document.querySelectorAll('.filter-button').forEach((button) => button.classList.toggle('selected', button.dataset.filter === activeFilter));
  }
  document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => { activeView = button.dataset.view; activeFilter = 'all'; updateNav(); render(); }));
  document.querySelectorAll('.filter-button').forEach((button) => button.addEventListener('click', () => { activeFilter = button.dataset.filter; updateNav(); render(); }));
  render();
})();
