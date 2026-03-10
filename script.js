/**
 * ============================================
 * SMART TUITION MANAGER — script.js
 * Pure Vanilla JavaScript
 * Data stored in localStorage
 * ============================================
 */

// ===== DATA LAYER =====

/** Load data from localStorage with a fallback default */
function loadData(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

/** Save data to localStorage */
function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// In-memory state
let students   = loadData('stm_students', []);
let attendance = loadData('stm_attendance', {});  // { "YYYY-MM-DD": { studentId: "present"|"absent" } }
let fees       = loadData('stm_fees', {});        // { "YYYY-MM": { studentId: "paid"|"unpaid" } }
let marks      = loadData('stm_marks', []);

// Persist state helpers
const persist = {
  students:   () => saveData('stm_students', students),
  attendance: () => saveData('stm_attendance', attendance),
  fees:       () => saveData('stm_fees', fees),
  marks:      () => saveData('stm_marks', marks),
};

// ===== UTILITY HELPERS =====

/** Generate a unique ID */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Get today's date as YYYY-MM-DD */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Get current month as YYYY-MM */
function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

/** Format a YYYY-MM string to "March 2025" */
function formatMonth(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return new Date(+y, +m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/** Format a YYYY-MM-DD string to a readable date */
function formatDate(d) {
  return new Date(d + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Generate a deterministic color from a string */
function strColor(str) {
  const colors = ['#6366f1','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#14b8a6'];
  let hash = 0;
  for (let c of str) hash = (hash << 5) - hash + c.charCodeAt(0);
  return colors[Math.abs(hash) % colors.length];
}

/** Build initials from a name */
function initials(name) {
  return name.trim().split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
}

/** Show a toast notification */
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  const icon = document.getElementById('toastIcon');
  const msgEl = document.getElementById('toastMsg');
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
  icon.className = `fas ${icons[type] || 'fa-check-circle'} ${type}`;
  msgEl.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3200);
}

// ===== NAVIGATION =====

/** Navigate to a page by name */
function navigate(page) {
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  // Update pages
  document.querySelectorAll('.page').forEach(el => {
    el.classList.toggle('active', el.id === `page-${page}`);
  });
  // Update topbar title
  const titles = { dashboard: 'Dashboard', students: 'Students', attendance: 'Attendance', fees: 'Fees', marks: 'Exam Marks' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  // Page-specific init
  const handlers = { dashboard: renderDashboard, students: renderStudentsTable, attendance: initAttendance, fees: initFees, marks: initMarks };
  if (handlers[page]) handlers[page]();
  closeSidebar();
}

// Wire nav items
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); });
});

// ===== SIDEBAR =====
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ===== THEME TOGGLE =====
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('themeIcon').className = isDark ? 'fas fa-moon' : 'fas fa-sun';
  document.getElementById('themeLabel').textContent = isDark ? 'Dark Mode' : 'Light Mode';
  localStorage.setItem('stm_theme', isDark ? 'light' : 'dark');
}

// Apply saved theme
(function() {
  const saved = localStorage.getItem('stm_theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
    if (saved === 'dark') {
      document.getElementById('themeIcon').className = 'fas fa-sun';
      document.getElementById('themeLabel').textContent = 'Light Mode';
    }
  }
})();

// ===== MODALS =====
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
});

// ===== CURRENT DATE =====
document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

