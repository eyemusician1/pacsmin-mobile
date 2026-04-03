const SUPABASE_URL = 'https://ljgeeobucxiwcneddsxu.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2Vlb2J1Y3hpd2NuZWRkc3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjY1MDksImV4cCI6MjA5MDc0MjUwOX0.jOLbE5XAjlqAmTkTmGBlxvQdC-KoMod2APOxOUGbo4Y';

if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  throw new Error('Supabase client failed to load. Check network or CDN access.');
}

const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const loginStatus = document.getElementById('loginStatus');
const logoutBtn = document.getElementById('logoutBtn');
const recentBody = document.getElementById('recentBody');
const lastUpdated = document.getElementById('lastUpdated');
const totalParticipantsEl = document.getElementById('totalParticipants');
const attendanceTodayEl = document.getElementById('attendanceToday');
const foodTodayEl = document.getElementById('foodToday');
const bundleTodayEl = document.getElementById('bundleToday');
const loginSubmitBtn = loginForm.querySelector('button[type="submit"]');
const passwordInput = document.getElementById('passwordInput');
const togglePasswordBtn = document.getElementById('togglePasswordBtn');
const leaderboardBody = document.getElementById('leaderboardBody');
const activitySearch = document.getElementById('activitySearch');
const activityTypeFilter = document.getElementById('activityTypeFilter');
const attendancePctEl = document.getElementById('attendancePct');
const foodPctEl = document.getElementById('foodPct');
const bundlePctEl = document.getElementById('bundlePct');
const attendanceBar = document.getElementById('attendanceBar');
const foodBar = document.getElementById('foodBar');
const bundleBar = document.getElementById('bundleBar');
const trendSparkline = document.getElementById('trendSparkline');
const trendLabel = document.getElementById('trendLabel');
const exportAttendanceBtn = document.getElementById('exportAttendanceBtn');
const exportFoodBtn = document.getElementById('exportFoodBtn');
const exportBundleBtn = document.getElementById('exportBundleBtn');

let currentActivityRows = [];
let cachedCounts = {
  totalParticipants: 0,
  attendanceToday: 0,
  foodToday: 0,
  bundleToday: 0,
};
let realtimeChannel = null;
let reconnectTimer = null;
let fallbackPollTimer = null;
let refreshQueued = false;
let refreshInFlight = null;
const FALLBACK_POLL_MS = 12000;

function queueRefresh() {
  if (refreshQueued) return;
  refreshQueued = true;
  window.setTimeout(async () => {
    refreshQueued = false;
    if (refreshInFlight) return;
    refreshInFlight = refreshAll().finally(() => {
      refreshInFlight = null;
    });
    await refreshInFlight;
  }, 180);
}

function getCurrentManilaDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${year}-${month}-${day}`;
}

function setStatus(message, isError = false) {
  loginStatus.textContent = message;
  loginStatus.style.color = isError ? '#A11A2A' : '#8c6a47';
  loginStatus.classList.toggle('hidden', !message);
}

if (togglePasswordBtn && passwordInput) {
  togglePasswordBtn.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    togglePasswordBtn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
}

function escapeHtml(str) {
  if (str == null) return '-';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toTime(value) {
  if (!value) return '-';
  if (/^\d{2}:\d{2}/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showDashboard(visible) {
  loginSection.classList.toggle('hidden', visible);
  dashboardSection.classList.toggle('hidden', !visible);
  logoutBtn.classList.toggle('hidden', !visible);
}

function setLoginLoading(isLoading) {
  loginSubmitBtn.disabled = isLoading;
  loginSubmitBtn.textContent = isLoading ? 'Signing in...' : 'Launch Dashboard';
}

async function fetchCounts() {
  const date = getCurrentManilaDate();
  const [participantsRes, attendanceRes, foodRes, bundleRes] = await Promise.all([
    sbClient.from('participants').select('*', { count: 'exact', head: true }),
    sbClient.from('attendance_records').select('*', { count: 'exact', head: true }).eq('attendance_date', date),
    sbClient.from('food_choices').select('*', { count: 'exact', head: true }).eq('choice_date', date),
    sbClient.from('bundle_choices').select('*', { count: 'exact', head: true }).eq('choice_date', date),
  ]);

  if (participantsRes.error) throw new Error(participantsRes.error.message);
  if (attendanceRes.error) throw new Error(attendanceRes.error.message);
  if (foodRes.error) throw new Error(foodRes.error.message);
  if (bundleRes.error) throw new Error(bundleRes.error.message);

  const counts = {
    totalParticipants: participantsRes.count ?? 0,
    attendanceToday: attendanceRes.count ?? 0,
    foodToday: foodRes.count ?? 0,
    bundleToday: bundleRes.count ?? 0,
  };

  cachedCounts = counts;
  totalParticipantsEl.textContent = String(counts.totalParticipants);
  attendanceTodayEl.textContent = String(counts.attendanceToday);
  foodTodayEl.textContent = String(counts.foodToday);
  bundleTodayEl.textContent = String(counts.bundleToday);

  renderProgressBars(counts);
}

function typePill(type) {
  if (type === 'attendance') return '<span class="type-pill type-attendance">Attendance</span>';
  if (type === 'food') return '<span class="type-pill type-food">Food</span>';
  return '<span class="type-pill type-bundle">Bundle</span>';
}

async function fetchRecentActivity() {
  const date = getCurrentManilaDate();
  const [attendanceRes, foodRes, bundleRes] = await Promise.all([
    sbClient.from('attendance_records')
      .select('time_in,created_at,participants(unique_id,full_name,society)')
      .eq('attendance_date', date).order('created_at', { ascending: false }).limit(25),
    sbClient.from('food_choices')
      .select('choice,created_at,participants(unique_id,full_name,society)')
      .eq('choice_date', date).order('created_at', { ascending: false }).limit(25),
    sbClient.from('bundle_choices')
      .select('choice,created_at,participants(unique_id,full_name,society)')
      .eq('choice_date', date).order('created_at', { ascending: false }).limit(25),
  ]);

  if (attendanceRes.error) throw new Error(attendanceRes.error.message);
  if (foodRes.error) throw new Error(foodRes.error.message);
  if (bundleRes.error) throw new Error(bundleRes.error.message);

  const activity = [];

  for (const row of attendanceRes.data ?? []) {
    activity.push({
      type: 'attendance',
      time: row.time_in || row.created_at,
      uid: row.participants?.unique_id ?? '-',
      name: row.participants?.full_name ?? '-',
      society: row.participants?.society ?? '-',
      detail: 'Present',
      createdAt: row.created_at,
    });
  }
  for (const row of foodRes.data ?? []) {
    activity.push({
      type: 'food',
      time: row.created_at,
      uid: row.participants?.unique_id ?? '-',
      name: row.participants?.full_name ?? '-',
      society: row.participants?.society ?? '-',
      detail: row.choice ?? '-',
      createdAt: row.created_at,
    });
  }
  for (const row of bundleRes.data ?? []) {
    activity.push({
      type: 'bundle',
      time: row.created_at,
      uid: row.participants?.unique_id ?? '-',
      name: row.participants?.full_name ?? '-',
      society: row.participants?.society ?? '-',
      detail: row.choice ?? '-',
      createdAt: row.created_at,
    });
  }

  activity.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  currentActivityRows = activity;
  renderRecentActivityTable();
}

function renderRecentActivityTable() {
  const keyword = (activitySearch?.value ?? '').trim().toLowerCase();
  const type = activityTypeFilter?.value ?? 'all';

  const filtered = currentActivityRows.filter(row => {
    if (type !== 'all' && row.type !== type) return false;
    if (!keyword) return true;
    return (
      String(row.uid).toLowerCase().includes(keyword) ||
      String(row.name).toLowerCase().includes(keyword) ||
      String(row.society).toLowerCase().includes(keyword)
    );
  });

  if (!filtered.length) {
    recentBody.innerHTML = '<tr><td colspan="6">No matching activity for today.</td></tr>';
    return;
  }

  recentBody.innerHTML = filtered.slice(0, 80).map(row => `
    <tr>
      <td>${toTime(row.time)}</td>
      <td>${typePill(row.type)}</td>
      <td>${escapeHtml(row.uid)}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.society)}</td>
      <td>${escapeHtml(row.detail)}</td>
    </tr>
  `).join('');
}

function renderProgressBars(counts) {
  const total = Math.max(1, Number(counts.totalParticipants) || 0);
  const attendancePct = Math.min(100, Math.round(((counts.attendanceToday || 0) / total) * 100));
  const foodPct = Math.min(100, Math.round(((counts.foodToday || 0) / total) * 100));
  const bundlePct = Math.min(100, Math.round(((counts.bundleToday || 0) / total) * 100));

  attendancePctEl.textContent = `${attendancePct}%`;
  foodPctEl.textContent = `${foodPct}%`;
  bundlePctEl.textContent = `${bundlePct}%`;
  attendanceBar.style.width = `${attendancePct}%`;
  foodBar.style.width = `${foodPct}%`;
  bundleBar.style.width = `${bundlePct}%`;
}

function updateLeaderboard(attendanceRows, foodRows, bundleRows) {
  const board = new Map();
  const bump = (society, field) => {
    const key = society && String(society).trim() ? String(society).trim() : 'Unassigned';
    if (!board.has(key)) {
      board.set(key, { society: key, attendance: 0, food: 0, bundle: 0, total: 0 });
    }
    const item = board.get(key);
    item[field] += 1;
    item.total += 1;
  };

  for (const row of attendanceRows) bump(row.participants?.society, 'attendance');
  for (const row of foodRows) bump(row.participants?.society, 'food');
  for (const row of bundleRows) bump(row.participants?.society, 'bundle');

  const ranked = [...board.values()]
    .sort((a, b) => b.total - a.total || b.attendance - a.attendance || a.society.localeCompare(b.society))
    .slice(0, 10);

  if (!ranked.length) {
    leaderboardBody.innerHTML = '<tr><td colspan="6">No society activity yet for today.</td></tr>';
    return;
  }

  leaderboardBody.innerHTML = ranked.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.society)}</td>
      <td><strong>${row.total}</strong></td>
      <td>${row.attendance}</td>
      <td>${row.food}</td>
      <td>${row.bundle}</td>
    </tr>
  `).join('');
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getPastDays(days) {
  const now = new Date();
  const results = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    results.push(formatDateKey(d));
  }
  return results;
}

