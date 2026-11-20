(() => {
  const $ = (selector) => document.querySelector(selector);
  const todayISO = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; };
  const dateFromISO = (value) => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day); };
  const formatISO = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  let tasks = [];
  let selectedDate = todayISO();
  let activeView = 'today';
  let activeFilter = 'all';
  let toastTimer;
  let supabaseClient;
  let currentUser;
  let realtimeChannel;
  let authMode = 'login';

  function showToast(message) {
    const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  function setAuthMessage(message, isError = false) {
    const node = $('#auth-message'); node.textContent = message; node.classList.toggle('error', isError);
  }
  function setAuthMode(mode) {
    authMode = mode;
    document.querySelectorAll('.auth-tab').forEach((tab) => tab.classList.toggle('selected', tab.dataset.authMode === mode));
    const registering = mode === 'register';
    $('#auth-nickname').hidden = !registering;
    $('#nickname-label').hidden = !registering;
    $('#auth-nickname').required = registering;
    $('#auth-password').autocomplete = registering ? 'new-password' : 'current-password';
    $('#auth-title').textContent = registering ? '建立你的帳號' : '登入每日行程';
    $('#auth-submit').textContent = registering ? '建立帳號' : '登入';
    setAuthMessage('');
  }
  function showApp(isSignedIn) {
    $('#auth-screen').hidden = isSignedIn;
    $('#app-shell').hidden = !isSignedIn;
  }
  async function handleSession(session) {
    if (!session) {
      currentUser = null; tasks = [];
      if (realtimeChannel) { await supabaseClient.removeChannel(realtimeChannel); realtimeChannel = null; }
      showApp(false); return;
    }
    currentUser = session.user;
    const metadata = currentUser.user_metadata || {};
    $('#account-name').textContent = metadata.nickname || currentUser.email || '';
    showApp(true);
    await loadTasks();
    subscribeToTasks();
  }
  async function loadTasks() {
    if (!currentUser) return;
    const { data, error } = await supabaseClient.from('tasks').select('*').order('date').order('time');
    if (error) { showToast(`讀取雲端行程失敗：${error.message}`); return; }
    tasks = (data || []).map((row) => ({ id: row.id, title: row.title, date: row.date, time: row.time || '', category: row.category || '個人', priority: row.priority || 'normal', note: row.note || '', completed: row.completed, createdAt: new Date(row.created_at).getTime() }));
    render();
  }
  function subscribeToTasks() {
    if (!currentUser) return;
    if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = supabaseClient.channel(`tasks-${currentUser.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${currentUser.id}` }, () => loadTasks()).subscribe();
  }
  async function saveTask(task) {
    const { error } = await supabaseClient.from('tasks').upsert({ id: task.id, user_id: currentUser.id, title: task.title, date: task.date, time: task.time || null, category: task.category, priority: task.priority, note: task.note || '', completed: task.completed });
    if (error) { showToast(`儲存失敗：${error.message}`); await loadTasks(); return false; }
    return true;
  }
  const sameDateTasks = () => tasks.filter((task) => task.date === selectedDate);
  const visibleTasks = () => {
    let list = activeView === 'done' ? tasks.filter((task) => task.completed) : activeView === 'all' ? tasks : sameDateTasks();
    if (activeFilter === 'pending') list = list.filter((task) => !task.completed);
    if (activeFilter === 'done') list = list.filter((task) => task.completed);
    return [...list].sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '99:99').localeCompare(b.time || '99:99'));
  };
  function render() {
    if (!currentUser) return;
    const current = sameDateTasks();
    const completed = current.filter((task) => task.completed).length;
    const pending = current.length - completed;
    const high = current.filter((task) => task.priority === 'high' && !task.completed).length;
    const date = dateFromISO(selectedDate);
    $('#today-label').textContent = new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());
    $('#selected-weekday').textContent = new Intl.DateTimeFormat('zh-TW', { weekday: 'long' }).format(date);
    $('#selected-date').textContent = new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
    $('#pending-count').textContent = pending; $('#completed-count').textContent = completed; $('#priority-count').textContent = high; $('#sidebar-count').textContent = pending;
    $('#progress-label').textContent = `${completed} / ${current.length}`;
    $('#progress-bar').style.width = `${current.length ? Math.round(completed / current.length * 100) : 0}%`;
    const title = activeView === 'all' ? '所有行程' : activeView === 'done' ? '已完成行程' : selectedDate === todayISO() ? '今天的行程' : `${date.getMonth() + 1} 月 ${date.getDate()} 日的行程`;
    $('#page-title').textContent = title;
    $('#page-subtitle').textContent = activeView === 'today' ? '把想做的事一件件完成。' : activeView === 'done' ? '看看一路完成的每一件事。' : '所有安排都在這裡。';
    $('#list-heading').textContent = activeView === 'all' ? '所有行程' : activeView === 'done' ? '完成紀錄' : '行程清單';
    $('#list-hint').textContent = activeView === 'all' || activeView === 'done' ? '依日期與時間排序' : '依時間排序';
    const filtered = visibleTasks(); const list = $('#task-list');
    if (!filtered.length) {
      const emptyTitle = activeFilter === 'done' ? '還沒有完成的行程' : activeFilter === 'pending' ? '太棒了，沒有待完成行程' : activeView === 'all' ? '還沒有任何行程' : activeView === 'done' ? '完成的行程會出現在這裡' : '今天還沒有安排';
      list.innerHTML = `<div class="empty-state"><div class="empty-illustration" aria-hidden="true">✧</div><strong>${emptyTitle}</strong><p>點擊「新增行程」，開始規劃你的一天。</p></div>`; return;
    }
    list.innerHTML = filtered.map((task) => {
      const priority = task.priority === 'high' ? '<span class="tag priority-tag high">高優先</span>' : task.priority === 'low' ? '<span class="tag priority-tag low">低優先</span>' : '';
      const dateLabel = activeView === 'today' ? '' : `<span class="task-date">${escapeHTML(task.date)}</span>`;
      return `<article class="task-row ${task.completed ? 'is-done' : ''}" data-id="${escapeHTML(task.id)}"><button class="check-button" type="button" aria-label="${task.completed ? '標記為未完成' : '標記為已完成'}" aria-pressed="${task.completed}">${task.completed ? '✓' : ''}</button><time class="task-time">${escapeHTML(task.time || '未定時間')}</time><div class="task-details">${dateLabel}<div class="task-title">${escapeHTML(task.title)}</div>${task.note ? `<div class="task-note">${escapeHTML(task.note)}</div>` : ''}</div><div class="task-tags"><span class="tag">${escapeHTML(task.category || '個人')}</span>${priority}</div><button class="delete-button" type="button" aria-label="刪除行程">×</button></article>`;
    }).join('');
  }
  function updateNav() {
    document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === activeView));
    document.querySelectorAll('.filter-button').forEach((button) => button.classList.toggle('selected', button.dataset.filter === activeFilter));
  }

  document.querySelectorAll('.auth-tab').forEach((tab) => tab.addEventListener('click', () => setAuthMode(tab.dataset.authMode)));
  $('#auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!supabaseClient) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    const button = $('#auth-submit'); button.disabled = true; setAuthMessage(authMode === 'register' ? '正在建立帳號…' : '正在登入…');
    try {
      if (authMode === 'register') {
        const nickname = String(form.get('nickname') || '').trim();
        if (!nickname) throw new Error('請輸入暱稱。');
        const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { data: { nickname } } });
        if (error) throw error;
        if (data.session) { setAuthMessage('帳號建立成功。'); await handleSession(data.session); }
        else setAuthMessage('帳號已建立！請到電子郵件收取驗證信，驗證後再登入。');
      } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await handleSession(data.session);
      }
    } catch (error) { setAuthMessage(error.message || '操作失敗，請稍後再試。', true); }
    finally { button.disabled = false; }
  });

  const dialog = $('#task-dialog');
  const closeDialog = () => dialog.close();
  $('#open-form').addEventListener('click', () => { $('#task-form').reset(); $('#task-time').value = '09:00'; dialog.showModal(); $('#task-title').focus(); });
  $('#close-form').addEventListener('click', closeDialog); $('#cancel-form').addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
  $('#task-form').addEventListener('submit', async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); const title = String(form.get('title') || '').trim(); if (!title) return;
    const task = { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, title, date: selectedDate, time: String(form.get('time') || ''), category: String(form.get('category') || '個人'), priority: String(form.get('priority') || 'normal'), note: String(form.get('note') || '').trim(), completed: false };
    if (await saveTask(task)) { tasks.push(task); closeDialog(); render(); showToast('行程已新增並同步'); }
  });
  $('#task-list').addEventListener('click', async (event) => {
    const row = event.target.closest('.task-row'); if (!row) return;
    const index = tasks.findIndex((task) => task.id === row.dataset.id); if (index < 0) return;
    if (event.target.closest('.check-button')) {
      const changed = { ...tasks[index], completed: !tasks[index].completed };
      if (await saveTask(changed)) { tasks[index] = changed; render(); }
    } else if (event.target.closest('.delete-button')) {
      const { error } = await supabaseClient.from('tasks').delete().eq('id', tasks[index].id);
      if (error) { showToast(`刪除失敗：${error.message}`); return; }
      tasks.splice(index, 1); render(); showToast('行程已刪除並同步');
    }
  });
  $('#previous-day').addEventListener('click', () => { const date = dateFromISO(selectedDate); date.setDate(date.getDate() - 1); selectedDate = formatISO(date); activeView = 'today'; updateNav(); render(); });
  $('#next-day').addEventListener('click', () => { const date = dateFromISO(selectedDate); date.setDate(date.getDate() + 1); selectedDate = formatISO(date); activeView = 'today'; updateNav(); render(); });
  $('#sign-out').addEventListener('click', async () => { const { error } = await supabaseClient.auth.signOut(); if (error) showToast(error.message); });
  document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => { activeView = button.dataset.view; activeFilter = 'all'; updateNav(); render(); }));
  document.querySelectorAll('.filter-button').forEach((button) => button.addEventListener('click', () => { activeFilter = button.dataset.filter; updateNav(); render(); }));

  const config = window.APP_CONFIG || {};
  if (!window.supabase || !config.supabaseUrl || config.supabaseUrl.includes('YOUR_') || !config.supabaseAnonKey || config.supabaseAnonKey.includes('YOUR_')) {
    $('#auth-setup').hidden = false;
    document.querySelectorAll('#auth-form input, #auth-submit, .auth-tab').forEach((element) => { element.disabled = true; });
    setAuthMessage('雲端帳號功能尚未設定。');
    showApp(false);
  } else {
    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    supabaseClient.auth.onAuthStateChange((_event, session) => { setTimeout(() => handleSession(session), 0); });
    supabaseClient.auth.getSession().then(({ data }) => handleSession(data.session));
  }
})();
