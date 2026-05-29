/**
 * Populates the database with realistic demo data for all four roles.
 * Safe to run multiple times — aborts if non-admin users already exist.
 * Use --force to wipe and re-seed.
 *
 *   node scripts/demoSeed.js
 *   node scripts/demoSeed.js --force
 *
 * All demo accounts share password: Demo@1234
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const User           = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const TeacherProfile = require('../models/TeacherProfile');
const Classroom      = require('../models/Classroom');
const Batch          = require('../models/Batch');
const FeeRecord      = require('../models/FeeRecord');
const AttendanceRecord = require('../models/AttendanceRecord');
const PricingRule    = require('../models/PricingRule');
const PaymentLedger  = require('../models/PaymentLedger');
const Test           = require('../models/Test');
const TestResult     = require('../models/TestResult');
const StudyMaterial  = require('../models/StudyMaterial');
const { buildPayoutLines } = require('../utils/payoutCalculator');

// ─── Date helpers ─────────────────────────────────────────────────────────────

const today = new Date();
today.setHours(0, 0, 0, 0);

const addDays   = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const daysAgo   = (n) => addDays(today, -n);
const daysAhead = (n) => addDays(today, +n);

/** Returns {month, year} for `offset` months from current month */
function monthOffset(offset) {
  let m = today.getMonth() + 1 + offset; // 1-12
  let y = today.getFullYear();
  while (m <= 0) { m += 12; y--; }
  while (m > 12)  { m -= 12; y++; }
  return { month: m, year: y };
}

/** All dates matching scheduleDays in the past `weeksBack` weeks (up to yesterday) */
const DAY_NUM = { Monday:1, Tuesday:2, Wednesday:3, Thursday:4, Friday:5, Saturday:6, Sunday:0 };

function lectureDates(scheduleDays, weeksBack = 10) {
  const dates = [];
  const start = daysAgo(weeksBack * 7);
  const end   = daysAgo(1);
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    if (scheduleDays.some(day => DAY_NUM[day] === d.getDay())) {
      dates.push(new Date(d));
    }
  }
  return dates;
}

// ─── Random helpers ───────────────────────────────────────────────────────────

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function attendanceStatus(presentRate = 0.82) {
  const r = Math.random();
  return r < presentRate ? 'present' : r < presentRate + 0.06 ? 'late' : 'absent';
}

let seq = 1001;
const nextReceipt = () => `RCP-DEMO-${String(seq++).padStart(4, '0')}`;

// ─── Wipe previous demo data ──────────────────────────────────────────────────