function buildPolylinePoints(values, width, height, pad) {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  return values.map((value, i) => {
    const x = pad + i * step;
    const y = height - pad - ((value / max) * (height - pad * 2));
    return `${x},${y}`;
  }).join(' ');
}

function renderTrendChart(days, attendanceSeries, foodSeries, bundleSeries) {
  if (!trendSparkline) return;

  const width = 420;
  const height = 130;
  const pad = 14;

  const attendancePoints = buildPolylinePoints(attendanceSeries, width, height, pad);
  const foodPoints = buildPolylinePoints(foodSeries, width, height, pad);
  const bundlePoints = buildPolylinePoints(bundleSeries, width, height, pad);

  trendSparkline.innerHTML = `
    <polyline points="${attendancePoints}" fill="none" stroke="#7b111f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
    <polyline points="${foodPoints}" fill="none" stroke="#9c6a2f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
    <polyline points="${bundlePoints}" fill="none" stroke="#4f6e33" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
  `;

  if (trendLabel && days.length > 1) {
    trendLabel.textContent = `${days[0]} to ${days[days.length - 1]}`;
  }
}

async function fetchLeaderboardAndTrends() {
  const date = getCurrentManilaDate();
  const days = getPastDays(7);
  const startDate = days[0];

  const [attendanceTodayRes, foodTodayRes, bundleTodayRes, attendanceTrendRes, foodTrendRes, bundleTrendRes] = await Promise.all([
    sbClient.from('attendance_records').select('attendance_date,participants(society)').eq('attendance_date', date),
    sbClient.from('food_choices').select('choice_date,participants(society)').eq('choice_date', date),
    sbClient.from('bundle_choices').select('choice_date,participants(society)').eq('choice_date', date),
    sbClient.from('attendance_records').select('attendance_date').gte('attendance_date', startDate),
    sbClient.from('food_choices').select('choice_date').gte('choice_date', startDate),
    sbClient.from('bundle_choices').select('choice_date').gte('choice_date', startDate),
  ]);

  if (attendanceTodayRes.error) throw new Error(attendanceTodayRes.error.message);
  if (foodTodayRes.error) throw new Error(foodTodayRes.error.message);
  if (bundleTodayRes.error) throw new Error(bundleTodayRes.error.message);
  if (attendanceTrendRes.error) throw new Error(attendanceTrendRes.error.message);
  if (foodTrendRes.error) throw new Error(foodTrendRes.error.message);
  if (bundleTrendRes.error) throw new Error(bundleTrendRes.error.message);

  updateLeaderboard(
    attendanceTodayRes.data ?? [],
    foodTodayRes.data ?? [],
    bundleTodayRes.data ?? []
  );

  const attendanceMap = new Map(days.map(day => [day, 0]));
  const foodMap = new Map(days.map(day => [day, 0]));
  const bundleMap = new Map(days.map(day => [day, 0]));

  for (const row of attendanceTrendRes.data ?? []) {
    if (attendanceMap.has(row.attendance_date)) {
      attendanceMap.set(row.attendance_date, attendanceMap.get(row.attendance_date) + 1);
    }
  }
  for (const row of foodTrendRes.data ?? []) {
    if (foodMap.has(row.choice_date)) {
      foodMap.set(row.choice_date, foodMap.get(row.choice_date) + 1);
    }
  }
  for (const row of bundleTrendRes.data ?? []) {
    if (bundleMap.has(row.choice_date)) {
      bundleMap.set(row.choice_date, bundleMap.get(row.choice_date) + 1);
    }
  }

  renderTrendChart(
    days,
    days.map(day => attendanceMap.get(day)),
    days.map(day => foodMap.get(day)),
    days.map(day => bundleMap.get(day))
  );
}

