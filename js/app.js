// EasyJob frontend logic and dashboard views
const CATS = [
  'Software Development',
  'Data & SQL',
  'Design & UI/UX',
  'Marketing',
  'Project Management',
  'Human Resources'
];
const LOCS = ['Germany', 'India', 'United States', 'South Korea'];
const TYPES = ['Full-time', 'Part-time', 'Internship'];
const LVLS = ['Fresher', 'Junior', 'Mid-level', 'Senior'];
const STAT = ['Submitted', 'In review', 'Shortlisted', 'Interview', 'Offered', 'Rejected'];

const SORT = {
  new: 'j.id DESC',
  deadline: 'j.deadline ASC',
  title: 'j.title ASC'
};

const C = {
  Submitted: 'secondary',
  'In review': 'warning',
  Shortlisted: 'info',
  Interview: 'primary',
  Offered: 'success',
  Rejected: 'danger'
};

const PF = {
  seeker: [
    ['name', 'Full name'],
    ['headline', 'Headline'],
    ['phone', 'Phone', 'tel'],
    ['city', 'City'],
    ['skills', 'Skills (comma separated)'],
    ['bio', 'About you', 'area']
  ],
  employer: [
    ['name', 'Contact name'],
    ['company', 'Company name'],
    ['phone', 'Phone', 'tel'],
    ['city', 'City'],
    ['website', 'Website'],
    ['about', 'About the company', 'area']
  ]
};

let me = null;
let tab = 'apps';
let otp = null;
let rate = 5;
let rv = 'all';
let fj = '';
let fs = '';

// Helpers
const $ = sel => document.querySelector(sel);

const esc = val => String(val ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[ch]));

