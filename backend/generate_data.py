import json
import random

random.seed(42)

# ---------------------------------------------------
# BASIC DATA
# ---------------------------------------------------

FIRST_NAMES = [
    "Ravi","Priya","Arun","Mounika","Kiran","Divya",
    "Sai","Venkat","Haritha","Pavani","Santhosh",
    "Lakshmi","Sneha","Rahul"
]

LAST_NAMES = [
    "Kumar","Reddy","Rao","Naidu","Patel","Singh",
    "Teja","Varma","Chowdary","Krishna","Charan","Devi"
]

DEPARTMENTS = ["CSE","ECE","MECH"]

SUBJECT_COUNT = 5

BATCHES = {
    "2021-2025":[7,8],
    "2022-2026":[5,6],
    "2023-2027":[3,4],
    "2024-2028":[1,2]
}

ACADEMIC_YEARS = ["2022-23","2023-24","2024-25"]
CURRENT_YEAR = "2024-25"


# ---------------------------------------------------
# HELPER FUNCTIONS
# ---------------------------------------------------

def generate_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def generate_subjects(dept):
    return [f"{dept}{101+i}" for i in range(SUBJECT_COUNT)]


# ---------------------------------------------------
# COLLECTIONS
# ---------------------------------------------------

departments=[]
faculty=[]
faculty_attendance=[]
students=[]
semester_performance=[]
student_attendance=[]
marks=[]
student_events=[]
placements=[]
research=[]
faculty_achievements=[]
accreditation_docs=[]


# ---------------------------------------------------
# CREATE DEPARTMENTS
# ---------------------------------------------------

for dept in DEPARTMENTS:

    departments.append({
        "deptId":dept,
        "deptName":f"{dept} Engineering"
    })


# ---------------------------------------------------
# CREATE FACULTY
# ---------------------------------------------------

faculty_refs={}

emp_counter=1

# Dean
faculty.append({
    "empId":f"FAC{emp_counter:03}",
    "name":f"Dr {generate_name()}",
    "role":"Dean",
    "department":"ALL"
})

emp_counter+=1

for dept in DEPARTMENTS:

    faculty_refs[dept]=[]

    for i in range(5):

        role="HOD" if i==0 else "Faculty"

        empId=f"FAC{emp_counter:03}"

        faculty.append({
            "empId":empId,
            "name":f"Dr {generate_name()}",
            "role":role,
            "department":dept
        })

        faculty_refs[dept].append(empId)

        emp_counter+=1


# ---------------------------------------------------
# FACULTY ATTENDANCE
# ---------------------------------------------------

for f in faculty:

    for month in ["Aug 2024","Sep 2024","Oct 2024"]:

        total_days=22
        present_days=random.randint(19,22)

        faculty_attendance.append({
            "empId":f["empId"],
            "month":month,
            "totalWorkingDays":total_days,
            "daysPresent":present_days
        })


# ---------------------------------------------------
# STUDENT GENERATION
# ---------------------------------------------------

roll_counter=1001

for dept in DEPARTMENTS:

    subjects=generate_subjects(dept)

    for i in range(30):

        roll=f"STU{roll_counter}"
        roll_counter+=1

        batch=random.choice(list(BATCHES.keys()))
        semester=random.choice(BATCHES[batch])

        cgpa=round(random.uniform(5,9.5),2)
        attendance=random.randint(60,95)
        backlog=random.randint(0,2)

        students.append({
            "rollNo":roll,
            "studentName":generate_name(),
            "department":dept,
            "batch":batch,
            "currentSemester":semester,
            "cgpa":cgpa,
            "attendancePercent":attendance,
            "backlogCount":backlog,
            "academicYear":CURRENT_YEAR
        })


# ---------------------------------------------------
# SEMESTER PERFORMANCE (CGPA TREND)
# ---------------------------------------------------

        prev_cgpa=5

        for s in range(1,semester+1):

            sgpa=round(random.uniform(5,9),2)

            prev_cgpa=round((prev_cgpa+sgpa)/2,2)

            semester_performance.append({
                "rollNo":roll,
                "semester":s,
                "sgpa":sgpa,
                "cgpa":prev_cgpa,
                "academicYear":CURRENT_YEAR
            })


