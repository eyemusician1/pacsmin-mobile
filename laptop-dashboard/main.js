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

  totalParticipantsEl.textContent = String(participantsRes.count ?? 0);
  attendanceTodayEl.textContent = String(attendanceRes.count ?? 0);
  foodTodayEl.textContent = String(foodRes.count ?? 0);
  bundleTodayEl.textContent = String(bundleRes.count ?? 0);
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

  if (!activity.length) {
    recentBody.innerHTML = '<tr><td colspan="6">No activity yet for today.</td></tr>';
    return;
  }

  recentBody.innerHTML = activity.slice(0, 40).map(row => `
    <tr>
      <td>${toTime(row.time)}</td>
      <td>${typePill(row.type)}</td>
      <td>${row.uid}</td>
      <td>${row.name}</td>
      <td>${row.society}</td>
      <td>${row.detail}</td>
    </tr>
  `).join('');
}

async function refreshAll() {
  try {
    await Promise.all([fetchCounts(), fetchRecentActivity()]);
    lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  } catch (err) {
    lastUpdated.textContent = err instanceof Error ? err.message : 'Failed to refresh.';
  }
}

let realtimeChannel = null;

function startRealtime() {
  if (realtimeChannel) {
    sbClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  realtimeChannel = sbClient
    .channel('dashboard-live-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, refreshAll)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'food_choices' }, refreshAll)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bundle_choices' }, refreshAll)
    .subscribe();
}

function stopRealtime() {
  if (realtimeChannel) {
    sbClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
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
  setStatus('Logged out.');
});

// ── On page load: restore session if exists ──
(async () => {
  const { data } = await sbClient.auth.getSession();
  if (data.session) {
    showDashboard(true);
    await refreshAll();
    startRealtime();
  }
})();