function csvEscape(value) {
  if (value == null) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function triggerCsvDownload(filename, columns, rows) {
  const header = columns.join(',');
  const body = rows.map(row => columns.map(column => csvEscape(row[column])).join(',')).join('\n');
  const content = `${header}\n${body}`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function exportToday(tableType) {
  const date = getCurrentManilaDate();

  if (tableType === 'attendance') {
    const { data, error } = await sbClient.from('attendance_records')
      .select('attendance_date,time_in,created_at,participants(unique_id,full_name,society)')
      .eq('attendance_date', date)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    const rows = (data ?? []).map(row => ({
      attendance_date: row.attendance_date,
      time_in: row.time_in,
      created_at: row.created_at,
      unique_id: row.participants?.unique_id ?? '',
      full_name: row.participants?.full_name ?? '',
      society: row.participants?.society ?? '',
    }));

    triggerCsvDownload(`attendance_${date}.csv`, ['attendance_date', 'time_in', 'created_at', 'unique_id', 'full_name', 'society'], rows);
    return;
  }

  if (tableType === 'food') {
    const { data, error } = await sbClient.from('food_choices')
      .select('choice_date,choice,created_at,participants(unique_id,full_name,society)')
      .eq('choice_date', date)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    const rows = (data ?? []).map(row => ({
      choice_date: row.choice_date,
      choice: row.choice,
      created_at: row.created_at,
      unique_id: row.participants?.unique_id ?? '',
      full_name: row.participants?.full_name ?? '',
      society: row.participants?.society ?? '',
    }));

    triggerCsvDownload(`food_${date}.csv`, ['choice_date', 'choice', 'created_at', 'unique_id', 'full_name', 'society'], rows);
    return;
  }

  const { data, error } = await sbClient.from('bundle_choices')
    .select('choice_date,choice,created_at,participants(unique_id,full_name,society)')
    .eq('choice_date', date)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map(row => ({
    choice_date: row.choice_date,
    choice: row.choice,
    created_at: row.created_at,
    unique_id: row.participants?.unique_id ?? '',
    full_name: row.participants?.full_name ?? '',
    society: row.participants?.society ?? '',
  }));

  triggerCsvDownload(`bundle_${date}.csv`, ['choice_date', 'choice', 'created_at', 'unique_id', 'full_name', 'society'], rows);
}

async function refreshAll() {
  try {
    await Promise.all([fetchCounts(), fetchRecentActivity(), fetchLeaderboardAndTrends()]);
    lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to refresh data.';
    lastUpdated.textContent = `⚠ ${msg}`;
    console.error('Dashboard refresh error:', err);
  }
}

function startFallbackPolling() {
  if (fallbackPollTimer) return;
  fallbackPollTimer = window.setInterval(() => {
    if (!dashboardSection.classList.contains('hidden')) {
      queueRefresh();
    }
  }, FALLBACK_POLL_MS);
}

function stopFallbackPolling() {
  if (fallbackPollTimer) {
    window.clearInterval(fallbackPollTimer);
    fallbackPollTimer = null;
  }
}

function scheduleRealtimeReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    if (!dashboardSection.classList.contains('hidden')) {
      startRealtime();
    }
  }, 2200);
}