# ---------------------------------------------------
# STUDENT ATTENDANCE
# ---------------------------------------------------

        for sub in subjects:

            total_classes=40
            attended=random.randint(25,40)

            student_attendance.append({
                "rollNo":roll,
                "subjectCode":sub,
                "semester":semester,
                "totalClasses":total_classes,
                "attendedClasses":attended,
                "percentage":round(attended/total_classes*100,2)
            })


# ---------------------------------------------------
# MARKS
# ---------------------------------------------------

        fail_subjects=set(random.sample(range(SUBJECT_COUNT),backlog))

        for i,sub in enumerate(subjects):

            fail=i in fail_subjects

            internal=random.randint(10,30)
            external=random.randint(20,70)

            total=internal+external

            marks.append({
                "rollNo":roll,
                "semester":semester,
                "subjectCode":sub,
                "internalMarks":internal,
                "externalMarks":external,
                "totalMarks":total,
                "status":"FAIL" if fail else "PASS",
                "academicYear":CURRENT_YEAR
            })


# ---------------------------------------------------
# STUDENT EVENTS
# ---------------------------------------------------

        for _ in range(random.randint(0,2)):

            student_events.append({
                "rollNo":roll,
                "eventName":random.choice(["Hackathon","Coding Contest","Tech Fest"]),
                "eventType":random.choice(["Technical","Sports","Cultural"]),
                "position":random.choice(["Participant","Winner","Runner Up"]),
                "year":"2024"
            })


# ---------------------------------------------------
# PLACEMENTS
# ---------------------------------------------------

for dept in DEPARTMENTS:

    for year in ACADEMIC_YEARS:

        eligible=random.randint(60,100)
        placed=int(eligible*random.uniform(0.6,0.9))

        placements.append({
            "deptId":dept,
            "academicYear":year,
            "totalEligible":eligible,
            "totalPlaced":placed,
            "placementPercentage":round(placed/eligible*100,2)
        })


# ---------------------------------------------------
# RESEARCH PUBLICATIONS
# ---------------------------------------------------

for dept in DEPARTMENTS:

    for emp in faculty_refs[dept]:

        for _ in range(random.randint(1,2)):

            research.append({
                "pubId":f"PUB{random.randint(1000,9999)}",
                "empId":emp,
                "deptId":dept,
                "journal":random.choice(["IEEE","Springer","Elsevier"]),
                "year":random.choice(["2022","2023","2024"]),
                "accreditationMapping":random.choice(["NAAC-C3","NBA-C5"])
            })


# ---------------------------------------------------
# FACULTY ACHIEVEMENTS
# ---------------------------------------------------

for f in faculty:

    if random.random()<0.6:

        faculty_achievements.append({
            "empId":f["empId"],
            "achievementType":random.choice(["Award","Patent","Grant"]),
            "title":"Research Excellence",
            "year":"2024"
        })


# ---------------------------------------------------
# ACCREDITATION DOCUMENTS
# ---------------------------------------------------

for dept in DEPARTMENTS:

    for body in ["NBA","NAAC"]:

        for c in range(1,8):

            accreditation_docs.append({
                "docId":f"DOC{random.randint(1000,9999)}",
                "deptId":dept,
                "accreditationBody":body,
                "criteria":f"Criterion-{c}",
                "status":random.choice(["Uploaded","Pending","Verified"]),
                "academicYear":CURRENT_YEAR
            })


# ---------------------------------------------------
# EXPORT JSON FILES
# ---------------------------------------------------

datasets={
"departments.json":departments,
"faculty.json":faculty,
"faculty_attendance.json":faculty_attendance,
"students.json":students,
"semester_performance.json":semester_performance,
"student_attendance.json":student_attendance,
"marks.json":marks,
"student_events.json":student_events,
"placements.json":placements,
"research.json":research,
"faculty_achievements.json":faculty_achievements,
"accreditation_docs.json":accreditation_docs
}

for filename,data in datasets.items():

    with open(filename,"w") as f:
        json.dump(data,f,indent=2)

print("Dataset generated successfully.")