const fmt = dateVal => {
  const s = String(dateVal);
  const parsed = new Date(s.length > 10 ? s.replace(' ', 'T') + 'Z' : s);
  return parsed.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const opts = (list, allLabel) =>
  (allLabel ? `<option value="">${allLabel}</option>` : '') +
  list.map(item => `<option>${item}</option>`).join('');

const toast = msg => {
  $('#tm').textContent = msg;
  bootstrap.Toast.getOrCreateInstance($('#tst')).show();
};

const M = () => bootstrap.Modal.getOrCreateInstance($('#mod'));
const hide = () => M().hide();

const show = (html, isLarge) => {
  $('#md').classList.toggle('modal-lg', !!isLarge);
  $('#mb').innerHTML =
    '<button class="btn-close float-end" data-bs-dismiss="modal" aria-label="Close"></button>' + html;
  M().show();
};

const fld = (id, label, type = 'text', attrs = '', val = '') => `
  <div class="mb-3">
    <label class="form-label small">${label}</label>
    <input id="${id}" type="${type}" class="form-control" value="${esc(val)}" ${attrs}>
  </div>
`;

const area = (id, label, val = '', attrs = '') => `
  <div class="mb-3">
    <label class="form-label small">${label}</label>
    <textarea id="${id}" class="form-control" rows="3" ${attrs}>${esc(val)}</textarea>
  </div>
`;

const badge = status => `<span class="badge text-bg-${C[status]}">${status}</span>`;

const stats = items => `
  <div class="row g-3 mb-3">
    ${items.map(([label, val]) => `
      <div class="col-6 col-md-3">
        <div class="card">
          <div class="card-body">
            <div class="fs-3 fw-bold">${val}</div>
            <div class="small text-body-secondary">${label}</div>
          </div>
        </div>
      </div>
    `).join('')}
  </div>
`;

const empty = (heading, text) => `
  <div class="text-center text-body-secondary py-5">
    <h5 class="text-body">${heading}</h5>
    <p>${text}</p>
  </div>
`;

const ln = val =>
  val.split('\n').map(line => line.trim()).filter(Boolean).join('|');

const mine = id =>
  q('SELECT a.*, j.employer_id FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ?', [id])[0];

const can = app => app && me && (app.user_id === me.id || app.employer_id === me.id);

const avatar = (user, size = 32) => {
  const safePhoto = user.photo && /^data:image\//.test(user.photo) ? esc(user.photo) : '';
  if (safePhoto) {
    return `<img src="${safePhoto}" alt="" class="rounded-circle" style="width:${size}px;height:${size}px;object-fit:cover">`;
  }
  const initial = esc((user.name || '?')[0]);
  return `<span class="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center fw-semibold" style="width:${size}px;height:${size}px;font-size:${size * 0.42}px">${initial}</span>`;
};

const job = id =>
  q('SELECT j.*, u.company, u.about FROM jobs j JOIN users u ON u.id = j.employer_id WHERE j.id = ?', [id])[0];

const sel = (id, label, list) => `
  <div class="mb-3">
    <label class="form-label small">${label}</label>
    <select id="${id}" class="form-select">${opts(list)}</select>
  </div>
`;

// Navigation
function nav() {
  if (me) {
    const roleBadge = me.role === 'employer' ? 'primary' : 'success';
    const roleText = me.role === 'employer' ? 'Employer' : 'Candidate';
    $('#navR').innerHTML = `
      <a href="#" class="nav-link" onclick="dashView(); return false">Dashboard</a>
      <span class="badge text-bg-${roleBadge}">${roleText}</span>
      <button class="btn p-0 border-0" onclick="tab='set'; dashView()" title="Settings" aria-label="Settings">
        ${avatar(me, 34)}
      </button>
      <button class="btn btn-sm btn-outline-secondary" onclick="out()">Sign out</button>
    `;
  } else {
    $('#navR').innerHTML = `
      <button class="btn btn-sm btn-outline-primary" onclick="auth('in')">Sign in</button>
      <button class="btn btn-sm btn-primary" onclick="auth('up')">Register</button>
    `;
  }
}

function home() {
  $('#pub').classList.remove('d-none');
  $('#dash').classList.add('d-none');
  nav();
  jobs();
  revs();
}

function dashView() {
  if (!me) {
    return auth('in');
  }
  $('#pub').classList.add('d-none');
  $('#dash').classList.remove('d-none');
  scrollTo(0, 0);
  nav();
  renderDash();
}

// Job search and details
function jobs() {
  const sortKey = SORT[$('#fo').value] || SORT.new;
  const list = q(
    `SELECT j.*, u.company
     FROM jobs j
     JOIN users u ON u.id = j.employer_id
     WHERE (j.title LIKE ?1 OR u.company LIKE ?1 OR j.skills LIKE ?1 OR j.description LIKE ?1)
       AND (?2 = '' OR j.category = ?2)
       AND (?3 = '' OR j.location = ?3)
       AND (?4 = '' OR j.job_type = ?4)
       AND (?5 = '' OR j.level = ?5)
     ORDER BY ${sortKey}`,
    [
      `%${$('#fk').value.trim()}%`,
      $('#fc').value,
      $('#fl').value,
      $('#ft').value,
      $('#fv').value
    ]
  );

  const savedSet = me && me.role === 'seeker'
    ? new Set(q('SELECT job_id FROM saved_jobs WHERE user_id = ?', [me.id]).map(r => r.job_id))
    : null;

  $('#cnt').textContent = `${list.length} role${list.length === 1 ? '' : 's'}`;

  if (!list.length) {
    $('#jl').innerHTML = empty('No roles match', 'Try a different keyword or filter.');
    return;
  }

  $('#jl').innerHTML = list.map(j => {
    const skillTags = j.skills
      .split(',')
      .slice(0, 4)
      .map(s => `<span class="badge text-bg-light border">${esc(s.trim())}</span>`)
      .join('');

    const saveBtn = savedSet
      ? `<button class="btn btn-sm ${savedSet.has(j.id) ? 'btn-primary' : 'btn-outline-primary'}" onclick="toggleSave(${j.id})">${savedSet.has(j.id) ? 'Saved' : 'Save'}</button>`
      : '';

    return `
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex gap-3 flex-wrap align-items-start">
            <div class="logo">${esc(j.company[0])}</div>
            <div class="flex-grow-1">
              <h5 class="mb-1">${esc(j.title)}</h5>
              <div class="small text-body-secondary">${esc(j.company)} | ${esc(j.location)} | ${esc(j.salary)}</div>
              <div class="mt-2 d-flex flex-wrap gap-1">
                <span class="badge text-bg-primary">${esc(j.job_type)}</span>
                <span class="badge text-bg-secondary">${esc(j.level)}</span>
                ${skillTags}
              </div>
            </div>
            <div class="text-md-end">
              <div class="d-flex gap-2">
                ${saveBtn}
                <button class="btn btn-sm btn-primary" onclick="viewJob(${j.id})">View details</button>
              </div>
              <div class="small text-body-secondary mt-2">Closes ${fmt(j.deadline)}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleSave(id) {
  if (!me || me.role !== 'seeker') return;
  const exists = q('SELECT 1 FROM saved_jobs WHERE user_id = ? AND job_id = ?', [me.id, id]).length;
  if (exists) {
    run('DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?', [me.id, id]);
  } else {
    run('INSERT INTO saved_jobs VALUES (?, ?)', [me.id, id]);
  }
  if ($('#dash').classList.contains('d-none')) {
    jobs();
  } else {
    renderDash();
  }
}

function viewJob(id) {
  const j = job(id);
  if (!j) return;

  const alreadyApplied = me && q('SELECT 1 FROM applications WHERE job_id = ? AND user_id = ?', [id, me.id]).length;
  const makeList = str =>
    `<ul class="small ps-3">${(str || '').split('|').map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;

  let actionHtml;
  if (!me) {
    actionHtml = `<button class="btn btn-primary w-100" onclick="auth('in')">Sign in to apply</button>`;
  } else if (me.role !== 'seeker') {
    actionHtml = `<div class="small text-body-secondary">Employer accounts cannot apply to roles.</div>`;
  } else if (alreadyApplied) {
    actionHtml = `<span class="badge text-bg-success">You have applied</span>`;
  } else {
    actionHtml = `<button class="btn btn-primary w-100" onclick="applyForm(${id})">Apply now</button>`;
  }

  const row = (k, v) =>
    `<dt class="col-5 fw-normal text-body-secondary">${k}</dt><dd class="col-7 mb-1">${esc(v)}</dd>`;

  const skillBadges = j.skills
    .split(',')
    .map(s => `<span class="badge text-bg-light border">${esc(s.trim())}</span>`)
    .join('');

  show(`
    <div class="row g-4">
      <div class="col-lg-8">
        <span class="badge text-bg-primary mb-2">${esc(j.category)}</span>
        <h3>${esc(j.title)}</h3>
        <p class="text-body-secondary">${esc(j.company)} | ${esc(j.location)}</p>
        <h6>About the role</h6>
        <p class="small">${esc(j.description)}</p>
        <h6>Responsibilities</h6>
        ${makeList(j.responsibilities)}
        <h6>Requirements</h6>
        ${makeList(j.requirements)}
        <h6>Skills</h6>
        <div class="d-flex flex-wrap gap-1">${skillBadges}</div>
      </div>
      <div class="col-lg-4">
        <div class="bg-body-tertiary rounded-4 p-3 mb-3">
          <h6>Job summary</h6>
          <dl class="row small mb-3">
            ${row('Posted', fmt(j.posted_at))}
            ${row('Vacancies', j.vacancies)}
            ${row('Type', j.job_type)}
            ${row('Level', j.level)}
            ${row('Salary', j.salary)}
            ${row('Deadline', fmt(j.deadline))}
          </dl>
          ${actionHtml}
        </div>
        <div class="small">
          <h6>About ${esc(j.company)}</h6>
          <p class="text-body-secondary">${esc(j.about)}</p>
        </div>
      </div>
    </div>
  `, true);
}

function applyForm(id) {
  const j = job(id);
  show(`
    <h4>Apply for ${esc(j.title)}</h4>
    <p class="text-body-secondary small">${esc(j.company)} | ${esc(j.location)}</p>
    <form onsubmit="submitApp(event, ${id})" class="mt-3">
      <div class="row">
        <div class="col-sm-6">${fld('af_n', 'Full name', 'text', 'disabled', me.name)}</div>
        <div class="col-sm-6">${fld('af_e', 'Email', 'email', 'disabled', me.email)}</div>
        <div class="col-sm-6">${fld('af_p', 'Phone', 'tel', 'required', me.phone)}</div>
        <div class="col-sm-6">${fld('af_w', 'Portfolio / GitHub (optional)', 'url', 'placeholder="https://"')}</div>
        <div class="col-sm-6">
          <label class="form-label small">Experience</label>
          <select id="af_x" class="form-select mb-3">${opts(['Fresher', 'Under 1 year', '1-3 years', '3+ years'])}</select>
        </div>
        <div class="col-sm-6">${fld('af_s', 'Expected salary', 'text', 'required placeholder="e.g. EUR 3,800 / mo"')}</div>
      </div>
      ${area('af_c', 'Cover letter', '', 'required maxlength="1500" placeholder="Why are you a good fit?"')}
      <div class="mb-3">
        <label class="form-label small">CV (PDF, DOC or DOCX, max 1.5 MB)</label>
        <input id="af_f" type="file" class="form-control" accept=".pdf,.doc,.docx" required>
      </div>
      <button class="btn btn-primary w-100">Submit application</button>
    </form>
  `);
}

async function submitApp(e, id) {
  e.preventDefault();
  if (!me || me.role !== 'seeker') return;

  if (q('SELECT 1 FROM applications WHERE job_id = ? AND user_id = ?', [id, me.id]).length) {
    return toast('You have already applied');
  }

  const file = $('#af_f').files[0];
  if (file.size > 1.5e6) {
    return toast('CV must be under 1.5 MB');
  }

  const dataUrl = await new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  run(
    `INSERT INTO applications (
      job_id, user_id, phone, portfolio, experience, expected_salary, cover_letter, cv_name, cv_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      me.id,
      $('#af_p').value.trim(),
      $('#af_w').value.trim(),
      $('#af_x').value,
      $('#af_s').value.trim(),
      $('#af_c').value.trim(),
      file.name,
      dataUrl
    ]
  );

  hide();
  tab = 'apps';
  toast('Application submitted');
  dashView();
}

// Authentication and OTP recovery
function auth(mode) {
  const views = {
    in: () => `
      <h4>Welcome back</h4>
      <form class="mt-3" onsubmit="login(event)">
        ${fld('au', 'Username or email', 'text', 'required autocomplete="username"')}
        ${fld('ap', 'Password', 'password', 'required autocomplete="current-password"')}
        <button class="btn btn-primary w-100">Sign in</button>
      </form>
      <div class="small mt-3">
        <a href="#" onclick="auth('code'); return false">Forgot password?</a> |
        <a href="#" onclick="auth('up'); return false">Create account</a>
      </div>
      <div class="small text-body-secondary mt-2">
        Demo:
        <a href="#" onclick="fillDemo('sameer','sameer12345'); return false">candidate</a> |
        <a href="#" onclick="fillDemo('employer','admin123'); return false">employer</a>
      </div>
    `,
    up: () => `
      <h4>Create your account</h4>
      <form class="mt-3" onsubmit="signup(event)">
        <div class="mb-3">
          <label class="form-label small">I am a</label>
          <select id="ur" class="form-select" onchange="$('#uc').classList.toggle('d-none', this.value !== 'employer')">
            <option value="seeker">Candidate</option>
            <option value="employer">Employer</option>
          </select>
        </div>
        ${fld('un', 'Full name', 'text', 'required')}
        ${fld('uu', 'Username', 'text', 'required autocomplete="username"')}
        ${fld('ue', 'Email', 'email', 'required')}
        ${fld('up', 'Password (6+ characters)', 'password', 'required minlength="6" autocomplete="new-password"')}
        <div id="uc" class="d-none">${fld('ucn', 'Company name')}</div>
        <button class="btn btn-primary w-100">Create account</button>
      </form>
      <div class="small mt-3">
        Already registered? <a href="#" onclick="auth('in'); return false">Sign in</a>
      </div>
    `,
    code: () => `
      <h4>Reset your password</h4>
      <p class="text-body-secondary small">
        Enter your email or username to generate a 6-digit verification code.
      </p>
      <form onsubmit="sendCode(event)">
        ${fld('ce', 'Email or username', 'text', 'required')}
        <button class="btn btn-primary w-100">Send code</button>
      </form>
      <div class="small mt-3">
        <a href="#" onclick="auth('in'); return false">Back to sign in</a>
      </div>
    `,
    verify: () => `
      <h4>Enter your code</h4>
      <p class="text-body-secondary small">
        Sent to ${esc(otp.mail.replace(/^(.).*(@.*)$/, '$1***$2'))}. Expires in 5 minutes.
      </p>
      <div class="alert alert-primary py-2 small">
        Demo mode: no email server is connected, so your code is displayed below.
        <div class="fs-4 fw-bold" style="letter-spacing: 0.25em">${otp.c}</div>
      </div>
      <form onsubmit="verify(event)">
        <input id="oc" class="form-control form-control-lg text-center mb-3"
               inputmode="numeric" maxlength="6" pattern="[0-9]{6}"
               placeholder="6-digit code" autocomplete="one-time-code" required>
        <button class="btn btn-primary w-100">Verify code</button>
      </form>
      <div class="small mt-3">
        <a href="#" onclick="resend(); return false">Send a new code</a>
      </div>
    `,
    reset: () => `
      <h4>Set a new password</h4>
      <p class="text-body-secondary small">Code verified. Choose a new password to sign in.</p>
      <form onsubmit="setPw(event)">
        ${fld('np', 'New password (6+ characters)', 'password', 'required minlength="6" autocomplete="new-password"')}
        <button class="btn btn-primary w-100">Save and sign in</button>
      </form>
    `
  };

  show(views[mode]());
  setTimeout(() => {
    const input = $('#mb input:not([disabled])');
    if (input) input.focus();
  }, 300);
}

function fillDemo(user, pass) {
  $('#au').value = user;
  $('#ap').value = pass;
}

async function login(e) {
  e.preventDefault();
  const ident = $('#au').value.trim().toLowerCase();
  const hash = await sha($('#ap').value);
  const user = q(
    'SELECT * FROM users WHERE (lower(username) = ?1 OR lower(email) = ?1) AND password_hash = ?2',
    [ident, hash]
  )[0];
  if (user) {
    enter(user);
  } else {
    toast('Incorrect username or password');
  }
}

async function signup(e) {
  e.preventDefault();
  const role = $('#ur').value;
  const username = $('#uu').value.trim();
  const email = $('#ue').value.trim();
  const company = $('#ucn').value.trim();

  if (q('SELECT 1 FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)', [username, email]).length) {
    return toast('Username or email already in use');
  }
  if (role === 'employer' && !company) {
    return toast('Enter your company name');
  }

  run(
    `INSERT INTO users (
      role, name, username, email, password_hash, company,
      headline, skills, bio, phone, city, website, about
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      role,
      $('#un').value.trim(),
      username,
      email,
      await sha($('#up').value),
      role === 'employer' ? company : null,
      '', '', '', '', '', '', ''
    ]
  );

  enter(q('SELECT * FROM users WHERE username = ?', [username])[0]);
}

function enter(user) {
  me = user;
  otp = null;
  localStorage.setItem('easyjob_sess', user.id);
  hide();
  tab = 'apps';
  toast('Signed in as ' + user.name);
  dashView();
}

function out() {
  me = null;
  localStorage.removeItem('easyjob_sess');
  toast('Signed out');
  home();
}

function mkOtp(user) {
  otp = {
    id: user.id,
    mail: user.email,
    c: String(Math.floor(1e5 + Math.random() * 9e5)),
    exp: Date.now() + 3e5,
    tries: 0,
    ok: false
  };
}

function sendCode(e) {
  e.preventDefault();
  const ident = $('#ce').value.trim().toLowerCase();
  const user = q('SELECT * FROM users WHERE lower(username) = ?1 OR lower(email) = ?1', [ident])[0];
  if (!user) {
    return toast('No account found');
  }
  mkOtp(user);
  auth('verify');
}

function resend() {
  const user = q('SELECT * FROM users WHERE id = ?', [otp.id])[0];
  mkOtp(user);
  toast('New code generated');
  auth('verify');
}

function verify(e) {
  e.preventDefault();
  if (!otp || Date.now() > otp.exp) {
    otp = null;
    toast('Code expired - request a new one');
    return auth('code');
  }
  if ($('#oc').value.trim() !== otp.c) {
    otp.tries++;
    if (otp.tries >= 3) {
      otp = null;
      toast('Too many attempts - request a new code');
      return auth('code');
    }
    const left = 3 - otp.tries;
    return toast(`Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left`);
  }
  otp.ok = true;
  auth('reset');
}

async function setPw(e) {
  e.preventDefault();
  if (!otp || !otp.ok) {
    return auth('code');
  }
  run('UPDATE users SET password_hash = ? WHERE id = ?', [await sha($('#np').value), otp.id]);
  enter(q('SELECT * FROM users WHERE id = ?', [otp.id])[0]);
}

// Reviews carousel
function revs() {
  const list = q(`SELECT * FROM reviews WHERE ?1 = 'all' OR author_role = ?1 ORDER BY id DESC`, [rv]);

  $('#rf').innerHTML = [
    ['all', 'All'],
    ['seeker', 'Candidates'],
    ['employer', 'Employers']
  ].map(([k, label]) => `
    <button class="btn btn-sm ${k === rv ? 'btn-primary' : 'btn-outline-secondary'}" onclick="rv='${k}'; revs()">${label}</button>
  `).join('');

  if (list.length) {
    $('#rs').innerHTML = list.map((r, i) => `
      <div class="carousel-item ${i ? '' : 'active'}">
        <div class="text-center px-md-5 py-3">
          <div class="text-warning fs-5">${'&#9733;'.repeat(r.rating)}${'&#9734;'.repeat(5 - r.rating)}</div>
          <p class="fs-5 my-3">"${esc(r.body)}"</p>
          <div class="fw-semibold">${esc(r.author)}</div>
          <div class="small text-body-secondary">${r.author_role === 'seeker' ? 'Candidate' : 'Employer'}</div>
        </div>
      </div>
    `).join('');
  } else {
    $('#rs').innerHTML = '<p class="text-center text-body-secondary py-4">No reviews yet.</p>';
  }

  $('#ri').innerHTML = list.map((r, i) =>
    `<button type="button" data-bs-target="#rc" data-bs-slide-to="${i}" ${i ? '' : 'class="active"'}></button>`
  ).join('');

  if (me) {
    $('#rw').innerHTML = `
      <div class="card-body">
        <h6>Share your experience</h6>
        <div id="sp"></div>
        <form onsubmit="addRev(event)">
          ${area('rtx', '', '', 'required maxlength="240" placeholder="Write a short review"')}
          <button class="btn btn-primary btn-sm">Post review</button>
        </form>
      </div>
    `;
    stars();
  } else {
    $('#rw').innerHTML = `
      <div class="card-body text-body-secondary">
        <a href="#" onclick="auth('in'); return false">Sign in</a> to share your experience.
      </div>
    `;
  }
}

function stars() {
  $('#sp').innerHTML = [1, 2, 3, 4, 5].map(n => `
    <button type="button" class="star ${n <= rate ? 'on' : ''}" onclick="rate=${n}; stars()" aria-label="${n} stars">&#9733;</button>
  `).join('');
}

function addRev(e) {
  e.preventDefault();
  run(
    `INSERT INTO reviews (user_id, author, author_role, rating, body)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       author = excluded.author,
       rating = excluded.rating,
       body = excluded.body,
       created_at = CURRENT_TIMESTAMP`,
    [me.id, me.name, me.role, rate, $('#rtx').value.trim()]
  );
  rv = 'all';
  revs();
  toast('Thanks for your review');
}

// Dashboards
function renderDash() {
  const isSeeker = me.role === 'seeker';
  const tabs = isSeeker
    ? [['apps', 'My applications'], ['saved', 'Saved jobs'], ['set', 'Settings']]
    : [['apps', 'Applicants'], ['jobs', 'My jobs'], ['post', 'Post a job'], ['set', 'Settings']];

  if (!tabs.some(t => t[0] === tab)) {
    tab = 'apps';
  }

  const heading = isSeeker ? 'Hello, ' + esc(me.name.split(' ')[0]) : esc(me.company);
  $('#dash').innerHTML = `
    <div class="d-flex align-items-center gap-3 mb-3">
      ${avatar(me, 52)}
      <div>
        <h3 class="mb-0">${heading}</h3>
        <div class="text-body-secondary">${isSeeker ? 'Candidate' : 'Employer'} dashboard</div>
      </div>
    </div>
    <ul class="nav nav-pills mb-3">
      ${tabs.map(([k, label]) => `
        <li class="nav-item">
          <button class="nav-link ${k === tab ? 'active' : ''}" onclick="tab='${k}'; renderDash()">${label}</button>
        </li>
      `).join('')}
    </ul>
    <div id="pane"></div>
  `;

  const renderers = isSeeker
    ? { apps: seekApps, saved: savedList, set: settings }
    : { apps: empApps, jobs: empJobs, post: postForm, set: settings };

  $('#pane').innerHTML = renderers[tab]();
}

function thread(app) {
  const msgs = q('SELECT * FROM messages WHERE application_id = ? ORDER BY id', [app.id]);
  const items = msgs.map(m => {
    const isMine = m.sender_role === me.role;
    const sender = isMine ? 'You' : (m.sender_role === 'employer' ? 'Employer' : 'Candidate');
    const cls = isMine ? 'bg-primary text-white align-self-end' : 'bg-body-secondary align-self-start';
    return `
      <div class="px-3 py-2 rounded-4 small ${cls}" style="max-width: 85%">
        <div class="opacity-75" style="font-size: 11px">${sender} | ${fmt(m.sent_at)}</div>
        ${esc(m.body)}
      </div>
    `;
  }).join('');

  return `
    <div class="d-flex flex-column gap-1 my-2">${items}</div>
    <form class="input-group input-group-sm mb-2" onsubmit="sendMsg(event, ${app.id})">
      <input class="form-control" name="t" placeholder="Write a message" required>
      <button class="btn btn-outline-primary">Send</button>
    </form>
  `;
}

function files(app) {
  const withdrawBtn = me.role === 'seeker'
    ? `<button class="btn btn-sm btn-outline-danger ms-auto" onclick="withdraw(${app.id})">Withdraw</button>`
    : '';

  return `
    <div class="d-flex flex-wrap gap-2">
      <button class="btn btn-sm btn-outline-primary" onclick="dlCv(${app.id})">Download CV</button>
      <button class="btn btn-sm btn-outline-primary" onclick="dlCover(${app.id})">Download cover letter</button>
      ${withdrawBtn}
    </div>
  `;
}

function sendMsg(e, id) {
  e.preventDefault();
  const app = mine(id);
  if (!can(app)) return;
  run(
    'INSERT INTO messages (application_id, sender_role, body) VALUES (?, ?, ?)',
    [id, me.role, e.target.t.value.trim()]
  );
  renderDash();
}

function withdraw(id) {
  const app = mine(id);
  if (!app || app.user_id !== me.id) return;
  if (!confirm('Withdraw this application?')) return;
  run('DELETE FROM applications WHERE id = ?', [id]);
  renderDash();
}

function seekApps() {
  const counts = q(
    `SELECT COUNT(*) AS n,
            SUM(status = 'In review') AS r,
            SUM(status IN ('Shortlisted', 'Interview', 'Offered')) AS s
     FROM applications
     WHERE user_id = ?`,
    [me.id]
  )[0];

  const savedCount = q('SELECT COUNT(*) AS n FROM saved_jobs WHERE user_id = ?', [me.id])[0].n;

  const list = q(
    `SELECT a.*, j.title, u.company
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN users u ON u.id = j.employer_id
     WHERE a.user_id = ?
     ORDER BY a.id DESC`,
    [me.id]
  );

  const summary = stats([
    ['Applications', counts.n],
    ['In review', counts.r || 0],
    ['Shortlisted or later', counts.s || 0],
    ['Saved jobs', savedCount]
  ]);

  if (!list.length) {
    return summary + empty('No applications yet', 'Apply to a role and employer replies will appear here.');
  }

  const cards = list.map(a => {
    const idx = STAT.indexOf(a.status);
    const width = a.status === 'Rejected' ? 100 : (idx + 1) * 20;
    return `
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <h5 class="mb-0">${esc(a.title)}</h5>
              <div class="small text-body-secondary">
                ${esc(a.company)} | Applied ${fmt(a.applied_at)} | ${esc(a.experience)} | Expecting ${esc(a.expected_salary)}
              </div>
            </div>
            ${badge(a.status)}
          </div>
          <div class="progress my-3" style="height: 6px">
            <div class="progress-bar ${a.status === 'Rejected' ? 'bg-danger' : ''}" style="width: ${width}%"></div>
          </div>
          ${thread(a)}
          ${files(a)}
        </div>
      </div>
    `;
  }).join('');

  return summary + cards;
}

function savedList() {
  const list = q(
    `SELECT j.*, u.company
     FROM saved_jobs s
     JOIN jobs j ON j.id = s.job_id
     JOIN users u ON u.id = j.employer_id
     WHERE s.user_id = ?`,
    [me.id]
  );

  if (!list.length) {
    return empty('Nothing saved', 'Use Save on any role to keep it here.');
  }

  return list.map(j => `
    <div class="card mb-3">
      <div class="card-body d-flex gap-3 align-items-center flex-wrap">
        <div class="logo">${esc(j.company[0])}</div>
        <div class="flex-grow-1">
          <h5 class="mb-0">${esc(j.title)}</h5>
          <div class="small text-body-secondary">${esc(j.company)} | ${esc(j.location)} | Closes ${fmt(j.deadline)}</div>
        </div>
        <button class="btn btn-sm btn-outline-secondary" onclick="toggleSave(${j.id})">Remove</button>
        <button class="btn btn-sm btn-primary" onclick="viewJob(${j.id})">View details</button>
      </div>
    </div>
  `).join('');
}

function empApps() {
  const counts = q(
    `SELECT (SELECT COUNT(*) FROM jobs WHERE employer_id = ?1) AS jobs,
            COUNT(a.id) AS apps,
            SUM(a.status = 'Submitted') AS fresh,
            SUM(a.status IN ('Shortlisted', 'Interview', 'Offered')) AS sl
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE j.employer_id = ?1`,
    [me.id]
  )[0];

  const myJobs = q('SELECT id, title FROM jobs WHERE employer_id = ?', [me.id]);

  const list = q(
    `SELECT a.*, j.title, c.name, c.email, c.headline, c.skills, c.photo
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN users c ON c.id = a.user_id
     WHERE j.employer_id = ?1
       AND (?2 = '' OR j.id = ?2)
       AND (?3 = '' OR a.status = ?3)
     ORDER BY a.id DESC`,
    [me.id, fj, fs]
  );

  const summary = stats([
    ['Open jobs', counts.jobs],
    ['Applicants', counts.apps],
    ['New', counts.fresh || 0],
    ['Shortlisted or later', counts.sl || 0]
  ]);

  const filters = `
    <div class="row g-2 mb-3">
      <div class="col-sm-6">
        <select class="form-select" onchange="fj=this.value; renderDash()">
          <option value="">All jobs</option>
          ${myJobs.map(j => `<option value="${j.id}" ${String(j.id) === fj ? 'selected' : ''}>${esc(j.title)}</option>`).join('')}
        </select>
      </div>
      <div class="col-sm-6">
        <select class="form-select" onchange="fs=this.value; renderDash()">
          <option value="">All statuses</option>
          ${STAT.map(s => `<option ${s === fs ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>
  `;

  if (!list.length) {
    return summary + filters + empty('No applicants yet', 'Applications to your roles will appear here.');
  }

  const cards = list.map(a => {
    const portfolioLink = /^https?:\/\//.test(a.portfolio)
      ? `<a href="${esc(a.portfolio)}" target="_blank" rel="noopener">Open link</a>`
      : '-';

    return `
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">
            <div class="d-flex gap-3">
              ${avatar({ photo: a.photo, name: a.name }, 44)}
              <div>
                <h5 class="mb-0">${esc(a.name)}</h5>
                <div class="small text-body-secondary">
                  ${esc(a.email)}${a.phone ? ' | ' + esc(a.phone) : ''}${a.headline ? ' | ' + esc(a.headline) : ''}
                </div>
                <div class="small mt-1">Applied for <b>${esc(a.title)}</b> on ${fmt(a.applied_at)}</div>
              </div>
            </div>
            <select class="form-select form-select-sm w-auto" onchange="setStatus(${a.id}, this.value)">
              ${STAT.map(s => `<option ${s === a.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>

          <div class="row small my-2 g-2">
            <div class="col-sm-4">
              <span class="text-body-secondary">Experience</span><br>${esc(a.experience)}
            </div>
            <div class="col-sm-4">
              <span class="text-body-secondary">Expected salary</span><br>${esc(a.expected_salary)}
            </div>
            <div class="col-sm-4">
              <span class="text-body-secondary">Portfolio</span><br>${portfolioLink}
            </div>
          </div>

          ${a.skills ? `<div class="small mb-2"><span class="text-body-secondary">Skills:</span> ${esc(a.skills)}</div>` : ''}

          <details class="small mb-2">
            <summary class="text-primary" style="cursor: pointer">Cover letter</summary>
            <p class="mt-2" style="white-space: pre-wrap">${esc(a.cover_letter)}</p>
          </details>

          ${thread(a)}
          ${files(a)}
        </div>
      </div>
    `;
  }).join('');

  return summary + filters + cards;
}

function setStatus(id, val) {
  const app = mine(id);
  if (!app || !me || app.employer_id !== me.id || !STAT.includes(val)) return;
  run('UPDATE applications SET status = ? WHERE id = ?', [val, id]);
  renderDash();
  toast('Status updated');
}

function empJobs() {
  const list = q(
    'SELECT j.*, (SELECT COUNT(*) FROM applications WHERE job_id = j.id) AS n FROM jobs j WHERE employer_id = ? ORDER BY id DESC',
    [me.id]
  );

  if (!list.length) {
    return empty('No jobs posted', 'Use "Post a job" to publish your first role.');
  }

  return list.map(j => `
    <div class="card mb-3">
      <div class="card-body d-flex gap-3 align-items-center flex-wrap">
        <div class="flex-grow-1">
          <h5 class="mb-0">${esc(j.title)}</h5>
          <div class="small text-body-secondary">
            ${esc(j.location)} | ${esc(j.job_type)} | ${esc(j.level)} | Closes ${fmt(j.deadline)} | ${j.n} applicant${j.n === 1 ? '' : 's'}
          </div>
        </div>
        <button class="btn btn-sm btn-outline-primary" onclick="viewJob(${j.id})">Preview</button>
        <button class="btn btn-sm btn-outline-danger" onclick="delJob(${j.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

function delJob(id) {
  const j = q('SELECT * FROM jobs WHERE id = ?', [id])[0];
  if (!j || j.employer_id !== me.id) return;
  if (!confirm('Delete this job and its applications?')) return;
  run('DELETE FROM jobs WHERE id = ?', [id]);
  renderDash();
}

function postForm() {
  return `
    <form class="card" onsubmit="postJob(event)">
      <div class="card-body">
        <div class="row">
          <div class="col-md-8">${fld('pj_t', 'Job title', 'text', 'required')}</div>
          <div class="col-md-4">${fld('pj_s', 'Salary', 'text', 'required placeholder="EUR 3,600-4,800 / mo"')}</div>
          <div class="col-md-3">${sel('pj_c', 'Category', CATS)}</div>
          <div class="col-md-3">${sel('pj_l', 'Location', LOCS)}</div>
          <div class="col-md-3">${sel('pj_y', 'Type', TYPES)}</div>
          <div class="col-md-3">${sel('pj_v', 'Level', LVLS)}</div>
          <div class="col-md-4">${fld('pj_n', 'Vacancies', 'number', 'min="1" value="1"')}</div>
          <div class="col-md-4">${fld('pj_d', 'Application deadline', 'date', 'required')}</div>
          <div class="col-md-4">${fld('pj_k', 'Skills (comma separated)', 'text', 'required')}</div>
        </div>
        ${area('pj_x', 'About the role', '', 'required')}
        ${area('pj_r', 'Responsibilities (one per line)', '', 'required')}
        ${area('pj_q', 'Requirements (one per line)', '', 'required')}
        <button class="btn btn-primary">Publish job</button>
      </div>
    </form>
  `;
}

function postJob(e) {
  e.preventDefault();
  if (me.role !== 'employer') return;

  run(
    `INSERT INTO jobs (
      employer_id, title, category, location, job_type, level, salary,
      skills, vacancies, deadline, description, responsibilities, requirements
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      me.id,
      $('#pj_t').value.trim(),
      $('#pj_c').value,
      $('#pj_l').value,
      $('#pj_y').value,
      $('#pj_v').value,
      $('#pj_s').value.trim(),
      $('#pj_k').value.trim(),
      +$('#pj_n').value || 1,
      $('#pj_d').value,
      $('#pj_x').value.trim(),
      ln($('#pj_r').value),
      ln($('#pj_q').value)
    ]
  );

  tab = 'jobs';
  renderDash();
  toast('Job published');
}

// Profile, photo and theme settings
function settings() {
  const theme = localStorage.getItem('easyjob_theme') || 'auto';
  const fieldsHtml = PF[me.role].map(([name, label, type]) =>
    type === 'area'
      ? area('p_' + name, label, me[name])
      : fld('p_' + name, label, type || 'text', '', me[name])
  ).join('');

  return `
    <div class="row g-3">
      <div class="col-lg-4">
        <div class="card mb-3">
          <div class="card-body text-center">
            <div class="mb-3">${avatar(me, 96)}</div>
            <h6 class="mb-0">${esc(me.name)}</h6>
            <div class="small text-body-secondary mb-3">${esc(me.email)}</div>
            <input id="ph" type="file" accept="image/*" class="d-none" onchange="setPhoto(this)">
            <div class="d-flex gap-2 justify-content-center">
              <button class="btn btn-sm btn-primary" onclick="$('#ph').click()">${me.photo ? 'Change photo' : 'Upload photo'}</button>
              ${me.photo ? '<button class="btn btn-sm btn-outline-secondary" onclick="rmPhoto()">Remove</button>' : ''}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-body">
            <h6>Appearance</h6>
            <div class="btn-group w-100">
              ${[['light', 'Light'], ['dark', 'Dark'], ['auto', 'System']].map(([k, label]) => `
                <button class="btn btn-sm ${k === theme ? 'btn-primary' : 'btn-outline-secondary'}" onclick="setTheme('${k}')">${label}</button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-8">
        <form class="card" onsubmit="saveProf(event)">
          <div class="card-body">
            <h6 class="mb-3">${me.role === 'seeker' ? 'Profile' : 'Company profile'}</h6>
            ${fld('pe', 'Email', 'email', 'disabled', me.email)}
            ${fieldsHtml}
            <button class="btn btn-primary">Save changes</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function setPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    return toast('Please choose an image');
  }

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const side = Math.min(img.width, img.height);
      canvas.width = 256;
      canvas.height = 256;
      canvas.getContext('2d').drawImage(
        img,
        (img.width - side) / 2,
        (img.height - side) / 2,
        side,
        side,
        0,
        0,
        256,
        256
      );
      savePhoto(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => toast('Could not read that image');
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function savePhoto(dataUrl) {
  run('UPDATE users SET photo = ? WHERE id = ?', [dataUrl, me.id]);
  me = q('SELECT * FROM users WHERE id = ?', [me.id])[0];
  nav();
  renderDash();
  toast(dataUrl ? 'Photo updated' : 'Photo removed');
}

const rmPhoto = () => savePhoto(null);

function applyTheme() {
  const theme = localStorage.getItem('easyjob_theme') || 'auto';
  document.documentElement.dataset.bsTheme =
    theme === 'auto'
      ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
}

function setTheme(theme) {
  localStorage.setItem('easyjob_theme', theme);
  applyTheme();
  renderDash();
}

function saveProf(e) {
  e.preventDefault();
  const fields = PF[me.role];
  const assignments = fields.map(f => f[0] + ' = ?').join(', ');
  const values = fields.map(f => $('#p_' + f[0]).value.trim());
  run(`UPDATE users SET ${assignments} WHERE id = ?`, [...values, me.id]);
  me = q('SELECT * FROM users WHERE id = ?', [me.id])[0];
  run('UPDATE reviews SET author = ? WHERE user_id = ?', [me.name, me.id]);
  nav();
  renderDash();
  toast('Profile saved');
}

// Downloads
function dlFile(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1500);
}

function dlCv(id) {
  const app = mine(id);
  if (!can(app)) return;
  if (!app.cv_data) {
    return toast('No CV file stored for this application');
  }
  const [header, body] = app.cv_data.split(',');
  const raw = atob(body);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  const mime = header.slice(5).split(';')[0];
  dlFile(new Blob([bytes], { type: mime }), app.cv_name);
}

function dlCover(id) {
  const app = mine(id);
  if (!can(app)) return;
  const candidate = q('SELECT name FROM users WHERE id = ?', [app.user_id])[0].name;
  const filename = 'Cover_letter_' + candidate.replace(/\W+/g, '_') + '.txt';
  dlFile(new Blob([app.cover_letter], { type: 'text/plain' }), filename);
}

// App boot
(async () => {
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  [
    ['#fc', CATS, 'All categories'],
    ['#fl', LOCS, 'All locations'],
    ['#ft', TYPES, 'All types'],
    ['#fv', LVLS, 'All levels']
  ].forEach(([selector, list, allLabel]) => {
    $(selector).innerHTML = opts(list, allLabel);
  });

  try {
    await openDb();
  } catch (err) {
    $('#jl').innerHTML =
      '<div class="alert alert-danger">Could not load the SQL engine. Check your internet connection and reload.</div>';
    return;
  }

  const savedId = localStorage.getItem('easyjob_sess');
  me = savedId ? (q('SELECT * FROM users WHERE id = ?', [savedId])[0] || null) : null;
  home();
})();