function startRealtime() {
  if (realtimeChannel) {
    sbClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  realtimeChannel = sbClient
    .channel('dashboard-live-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, queueRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, queueRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'food_choices' }, queueRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bundle_choices' }, queueRefresh)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        queueRefresh();
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        lastUpdated.textContent = 'Realtime reconnecting...';
        scheduleRealtimeReconnect();
      }
    });

  startFallbackPolling();
}

function stopRealtime() {
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (realtimeChannel) {
    sbClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  stopFallbackPolling();
}

if (activitySearch) {
  activitySearch.addEventListener('input', renderRecentActivityTable);
}

if (activityTypeFilter) {
  activityTypeFilter.addEventListener('change', renderRecentActivityTable);
}

if (exportAttendanceBtn) {
  exportAttendanceBtn.addEventListener('click', async () => {
    try {
      await exportToday('attendance');
      setStatus('');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to export attendance.', true);
    }
  });
}

if (exportFoodBtn) {
  exportFoodBtn.addEventListener('click', async () => {
    try {
      await exportToday('food');
      setStatus('');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to export food.', true);
    }
  });
}

if (exportBundleBtn) {
  exportBundleBtn.addEventListener('click', async () => {
    try {
      await exportToday('bundle');
      setStatus('');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to export bundle.', true);
    }
  });
}

// ── Login ──
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;

  if (!email || !password) {
    setStatus('Please enter both email and password.', true);
    return;
  }

  setStatus('Signing in...');
  setLoginLoading(true);

  try {
    const { data, error } = await sbClient.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus(error.message, true);
      return;
    }

    if (data.session) {
      setStatus('');
      showDashboard(true);
      await refreshAll();
      startRealtime();
    } else {
      setStatus('Login failed. Please try again.', true);
    }
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Login failed.', true);
  } finally {
    setLoginLoading(false);
  }
});

// ── Logout ──
logoutBtn.addEventListener('click', async () => {
  stopRealtime();
  await sbClient.auth.signOut();
  showDashboard(false);
  setStatus('');
});

// ── On page load: restore session if exists ──
(async () => {
  try {
    const { data, error } = await sbClient.auth.getSession();
    if (error) throw error;
    if (data.session) {
      showDashboard(true);
      await refreshAll();
      startRealtime();
    }
  } catch (err) {
    console.error('Session restore failed:', err);
    setStatus('Could not restore session. Please log in.', true);
  }
})();

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !dashboardSection.classList.contains('hidden')) {
    queueRefresh();
  }
});