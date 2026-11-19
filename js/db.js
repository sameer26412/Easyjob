// In-browser SQLite setup using sql.js and localStorage persistence
let db;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK (role IN ('seeker', 'employer')),
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  headline TEXT,
  skills TEXT,
  bio TEXT,
  company TEXT,
  website TEXT,
  about TEXT,
  photo TEXT
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  job_type TEXT NOT NULL,
  level TEXT NOT NULL,
  salary TEXT,
  skills TEXT,
  vacancies INTEGER DEFAULT 1,
  deadline TEXT,
  description TEXT,
  responsibilities TEXT,
  requirements TEXT,
  posted_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT,
  portfolio TEXT,
  experience TEXT,
  expected_salary TEXT,
  cover_letter TEXT NOT NULL,
  cv_name TEXT,
  cv_data TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted',
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (job_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_jobs (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, job_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  author_role TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

async function sha(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function q(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function run(sql, params = []) {
  db.run(sql, params);
  persist();
}

function persist() {
  try {
    const data = db.export();
    // sql.js resets PRAGMA flags on export(), so turn foreign keys back on
    db.run('PRAGMA foreign_keys = ON');
    let bin = '';
    for (let i = 0; i < data.length; i += 8192) {
      bin += String.fromCharCode.apply(null, data.subarray(i, i + 8192));
    }
    localStorage.setItem('easyjob_db', btoa(bin));
  } catch (err) {
    toast('Browser storage is full - try a smaller CV file');
  }
}

async function openDb() {
  const SQL = await initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
  });

  const saved = localStorage.getItem('easyjob_db');
  const bytes = saved ? Uint8Array.from(atob(saved), c => c.charCodeAt(0)) : undefined;
  db = new SQL.Database(bytes);

  db.run('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);

  const cols = q('PRAGMA table_info(users)');
  if (!cols.some(c => c.name === 'photo')) {
    db.run('ALTER TABLE users ADD COLUMN photo TEXT');
  }

  if (!q('SELECT 1 FROM users LIMIT 1').length) {
    await seed();
  }

  persist();
}

async function seed() {
  const seekerPass = await sha('sam123');
  const employerPass = await sha('admin123');

  const insertUser = `
    INSERT INTO users (
      role, name, username, email, password_hash, phone, city,
      headline, skills, bio, company, website, about
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(insertUser, [
    'seeker', 'Sameer Ghanate', 'sameer', 'sameer@example.com', seekerPass, '', 'Hubballi',
    'BCA graduate - Web & SQL', 'HTML, CSS, JavaScript, Bootstrap, SQL',
    'BCA graduate focused on web development and relational databases.',
    null, null, null
  ]);

  db.run(insertUser, [
    'employer', 'Stefan Becker', 'employer', 'hr@nordwerk.example', employerPass, '', 'Munich',
    null, null, null,
    'NordWerk Systems', 'https://nordwerk.example',
    'Software engineering team building web platforms and internal tools for European clients.'
  ]);

  db.run(insertUser, [
    'employer', 'Ananya Rao', 'employer2', 'hr@kaveridata.example', employerPass, '', 'Bengaluru',
    null, null, null,
    'Kaveri Data Labs', 'https://kaveridata.example',
    'Database engineering and reporting services for mid-sized businesses.'
  ]);

  const sampleJobs = [
    [
      2, 'Full-Stack Web Developer', 'Software Development', 'Germany', 'Full-time', 'Junior',
      'EUR 3,800-4,800 / mo', 'HTML, CSS, JavaScript, Bootstrap, SQL', 3, '2027-03-31',
      'Work with our Munich engineering team to build and maintain client web applications from frontend layouts to SQL schemas.',
      'Build responsive pages with HTML, CSS, JavaScript and Bootstrap|Write and tune SQL tables and queries|Participate in code reviews and sprint planning',
      'BCA, B.Sc. CS or related degree|Practical experience with JavaScript and SQL|Clear written and spoken English'
    ],
    [
      2, 'IT Project Coordinator', 'Project Management', 'Germany', 'Part-time', 'Fresher',
      'EUR 2,200-2,900 / mo', 'Documentation, Agile, Communication', 2, '2027-04-20',
      'Assist delivery teams with sprint tracking, release notes, and manual QA checks.',
      'Keep roadmaps, release notes and flow diagrams updated|Coordinate sprint updates with engineers|Log and verify bug fixes during QA',
      'Background in computer applications or IT|Good organization habits|Comfortable working in English'
    ],
    [
      2, 'UI/UX Designer', 'Design & UI/UX', 'South Korea', 'Full-time', 'Mid-level',
      '$3,800-4,900 / mo', 'Figma, Bootstrap, Prototyping', 2, '2027-03-20',
      'Design clean, mobile-first layouts and clickable prototypes for web portals in our Seoul office.',
      'Convert product requirements into wireframes and UI screens|Coordinate with frontend developers during HTML/CSS handoff|Run quick usability sessions and refine flows',
      'Portfolio of responsive web interfaces|Good grasp of grid layouts and accessibility|2+ years of UI/UX experience'
    ],
    [
      3, 'SQL & Data Analyst', 'Data & SQL', 'India', 'Full-time', 'Junior',
      'INR 50,000-80,000 / mo', 'SQL, Excel, Power BI', 5, '2027-04-10',
      'Write relational queries, prepare weekly KPI views, and check data quality across client reporting tables.',
      'Write SQL joins, aggregations and cleanup scripts|Maintain weekly operational reports|Work with developers on schema updates',
      'BCA, B.Sc. or equivalent with solid SQL skills|Attention to data accuracy|Basic spreadsheet or BI experience'
    ],
    [
      3, 'Technical Recruiter', 'Human Resources', 'India', 'Part-time', 'Fresher',
      'INR 25,000-40,000 / mo', 'Screening, Communication, ATS', 2, '2027-05-05',
      'Screen candidate applications, coordinate technical interviews, and keep application statuses updated.',
      'Review incoming resumes and shortlist candidates|Schedule interview slots with hiring managers|Reply to applicant questions promptly',
      'Clear written communication|Interest in tech hiring|Any graduate degree'
    ],
    [
      3, 'Digital Marketing Intern', 'Marketing', 'United States', 'Internship', 'Fresher',
      '$1,800-2,400 / mo', 'SEO, Analytics, Content', 3, '2027-02-28',
      'Support search optimization, content updates, and campaign tracking across web channels.',
      'Draft landing page and social copy|Check weekly traffic metrics in analytics tools|Research keywords and competitor pages',
      'Pursuing or completed an IT, marketing or business degree|Basic analytical mindset|Clear writing skills'
    ]
  ];

  const insertJob = `
    INSERT INTO jobs (
      employer_id, title, category, location, job_type, level, salary,
      skills, vacancies, deadline, description, responsibilities, requirements
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  sampleJobs.forEach(job => db.run(insertJob, job));

  db.run(
    `INSERT INTO applications (
      job_id, user_id, phone, portfolio, experience, expected_salary, cover_letter, cv_name, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      1, 1, '', '', 'Fresher', 'EUR 3,800 / mo',
      'I completed my BCA with a web portal project built using HTML, CSS, JavaScript, Bootstrap and SQL, and I would like to contribute as a junior developer.',
      'Sameer_CV.pdf', 'Interview'
    ]
  );

  db.run(
    `INSERT INTO messages (application_id, sender_role, body) VALUES
      (1, 'employer', 'Hi Sameer, we reviewed your profile and would like to schedule a technical interview on Friday at 11:00 CET.'),
      (1, 'seeker', 'Thank you, Friday at 11:00 CET works for me.')`
  );

  const sampleReviews = [
    ['Stefan Becker', 'employer', 5, 'Checking CVs, updating status, and messaging applicants all on one page saves a lot of back-and-forth.'],
    ['Rohan Patil', 'seeker', 5, 'Simple search filters and easy to follow where my application stands.'],
    ['Ananya Rao', 'employer', 4, 'Clean dashboard layout. Filtering applicants by job and stage works well.'],
    ['Neha Verma', 'seeker', 5, 'Nice to have direct replies from the employer inside the same application card.']
  ];
  sampleReviews.forEach(rev => {
    db.run('INSERT INTO reviews (author, author_role, rating, body) VALUES (?, ?, ?, ?)', rev);
  });
}
