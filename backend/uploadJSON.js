import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We need to insert in specific order to build reference maps
const uploadOrder = [
    { file: 'departments.json', coll: 'departments' },
    { file: 'faculty.json', coll: 'faculties' },
    { file: 'students.json', coll: 'students' },
    { file: 'semester_performance.json', coll: 'semester_performances' },
    { file: 'student_attendance.json', coll: 'student_attendances' },
    { file: 'marks.json', coll: 'marks' },
    { file: 'student_events.json', coll: 'student_activities' },
    { file: 'placements.json', coll: 'placements' },
    { file: 'research.json', coll: 'research' },
    { file: 'faculty_achievements.json', coll: 'faculty_achievements' },
    { file: 'accreditation_docs.json', coll: 'accreditation_items' }
];

// Memory maps to translate python string keys to MongoDB ObjectIds
const deptMap = {}; // 'CSE' -> ObjectId
const empMap = {};  // 'FAC001' -> ObjectId
const studentMap = {}; // 'STU1001' -> ObjectId

async function uploadData() {
    console.log("⏳ Connecting to Main MongoDB...");
    
    let mainUri = process.env.MONGO_URI;
    if (mainUri.includes("<db_password>")) {
        mainUri = mainUri.replace("<db_password>", encodeURIComponent(process.env.DB_PASSWORD || ""));
    }
    if (mainUri.includes("<db_username>")) {
        mainUri = mainUri.replace("<db_username>", encodeURIComponent(process.env.DB_USERNAME || ""));
    }

    try {
        await mongoose.connect(mainUri);
        console.log("✅ Main DB connected successfully.");
        
        for (const {file, coll} of uploadOrder) {
            const filepath = path.join(__dirname, file);
            if (!fs.existsSync(filepath)) {
                console.warn(`⚠️ Skipped: ${file} not found.`);
                continue;
            }

            const rawData = fs.readFileSync(filepath, 'utf8');
            let data = JSON.parse(rawData);

            if (data.length > 0) {
                // Ensure every document has a dedicated _id initialized so we can map it
                data.forEach(doc => {
                    if (!doc._id) doc._id = new mongoose.Types.ObjectId();
                });

                // Apply mappings and fixes based on collection
                if (coll === 'departments') {
                    data.forEach(doc => {
                        doc.name = doc.deptName;
                        doc.code = doc.deptId;
                        deptMap[doc.deptId] = doc._id; // Store for later
                    });
                }
                if (coll === 'faculties') {
                    data.forEach(doc => {
                        doc.user = new mongoose.Types.ObjectId(); // Mock user
                        if (doc.department && deptMap[doc.department]) {
                            doc.department = deptMap[doc.department];
                        } else if (doc.department === 'ALL' && Object.keys(deptMap).length > 0) {
                            doc.department = Object.values(deptMap)[0]; // Just assign the first dept for 'ALL'
                        }
                        empMap[doc.empId] = doc._id;
                    });
                }
                if (coll === 'students') {
                    data.forEach(doc => {
                        doc.name = doc.studentName;
                        doc.email = doc.rollNo.toLowerCase() + "@iqac.edu";
                        if (doc.department && deptMap[doc.department]) doc.department = deptMap[doc.department];
                        studentMap[doc.rollNo] = doc._id;
                    });
                }
                
                // Relational links for subsequent collections
                if (coll === 'semester_performances' || coll === 'student_attendances' || coll === 'marks' || coll === 'student_activities') {
                    data.forEach(doc => {
                        if (doc.rollNo && studentMap[doc.rollNo]) doc.student = studentMap[doc.rollNo];
                        if (coll === 'student_attendances') doc.academicYear = "2024-25"; // Fix missing academicYear
                    });
                }
                if (coll === 'placements' || coll === 'accreditation_items') {
                    data.forEach(doc => {
                        if (doc.deptId && deptMap[doc.deptId]) doc.department = deptMap[doc.deptId];
                        // AccreditationItem uses 'title' and 'type' enum
                        if (coll === 'accreditation_items') {
                            doc.title = doc.criteria;
                            doc.type = doc.accreditationBody;
                            doc.criterion = doc.criteria;
                        }
                    });
                }
                if (coll === 'research' || coll === 'faculty_achievements') {
                    data.forEach(doc => {
                        if (doc.empId && empMap[doc.empId]) doc.faculty = empMap[doc.empId];
                        if (doc.deptId && deptMap[doc.deptId]) doc.department = deptMap[doc.deptId];
                        if (coll === 'research') {
                            doc.title = `Research in ${doc.journal}`;
                        }
                    });
                }

                const collection = mongoose.connection.collection(coll);
                await collection.deleteMany({});
                await collection.insertMany(data);
                
                console.log(`✔️ Uploaded ${data.length} records to '${coll}' collection.`);
            }
        }
        
        console.log("\n🚀 ALL PYTHON JSON DATA UPLOADED SUCCESSFULLY!");
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("\n❌ Error uploading data:");
        if (err.writeErrors && err.writeErrors.length > 0) {
            console.error(err.writeErrors[0].err.errmsg);
        } else {
            console.error(err.message);
        }
        process.exit(1);
    }
}

uploadData();