// ===== DASHBOARD =====
function renderDashboard() {
  const month = currentMonth();

  // Total students
  document.getElementById('dash-total-students').textContent = students.length;

  // Fees
  const monthFees = fees[month] || {};
  let collected = 0, pending = 0;
  students.forEach(s => {
    const status = monthFees[s.id] || 'unpaid';
    if (status === 'paid') collected += Number(s.fees) || 0;
    else pending += Number(s.fees) || 0;
  });
  document.getElementById('dash-fees-collected').textContent = '₹' + collected.toLocaleString('en-IN');
  document.getElementById('dash-pending-fees').textContent   = '₹' + pending.toLocaleString('en-IN');

  // Today attendance
  const todayAtt = attendance[today()] || {};
  const presentCount = Object.values(todayAtt).filter(v => v === 'present').length;
  document.getElementById('dash-today-present').textContent = `${presentCount}/${students.length}`;

  // Recent students
  const recentEl = document.getElementById('dash-recent-students');
  if (students.length === 0) {
    recentEl.innerHTML = `<div class="empty-state"><i class="fas fa-user-plus"></i><p>No students yet. Add some!</p></div>`;
  } else {
    recentEl.innerHTML = students.slice(-5).reverse().map(s => `
      <div class="recent-item">
        <div class="student-avatar" style="background:${strColor(s.name)}">${initials(s.name)}</div>
        <div class="recent-info">
          <div class="recent-name">${escHtml(s.name)}</div>
          <div class="recent-sub">Class ${escHtml(s.class)} &bull; ${escHtml(s.phone)}</div>
        </div>
        <span class="badge badge-class">Cls ${escHtml(s.class)}</span>
      </div>`).join('');
  }

  // Pending list
  const pendingEl = document.getElementById('dash-pending-list');
  const pendingStudents = students.filter(s => (monthFees[s.id] || 'unpaid') === 'unpaid');
  if (pendingStudents.length === 0) {
    pendingEl.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><p>All fees are cleared!</p></div>`;
  } else {
    pendingEl.innerHTML = pendingStudents.slice(0, 6).map(s => `
      <div class="pending-item">
        <div class="student-avatar" style="background:${strColor(s.name)};width:30px;height:30px;font-size:0.7rem">${initials(s.name)}</div>
        <span class="pending-name">${escHtml(s.name)}</span>
        <span class="pending-amount">₹${Number(s.fees).toLocaleString('en-IN')}</span>
        <button class="pending-notify" onclick="sendReminder('${s.id}')"><i class="fas fa-bell"></i> Notify</button>
      </div>`).join('');
  }
}

// ===== STUDENTS =====
function openStudentModal(id = null) {
  document.getElementById('studentId').value = id || '';
  if (id) {
    const s = students.find(x => x.id === id);
    if (!s) return;
    document.getElementById('studentModalTitle').textContent = 'Edit Student';
    document.getElementById('studentName').value   = s.name;
    document.getElementById('studentClass').value  = s.class;
    document.getElementById('studentPhone').value  = s.phone;
    document.getElementById('studentParent').value = s.parent;
    document.getElementById('studentFees').value   = s.fees;
  } else {
    document.getElementById('studentModalTitle').textContent = 'Add New Student';
    ['studentName','studentClass','studentPhone','studentParent','studentFees'].forEach(id => {
      document.getElementById(id).value = '';
    });
  }
  openModal('studentModal');
}

function saveStudent() {
  const id     = document.getElementById('studentId').value;
  const name   = document.getElementById('studentName').value.trim();
  const cls    = document.getElementById('studentClass').value;
  const phone  = document.getElementById('studentPhone').value.trim();
  const parent = document.getElementById('studentParent').value.trim();
  const fee    = document.getElementById('studentFees').value.trim();

  if (!name || !cls || !phone || !parent || !fee) {
    toast('Please fill all fields.', 'error'); return;
  }
  if (!/^\d{10}$/.test(phone)) {
    toast('Phone must be 10 digits.', 'error'); return;
  }
  if (isNaN(fee) || Number(fee) <= 0) {
    toast('Fees must be a positive number.', 'error'); return;
  }

  if (id) {
    const idx = students.findIndex(s => s.id === id);
    if (idx > -1) students[idx] = { ...students[idx], name, class: cls, phone, parent, fees: fee };
    toast('Student updated!');
  } else {
    students.push({ id: uid(), name, class: cls, phone, parent, fees: fee });
    toast('Student added!');
  }

  persist.students();
  closeModal('studentModal');
  renderStudentsTable();
  renderDashboard();
  populateStudentSelects();
}

function deleteStudent(id) {
  confirm_('Delete this student? All related data (attendance, fees, marks) will also be removed.', () => {
    students = students.filter(s => s.id !== id);
    // Clean related data
    Object.keys(attendance).forEach(date => { delete attendance[date][id]; });
    Object.keys(fees).forEach(m => { delete fees[m][id]; });
    marks = marks.filter(m => m.studentId !== id);
    persist.students(); persist.attendance(); persist.fees(); persist.marks();
    renderStudentsTable();
    renderDashboard();
    populateStudentSelects();
    toast('Student deleted.', 'info');
  });
}

function renderStudentsTable() {
  const query   = (document.getElementById('studentSearch')?.value || '').toLowerCase();
  const clsF    = document.getElementById('classFilter')?.value || '';
  const tbody   = document.getElementById('studentsTableBody');
  let filtered  = students;
  if (query) filtered = filtered.filter(s => s.name.toLowerCase().includes(query) || s.parent.toLowerCase().includes(query));
  if (clsF)  filtered = filtered.filter(s => s.class === clsF);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row"><i class="fas fa-user-graduate"></i> No students found.</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <div style="display:flex;align-items:center;gap:0.6rem;">
          <div class="student-avatar" style="background:${strColor(s.name)};width:32px;height:32px;font-size:0.75rem">${initials(s.name)}</div>
          <span style="font-weight:600">${escHtml(s.name)}</span>
        </div>
      </td>
      <td><span class="badge badge-class">Class ${escHtml(s.class)}</span></td>
      <td>${escHtml(s.phone)}</td>
      <td>${escHtml(s.parent)}</td>
      <td style="font-weight:700">₹${Number(s.fees).toLocaleString('en-IN')}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon edit" onclick="openStudentModal('${s.id}')" title="Edit"><i class="fas fa-pen"></i></button>
          <button class="btn-icon delete" onclick="deleteStudent('${s.id}')" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

// ===== CSV EXPORT =====
function exportCSV() {
  if (students.length === 0) { toast('No students to export.', 'info'); return; }
  const header = ['#','Name','Class','Phone','Parent','Fees(INR)'];
  const rows = students.map((s, i) => [i+1, s.name, `Class ${s.class}`, s.phone, s.parent, s.fees]);
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `students_${today()}.csv`;
  a.click(); URL.revokeObjectURL(url);
  toast('Exported to CSV!');
}

// ===== ATTENDANCE =====
function initAttendance() {
  const dateEl = document.getElementById('attendanceDate');
  if (!dateEl.value) dateEl.value = today();
  populateMonthSelect('reportMonth');
  renderAttendance();
  renderMonthlyReport();
}

function renderAttendance() {
  const date    = document.getElementById('attendanceDate').value || today();
  const dayAtt  = attendance[date] || {};
  const grid    = document.getElementById('attendanceGrid');

  if (students.length === 0) {
    grid.innerHTML = `<div class="empty-state big" style="grid-column:1/-1"><i class="fas fa-user-graduate"></i><p>Add students first to mark attendance.</p></div>`;
    return;
  }

  grid.innerHTML = students.map(s => {
    const status = dayAtt[s.id] || '';
    return `
      <div class="attendance-card ${status}" id="att-card-${s.id}">
        <div class="att-card-top">
          <div class="student-avatar" style="background:${strColor(s.name)}">${initials(s.name)}</div>
          <div class="att-info">
            <div class="att-name">${escHtml(s.name)}</div>
            <div class="att-class">Class ${escHtml(s.class)}</div>
          </div>
          ${status ? `<span class="badge badge-${status}">${status.charAt(0).toUpperCase()+status.slice(1)}</span>` : ''}
        </div>
        <div class="att-btns">
          <button class="att-btn present-btn ${status==='present'?'active':''}" onclick="markAttendance('${s.id}','present','${date}')">
            <i class="fas fa-check"></i> Present
          </button>
          <button class="att-btn absent-btn ${status==='absent'?'active':''}" onclick="markAttendance('${s.id}','absent','${date}')">
            <i class="fas fa-times"></i> Absent
          </button>
        </div>
      </div>`;
  }).join('');
}

function markAttendance(studentId, status, date) {
  if (!attendance[date]) attendance[date] = {};
  attendance[date][studentId] = status;
  persist.attendance();
  renderAttendance();
  renderDashboard();
  toast(`Marked ${status}!`, status === 'present' ? 'success' : 'info');
}

function renderMonthlyReport() {
  const month  = document.getElementById('reportMonth').value || currentMonth();
  const tbody  = document.getElementById('monthlyReportBody');
  if (!month || students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No data for selected period.</td></tr>`;
    return;
  }

  // Get all dates in selected month that have data
  const datesInMonth = Object.keys(attendance).filter(d => d.startsWith(month));

  tbody.innerHTML = students.map(s => {
    let present = 0, absent = 0;
    datesInMonth.forEach(d => {
      const v = attendance[d]?.[s.id];
      if (v === 'present') present++;
      else if (v === 'absent') absent++;
    });
    const total = present + absent;
    const pct   = total > 0 ? Math.round((present / total) * 100) : 0;
    const pctClass = pct >= 75 ? '' : pct >= 50 ? 'low' : 'critical';
    return `
      <tr>
        <td><div style="display:flex;align-items:center;gap:0.5rem">
          <div class="student-avatar" style="background:${strColor(s.name)};width:28px;height:28px;font-size:0.65rem">${initials(s.name)}</div>
          ${escHtml(s.name)}
        </div></td>
        <td><span class="badge badge-class">Cls ${escHtml(s.class)}</span></td>
        <td style="color:var(--accent-green);font-weight:600">${present}</td>
        <td style="color:var(--accent-red);font-weight:600">${absent}</td>
        <td>
          <span style="font-weight:700">${pct}%</span>
          <span class="progress-bar"><span class="progress-fill ${pctClass}" style="width:${pct}%"></span></span>
        </td>
      </tr>`;
  }).join('');
}

