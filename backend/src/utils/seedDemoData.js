import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import Attendance from "../models/Attendance.js";
import Department from "../models/Department.js";
import Faculty from "../models/Faculty.js";
import FacultyAchievement from "../models/FacultyAchievement.js";
import Mark from "../models/Mark.js";
import Section from "../models/Section.js";
import Student from "../models/Student.js";
import StudentAchievement from "../models/StudentAchievement.js";
import User from "../models/User.js";

dotenv.config();

const makeMetric = (semester, cgpa, sgpa, attendancePercent, backlogCount = 0) => ({
  semester,
  academicYear: "2025-26",
  cgpa,
  sgpa,
  attendancePercent,
  backlogCount
});

const createDepartmentStack = async ({
  name,
  code,
  hodEmail,
  facultyEmails,
  studentPrefix,
  sectionCodes
}) => {
  const department = await Department.create({ name, code });

  const hod = await User.create({
    name: `HOD ${code}`,
    email: hodEmail,
    password: "Admin@123",
    role: "hod",
    department: department._id
  });

  department.hod = hod._id;
  await department.save();

  const sections = await Section.create(
    sectionCodes.map((sectionCode, idx) => ({
      name: `${code} Section ${String.fromCharCode(65 + idx)}`,
      code: `${code}-${sectionCode}`,
      semester: 4,
      department: department._id,
      subjects: ["SUB401", "SUB402", "SUB403"]
    }))
  );

  const facultyUsers = [];
  for (let i = 0; i < facultyEmails.length; i += 1) {
    const fUser = await User.create({
      name: `${code} Faculty ${i + 1}`,
      email: facultyEmails[i],
      password: "Admin@123",
      role: "faculty",
      department: department._id,
      facultyId: `${code}-FAC-${i + 1}`
    });

    facultyUsers.push(fUser);

    await Faculty.create({
      user: fUser._id,
      department: department._id,
      designation: i === 0 ? "Professor" : "Assistant Professor",
      contactNumber: `9000000${Math.floor(Math.random() * 900 + 100)}`,
      researchInterests: ["AI in Education", "Academic Analytics"],
      sections: sections.map((s) => s._id)
    });

    await FacultyAchievement.create({
      faculty: fUser._id,
      department: department._id,
      title: `${code} Research Publication ${i + 1}`,
      type: "publication",
      description: "Indexed publication in academic analytics"
    });
  }

  const students = [];
  for (let i = 1; i <= 10; i += 1) {
    const section = sections[(i - 1) % sections.length];
    const risk = i % 6 === 0 ? "HIGH" : i % 4 === 0 ? "MEDIUM" : "LOW";
    const baseCgpa = risk === "HIGH" ? 6.1 : risk === "MEDIUM" ? 7.0 : 8.2;
    const rollNo = `${studentPrefix}${String(i).padStart(3, "0")}`;
    const studentEmail = `${rollNo.toLowerCase()}@student.iqac.edu`;

    const student = await Student.create({
      rollNo,
      name: `${code} Student ${i}`,
      email: studentEmail,
      department: department._id,
      section: section._id,
      currentSemester: 4,
      batch: "2023-2027",
      riskLevel: risk,
      metrics: [
        makeMetric(2, Number((baseCgpa - 0.2).toFixed(2)), Number((baseCgpa - 0.1).toFixed(2)), risk === "HIGH" ? 62 : 82, risk === "HIGH" ? 2 : 0),
        makeMetric(3, Number((baseCgpa - 0.1).toFixed(2)), Number(baseCgpa.toFixed(2)), risk === "HIGH" ? 58 : 84, risk === "HIGH" ? 2 : risk === "MEDIUM" ? 1 : 0),
        makeMetric(4, Number(baseCgpa.toFixed(2)), Number((baseCgpa + 0.1).toFixed(2)), risk === "HIGH" ? 55 : 86, risk === "HIGH" ? 3 : risk === "MEDIUM" ? 1 : 0)
      ]
    });

    students.push(student);

    await User.create({
      name: student.name,
      email: studentEmail,
      password: "Admin@123",
      role: "student",
      department: department._id,
      studentProfile: student._id,
      registrationNumber: rollNo
    });

    await StudentAchievement.create({
      student: student._id,
      department: department._id,
      title: `${student.name} - Academic Achievement`,
      type: "academic",
      description: "Top performer in one of the department core courses"
    });

    await Mark.create({
      student: student._id,
      section: section._id,
      faculty: facultyUsers[0]._id,
      subjectCode: "SUB401",
      subjectName: "Core Subject 1",
      semester: 4,
      academicYear: "2025-26",
      internal: 25,
      external: Math.max(28, Math.round(baseCgpa * 8)),
      total: Math.max(53, Math.round(baseCgpa * 10)),
      passed: true
    });

    await Attendance.create({
      student: student._id,
      section: section._id,
      faculty: facultyUsers[0]._id,
      semester: 4,
      academicYear: "2025-26",
      totalClasses: 90,
      attendedClasses: risk === "HIGH" ? 52 : 78,
      percentage: risk === "HIGH" ? 57.78 : 86.67
    });
  }

  for (const section of sections) {
    const sectionStudents = students.filter((s) => String(s.section) === String(section._id));
    section.students = sectionStudents.map((s) => s._id);
    section.advisor = facultyUsers[0]._id;
    await section.save();
  }

  return { department, hod, facultyUsers, students, sections };
};

const run = async () => {
  await connectDB();

  await Promise.all([
    Attendance.deleteMany({}),
    Mark.deleteMany({}),
    StudentAchievement.deleteMany({}),
    FacultyAchievement.deleteMany({}),
    Faculty.deleteMany({}),
    Section.deleteMany({}),
    Student.deleteMany({}),
    Department.deleteMany({}),
    User.deleteMany({})
  ]);

  const admin = await User.create({
    name: "IQAC Admin",
    email: "admin@iqac.edu",
    password: "Admin@123",
    role: "admin"
  });

  const cseStack = await createDepartmentStack({
    name: "Computer Science and Engineering",
    code: "CSE",
    hodEmail: "hod.cse@iqac.edu",
    facultyEmails: ["faculty.cse1@iqac.edu", "faculty.cse2@iqac.edu", "faculty.cse3@iqac.edu"],
    studentPrefix: "CSE",
    sectionCodes: ["A", "B"]
  });

  await createDepartmentStack({
    name: "Electronics and Communication Engineering",
    code: "ECE",
    hodEmail: "hod.ece@iqac.edu",
    facultyEmails: ["faculty.ece1@iqac.edu", "faculty.ece2@iqac.edu", "faculty.ece3@iqac.edu"],
    studentPrefix: "ECE",
    sectionCodes: ["A", "B"]
  });

  await createDepartmentStack({
    name: "Mechanical Engineering",
    code: "MECH",
    hodEmail: "hod.mech@iqac.edu",
    facultyEmails: ["faculty.mech1@iqac.edu", "faculty.mech2@iqac.edu", "faculty.mech3@iqac.edu"],
    studentPrefix: "MEC",
    sectionCodes: ["A", "B"]
  });

  console.log("Seed complete");
  console.log({
    admin: admin.email,
    hodCSE: "hod.cse@iqac.edu",
    hodECE: "hod.ece@iqac.edu",
    hodMECH: "hod.mech@iqac.edu",
    facultyCSE: "faculty.cse1@iqac.edu",
    studentCSE: cseStack.students[0].email,
    password: "Admin@123"
  });

  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
