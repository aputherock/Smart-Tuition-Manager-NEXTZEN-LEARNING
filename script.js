/**
 * ============================================
 * SMART TUITION MANAGER — script.js
 * Data is permanently stored using localStorage
 * so it never disappears after a page refresh.
 * ============================================
 *
 * HOW localStorage WORKS IN THIS FILE (beginner explanation)
 * ──────────────────────────────────────────────────────────
 * localStorage is a small storage area built into every browser.
 * It works like a key-value dictionary that survives page refreshes.
 *
 *  • localStorage.setItem("key", value)  → save something
 *  • localStorage.getItem("key")         → read it back
 *
 * Because localStorage only stores plain text (strings), we use:
 *  • JSON.stringify(data)   before saving  (converts array/object → string)
 *  • JSON.parse(text)       after loading  (converts string → array/object)
 *
 * Keys used by this app:
 *  "stm_students"   – array of student objects
 *  "stm_attendance" – object { date: { studentId: "present"|"absent" } }
 *  "stm_fees"       – object { "YYYY-MM": { studentId: "paid"|"unpaid" } }
 *  "stm_marks"      – array of marks objects
 *  "stm_theme"      – "light" or "dark" (UI preference)
 */


// ─────────────────────────────────────────────
// STEP 1 — Two tiny helper functions that
//           read and write localStorage.
//           Every other function uses these.
// ─────────────────────────────────────────────

/**
 * loadData()
 * Reads a value from localStorage and converts it back to
 * a JS array or object. If nothing is stored yet, returns
 * the fallback value you provide ([] for arrays, {} for objects).
 */
function loadData(key, fallback) {
  if (fallback === undefined) fallback = [];
  try {
    var raw = localStorage.getItem(key);  // returns null if key doesn't exist
    if (raw) {
      return JSON.parse(raw);             // convert saved text back to JS value
    } else {
      return fallback;                    // nothing saved yet — use default
    }
  } catch (e) {
    return fallback;                      // corrupted data — use default
  }
}

/**
 * saveData()
 * Converts a JS array/object to text and saves it in localStorage.
 * Call this every time you add, edit, or delete a record so the
 * change is immediately persisted across refreshes.
 */
function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value)); // convert JS value → text, then save
}


// ─────────────────────────────────────────────
// STEP 2 — Load ALL data when the page opens.
//           These four lines run once at startup
//           and fill the in-memory variables with
//           whatever was previously saved.
// ─────────────────────────────────────────────

var students   = loadData('stm_students',   []);  // array of student objects
var attendance = loadData('stm_attendance', {});  // object – keys are dates
var fees       = loadData('stm_fees',       {});  // object – keys are months
var marks      = loadData('stm_marks',      []);  // array of marks objects


// ─────────────────────────────────────────────
// STEP 3 — persist helpers.
//           Call persist.students() after any
//           change to the students array, etc.
//           This is the line that actually writes
//           to localStorage.
// ─────────────────────────────────────────────

var persist = {
  students:   function() { saveData('stm_students',   students);   },
  attendance: function() { saveData('stm_attendance', attendance); },
  fees:       function() { saveData('stm_fees',       fees);       },
  marks:      function() { saveData('stm_marks',      marks);      }
};


// ─────────────────────────────────────────────
// Everything below is the rest of the app logic.
// The localStorage calls are already wired in —
// no further changes are needed below this line.
// ─────────────────────────────────────────────


// ===== UTILITY HELPERS =====

/** Generate a unique ID for new records */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Get today's date as YYYY-MM-DD */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Get the current month as YYYY-MM */
function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

/** Format a YYYY-MM string to "March 2025" */
function formatMonth(ym) {
  if (!ym) return '';
  var parts = ym.split('-');
  return new Date(+parts[0], +parts[1] - 1, 1)
    .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/** Return a consistent colour for a given string (used for avatars) */
function strColor(str) {
  var colors = ['#6366f1','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#14b8a6'];
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
  }
  return colors[Math.abs(hash) % colors.length];
}