// ===== FEES =====
function initFees() {
  populateMonthSelect('feesMonth', true);
  renderFees();
}

function renderFees() {
  const month    = document.getElementById('feesMonth').value || currentMonth();
  const monthFee = fees[month] || {};
  const tbody    = document.getElementById('feesTableBody');

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No students found.</td></tr>`;
    updateFeeStats(0, 0, 0, 0);
    return;
  }

  let paidCount = 0, unpaidCount = 0, totalPaid = 0, totalUnpaid = 0;
  students.forEach(s => {
    const st = monthFee[s.id] || 'unpaid';
    if (st === 'paid') { paidCount++; totalPaid += Number(s.fees); }
    else { unpaidCount++; totalUnpaid += Number(s.fees); }
  });
  updateFeeStats(paidCount, unpaidCount, totalPaid, totalUnpaid);

  tbody.innerHTML = students.map(s => {
    const status = monthFee[s.id] || 'unpaid';
    return `
      <tr>
        <td><div style="display:flex;align-items:center;gap:0.6rem">
          <div class="student-avatar" style="background:${strColor(s.name)};width:32px;height:32px;font-size:0.75rem">${initials(s.name)}</div>
          <span style="font-weight:600">${escHtml(s.name)}</span>
        </div></td>
        <td><span class="badge badge-class">Class ${escHtml(s.class)}</span></td>
        <td style="font-weight:700">₹${Number(s.fees).toLocaleString('en-IN')}</td>
        <td><span class="badge badge-${status}">${status === 'paid' ? '✓ Paid' : '✗ Unpaid'}</span></td>
        <td>
          <div class="action-btns">
            <button class="btn-icon edit" onclick="toggleFeeStatus('${s.id}','${month}')" title="Toggle Status" style="width:auto;padding:0.3rem 0.7rem;gap:0.3rem;">
              <i class="fas fa-exchange-alt"></i> Toggle
            </button>
            ${status === 'unpaid' ? `<button class="pending-notify" onclick="sendReminder('${s.id}')"><i class="fas fa-bell"></i> Notify</button>` : ''}
          </div>
        </td>
      </tr>`;
  }).join('');
}

function toggleFeeStatus(studentId, month) {
  if (!fees[month]) fees[month] = {};
  const current = fees[month][studentId] || 'unpaid';
  fees[month][studentId] = current === 'paid' ? 'unpaid' : 'paid';
  persist.fees();
  renderFees();
  renderDashboard();
  toast(`Fee marked as ${fees[month][studentId]}!`);
}

function updateFeeStats(paid, unpaid, totalPaid, totalUnpaid) {
  document.getElementById('fees-paid-count').textContent     = paid;
  document.getElementById('fees-unpaid-count').textContent   = unpaid;
  document.getElementById('fees-total-collected').textContent = '₹' + totalPaid.toLocaleString('en-IN');
  document.getElementById('fees-total-pending').textContent  = '₹' + totalUnpaid.toLocaleString('en-IN');
}

// ===== PARENT NOTIFICATION =====
function sendReminder(studentId) {
  const s = students.find(x => x.id === studentId);
  if (!s) return;
  toast(`📱 Reminder sent to ${s.parent} for ${s.name}'s fees!`, 'info');
}

