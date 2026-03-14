import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import Department from "../models/Department.js";
import Student from "../models/Student.js";
import User from "../models/User.js";

dotenv.config();

const run = async () => {
  await connectDB();

  await Promise.all([Department.deleteMany({}), Student.deleteMany({}), User.deleteMany({})]);

  const [cse, ece] = await Department.create([
    { name: "Computer Science and Engineering", code: "CSE" },
    { name: "Electronics and Communication Engineering", code: "ECE" }
  ]);

  const students = await Student.create([
    {
      rollNo: "CSE001",
      name: "Ravi Kumar",
      email: "ravi@student.iqac.edu",
      department: cse._id,
      currentSemester: 4,
      batch: "2023-2027",
      riskLevel: "HIGH",
      metrics: [
        { semester: 3, academicYear: "2024-25", sgpa: 6.8, cgpa: 6.9, backlogCount: 2, attendancePercent: 58 },
        { semester: 4, academicYear: "2024-25", sgpa: 6.3, cgpa: 6.7, backlogCount: 3, attendancePercent: 55 }
      ]
    },
    {
      rollNo: "ECE001",
      name: "Arjun Singh",
      email: "arjun@student.iqac.edu",
      department: ece._id,
      currentSemester: 4,
      batch: "2023-2027",
      riskLevel: "LOW",
      metrics: [
        { semester: 3, academicYear: "2024-25", sgpa: 8.1, cgpa: 7.9, backlogCount: 0, attendancePercent: 85 },
        { semester: 4, academicYear: "2024-25", sgpa: 8.2, cgpa: 8.0, backlogCount: 0, attendancePercent: 87 }
      ]
    }
  ]);

  const admin = await User.create({
    name: "IQAC Admin",
    email: "admin@iqac.edu",
    password: "Admin@123",
    role: "admin"
  });

  const hod = await User.create({
    name: "HOD CSE",
    email: "hod.cse@iqac.edu",
    password: "Admin@123",
    role: "hod",
    department: cse._id
  });

  const faculty = await User.create({
    name: "Faculty CSE",
    email: "faculty.cse@iqac.edu",
    password: "Admin@123",
    role: "faculty",
    department: cse._id
  });

  await User.create({
    name: students[0].name,
    email: students[0].email,
    password: "Admin@123",
    role: "student",
    department: cse._id,
    studentProfile: students[0]._id
  });

  cse.hod = hod._id;
  await cse.save();

  console.log("Seed complete");
  console.log({
    admin: admin.email,
    hod: hod.email,
    faculty: faculty.email,
    student: students[0].email,
    password: "Admin@123"
  });

  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
