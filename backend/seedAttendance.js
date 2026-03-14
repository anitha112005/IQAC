import mongoose from 'mongoose';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const defaultUri = "mongodb+srv://suresurya20051207_db_user:<db_password>@cluster0.sv7xozx.mongodb.net/attendence_patterns?appName=Cluster0";

console.log("=== Seed Attendance Patterns ===");
console.log(`Target Database: attendence_patterns`);

rl.question('🔑 Please enter the password for suresurya20051207_db_user: ', async (password) => {
    rl.close();
    
    // Replace <db_password> with URL-encoded password
    const uri = defaultUri.replace('<db_password>', encodeURIComponent(password.trim()));
    
    try {
        console.log("\n⏳ Connecting to MongoDB Atlas cluster0...");
        await mongoose.connect(uri);
        console.log("✅ Connected successfully to attendence_patterns database!");

        // 1. Define Attendance Pattern Schema
        const attendancePatternSchema = new mongoose.Schema({
            rollNo: { type: String, required: true },
            name: { type: String, required: true },
            department: { type: String, required: true },
            attendancePercentage: { type: Number, required: true },
            patternType: { type: String, required: true },
            riskLevel: { type: String, required: true },
            recordedAt: { type: Date, default: Date.now }
        });

        // 2. Create Model in 'attendence_patterns' DB
        const Attendance = mongoose.model('AttendancePattern', attendancePatternSchema);

        console.log("\n🧹 Clearing any existing sample attendance data...");
        await Attendance.deleteMany({});
        console.log("Data cleared.");

        // 3. Generate Sample Data
        console.log("\n⚙️ Generating realistic sample attendance patterns...");
        const sampleData = [
            { rollNo: "231FA04001", name: "Ravi Kumar", department: "CSE", attendancePercentage: 62, patternType: "Chronically Absent Mondays", riskLevel: "HIGH" },
            { rollNo: "231FA04002", name: "Priya Devi", department: "ECE", attendancePercentage: 95, patternType: "Consistent Attendance", riskLevel: "LOW" },
            { rollNo: "231FA04003", name: "Arun Teja", department: "MECH", attendancePercentage: 58, patternType: "Continuous Extended Leaves (3+ days)", riskLevel: "HIGH" },
            { rollNo: "231FA04004", name: "Mounika Reddy", department: "IT", attendancePercentage: 78, patternType: "Late Arrivals in Morning Sessions", riskLevel: "MEDIUM" },
            { rollNo: "231FA04005", name: "Sai Charan", department: "CIVIL", attendancePercentage: 42, patternType: "Irregular/Unpredictable Outages", riskLevel: "HIGH" },
            { rollNo: "231FA04006", name: "Lakshmi Prasad", department: "CSE", attendancePercentage: 88, patternType: "Proxy Suspected (Irregular biometric)", riskLevel: "MEDIUM" },
            { rollNo: "231FA04007", name: "Venkat Rao", department: "ECE", attendancePercentage: 70, patternType: "Frequent Afternoon Absences", riskLevel: "MEDIUM" },
            { rollNo: "231FA04008", name: "Divya Sri", department: "IT", attendancePercentage: 98, patternType: "Consistent Attendance", riskLevel: "LOW" },
            { rollNo: "231FA04009", name: "Haritha Naga", department: "CIVIL", attendancePercentage: 64, patternType: "Medical/Health Leaves", riskLevel: "HIGH" },
            { rollNo: "231FA04010", name: "Pavani Krishna", department: "MECH", attendancePercentage: 81, patternType: "Sports Quota Leaves", riskLevel: "LOW" }
        ];

        // 4. Save and Show Progress
        let count = 0;
        for (const data of sampleData) {
            await Attendance.create(data);
            count++;
            console.log(`➜ [${count}/${sampleData.length}] Saved pattern for: ${data.name} (${data.rollNo}) - ${data.patternType}`);
            // Small artificial delay to show console progress realistically
            await new Promise(resolve => setTimeout(resolve, 200)); 
        }

        console.log("\n🎉 SUCCESS: All sample attendance patterns saved to the DB.");
        console.log("Closing connection...");
        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error("\n❌ MongoDB Error:");
        console.error(error.message);
        if (error.message.includes('authentication failed')) {
            console.error("💡 Hint: Double check your database password. The password is case-sensitive.");
        }
        process.exit(1);
    }
});