/** Build two-letter initials from a full name */
function initials(name) {
  return name.trim().split(' ').map(function(w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
}

/** Escape HTML to prevent XSS */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Show a brief toast notification at the bottom-right */
function toast(msg, type) {
  if (!type) type = 'success';
  var t     = document.getElementById('toast');
  var icon  = document.getElementById('toastIcon');
  var msgEl = document.getElementById('toastMsg');
  var icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
  icon.className    = 'fas ' + (icons[type] || 'fa-check-circle') + ' ' + type;
  msgEl.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function() { t.classList.remove('show'); }, 3200);
}

/** Show the confirm/delete modal; call callback if user confirms */
function confirm_(message, callback) {
  document.getElementById('confirmMessage').textContent = message;
  var btn   = document.getElementById('confirmBtn');
  var fresh = btn.cloneNode(true); // clone removes stale event listeners
  btn.replaceWith(fresh);
  fresh.addEventListener('click', function() {
    callback();
    closeModal('confirmModal');
  });
  openModal('confirmModal');
}


// ===== NAVIGATION =====

function navigate(page) {
  document.querySelectorAll('.nav-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach(function(el) {
    el.classList.toggle('active', el.id === 'page-' + page);
  });
  var titles = { dashboard: 'Dashboard', students: 'Students', attendance: 'Attendance', fees: 'Fees', marks: 'Exam Marks' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  var handlers = { dashboard: renderDashboard, students: renderStudentsTable, attendance: initAttendance, fees: initFees, marks: initMarks };
  if (handlers[page]) handlers[page]();
  closeSidebar();
}

document.querySelectorAll('.nav-item').forEach(function(el) {
  el.addEventListener('click', function(e) { e.preventDefault(); navigate(el.dataset.page); });
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
// Theme preference is also saved in localStorage so it sticks after refresh.

function toggleTheme() {
  var html   = document.documentElement;
  var isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('themeIcon').className    = isDark ? 'fas fa-moon' : 'fas fa-sun';
  document.getElementById('themeLabel').textContent = isDark ? 'Dark Mode'   : 'Light Mode';
  localStorage.setItem('stm_theme', isDark ? 'light' : 'dark'); // save preference
}

(function applyTheme() {
  var saved = localStorage.getItem('stm_theme'); // load preference
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
    if (saved === 'dark') {
      document.getElementById('themeIcon').className    = 'fas fa-sun';
      document.getElementById('themeLabel').textContent = 'Light Mode';
    }
  }
})();


// ===== MODALS =====

function openModal(id)  { document.getElementById(id).classList.add('open');    }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(function(el) {
  el.addEventListener('click', function(e) { if (e.target === el) el.classList.remove('open'); });
});


// ===== CURRENT DATE =====

document.getElementById('currentDate').textContent =
  new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });


// ===== DASHBOARD =====

function renderDashboard() {
  var month = currentMonth();

  document.getElementById('dash-total-students').textContent = students.length;

  var monthFees = fees[month] || {};
  var collected = 0, pending = 0;
  students.forEach(function(s) {
    var status = monthFees[s.id] || 'unpaid';
    if (status === 'paid') collected += Number(s.fees) || 0;
    else                   pending   += Number(s.fees) || 0;
  });
  document.getElementById('dash-fees-collected').textContent = '₹' + collected.toLocaleString('en-IN');
  document.getElementById('dash-pending-fees').textContent   = '₹' + pending.toLocaleString('en-IN');

  var todayAtt     = attendance[today()] || {};
  var presentCount = Object.values(todayAtt).filter(function(v) { return v === 'present'; }).length;
  document.getElementById('dash-today-present').textContent  = presentCount + '/' + students.length;

  var recentEl = document.getElementById('dash-recent-students');
  if (students.length === 0) {
    recentEl.innerHTML = '<div class="empty-state"><i class="fas fa-user-plus"></i><p>No students yet. Add some!</p></div>';
  } else {
    recentEl.innerHTML = students.slice(-5).reverse().map(function(s) {
      return '<div class="recent-item">' +
        '<div class="student-avatar" style="background:' + strColor(s.name) + '">' + initials(s.name) + '</div>' +
        '<div class="recent-info">' +
          '<div class="recent-name">' + escHtml(s.name) + '</div>' +
          '<div class="recent-sub">Class ' + escHtml(s.class) + ' &bull; ' + escHtml(s.phone) + '</div>' +
        '</div>' +
        '<span class="badge badge-class">Cls ' + escHtml(s.class) + '</span>' +
      '</div>';
    }).join('');
  }

  var pendingEl       = document.getElementById('dash-pending-list');
  var pendingStudents = students.filter(function(s) { return (monthFees[s.id] || 'unpaid') === 'unpaid'; });
  if (pendingStudents.length === 0) {
    pendingEl.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><p>All fees are cleared!</p></div>';
  } else {
    pendingEl.innerHTML = pendingStudents.slice(0, 6).map(function(s) {
      return '<div class="pending-item">' +
        '<div class="student-avatar" style="background:' + strColor(s.name) + ';width:30px;height:30px;font-size:0.7rem">' + initials(s.name) + '</div>' +
        '<span class="pending-name">'    + escHtml(s.name) + '</span>' +
        '<span class="pending-amount">₹' + Number(s.fees).toLocaleString('en-IN') + '</span>' +
        '<button class="pending-notify" onclick="sendReminder(\'' + s.id + '\')"><i class="fas fa-bell"></i> Notify</button>' +
      '</div>';
    }).join('');
  }
}