// ===== MARKS =====
function initMarks() {
  populateStudentSelects();
  renderMarksTable();
}

function openMarksModal(id = null) {
  document.getElementById('marksId').value = id || '';
  if (id) {
    const m = marks.find(x => x.id === id);
    if (!m) return;
    document.getElementById('marksStudent').value  = m.studentId;
    document.getElementById('marksExam').value     = m.exam;
    document.getElementById('marksSubject').value  = m.subject;
    document.getElementById('marksObtained').value = m.obtained;
    document.getElementById('marksTotal').value    = m.total;
  } else {
    ['marksStudent','marksExam','marksSubject','marksObtained','marksTotal'].forEach(id => {
      document.getElementById(id).value = '';
    });
  }
  openModal('marksModal');
}

function saveMarks() {
  const id       = document.getElementById('marksId').value;
  const studentId = document.getElementById('marksStudent').value;
  const exam     = document.getElementById('marksExam').value.trim();
  const subject  = document.getElementById('marksSubject').value.trim();
  const obtained = document.getElementById('marksObtained').value.trim();
  const total    = document.getElementById('marksTotal').value.trim();

  if (!studentId || !exam || !subject || !obtained || !total) {
    toast('Please fill all fields.', 'error'); return;
  }
  if (isNaN(obtained) || isNaN(total) || Number(obtained) < 0 || Number(total) <= 0) {
    toast('Invalid marks values.', 'error'); return;
  }
  if (Number(obtained) > Number(total)) {
    toast('Obtained marks cannot exceed total.', 'error'); return;
  }

  const entry = { studentId, exam, subject, obtained: Number(obtained), total: Number(total) };

  if (id) {
    const idx = marks.findIndex(m => m.id === id);
    if (idx > -1) marks[idx] = { ...marks[idx], ...entry };
    toast('Marks updated!');
  } else {
    marks.push({ id: uid(), ...entry });
    toast('Marks added!');
  }

  persist.marks();
  closeModal('marksModal');
  renderMarksTable();
}

