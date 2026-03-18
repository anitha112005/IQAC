import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { connectDB } from "../config/db.js";
import Department from "../models/Department.js";
import Student from "../models/Student.js";
import Faculty from "../models/Faculty.js";

dotenv.config();

const ensureDepartments = async () => {
  const defs = [
    { code: "CSE", name: "Computer Science and Engineering" },
    { code: "ECE", name: "Electronics and Communication Engineering" }
  ];

  const result = {};

  for (const def of defs) {
    let dept = await Department.findOne({ code: def.code });
    if (!dept) {
      dept = await Department.create({ code: def.code, name: def.name });
    }
    result[def.code] = dept;
  }

  return result;
};

const ensureStudents = async (departments) => {
  const created = [];

  // Generate around 200 students in total (100 per department)
  const configs = [
    { code: "CSE", dept: departments.CSE, sections: ["A", "B", "C"] },
    { code: "ECE", dept: departments.ECE, sections: ["A", "B"] }
  ];

  for (const cfg of configs) {
    for (let i = 101; i <= 200; i++) {
      const rollNo = `${cfg.code}${i.toString().padStart(3, "0")}`;
      const existing = await Student.findOne({ rollNo });
      if (existing) continue;

      const idx = i - 100; // 1..100
      const section = cfg.sections[(idx - 1) % cfg.sections.length];

      const baseCgpa = 6 + ((idx % 5) * 0.5); // 6.0 - 8.0
      const baseSgpa = baseCgpa + 0.1;
      const backlogCount = idx % 4; // 0-3
      const attendance3 = 60 + (idx % 35); // 60-94
      const attendance4 = 58 + ((idx * 3) % 35); // 58-92

      let riskLevel = "LOW";
      if (baseCgpa < 7 || attendance4 < 65) riskLevel = "HIGH";
      else if (baseCgpa < 8) riskLevel = "MEDIUM";

      const totalFee = 120000;
      const paidPercent = 60 + (idx % 41); // 60-100
      const paidAmount = Math.round((totalFee * paidPercent) / 100);
      const pendingAmount = totalFee - paidAmount;
      const paymentStatus = pendingAmount === 0 ? "PAID" : paidPercent >= 80 ? "PARTIAL" : "PENDING";

      const studentDoc = {
        rollNo,
        name: `Student ${cfg.code} ${idx}`,
        email: `student${cfg.code.toLowerCase()}${idx}@student.iqac.edu`,
        department: cfg.dept._id,
        section,
        currentSemester: 4,
        batch: "2023-2027",
        phone: `90000${idx.toString().padStart(5, "0")}`,
        address: "Hyderabad",
        feeDetails: {
          totalFee,
          paidAmount,
          pendingAmount,
          paymentStatus
        },
        riskLevel,
        metrics: [
          {
            semester: 3,
            academicYear: "2024-25",
            sgpa: Number(baseSgpa.toFixed(2)),
            cgpa: Number(baseCgpa.toFixed(2)),
            backlogCount,
            attendancePercent: attendance3
          },
          {
            semester: 4,
            academicYear: "2024-25",
            sgpa: Number((baseSgpa + 0.1).toFixed(2)),
            cgpa: Number((baseCgpa + 0.05).toFixed(2)),
            backlogCount,
            attendancePercent: attendance4
          }
        ]
      };

      const doc = await Student.create(studentDoc);
      created.push(doc);
    }
  }

  return created;
};

const ensureFaculty = async (departments) => {
  const passwordHash = await bcrypt.hash("Dummy@123", 10);

  const facultyDefs = [
    {
      employeeId: "CSEF010",
      name: "Dr. Neha Kapoor",
      email: "neha.kapoor@iqac.edu",
      username: "neha.kapoor",
      department: departments.CSE._id,
      designation: "Associate Professor",
      qualification: "PhD",
      experience: 10,
      researchArea: "Machine Learning",
      subjects: [
        { subjectName: "Machine Learning", semester: 5 },
        { subjectName: "Data Mining", semester: 6 }
      ]
    },
    {
      employeeId: "ECEF010",
      name: "Prof. Suresh Rao",
      email: "suresh.rao@iqac.edu",
      username: "suresh.rao",
      department: departments.ECE._id,
      designation: "Assistant Professor",
      qualification: "M.Tech",
      experience: 6,
      researchArea: "Embedded Systems",
      subjects: [
        { subjectName: "VLSI Design", semester: 5 },
        { subjectName: "Embedded Systems", semester: 6 }
      ]
    }
  ];

  const created = [];

  for (const fd of facultyDefs) {
    const existing = await Faculty.findOne({ employeeId: fd.employeeId });
    if (existing) continue;

    const doc = await Faculty.create({
      ...fd,
      user: new mongoose.Types.ObjectId(),
      passwordHash
    });
    created.push(doc);
  }

  return created;
};

const run = async () => {
  try {
    await connectDB();

    const departments = await ensureDepartments();
    const students = await ensureStudents(departments);
    const faculty = await ensureFaculty(departments);

    console.log("Core seeding complete (without touching User collection)");
    console.log({
      departmentsSeeded: Object.keys(departments),
      studentsAdded: students.map((s) => s.rollNo),
      facultyAdded: faculty.map((f) => f.employeeId)
    });

    process.exit(0);
  } catch (err) {
    console.error("Error during core seeding:", err);
    process.exit(1);
  }
};

run();