// ===== STUDENTS =====

function openStudentModal(id) {
  document.getElementById('studentId').value = id || '';
  if (id) {
    var s = students.find(function(x) { return x.id === id; });
    if (!s) return;
    document.getElementById('studentModalTitle').textContent = 'Edit Student';
    document.getElementById('studentName').value   = s.name;
    document.getElementById('studentClass').value  = s.class;
    document.getElementById('studentPhone').value  = s.phone;
    document.getElementById('studentParent').value = s.parent;
    document.getElementById('studentFees').value   = s.fees;
  } else {
    document.getElementById('studentModalTitle').textContent = 'Add New Student';
    ['studentName','studentClass','studentPhone','studentParent','studentFees'].forEach(function(fid) {
      document.getElementById(fid).value = '';
    });
  }
  openModal('studentModal');
}

/**
 * saveStudent()
 * Called when the user clicks "Save Student" in the modal.
 *
 * Flow:
 *  1. Read values from the form fields
 *  2. Validate them
 *  3. Add to (or update) the in-memory `students` array
 *  4. Call persist.students()
 *       → calls saveData('stm_students', students)
 *           → calls localStorage.setItem(...)
 *     ↑ THIS is the line that makes data survive a page refresh
 *  5. Re-render the UI
 */
function saveStudent() {
  var id     = document.getElementById('studentId').value;
  var name   = document.getElementById('studentName').value.trim();
  var cls    = document.getElementById('studentClass').value;
  var phone  = document.getElementById('studentPhone').value.trim();
  var parent = document.getElementById('studentParent').value.trim();
  var fee    = document.getElementById('studentFees').value.trim();

  // Validation
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
    // Update existing student in the array
    var idx = students.findIndex(function(s) { return s.id === id; });
    if (idx > -1) {
      students[idx] = { id: students[idx].id, name: name, class: cls, phone: phone, parent: parent, fees: fee };
    }
    toast('Student updated!');
  } else {
    // Add a brand-new student to the array
    students.push({ id: uid(), name: name, class: cls, phone: phone, parent: parent, fees: fee });
    toast('Student added!');
  }

  // ★ SAVE to localStorage — without this the data would vanish on refresh
  persist.students();

  closeModal('studentModal');
  renderStudentsTable();
  renderDashboard();
  populateStudentSelects();
}

/**
 * deleteStudent()
 * Removes a student and all their attendance / fees / marks data,
 * then saves every affected collection back to localStorage.
 */
function deleteStudent(id) {
  confirm_('Delete this student? All related data (attendance, fees, marks) will also be removed.', function() {

    students = students.filter(function(s) { return s.id !== id; });

    Object.keys(attendance).forEach(function(date) { delete attendance[date][id]; });
    Object.keys(fees).forEach(function(m)           { delete fees[m][id]; });
    marks = marks.filter(function(m) { return m.studentId !== id; });

    // ★ SAVE all four collections back to localStorage
    persist.students();
    persist.attendance();
    persist.fees();
    persist.marks();

    renderStudentsTable();
    renderDashboard();
    populateStudentSelects();
    toast('Student deleted.', 'info');
  });
}