function deleteMarks(id) {
  confirm_('Delete this marks entry?', () => {
    marks = marks.filter(m => m.id !== id);
    persist.marks();
    renderMarksTable();
    toast('Marks deleted.', 'info');
  });
}

function renderMarksTable() {
  const studentF = document.getElementById('marksStudentFilter')?.value || '';
  const examF    = document.getElementById('marksExamFilter')?.value || '';
  const tbody    = document.getElementById('marksTableBody');

  let filtered = marks;
  if (studentF) filtered = filtered.filter(m => m.studentId === studentF);
  if (examF)    filtered = filtered.filter(m => m.exam === examF);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row"><i class="fas fa-star-half-alt"></i> No marks added yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(m => {
    const s   = students.find(x => x.id === m.studentId);
    const pct = Math.round((m.obtained / m.total) * 100);
    const pctClass = pct >= 75 ? 'good' : pct >= 50 ? 'avg' : 'poor';
    return `
      <tr>
        <td><div style="display:flex;align-items:center;gap:0.5rem">
          ${s ? `<div class="student-avatar" style="background:${strColor(s.name)};width:28px;height:28px;font-size:0.65rem">${initials(s.name)}</div>` : ''}
          <span style="font-weight:600">${escHtml(s?.name || 'Unknown')}</span>
        </div></td>
        <td>${s ? `<span class="badge badge-class">Cls ${escHtml(s.class)}</span>` : '—'}</td>
        <td style="font-weight:600">${escHtml(m.exam)}</td>
        <td>${escHtml(m.subject)}</td>
        <td style="font-weight:700">${m.obtained}</td>
        <td>${m.total}</td>
        <td><span class="marks-pct ${pctClass}">${pct}%</span></td>
        <td>
          <div class="action-btns">
            <button class="btn-icon edit" onclick="openMarksModal('${m.id}')"><i class="fas fa-pen"></i></button>
            <button class="btn-icon delete" onclick="deleteMarks('${m.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

// ===== SHARED HELPERS =====

/** Populate a <select> with YYYY-MM options (last 12 months) */
function populateMonthSelect(elementId, selectCurrent = false) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const now = new Date();
  const options = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    options.push(`<option value="${ym}" ${(selectCurrent && i === 0) ? 'selected' : ''}>${formatMonth(ym)}</option>`);
  }
  el.innerHTML = options.join('');
}

/** Populate all student <select> dropdowns for marks */
function populateStudentSelects() {
  ['marksStudent','marksStudentFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const first = id === 'marksStudentFilter'
      ? '<option value="">All Students</option>'
      : '<option value="">Select student</option>';
    el.innerHTML = first + students.map(s =>
      `<option value="${s.id}">${escHtml(s.name)} (Class ${s.class})</option>`
    ).join('');
  });
}

/** Escape HTML to prevent XSS */
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** Confirmation dialog */
function confirm_(message, callback) {
  document.getElementById('confirmMessage').textContent = message;
  const btn = document.getElementById('confirmBtn');
  const fresh = btn.cloneNode(true);
  btn.replaceWith(fresh);
  fresh.addEventListener('click', () => { callback(); closeModal('confirmModal'); });
  openModal('confirmModal');
}

// ===== SEARCH SHORTCUT =====
// Pressing Ctrl/Cmd+K focuses the student search
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    navigate('students');
    document.getElementById('studentSearch')?.focus();
  }
});

// ===== INIT =====
(function init() {
  renderDashboard();
  // Pre-populate month selects
  populateMonthSelect('reportMonth');
  populateMonthSelect('feesMonth', true);
  populateStudentSelects();
  // Set attendance date to today
  const attDate = document.getElementById('attendanceDate');
  if (attDate) attDate.value = today();
})();