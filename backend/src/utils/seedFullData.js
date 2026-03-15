import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import Department from "../models/Department.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import Placement from "../models/Placement.js";
import Research from "../models/Research.js";
import AccreditationItem from "../models/AccreditationItem.js";
import Achievement from "../models/Achievement.js";

dotenv.config();

const run = async () => {
    await connectDB();

    // ── WIPE EXISTING DATA ──────────────────────────────────────
    await Promise.all([
        Department.deleteMany({}),
        Student.deleteMany({}),
        User.deleteMany({}),
        Placement.deleteMany({}),
        Research.deleteMany({}),
        AccreditationItem.deleteMany({}),
        Achievement.deleteMany({})
    ]);

    console.log("Cleared existing data...");

    // ── DEPARTMENTS ─────────────────────────────────────────────
    const [cse, ece, mech, civil, it] = await Department.create([
        {
            name: "Computer Science and Engineering",
            code: "CSE",
            vision: "To be a centre of excellence in computing education and research.",
            mission: "Impart quality education and foster innovation in computing."
        },
        {
            name: "Electronics and Communication Engineering",
            code: "ECE",
            vision: "Excellence in electronics and communication technology.",
            mission: "Provide students with strong fundamentals in ECE domains."
        },
        {
            name: "Mechanical Engineering",
            code: "MECH",
            vision: "Pioneer in mechanical engineering education.",
            mission: "Develop engineers with strong analytical and practical skills."
        },
        {
            name: "Civil Engineering",
            code: "CIVIL",
            vision: "Building sustainable infrastructure through quality education.",
            mission: "Train civil engineers for real-world infrastructure challenges."
        },
        {
            name: "Information Technology",
            code: "IT",
            vision: "To lead in IT education and applied research.",
            mission: "Equip students with cutting-edge IT skills and tools."
        }
    ]);

    console.log("Departments created...");

    // ── USERS (Admin + HODs + Faculty) ──────────────────────────
    const admin = await User.create({
        name: "IQAC Administrator",
        email: "admin@iqac.edu",
        password: "Admin@123",
        role: "admin"
    });

    const [hodCSE, hodECE, hodMECH, hodCIVIL, hodIT] = await User.create([
        { name: "Dr. P. Venkata Rao", email: "hod.cse@iqac.edu", password: "Admin@123", role: "hod", department: cse._id },
        { name: "Dr. S. Lakshmi Prasad", email: "hod.ece@iqac.edu", password: "Admin@123", role: "hod", department: ece._id },
        { name: "Dr. R. Mohan Kumar", email: "hod.mech@iqac.edu", password: "Admin@123", role: "hod", department: mech._id },
        { name: "Dr. A. Srinivasa Rao", email: "hod.civil@iqac.edu", password: "Admin@123", role: "hod", department: civil._id },
        { name: "Dr. K. Madhavi Latha", email: "hod.it@iqac.edu", password: "Admin@123", role: "hod", department: it._id }
    ]);

    const [facCSE1, facCSE2, facECE1, facMECH1, facIT1] = await User.create([
        { name: "Dr. B. Ramesh", email: "faculty1.cse@iqac.edu", password: "Admin@123", role: "faculty", department: cse._id },
        { name: "Ms. T. Sunitha", email: "faculty2.cse@iqac.edu", password: "Admin@123", role: "faculty", department: cse._id },
        { name: "Dr. G. Narayana", email: "faculty1.ece@iqac.edu", password: "Admin@123", role: "faculty", department: ece._id },
        { name: "Mr. V. Srikanth", email: "faculty1.mech@iqac.edu", password: "Admin@123", role: "faculty", department: mech._id },
        { name: "Ms. P. Divya", email: "faculty1.it@iqac.edu", password: "Admin@123", role: "faculty", department: it._id }
    ]);

    // Update departments with HODs
    await Department.findByIdAndUpdate(cse._id, { hod: hodCSE._id });
    await Department.findByIdAndUpdate(ece._id, { hod: hodECE._id });
    await Department.findByIdAndUpdate(mech._id, { hod: hodMECH._id });
    await Department.findByIdAndUpdate(civil._id, { hod: hodCIVIL._id });
    await Department.findByIdAndUpdate(it._id, { hod: hodIT._id });

    console.log("Users created...");

    // ── STUDENTS ─────────────────────────────────────────────────
    // CSE Students — mix of risk levels
    const cseStudents = await Student.create([
        {
            rollNo: "21CSE001", name: "Ravi Kumar Sharma", email: "ravi.sharma@student.iqac.edu",
            department: cse._id, currentSemester: 6, batch: "2021-2025", riskLevel: "HIGH",
            metrics: [
                { semester: 1, academicYear: "2021-22", sgpa: 7.2, cgpa: 7.2, backlogCount: 0, attendancePercent: 82 },
                { semester: 2, academicYear: "2021-22", sgpa: 6.8, cgpa: 7.0, backlogCount: 1, attendancePercent: 75 },
                { semester: 3, academicYear: "2022-23", sgpa: 6.1, cgpa: 6.7, backlogCount: 2, attendancePercent: 68 },
                { semester: 4, academicYear: "2022-23", sgpa: 5.9, cgpa: 6.5, backlogCount: 3, attendancePercent: 62 },
                { semester: 5, academicYear: "2023-24", sgpa: 5.7, cgpa: 6.3, backlogCount: 3, attendancePercent: 58 },
                { semester: 6, academicYear: "2024-25", sgpa: 5.5, cgpa: 6.1, backlogCount: 4, attendancePercent: 55 }
            ]
        },
        {
            rollNo: "21CSE002", name: "Priya Lakshmi Devi", email: "priya.devi@student.iqac.edu",
            department: cse._id, currentSemester: 6, batch: "2021-2025", riskLevel: "LOW",
            metrics: [
                { semester: 1, academicYear: "2021-22", sgpa: 9.1, cgpa: 9.1, backlogCount: 0, attendancePercent: 95 },
                { semester: 2, academicYear: "2021-22", sgpa: 9.3, cgpa: 9.2, backlogCount: 0, attendancePercent: 97 },
                { semester: 3, academicYear: "2022-23", sgpa: 9.0, cgpa: 9.1, backlogCount: 0, attendancePercent: 94 },
                { semester: 4, academicYear: "2022-23", sgpa: 9.4, cgpa: 9.2, backlogCount: 0, attendancePercent: 96 },
                { semester: 5, academicYear: "2023-24", sgpa: 9.2, cgpa: 9.2, backlogCount: 0, attendancePercent: 95 },
                { semester: 6, academicYear: "2024-25", sgpa: 9.5, cgpa: 9.3, backlogCount: 0, attendancePercent: 98 }
            ]
        },
        {
            rollNo: "21CSE003", name: "Arun Sai Teja", email: "arun.teja@student.iqac.edu",
            department: cse._id, currentSemester: 6, batch: "2021-2025", riskLevel: "MEDIUM",
            metrics: [
                { semester: 1, academicYear: "2021-22", sgpa: 7.8, cgpa: 7.8, backlogCount: 0, attendancePercent: 80 },
                { semester: 2, academicYear: "2021-22", sgpa: 7.2, cgpa: 7.5, backlogCount: 1, attendancePercent: 76 },
                { semester: 3, academicYear: "2022-23", sgpa: 6.9, cgpa: 7.3, backlogCount: 1, attendancePercent: 72 },
                { semester: 4, academicYear: "2022-23", sgpa: 7.1, cgpa: 7.3, backlogCount: 1, attendancePercent: 74 },
                { semester: 5, academicYear: "2023-24", sgpa: 6.8, cgpa: 7.2, backlogCount: 2, attendancePercent: 70 },
                { semester: 6, academicYear: "2024-25", sgpa: 6.6, cgpa: 7.1, backlogCount: 2, attendancePercent: 68 }
            ]
        },
        {
            rollNo: "21CSE004", name: "Mounika Reddy", email: "mounika.reddy@student.iqac.edu",
            department: cse._id, currentSemester: 6, batch: "2021-2025", riskLevel: "LOW",
            metrics: [
                { semester: 1, academicYear: "2021-22", sgpa: 8.5, cgpa: 8.5, backlogCount: 0, attendancePercent: 90 },
                { semester: 2, academicYear: "2021-22", sgpa: 8.7, cgpa: 8.6, backlogCount: 0, attendancePercent: 92 },
                { semester: 3, academicYear: "2022-23", sgpa: 8.4, cgpa: 8.5, backlogCount: 0, attendancePercent: 89 },
                { semester: 4, academicYear: "2022-23", sgpa: 8.8, cgpa: 8.6, backlogCount: 0, attendancePercent: 91 },
                { semester: 5, academicYear: "2023-24", sgpa: 8.6, cgpa: 8.6, backlogCount: 0, attendancePercent: 93 },
                { semester: 6, academicYear: "2024-25", sgpa: 8.9, cgpa: 8.7, backlogCount: 0, attendancePercent: 94 }
            ]
        },
        {
            rollNo: "21CSE005", name: "Kiran Babu Naidu", email: "kiran.naidu@student.iqac.edu",
            department: cse._id, currentSemester: 6, batch: "2021-2025", riskLevel: "HIGH",
            metrics: [
                { semester: 1, academicYear: "2021-22", sgpa: 6.5, cgpa: 6.5, backlogCount: 1, attendancePercent: 70 },
                { semester: 2, academicYear: "2021-22", sgpa: 5.9, cgpa: 6.2, backlogCount: 2, attendancePercent: 65 },
                { semester: 3, academicYear: "2022-23", sgpa: 5.5, cgpa: 6.0, backlogCount: 3, attendancePercent: 60 },
                { semester: 4, academicYear: "2022-23", sgpa: 5.2, cgpa: 5.8, backlogCount: 4, attendancePercent: 58 },
                { semester: 5, academicYear: "2023-24", sgpa: 5.0, cgpa: 5.6, backlogCount: 4, attendancePercent: 55 },
                { semester: 6, academicYear: "2024-25", sgpa: 4.8, cgpa: 5.4, backlogCount: 5, attendancePercent: 52 }
            ]
        }
    ]);

    // ECE Students
    const eceStudents = await Student.create([
        {
            rollNo: "21ECE001", name: "Arjun Singh Chauhan", email: "arjun.singh@student.iqac.edu",
            department: ece._id, currentSemester: 6, batch: "2021-2025", riskLevel: "LOW",
            metrics: [
                { semester: 1, academicYear: "2021-22", sgpa: 8.8, cgpa: 8.8, backlogCount: 0, attendancePercent: 93 },
                { semester: 2, academicYear: "2021-22", sgpa: 8.9, cgpa: 8.9, backlogCount: 0, attendancePercent: 95 },
                { semester: 3, academicYear: "2022-23", sgpa: 8.7, cgpa: 8.8, backlogCount: 0, attendancePercent: 92 },
                { semester: 4, academicYear: "2022-23", sgpa: 9.0, cgpa: 8.9, backlogCount: 0, attendancePercent: 96 },
                { semester: 5, academicYear: "2023-24", sgpa: 8.8, cgpa: 8.9, backlogCount: 0, attendancePercent: 94 },
                { semester: 6, academicYear: "2024-25", sgpa: 9.1, cgpa: 8.9, backlogCount: 0, attendancePercent: 97 }
            ]
        },
        {
            rollNo: "21ECE002", name: "Divya Sree Patel", email: "divya.patel@student.iqac.edu",
            department: ece._id, currentSemester: 6, batch: "2021-2025", riskLevel: "MEDIUM",
            metrics: [
                { semester: 1, academicYear: "2021-22", sgpa: 7.5, cgpa: 7.5, backlogCount: 0, attendancePercent: 78 },
                { semester: 2, academicYear: "2021-22", sgpa: 7.1, cgpa: 7.3, backlogCount: 1, attendancePercent: 74 },
                { semester: 3, academicYear: "2022-23", sgpa: 6.8, cgpa: 7.1, backlogCount: 1, attendancePercent: 71 },
                { semester: 4, academicYear: "2022-23", sgpa: 7.0, cgpa: 7.1, backlogCount: 1, attendancePercent: 73 },
                { semester: 5, academicYear: "2023-24", sgpa: 6.9, cgpa: 7.1, backlogCount: 2, attendancePercent: 70 },
                { semester: 6, academicYear: "2024-25", sgpa: 6.7, cgpa: 7.0, backlogCount: 2, attendancePercent: 69 }
            ]
        },
        {
            rollNo: "21ECE003", name: "Sai Charan Varma", email: "sai.varma@student.iqac.edu",
            department: ece._id, currentSemester: 6, batch: "2021-2025", riskLevel: "HIGH",
            metrics: [
                { semester: 1, academicYear: "2021-22", sgpa: 6.2, cgpa: 6.2, backlogCount: 1, attendancePercent: 65 },
                { semester: 2, academicYear: "2021-22", sgpa: 5.8, cgpa: 6.0, backlogCount: 2, attendancePercent: 61 },
                { semester: 3, academicYear: "2022-23", sgpa: 5.5, cgpa: 5.8, backlogCount: 3, attendancePercent: 58 },
                { semester: 4, academicYear: "2022-23", sgpa: 5.3, cgpa: 5.7, backlogCount: 3, attendancePercent: 56 },
                { semester: 5, academicYear: "2023-24", sgpa: 5.1, cgpa: 5.6, backlogCount: 4, attendancePercent: 54 },
                { semester: 6, academicYear: "2024-25", sgpa: 4.9, cgpa: 5.4, backlogCount: 4, attendancePercent: 51 }
            ]
        }
    ]);

    // MECH Students
    const mechStudents = await Student.create([
        {
            rollNo: "21MECH001", name: "Venkat Suresh Kumar", email: "venkat.kumar@student.iqac.edu",
            department: mech._id, currentSemester: 6, batch: "2021-2025", riskLevel: "MEDIUM",
            metrics: [
                { semester: 1, academicYear: "2021-22", sgpa: 7.0, cgpa: 7.0, backlogCount: 0, attendancePercent: 76 },
                { semester: 2, academicYear: "2021-22", sgpa: 6.8, cgpa: 6.9, backlogCount: 1, attendancePercent: 73 },
                { semester: 3, academicYear: "2022-23", sgpa: 6.5, cgpa: 6.8, backlogCount: 1, attendancePercent: 70 },
                { semester: 4, academicYear: "2022-23", sgpa: 6.7, cgpa: 6.8, backlogCount: 1, attendancePercent: 72 },
                { semester: 5, academicYear: "2023-24", sgpa: 6.4, cgpa: 6.7, backlogCount: 2, attendancePercent: 69 },
                { semester: 6, academicYear: "2024-25", sgpa: 6.2, cgpa: 6.6, backlogCount: 2, attendancePercent: 67 }
            ]
        },
        {
            rollNo: "21MECH002", name: "Haritha Naga Sai", email: "haritha.sai@student.iqac.edu",
            department: mech._id, currentSemester: 6, batch: "2021-2025", riskLevel: "LOW",
            metrics: [
                { semester: 1, academicYear: "2021-22", sgpa: 8.2, cgpa: 8.2, backlogCount: 0, attendancePercent: 88 },
                { semester: 2, academicYear: "2021-22", sgpa: 8.4, cgpa: 8.3, backlogCount: 0, attendancePercent: 90 },
                { semester: 3, academicYear: "2022-23", sgpa: 8.1, cgpa: 8.2, backlogCount: 0, attendancePercent: 87 },
                { semester: 4, academicYear: "2022-23", sgpa: 8.5, cgpa: 8.3, backlogCount: 0, attendancePercent: 91 },
                { semester: 5, academicYear: "2023-24", sgpa: 8.3, cgpa: 8.3, backlogCount: 0, attendancePercent: 89 },
                { semester: 6, academicYear: "2024-25", sgpa: 8.6, cgpa: 8.4, backlogCount: 0, attendancePercent: 92 }
            ]
        }
    ]);

    // IT Students
    const itStudents = await Student.create([
        {
            rollNo: "21IT001", name: "Pavani Krishna Rao", email: "pavani.rao@student.iqac.edu",
            department: it._id, currentSemester: 6, batch: "2021-2025", riskLevel: "LOW",
            metrics: [
                { semester: 1, academicYear: "2021-22", sgpa: 9.2, cgpa: 9.2, backlogCount: 0, attendancePercent: 96 },
                { semester: 2, academicYear: "2021-22", sgpa: 9.4, cgpa: 9.3, backlogCount: 0, attendancePercent: 98 },
                { semester: 3, academicYear: "2022-23", sgpa: 9.1, cgpa: 9.2, backlogCount: 0, attendancePercent: 95 },
                { semester: 4, academicYear: "2022-23", sgpa: 9.5, cgpa: 9.3, backlogCount: 0, attendancePercent: 97 },
                { semester: 5, academicYear: "2023-24", sgpa: 9.3, cgpa: 9.3, backlogCount: 0, attendancePercent: 96 },
                { semester: 6, academicYear: "2024-25", sgpa: 9.6, cgpa: 9.4, backlogCount: 0, attendancePercent: 99 }
            ]
        },
        {
            rollNo: "21IT002", name: "Santhosh Babu Reddy", email: "santhosh.reddy@student.iqac.edu",
            department: it._id, currentSemester: 6, batch: "2021-2025", riskLevel: "HIGH",
            metrics: [
                { semester: 1, academicYear: "2021-22", sgpa: 6.0, cgpa: 6.0, backlogCount: 1, attendancePercent: 66 },
                { semester: 2, academicYear: "2021-22", sgpa: 5.7, cgpa: 5.9, backlogCount: 2, attendancePercent: 62 },
                { semester: 3, academicYear: "2022-23", sgpa: 5.4, cgpa: 5.7, backlogCount: 3, attendancePercent: 59 },
                { semester: 4, academicYear: "2022-23", sgpa: 5.2, cgpa: 5.6, backlogCount: 3, attendancePercent: 57 },
                { semester: 5, academicYear: "2023-24", sgpa: 5.0, cgpa: 5.5, backlogCount: 4, attendancePercent: 54 },
                { semester: 6, academicYear: "2024-25", sgpa: 4.7, cgpa: 5.3, backlogCount: 5, attendancePercent: 51 }
            ]
        }
    ]);

    console.log("Students created...");

    // ── PLACEMENTS ───────────────────────────────────────────────
    await Placement.create([
        {
            department: cse._id, academicYear: "2023-24",
            totalEligible: 120, totalPlaced: 98,
            highestPackageLPA: 42, medianPackageLPA: 8.5,
            majorRecruiters: ["TCS", "Infosys", "Wipro", "Cognizant", "Amazon", "HCL"],
            enteredBy: admin._id
        },
        {
            department: cse._id, academicYear: "2022-23",
            totalEligible: 115, totalPlaced: 89,
            highestPackageLPA: 36, medianPackageLPA: 7.8,
            majorRecruiters: ["TCS", "Infosys", "Capgemini", "Tech Mahindra"],
            enteredBy: admin._id
        },
        {
            department: ece._id, academicYear: "2023-24",
            totalEligible: 90, totalPlaced: 67,
            highestPackageLPA: 28, medianPackageLPA: 6.5,
            majorRecruiters: ["Bosch", "Qualcomm", "L&T", "Wipro", "TCS"],
            enteredBy: admin._id
        },
        {
            department: ece._id, academicYear: "2022-23",
            totalEligible: 88, totalPlaced: 60,
            highestPackageLPA: 24, medianPackageLPA: 6.0,
            majorRecruiters: ["L&T", "Siemens", "TCS", "Infosys"],
            enteredBy: admin._id
        },
        {
            department: mech._id, academicYear: "2023-24",
            totalEligible: 75, totalPlaced: 48,
            highestPackageLPA: 18, medianPackageLPA: 5.2,
            majorRecruiters: ["L&T", "BHEL", "Tata Motors", "Maruti Suzuki"],
            enteredBy: admin._id
        },
        {
            department: civil._id, academicYear: "2023-24",
            totalEligible: 60, totalPlaced: 35,
            highestPackageLPA: 15, medianPackageLPA: 4.8,
            majorRecruiters: ["L&T Construction", "NMDC", "APEPDCL"],
            enteredBy: admin._id
        },
        {
            department: it._id, academicYear: "2023-24",
            totalEligible: 95, totalPlaced: 88,
            highestPackageLPA: 45, medianPackageLPA: 9.2,
            majorRecruiters: ["Microsoft", "Google", "Amazon", "Flipkart", "TCS", "Infosys"],
            enteredBy: admin._id
        },
        {
            department: it._id, academicYear: "2022-23",
            totalEligible: 90, totalPlaced: 79,
            highestPackageLPA: 38, medianPackageLPA: 8.6,
            majorRecruiters: ["Amazon", "Wipro", "HCL", "Cognizant"],
            enteredBy: admin._id
        }
    ]);

    console.log("Placements created...");

    // ── RESEARCH PUBLICATIONS ────────────────────────────────────
    await Research.create([
        {
            department: cse._id, faculty: facCSE1._id,
            title: "Deep Learning Approaches for Early Detection of Diabetic Retinopathy",
            publicationType: "Journal",
            journalOrConference: "IEEE Transactions on Medical Imaging",
            publishedOn: new Date("2024-03-15"),
            accreditationCriteria: "NAAC-C3"
        },
        {
            department: cse._id, faculty: facCSE2._id,
            title: "Federated Learning for Privacy-Preserving Healthcare Data Analysis",
            publicationType: "Conference",
            journalOrConference: "International Conference on Machine Learning (ICML)",
            publishedOn: new Date("2024-01-20"),
            accreditationCriteria: "NAAC-C3"
        },
        {
            department: cse._id, faculty: facCSE1._id,
            title: "Efficient Graph Neural Networks for Social Network Analysis",
            publicationType: "Journal",
            journalOrConference: "Elsevier Pattern Recognition Letters",
            publishedOn: new Date("2023-11-10"),
            accreditationCriteria: "NBA-C4"
        },
        {
            department: ece._id, faculty: facECE1._id,
            title: "5G-NR Channel Estimation using LSTM Networks",
            publicationType: "Journal",
            journalOrConference: "IEEE Communications Letters",
            publishedOn: new Date("2024-02-08"),
            accreditationCriteria: "NAAC-C3"
        },
        {
            department: ece._id, faculty: facECE1._id,
            title: "Low Power VLSI Design for IoT Edge Computing",
            publicationType: "Conference",
            journalOrConference: "VLSI Design Conference 2024",
            publishedOn: new Date("2024-04-12"),
            accreditationCriteria: "NBA-C4"
        },
        {
            department: mech._id, faculty: facMECH1._id,
            title: "Additive Manufacturing of Titanium Alloys for Aerospace Applications",
            publicationType: "Journal",
            journalOrConference: "Journal of Manufacturing Science and Engineering",
            publishedOn: new Date("2023-09-22"),
            accreditationCriteria: "NAAC-C3"
        },
        {
            department: it._id, faculty: facIT1._id,
            title: "Blockchain-Based Secure Academic Credential Verification System",
            publicationType: "Journal",
            journalOrConference: "Computers & Security Journal",
            publishedOn: new Date("2024-05-01"),
            accreditationCriteria: "NAAC-C3"
        },
        {
            department: it._id, faculty: facIT1._id,
            title: "Explainable AI for Credit Risk Assessment in Rural Banking",
            publicationType: "Patent",
            journalOrConference: "Indian Patent Office",
            publishedOn: new Date("2024-06-15"),
            accreditationCriteria: "NBA-C4"
        }
    ]);

    console.log("Research publications created...");

    // ── ACCREDITATION ITEMS ──────────────────────────────────────
    await AccreditationItem.create([
        // NBA Items — CSE
        {
            title: "Program Educational Objectives (PEOs) documented and displayed",
            body: "PEOs defined for B.Tech CSE program aligned with department vision and mission.",
            type: "NBA", criterion: "Criterion-1", department: cse._id,
            academicYear: "2024-25", completed: true, uploadedBy: hodCSE._id
        },
        {
            title: "Course Outcomes mapped to Program Outcomes for all courses",
            body: "CO-PO mapping completed for all 40 courses in CSE curriculum.",
            type: "NBA", criterion: "Criterion-2", department: cse._id,
            academicYear: "2024-25", completed: true, uploadedBy: hodCSE._id
        },
        {
            title: "CO Attainment calculated for all courses in current semester",
            body: "Direct attainment computed using internal and external marks.",
            type: "NBA", criterion: "Criterion-3", department: cse._id,
            academicYear: "2024-25", completed: false, uploadedBy: hodCSE._id
        },
        {
            title: "Faculty qualification certificates uploaded",
            body: "All faculty PhD and PG certificates verified and uploaded.",
            type: "NBA", criterion: "Criterion-4", department: cse._id,
            academicYear: "2024-25", completed: true, uploadedBy: hodCSE._id
        },
        {
            title: "Lab utilization records for all laboratories",
            body: "Timetable and utilization percentage for 8 labs documented.",
            type: "NBA", criterion: "Criterion-5", department: cse._id,
            academicYear: "2024-25", completed: true, uploadedBy: hodCSE._id
        },
        {
            title: "Student placement and higher education data documented",
            body: "Placement records for 2023-24 batch verified with offer letters.",
            type: "NBA", criterion: "Criterion-6", department: cse._id,
            academicYear: "2024-25", completed: true, uploadedBy: hodCSE._id
        },
        // NAAC Items
        {
            title: "IQAC Annual Quality Assurance Report (AQAR) 2023-24 submitted",
            body: "AQAR submitted to NAAC portal with all supporting documents.",
            type: "NAAC", criterion: "Criterion-6", department: null,
            academicYear: "2024-25", completed: true, uploadedBy: admin._id
        },
        {
            title: "Student feedback analysis report for odd semester 2024-25",
            body: "Feedback collected from 1200 students and analyzed.",
            type: "NAAC", criterion: "Criterion-2", department: null,
            academicYear: "2024-25", completed: false, uploadedBy: admin._id
        },
        {
            title: "Research funding and grants documentation 2024-25",
            body: "Details of 3 funded projects worth Rs. 45 lakhs documented.",
            type: "NAAC", criterion: "Criterion-3", department: null,
            academicYear: "2024-25", completed: true, uploadedBy: admin._id
        },
        {
            title: "MOU documents with industry partners",
            body: "Active MOUs with TCS, Infosys, and Microsoft uploaded.",
            type: "NAAC", criterion: "Criterion-7", department: null,
            academicYear: "2024-25", completed: false, uploadedBy: admin._id
        }
    ]);

    console.log("Accreditation items created...");

    // ── ACHIEVEMENTS ─────────────────────────────────────────────
    await Achievement.create([
        {
            department: cse._id,
            title: "Best Paper Award at National Conference on AI and ML",
            category: "Faculty", level: "National",
            date: new Date("2024-03-10"),
            accreditationCriteria: "NAAC-C3"
        },
        {
            department: cse._id,
            title: "Smart India Hackathon 2024 — Runner Up",
            category: "Student", level: "National",
            date: new Date("2024-08-25"),
            accreditationCriteria: "NAAC-C5"
        },
        {
            department: it._id,
            title: "Google Solution Challenge — Top 100 Global Teams",
            category: "Student", level: "International",
            date: new Date("2024-05-15"),
            accreditationCriteria: "NAAC-C5"
        },
        {
            department: ece._id,
            title: "DRDO Sponsored Project on Signal Processing",
            category: "Department", level: "National",
            date: new Date("2024-01-20"),
            accreditationCriteria: "NAAC-C3"
        },
        {
            department: mech._id,
            title: "ISRO Internship — 3 students selected",
            category: "Student", level: "National",
            date: new Date("2024-06-01"),
            accreditationCriteria: "NAAC-C5"
        },
        {
            department: cse._id,
            title: "Microsoft Learn Student Ambassador — 2 students",
            category: "Student", level: "International",
            date: new Date("2024-07-10"),
            accreditationCriteria: "NAAC-C5"
        }
    ]);

    console.log("Achievements created...");

    // ── SUMMARY ──────────────────────────────────────────────────
    console.log("\n✅ FULL EXAMPLE DATABASE SEEDED SUCCESSFULLY");
    console.log("══════════════════════════════════════════════");
    console.log("Departments : 5  (CSE, ECE, MECH, CIVIL, IT)");
    console.log("Students    : 12 (mix of HIGH/MEDIUM/LOW risk)");
    console.log("Users       : 12 (1 admin + 5 HODs + 5 faculty + 1 student)");
    console.log("Placements  : 8  (2 years × 4 departments)");
    console.log("Research    : 8  (journals, conferences, patents)");
    console.log("Accreditation Items: 10 (NBA + NAAC)");
    console.log("Achievements: 6  (national + international)");
    console.log("══════════════════════════════════════════════");
    console.log("\nLogin credentials:");
    console.log("Admin  → admin@iqac.edu     / Admin@123");
    console.log("HOD    → hod.cse@iqac.edu   / Admin@123");
    console.log("Faculty→ faculty1.cse@iqac.edu / Admin@123");
    console.log("\nNow run: node src/utils/seedFullData.js");

    process.exit(0);
};

run().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});