function renderStudentsTable() {
  var query    = (document.getElementById('studentSearch') ? document.getElementById('studentSearch').value : '').toLowerCase();
  var clsF     = document.getElementById('classFilter')   ? document.getElementById('classFilter').value    : '';
  var tbody    = document.getElementById('studentsTableBody');
  var filtered = students;

  if (query) filtered = filtered.filter(function(s) {
    return s.name.toLowerCase().indexOf(query) > -1 || s.parent.toLowerCase().indexOf(query) > -1;
  });
  if (clsF) filtered = filtered.filter(function(s) { return s.class === clsF; });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row"><i class="fas fa-user-graduate"></i> No students found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function(s, i) {
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><div style="display:flex;align-items:center;gap:0.6rem;">' +
        '<div class="student-avatar" style="background:' + strColor(s.name) + ';width:32px;height:32px;font-size:0.75rem">' + initials(s.name) + '</div>' +
        '<span style="font-weight:600">' + escHtml(s.name) + '</span>' +
      '</div></td>' +
      '<td><span class="badge badge-class">Class ' + escHtml(s.class) + '</span></td>' +
      '<td>' + escHtml(s.phone)  + '</td>' +
      '<td>' + escHtml(s.parent) + '</td>' +
      '<td style="font-weight:700">₹' + Number(s.fees).toLocaleString('en-IN') + '</td>' +
      '<td><div class="action-btns">' +
        '<button class="btn-icon edit"   onclick="openStudentModal(\'' + s.id + '\')" title="Edit"><i class="fas fa-pen"></i></button>' +
        '<button class="btn-icon delete" onclick="deleteStudent(\''    + s.id + '\')" title="Delete"><i class="fas fa-trash"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join('');
}


// ===== CSV EXPORT =====