async function clearDemo() {
  process.stdout.write('Clearing previous demo data… ');
  const ids = (await User.find({ role: { $ne: 'admin' } }).select('_id')).map(u => u._id);
  await Promise.all([
    User.deleteMany({ _id: { $in: ids } }),
    StudentProfile.deleteMany({}),  TeacherProfile.deleteMany({}),
    Classroom.deleteMany({}),        Batch.deleteMany({}),
    FeeRecord.deleteMany({}),        AttendanceRecord.deleteMany({}),
    PricingRule.deleteMany({}),      PaymentLedger.deleteMany({}),
    Test.deleteMany({}),             TestResult.deleteMany({}),
    StudyMaterial.deleteMany({}),
  ]);
  console.log('done.\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  const existing = await User.countDocuments({ role: { $ne: 'admin' } });
  if (existing > 0) {
    if (!process.argv.includes('--force')) {
      console.log(`⚠  Demo data already exists (${existing} non-admin users found).`);
      console.log('   Run with --force to wipe and re-seed.\n');
      return process.exit(0);
    }
    await clearDemo();
  }

  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.error('No admin found. Run `npm run seed` first, then re-run this script.');
    return process.exit(1);
  }

  // ── 1. Receptionist ──────────────────────────────────────────────────────────
  await User.create({
    name: 'Kavita Desai', email: 'receptionist@demo.com',
    passwordHash: 'Demo@1234', role: 'receptionist', phone: '9876500001',
  });
  console.log('✓  1 receptionist');

  // ── 2. Teachers ───────────────────────────────────────────────────────────────
  const teacherDefs = [
    { name: 'Priya Sharma',  email: 'priya@demo.com',  subjects: ['Physics'],    qualifications: ['M.Sc Physics', 'B.Ed'],    upi: 'priya@upi' },
    { name: 'Rahul Verma',   email: 'rahul@demo.com',   subjects: ['Maths'],      qualifications: ['M.Sc Mathematics', 'B.Ed'], upi: 'rahul@upi' },
    { name: 'Sneha Patil',   email: 'sneha@demo.com',   subjects: ['Chemistry'],  qualifications: ['M.Sc Chemistry'],          upi: 'sneha@upi' },
  ];

  const teachers = [];
  for (const [i, td] of teacherDefs.entries()) {
    const u  = await User.create({ name: td.name, email: td.email, passwordHash: 'Demo@1234', role: 'teacher', phone: `9800100${String(i + 1).padStart(2,'0')}` });
    const tp = await TeacherProfile.create({
      user: u._id, subjects: td.subjects, qualifications: td.qualifications,
      bankDetails: { accountHolder: td.name, upiId: td.upi },
    });
    teachers.push({ u, tp });
  }
  const [priya, rahul, sneha] = teachers;
  console.log(`✓  ${teachers.length} teachers`);

  // ── 3. Classrooms ─────────────────────────────────────────────────────────────
  const classrooms = await Classroom.insertMany([
    { name: 'Room 101', capacity: 30, facilities: ['Whiteboard', 'Projector', 'AC'] },
    { name: 'Room 102', capacity: 25, facilities: ['Whiteboard', 'AC'] },
    { name: 'Room 103', capacity: 20, facilities: ['Whiteboard', 'Lab Equipment'] },
  ]);
  console.log(`✓  ${classrooms.length} classrooms`);

  // ── 4. Students ───────────────────────────────────────────────────────────────
  const studentDefs = [
    // 11th — 4 students
    { name: 'Amit Kulkarni', email: 'amit@demo.com',   cl: '11th', en: 'STU001', parent: 'Suresh Kulkarni',  pp: '9800000001' },
    { name: 'Neha Joshi',    email: 'neha@demo.com',   cl: '11th', en: 'STU002', parent: 'Vinod Joshi',      pp: '9800000002' },
    { name: 'Rohan Mehta',   email: 'rohan@demo.com',  cl: '11th', en: 'STU003', parent: 'Ajay Mehta',       pp: '9800000003' },
    { name: 'Karan Shah',    email: 'karan@demo.com',  cl: '11th', en: 'STU004', parent: 'Nilesh Shah',      pp: '9800000004' },
    // 12th — 4 students
    { name: 'Pooja Singh',   email: 'pooja@demo.com',  cl: '12th', en: 'STU005', parent: 'Ramesh Singh',     pp: '9800000005' },
    { name: 'Vikram Desai',  email: 'vikram@demo.com', cl: '12th', en: 'STU006', parent: 'Kishore Desai',    pp: '9800000006' },
    { name: 'Anjali Rao',    email: 'anjali@demo.com', cl: '12th', en: 'STU007', parent: 'Madhav Rao',       pp: '9800000007' },
    { name: 'Meera Pillai',  email: 'meera@demo.com',  cl: '12th', en: 'STU008', parent: 'Krishnan Pillai',  pp: '9800000008' },
    // CET — 2 students
    { name: 'Suresh Kumar',  email: 'suresh@demo.com', cl: 'CET',  en: 'STU009', parent: 'Mohan Kumar',      pp: '9800000009' },
    { name: 'Divya Nair',    email: 'divya@demo.com',  cl: 'CET',  en: 'STU010', parent: 'Gopalan Nair',     pp: '9800000010' },
  ];

  const students = [];
  for (const sd of studentDefs) {
    const u  = await User.create({ name: sd.name, email: sd.email, passwordHash: 'Demo@1234', role: 'student', phone: sd.pp });
    const sp = await StudentProfile.create({
      user: u._id, enrollmentNumber: sd.en, classLevel: sd.cl,
      parentName: sd.parent, parentPhone: sd.pp, joinedAt: daysAgo(100),
    });
    students.push({ u, sp, cl: sd.cl });
  }
  const s11  = students.filter(s => s.cl === '11th').map(s => s.sp._id);
  const s12  = students.filter(s => s.cl === '12th').map(s => s.sp._id);
  const sCET = students.filter(s => s.cl === 'CET' ).map(s => s.sp._id);
  console.log(`✓  ${students.length} students`);

  // ── 5. Pricing rules ─────────────────────────────────────────────────────────
  await PricingRule.insertMany([
    { classLevel: '11th', subject: 'Physics',   ratePerLecture: 400, effectiveFrom: daysAgo(180), effectiveTo: null, createdBy: admin._id },
    { classLevel: '11th', subject: 'Maths',     ratePerLecture: 400, effectiveFrom: daysAgo(180), effectiveTo: null, createdBy: admin._id },
    { classLevel: '12th', subject: 'Physics',   ratePerLecture: 500, effectiveFrom: daysAgo(180), effectiveTo: null, createdBy: admin._id },
    { classLevel: '12th', subject: 'Chemistry', ratePerLecture: 500, effectiveFrom: daysAgo(180), effectiveTo: null, createdBy: admin._id },
    { classLevel: 'CET',  subject: 'Maths',     ratePerLecture: 600, effectiveFrom: daysAgo(180), effectiveTo: null, createdBy: admin._id },
  ]);
  console.log('✓  5 pricing rules');

  // ── 6. Batches ────────────────────────────────────────────────────────────────
  const batchDefs = [
    // idx 0
    { name: '11th Physics (Morning)', cl: '11th', sub: 'Physics',   teacher: priya, room: classrooms[0], sps: s11,
      schedule: [{day:'Monday',startTime:'07:00',endTime:'08:00'},{day:'Wednesday',startTime:'07:00',endTime:'08:00'},{day:'Friday',startTime:'07:00',endTime:'08:00'}],
      fee: 2000 },
    // idx 1
    { name: '11th Maths (Morning)',   cl: '11th', sub: 'Maths',     teacher: rahul, room: classrooms[1], sps: s11,
      schedule: [{day:'Monday',startTime:'08:00',endTime:'09:00'},{day:'Wednesday',startTime:'08:00',endTime:'09:00'},{day:'Friday',startTime:'08:00',endTime:'09:00'}],
      fee: 2000 },
    // idx 2
    { name: '12th Physics (Morning)', cl: '12th', sub: 'Physics',   teacher: priya, room: classrooms[0], sps: s12,
      schedule: [{day:'Tuesday',startTime:'07:00',endTime:'08:00'},{day:'Thursday',startTime:'07:00',endTime:'08:00'},{day:'Saturday',startTime:'07:00',endTime:'08:00'}],
      fee: 2500 },
    // idx 3
    { name: '12th Chemistry',         cl: '12th', sub: 'Chemistry', teacher: sneha, room: classrooms[2], sps: s12,
      schedule: [{day:'Tuesday',startTime:'08:00',endTime:'09:30'},{day:'Thursday',startTime:'08:00',endTime:'09:30'},{day:'Saturday',startTime:'08:00',endTime:'09:30'}],
      fee: 2500 },
    // idx 4
    { name: 'CET Maths (Evening)',    cl: 'CET',  sub: 'Maths',     teacher: rahul, room: classrooms[1], sps: sCET,
      schedule: [{day:'Monday',startTime:'17:00',endTime:'19:00'},{day:'Tuesday',startTime:'17:00',endTime:'19:00'},{day:'Thursday',startTime:'17:00',endTime:'19:00'}],
      fee: 3000 },
  ];

  const batches = [];
  for (const bd of batchDefs) {
    const batch = await Batch.create({
      name: bd.name, classLevel: bd.cl, subject: bd.sub,
      assignedTeacher: bd.teacher.tp._id, classroom: bd.room._id,
      students: bd.sps, schedule: bd.schedule,
    });
    await TeacherProfile.findByIdAndUpdate(bd.teacher.tp._id, { $addToSet: { assignedBatches: batch._id } });
    await StudentProfile.updateMany({ _id: { $in: bd.sps } }, { $addToSet: { batches: batch._id } });
    batches.push({ ...bd, _id: batch._id });
  }
  console.log(`✓  ${batches.length} batches`);

  // ── 7. Attendance records ─────────────────────────────────────────────────────
  let attCount = 0;
  for (const bd of batches) {
    const dates = lectureDates(bd.schedule.map(s => s.day), 10);
    for (const date of dates) {
      await AttendanceRecord.create({
        batch:   bd._id,
        teacher: bd.teacher.tp._id,
        date,
        students: bd.sps.map(id => ({ student: id, status: attendanceStatus() })),
        markedBy: bd.teacher.tp._id,
        markedAt: date,
      });
      attCount++;
    }
  }
  console.log(`✓  ${attCount} attendance records`);

  // ── 8. Fee records (4 months: -3 to 0, varied statuses) ──────────────────────
  const paidMethods   = ['cash', 'upi', 'bank_transfer'];
  const pastStatuses  = ['paid', 'paid', 'paid', 'partial', 'overdue']; // weighted toward paid
  let feeCount = 0;

  for (const bd of batches) {
    for (const studentId of bd.sps) {
      for (const mo of [-3, -2, -1, 0]) {
        const { month, year } = monthOffset(mo);
        const dueDate   = new Date(year, month - 1, 10);
        const isCurrent = mo === 0;
        const status    = isCurrent ? 'pending' : pick(pastStatuses);
        const isPaid    = status === 'paid';
        const isPartial = status === 'partial';
        const amountPaid = isPaid ? bd.fee : isPartial ? Math.floor(bd.fee / 2) : 0;

        const feeDoc = {
          student: studentId, batch: bd._id,
          amount: bd.fee, amountPaid, dueDate,
          status, forMonth: month, forYear: year,
        };
        if (isPaid || isPartial) {
          feeDoc.paidDate      = addDays(dueDate, Math.floor(Math.random() * 6));
          feeDoc.paymentMethod = pick(paidMethods);
          feeDoc.collectedBy   = admin._id;
        }
        if (isPaid) {
          feeDoc.receiptNumber = nextReceipt();
        }
        await FeeRecord.create(feeDoc);
        feeCount++;
      }
    }
  }
  console.log(`✓  ${feeCount} fee records`);

  // ── 9. Tests & results ────────────────────────────────────────────────────────
  const testDefs = [
    // Past (with results)
    { bi:0, title:'Unit Test 1 — Kinematics',        sub:'Physics',   date: daysAgo(45), marks:40, pass:16 },
    { bi:0, title:'Unit Test 2 — Laws of Motion',    sub:'Physics',   date: daysAgo(20), marks:40, pass:16 },
    { bi:1, title:'Unit Test 1 — Algebra',           sub:'Maths',     date: daysAgo(42), marks:50, pass:20 },
    { bi:1, title:'Unit Test 2 — Trigonometry',      sub:'Maths',     date: daysAgo(18), marks:50, pass:20 },
    { bi:2, title:'Unit Test 1 — Electrostatics',    sub:'Physics',   date: daysAgo(40), marks:40, pass:16 },
    { bi:3, title:'Unit Test 1 — Atomic Structure',  sub:'Chemistry', date: daysAgo(38), marks:40, pass:16 },
    { bi:4, title:'Practice Test 1 — Geometry',      sub:'Maths',     date: daysAgo(22), marks:60, pass:24 },
    // Upcoming (no results)
    { bi:0, title:'Mid-Term — Mechanics',            sub:'Physics',   date: daysAhead(5),  marks:80,  pass:32 },
    { bi:1, title:'Mid-Term — Calculus',             sub:'Maths',     date: daysAhead(7),  marks:100, pass:40 },
    { bi:2, title:'Mid-Term — Electrostatics',       sub:'Physics',   date: daysAhead(4),  marks:80,  pass:32 },
    { bi:3, title:'Half-Yearly — Organic Chemistry', sub:'Chemistry', date: daysAhead(10), marks:80,  pass:32 },
    { bi:4, title:'Practice Test 2 — Calculus',      sub:'Maths',     date: daysAhead(3),  marks:60,  pass:24 },
  ];

  let testCount = 0, resultCount = 0;
  for (const td of testDefs) {
    const bd   = batches[td.bi];
    const test = await Test.create({
      title: td.title, batch: bd._id, subject: td.sub,
      scheduledDate: td.date, totalMarks: td.marks,
      passingMarks: td.pass, duration: 60,
      createdBy: admin._id, isPublished: true,
    });
    testCount++;

    if (td.date < today) {
      // Realistic score distribution: mostly 60-90%, some toppers, a few struggling
      const scoreProfiles = [0.92, 0.85, 0.78, 0.71, 0.88, 0.65, 0.56, 0.93];
      for (const [i, studentId] of bd.sps.entries()) {
        const base  = scoreProfiles[i % scoreProfiles.length] + (Math.random() * 0.06 - 0.03);
        const marks = Math.min(td.marks, Math.round(base * td.marks));
        const pct   = (marks / td.marks) * 100;
        const grade = pct >= 90 ? 'A+' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 45 ? 'C' : 'D';
        await TestResult.create({
          test: test._id, student: studentId,
          marksObtained: marks, grade, percentile: Math.round(pct),
          enteredBy: admin._id,
        });
        resultCount++;
      }
    }
  }
  console.log(`✓  ${testCount} tests, ${resultCount} results`);

  // ── 10. Study materials ───────────────────────────────────────────────────────
  const matDefs = [
    { bi:0, title:'Kinematics Formula Sheet',          type:'pdf',   sub:'Physics',   t: priya },
    { bi:0, title:"Newton's Laws Practice Set",        type:'pdf',   sub:'Physics',   t: priya },
    { bi:1, title:'Algebra Notes — Chapters 1–3',      type:'pdf',   sub:'Maths',     t: rahul },
    { bi:1, title:'Trigonometry Identities Reference', type:'image', sub:'Maths',     t: rahul },
    { bi:2, title:'Electrostatics Summary Sheet',      type:'pdf',   sub:'Physics',   t: priya },
    { bi:3, title:'Atomic Structure Mind Map',         type:'image', sub:'Chemistry', t: sneha },
    { bi:3, title:'Periodic Table Reference Card',     type:'pdf',   sub:'Chemistry', t: sneha },
    { bi:4, title:'CET Previous Papers 2023',          type:'pdf',   sub:'Maths',     t: rahul },
    { bi:4, title:'CET Important Formulae',            type:'pdf',   sub:'Maths',     t: rahul },
  ];

  for (const md of matDefs) {
    const ext = md.type === 'image' ? 'jpg' : 'pdf';
    await StudyMaterial.create({
      title: md.title, batch: batches[md.bi]._id, subject: md.sub,
      fileType: md.type,
      fileUrl:  `/uploads/demo-placeholder.${ext}`,
      fileName: md.title.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/ /g, '_') + `.${ext}`,
      fileSizeBytes: 102400 + Math.floor(Math.random() * 614400),
      uploadedBy: md.t.u._id, isCacheable: true,
    });
  }
  console.log(`✓  ${matDefs.length} study materials`);

  // ── 11. Payment ledgers (past 3 months, fully paid) ───────────────────────────
  let ledgerCount = 0;
  for (const teacher of [priya, rahul, sneha]) {
    for (const mo of [-3, -2, -1]) {
      const { month, year } = monthOffset(mo);
      const { lines, totalAmount, totalLectures } = await buildPayoutLines(teacher.tp._id, month, year);
      if (totalLectures === 0) continue;
      await PaymentLedger.create({
        teacher: teacher.tp._id, month, year,
        lines, totalAmount, totalLectures,
        status: 'paid',
        paidOn:   new Date(year, month, 10), // paid on 10th of following month
        paidBy:   admin._id,
        remarks: 'Monthly payout',
      });
      ledgerCount++;
    }
  }
  console.log(`✓  ${ledgerCount} payment ledger entries`);

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Demo data seeded successfully!
  All accounts use password: Demo@1234
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Role           Email                     Name
  ─────────────────────────────────────────────────
  admin          admin@tuitionapp.local    (existing)
  receptionist   receptionist@demo.com     Kavita Desai
  teacher        priya@demo.com            Priya Sharma
  teacher        rahul@demo.com            Rahul Verma
  teacher        sneha@demo.com            Sneha Patil
  student        amit@demo.com             Amit Kulkarni  (11th)
  student        neha@demo.com             Neha Joshi     (11th)
  student        rohan@demo.com            Rohan Mehta    (11th)
  student        karan@demo.com            Karan Shah     (11th)
  student        pooja@demo.com            Pooja Singh    (12th)
  student        vikram@demo.com           Vikram Desai   (12th)
  student        anjali@demo.com           Anjali Rao     (12th)
  student        meera@demo.com            Meera Pillai   (12th)
  student        suresh@demo.com           Suresh Kumar   (CET)
  student        divya@demo.com            Divya Nair     (CET)
  ─────────────────────────────────────────────────

  Batches:  5   Attendance records: ${attCount}
  Fees:     ${feeCount}   Tests: ${testCount} (${resultCount} results)
  Payouts:  ${ledgerCount}   Materials: ${matDefs.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main()
  .then(() => process.exit(0))
  .catch(err => { console.error('\n✘', err.message); process.exit(1); });
