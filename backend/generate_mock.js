import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NUM_STUDENTS = 300;

// Base Data
const firstNames = ["Ravi", "Priya", "Arun", "Mounika", "Sai", "Lakshmi", "Venkat", "Divya", "Haritha", "Pavani", "Santhosh", "Kiran", "Naveen", "Swathi", "Rahul", "Anjali", "Karthik", "Sneha", "Prasad", "Bhavani"];
const lastNames = ["Kumar", "Devi", "Teja", "Reddy", "Charan", "Prasad", "Rao", "Sri", "Naga", "Krishna", "Babu", "Naidu", "Sharma", "Varma", "Chowdary", "Patel", "Singh"];

function getRandomName() {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
}

// Distributions
const depts = [
  { code: "CSE", count: 80, current: 1 },
  { code: "ECE", count: 65, current: 1 },
  { code: "MECH", count: 55, current: 1 },
  { code: "IT", count: 55, current: 1 },
  { code: "CIVIL", count: 45, current: 1 }
];

const batches = [
  { name: "2021-2025", sems: [7, 8] },
  { name: "2022-2026", sems: [5, 6] },
  { name: "2023-2027", sems: [3, 4] },
  { name: "2024-2028", sems: [1, 2] } 
];

function getRandomNum(min, max, decimals = 2) {
  const num = Math.random() * (max - min) + min;
  return Number(num.toFixed(decimals));
}

const mockData = [];

// Enforce Risk Distributions
const riskTargets = {
  LOW: Math.floor(NUM_STUDENTS * 0.50), // 150
  MEDIUM: Math.floor(NUM_STUDENTS * 0.30), // 90
  HIGH: Math.floor(NUM_STUDENTS * 0.20) // 60
};
riskTargets.LOW += NUM_STUDENTS - (riskTargets.LOW + riskTargets.MEDIUM + riskTargets.HIGH);

let riskCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };

for (let i = 0; i < NUM_STUDENTS; i++) {
  let assignedDept = depts.find(d => d.current <= d.count);
  if (!assignedDept) assignedDept = depts[0]; 
  
  // Format rollNo: e.g., 231FA04442
  const baseRoll = 2310000000;
  const rollSuffix = (4000 + i).toString(); // e.g. 4000 to 4299
  const rollNo = `231FA0${rollSuffix}`;
  
  assignedDept.current++;

  const studentName = getRandomName();

  let simulationRiskLevel; // We use this purely to seed realistic metrics, but DO NOT output it
  const availRisks = Object.keys(riskTargets).filter(k => riskCounts[k] < riskTargets[k]);
  if (availRisks.length > 0) {
    simulationRiskLevel = availRisks[Math.floor(Math.random() * availRisks.length)];
  } else {
    simulationRiskLevel = "LOW"; 
  }
  riskCounts[simulationRiskLevel]++;

  let cgpa, sgpa, attendancePercent, backlogCount;

  if (simulationRiskLevel === "LOW") {
    cgpa = getRandomNum(7.5, 9.9);
    sgpa = getRandomNum(Math.max(4.5, cgpa - 0.8), Math.min(10.0, cgpa + 0.8));
    attendancePercent = Math.floor(getRandomNum(75, 99, 0));
    backlogCount = Math.random() > 0.8 ? 1 : 0; 
  } else if (simulationRiskLevel === "MEDIUM") {
    cgpa = getRandomNum(6.0, 7.4);
    sgpa = getRandomNum(Math.max(4.5, cgpa - 0.8), Math.min(10.0, cgpa + 0.8));
    attendancePercent = Math.floor(getRandomNum(65, 74, 0));
    backlogCount = Math.floor(getRandomNum(1, 4, 0)); 
  } else { 
    cgpa = getRandomNum(4.5, 5.9);
    sgpa = getRandomNum(Math.max(4.5, cgpa - 0.5), cgpa + 0.5);
    attendancePercent = Math.floor(getRandomNum(45, 64, 0));
    backlogCount = Math.floor(getRandomNum(3, 6, 0)); 
  }

  const batchObj = batches[Math.floor(Math.random() * batches.length)];
  const batch = batchObj.name;
  const currentSemester = batchObj.sems[Math.floor(Math.random() * batchObj.sems.length)];

  let academicYear = "2024-25";

  mockData.push({
    rollNo,
    studentName,
    department: assignedDept.code,
    batch,
    currentSemester,
    sgpa,
    cgpa,
    attendancePercent,
    backlogCount,
    academicYear
  });
}

const dirPath = path.join(__dirname, 'newfolder');
if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
}

fs.writeFileSync(path.join(dirPath, 'mock_data.json'), JSON.stringify(mockData, null, 2));

console.log(`Generated ${mockData.length} records in newfolder/mock_data.json`);