function exportCSV() {
  if (students.length === 0) { toast('No students to export.', 'info'); return; }
  var header = ['#','Name','Class','Phone','Parent','Fees(INR)'];
  var rows   = students.map(function(s, i) {
    return [i + 1, s.name, 'Class ' + s.class, s.phone, s.parent, s.fees];
  });
  var csv  = [header].concat(rows).map(function(r) {
    return r.map(function(c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
  }).join('\n');
  var blob = new Blob([csv], { type: 'text/csv' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = 'students_' + today() + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('Exported to CSV!');
}


// ===== ATTENDANCE =====

function initAttendance() {
  var dateEl = document.getElementById('attendanceDate');
  if (!dateEl.value) dateEl.value = today();
  populateMonthSelect('reportMonth');
  renderAttendance();
  renderMonthlyReport();
}

function renderAttendance() {
  var date   = document.getElementById('attendanceDate').value || today();
  var dayAtt = attendance[date] || {};
  var grid   = document.getElementById('attendanceGrid');

  if (students.length === 0) {
    grid.innerHTML = '<div class="empty-state big" style="grid-column:1/-1"><i class="fas fa-user-graduate"></i><p>Add students first to mark attendance.</p></div>';
    return;
  }

  grid.innerHTML = students.map(function(s) {
    var status    = dayAtt[s.id] || '';
    var badgeHtml = status
      ? '<span class="badge badge-' + status + '">' + status.charAt(0).toUpperCase() + status.slice(1) + '</span>'
      : '';
    return '<div class="attendance-card ' + status + '" id="att-card-' + s.id + '">' +
      '<div class="att-card-top">' +
        '<div class="student-avatar" style="background:' + strColor(s.name) + '">' + initials(s.name) + '</div>' +
        '<div class="att-info">' +
          '<div class="att-name">'  + escHtml(s.name)  + '</div>' +
          '<div class="att-class">Class ' + escHtml(s.class) + '</div>' +
        '</div>' +
        badgeHtml +
      '</div>' +
      '<div class="att-btns">' +
        '<button class="att-btn present-btn ' + (status === 'present' ? 'active' : '') + '" onclick="markAttendance(\'' + s.id + '\',\'present\',\'' + date + '\')">' +
          '<i class="fas fa-check"></i> Present</button>' +
        '<button class="att-btn absent-btn '  + (status === 'absent'  ? 'active' : '') + '" onclick="markAttendance(\'' + s.id + '\',\'absent\',\''  + date + '\')">' +
          '<i class="fas fa-times"></i> Absent</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

/**
 * markAttendance()
 * Records present/absent in memory, then immediately persists.
 */
function markAttendance(studentId, status, date) {
  if (!attendance[date]) attendance[date] = {};
  attendance[date][studentId] = status;

  persist.attendance(); // ★ SAVE to localStorage

  renderAttendance();
  renderDashboard();
  toast('Marked ' + status + '!', status === 'present' ? 'success' : 'info');
}

function renderMonthlyReport() {
  var month  = document.getElementById('reportMonth').value || currentMonth();
  var tbody  = document.getElementById('monthlyReportBody');
  if (!month || students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No data for selected period.</td></tr>';
    return;
  }
  var datesInMonth = Object.keys(attendance).filter(function(d) { return d.indexOf(month) === 0; });

  tbody.innerHTML = students.map(function(s) {
    var present = 0, absent = 0;
    datesInMonth.forEach(function(d) {
      var v = attendance[d] && attendance[d][s.id];
      if (v === 'present') present++;
      else if (v === 'absent') absent++;
    });
    var total    = present + absent;
    var pct      = total > 0 ? Math.round((present / total) * 100) : 0;
    var pctClass = pct >= 75 ? '' : pct >= 50 ? 'low' : 'critical';
    return '<tr>' +
      '<td><div style="display:flex;align-items:center;gap:0.5rem">' +
        '<div class="student-avatar" style="background:' + strColor(s.name) + ';width:28px;height:28px;font-size:0.65rem">' + initials(s.name) + '</div>' +
        escHtml(s.name) +
      '</div></td>' +
      '<td><span class="badge badge-class">Cls ' + escHtml(s.class) + '</span></td>' +
      '<td style="color:var(--accent-green);font-weight:600">' + present + '</td>' +
      '<td style="color:var(--accent-red);font-weight:600">'   + absent  + '</td>' +
      '<td><span style="font-weight:700">' + pct + '%</span>' +
        '<span class="progress-bar"><span class="progress-fill ' + pctClass + '" style="width:' + pct + '%"></span></span>' +
      '</td>' +
    '</tr>';
  }).join('');
}


// ===== FEES =====

function initFees() {
  populateMonthSelect('feesMonth', true);
  renderFees();
}

function renderFees() {
  var month    = document.getElementById('feesMonth').value || currentMonth();
  var monthFee = fees[month] || {};
  var tbody    = document.getElementById('feesTableBody');

  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No students found.</td></tr>';
    updateFeeStats(0, 0, 0, 0);
    return;
  }

  var paidCount = 0, unpaidCount = 0, totalPaid = 0, totalUnpaid = 0;
  students.forEach(function(s) {
    var st = monthFee[s.id] || 'unpaid';
    if (st === 'paid') { paidCount++;   totalPaid   += Number(s.fees); }
    else               { unpaidCount++; totalUnpaid += Number(s.fees); }
  });
  updateFeeStats(paidCount, unpaidCount, totalPaid, totalUnpaid);

  tbody.innerHTML = students.map(function(s) {
    var status = monthFee[s.id] || 'unpaid';
    var notify = status === 'unpaid'
      ? '<button class="pending-notify" onclick="sendReminder(\'' + s.id + '\')"><i class="fas fa-bell"></i> Notify</button>'
      : '';
    return '<tr>' +
      '<td><div style="display:flex;align-items:center;gap:0.6rem">' +
        '<div class="student-avatar" style="background:' + strColor(s.name) + ';width:32px;height:32px;font-size:0.75rem">' + initials(s.name) + '</div>' +
        '<span style="font-weight:600">' + escHtml(s.name) + '</span>' +
      '</div></td>' +
      '<td><span class="badge badge-class">Class ' + escHtml(s.class) + '</span></td>' +
      '<td style="font-weight:700">₹' + Number(s.fees).toLocaleString('en-IN') + '</td>' +
      '<td><span class="badge badge-' + status + '">' + (status === 'paid' ? '✓ Paid' : '✗ Unpaid') + '</span></td>' +
      '<td><div class="action-btns">' +
        '<button class="btn-icon edit" onclick="toggleFeeStatus(\'' + s.id + '\',\'' + month + '\')" style="width:auto;padding:0.3rem 0.7rem;gap:0.3rem;">' +
          '<i class="fas fa-exchange-alt"></i> Toggle</button>' +
        notify +
      '</div></td>' +
    '</tr>';
  }).join('');
}

/**
 * toggleFeeStatus()
 * Flips a student's fee paid ↔ unpaid and persists the change.
 */
function toggleFeeStatus(studentId, month) {
  if (!fees[month]) fees[month] = {};
  var current = fees[month][studentId] || 'unpaid';
  fees[month][studentId] = current === 'paid' ? 'unpaid' : 'paid';

  persist.fees(); // ★ SAVE to localStorage

  renderFees();
  renderDashboard();
  toast('Fee marked as ' + fees[month][studentId] + '!');
}

function updateFeeStats(paid, unpaid, totalPaid, totalUnpaid) {
  document.getElementById('fees-paid-count').textContent      = paid;
  document.getElementById('fees-unpaid-count').textContent    = unpaid;
  document.getElementById('fees-total-collected').textContent = '₹' + totalPaid.toLocaleString('en-IN');
  document.getElementById('fees-total-pending').textContent   = '₹' + totalUnpaid.toLocaleString('en-IN');
}


// ===== PARENT NOTIFICATION (demo) =====

function sendReminder(studentId) {
  var s = students.find(function(x) { return x.id === studentId; });
  if (!s) return;
  toast('📱 Reminder sent to ' + s.parent + " for " + s.name + "'s fees!", 'info');
}


// ===== MARKS =====

function initMarks() {
  populateStudentSelects();
  renderMarksTable();
}

function openMarksModal(id) {
  document.getElementById('marksId').value = id || '';
  if (id) {
    var m = marks.find(function(x) { return x.id === id; });
    if (!m) return;
    document.getElementById('marksStudent').value  = m.studentId;
    document.getElementById('marksExam').value     = m.exam;
    document.getElementById('marksSubject').value  = m.subject;
    document.getElementById('marksObtained').value = m.obtained;
    document.getElementById('marksTotal').value    = m.total;
  } else {
    ['marksStudent','marksExam','marksSubject','marksObtained','marksTotal'].forEach(function(fid) {
      document.getElementById(fid).value = '';
    });
  }
  openModal('marksModal');
}

/**
 * saveMarks()
 * Adds or updates a marks entry and persists to localStorage.
 */
function saveMarks() {
  var id        = document.getElementById('marksId').value;
  var studentId = document.getElementById('marksStudent').value;
  var exam      = document.getElementById('marksExam').value.trim();
  var subject   = document.getElementById('marksSubject').value.trim();
  var obtained  = document.getElementById('marksObtained').value.trim();
  var total     = document.getElementById('marksTotal').value.trim();

  if (!studentId || !exam || !subject || !obtained || !total) {
    toast('Please fill all fields.', 'error'); return;
  }
  if (isNaN(obtained) || isNaN(total) || Number(obtained) < 0 || Number(total) <= 0) {
    toast('Invalid marks values.', 'error'); return;
  }
  if (Number(obtained) > Number(total)) {
    toast('Obtained marks cannot exceed total.', 'error'); return;
  }

  var entry = { studentId: studentId, exam: exam, subject: subject, obtained: Number(obtained), total: Number(total) };

  if (id) {
    var idx = marks.findIndex(function(m) { return m.id === id; });
    if (idx > -1) marks[idx] = Object.assign({}, marks[idx], entry);
    toast('Marks updated!');
  } else {
    entry.id = uid();
    marks.push(entry);
    toast('Marks added!');
  }

  persist.marks(); // ★ SAVE to localStorage

  closeModal('marksModal');
  renderMarksTable();
}

function deleteMarks(id) {
  confirm_('Delete this marks entry?', function() {
    marks = marks.filter(function(m) { return m.id !== id; });
    persist.marks(); // ★ SAVE to localStorage
    renderMarksTable();
    toast('Marks deleted.', 'info');
  });
}

function renderMarksTable() {
  var studentF = document.getElementById('marksStudentFilter') ? document.getElementById('marksStudentFilter').value : '';
  var examF    = document.getElementById('marksExamFilter')    ? document.getElementById('marksExamFilter').value    : '';
  var tbody    = document.getElementById('marksTableBody');

  var filtered = marks;
  if (studentF) filtered = filtered.filter(function(m) { return m.studentId === studentF; });
  if (examF)    filtered = filtered.filter(function(m) { return m.exam === examF; });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row"><i class="fas fa-star-half-alt"></i> No marks added yet.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function(m) {
    var s        = students.find(function(x) { return x.id === m.studentId; });
    var pct      = Math.round((m.obtained / m.total) * 100);
    var pctClass = pct >= 75 ? 'good' : pct >= 50 ? 'avg' : 'poor';
    var avatar   = s
      ? '<div class="student-avatar" style="background:' + strColor(s.name) + ';width:28px;height:28px;font-size:0.65rem">' + initials(s.name) + '</div>'
      : '';
    return '<tr>' +
      '<td><div style="display:flex;align-items:center;gap:0.5rem">' + avatar +
        '<span style="font-weight:600">' + escHtml(s ? s.name : 'Unknown') + '</span>' +
      '</div></td>' +
      '<td>' + (s ? '<span class="badge badge-class">Cls ' + escHtml(s.class) + '</span>' : '—') + '</td>' +
      '<td style="font-weight:600">' + escHtml(m.exam)    + '</td>' +
      '<td>'                         + escHtml(m.subject) + '</td>' +
      '<td style="font-weight:700">' + m.obtained         + '</td>' +
      '<td>'                         + m.total            + '</td>' +
      '<td><span class="marks-pct ' + pctClass + '">' + pct + '%</span></td>' +
      '<td><div class="action-btns">' +
        '<button class="btn-icon edit"   onclick="openMarksModal(\'' + m.id + '\')"><i class="fas fa-pen"></i></button>' +
        '<button class="btn-icon delete" onclick="deleteMarks(\''    + m.id + '\')"><i class="fas fa-trash"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join('');
}


// ===== SHARED SELECT HELPERS =====

function populateMonthSelect(elementId, selectCurrent) {
  var el = document.getElementById(elementId);
  if (!el) return;
  var now = new Date(), options = [];
  for (var i = 0; i < 12; i++) {
    var d  = new Date(now.getFullYear(), now.getMonth() - i, 1);
    var ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    options.push('<option value="' + ym + '"' + (selectCurrent && i === 0 ? ' selected' : '') + '>' + formatMonth(ym) + '</option>');
  }
  el.innerHTML = options.join('');
}

function populateStudentSelects() {
  ['marksStudent','marksStudentFilter'].forEach(function(fid) {
    var el = document.getElementById(fid);
    if (!el) return;
    var first = fid === 'marksStudentFilter'
      ? '<option value="">All Students</option>'
      : '<option value="">Select student</option>';
    el.innerHTML = first + students.map(function(s) {
      return '<option value="' + s.id + '">' + escHtml(s.name) + ' (Class ' + s.class + ')</option>';
    }).join('');
  });
}


// ===== KEYBOARD SHORTCUT  Ctrl/Cmd+K =====

document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    navigate('students');
    var el = document.getElementById('studentSearch');
    if (el) el.focus();
  }
});


// ─────────────────────────────────────────────
// STEP 4 — INITIALISE on page load.
//
// At this point `students`, `attendance`, `fees`,
// and `marks` have already been populated from
// localStorage (see Step 2 at the top of this file).
// We just need to render the UI with that data.
// ─────────────────────────────────────────────

(function init() {
  renderDashboard();
  populateMonthSelect('reportMonth');
  populateMonthSelect('feesMonth', true);
  populateStudentSelects();
  var attDate = document.getElementById('attendanceDate');
  if (attDate) attDate.value = today();
})();