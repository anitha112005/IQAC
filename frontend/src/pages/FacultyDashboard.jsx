import { useEffect, useState } from "react";
import client from "../api/client";

export default function FacultyDashboard() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [markForm, setMarkForm] = useState({
    subjectCode: "CS401",
    subjectName: "Data Structures",
    semester: 4,
    academicYear: "2025-26",
    internal: 24,
    external: 48,
    total: 72,
    passed: true
  });
  const [attendanceForm, setAttendanceForm] = useState({
    semester: 4,
    academicYear: "2025-26",
    totalClasses: 90,
    attendedClasses: 72
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await client.get("/students");
      setStudents(data.data || []);
      if (data.data?.length) setSelectedStudent(data.data[0]._id);
    };

    load();
  }, []);

  useEffect(() => {
    if (!selectedSection) return;
    const filtered = students.filter((student) => String(student.section?._id || student.section) === String(selectedSection));
    setSectionStudents(filtered);
    setAttendanceRows(
      filtered.map((student) => ({
        studentId: student._id,
        name: student.name,
        rollNo: student.rollNo,
        status: "PRESENT"
      }))
    );
  }, [selectedSection, students]);

  const chartData = useMemo(() => {
    const rows = portal?.sectionAnalytics || [];
    return {
      labels: rows.map((r) => `Sec ${r.section}`),
      datasets: [
        {
          label: "Average Marks",
          data: rows.map((r) => r.averageMarks),
          backgroundColor: "#0D6EFD"
        },
        {
          label: "Pass %",
          data: rows.map((r) => r.passPercent),
          backgroundColor: "#66D1C1"
        }
      ]
    };
  }, [portal]);

  const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          boxWidth: 8
        }
      }
    },
    scales: {
      x: {
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: { stepSize: 10 }
      }
    }
  };

  const notify = (type, text) => setStatus({ type, text });

  const createAssignment = async (e) => {
    e.preventDefault();
    await client.post("/faculty/assignments", assignmentForm);
    await loadPortal();
    notify("success", "Teaching assignment saved.");
  };

  const selectAssignment = async (value) => {
    setSelectedAssignment(value);
    if (!value) return;

    const assignment = portal.assignments.find((a) => a._id === value);
    if (!assignment) return;

    const { data } = await client.get(`/faculty/sections/${assignment.section}/students?semester=${assignment.semester}`);
    setSectionStudents(data.data || []);
    setMarkRows(
      (data.data || []).map((student) => ({
        studentId: student._id,
        rollNo: student.rollNo,
        name: student.name,
        internal: 20,
        external: 40,
        total: 60
      }))
    );
  };

  const updateMarkRow = (studentId, field, value) => {
    setMarkRows((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        const updated = { ...row, [field]: Number(value) };
        updated.total = Number(updated.internal) + Number(updated.external);
        return updated;
      })
    );
  };

  const uploadSectionMarks = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    const assignment = portal.assignments.find((a) => a._id === selectedAssignment);
    if (!assignment) return;

    await client.post(`/faculty/sections/${assignment.section}/marks/bulk`, {
      semester: assignment.semester,
      academicYear: assignment.academicYear,
      subjectCode: assignment.subjectCode,
      subjectName: assignment.subjectName,
      credits: 3,
      marks: markRows.map((row) => ({
        studentId: row.studentId,
        internal: row.internal,
        external: row.external,
        total: row.total
      }))
    });

    await loadPortal();
    notify("success", "Section marks uploaded successfully.");
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    await client.post(`/faculty/students/${selectedStudent}/attendance`, attendanceForm);
    alert("Attendance uploaded");
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl text-brand-ink">Faculty Data Entry Panel</h2>

      <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
        <label className="text-sm text-brand-ink/70">Select Student</label>
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="mt-2 w-full rounded-lg border border-brand-ink/20 px-3 py-2"
        >
          {students.map((student) => (
            <option key={student._id} value={student._id}>
              {student.rollNo} - {student.name}
            </option>
          ))}
        </select>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={submitMarks} className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Upload Marks</h3>
          <div className="mt-3 grid gap-3">
            <input
              placeholder="Subject Code"
              value={markForm.subjectCode}
              onChange={(e) => setMarkForm((prev) => ({ ...prev, subjectCode: e.target.value }))}
              className="rounded-lg border border-brand-ink/20 px-3 py-2"
            />
            <input
              placeholder="Subject Name"
              value={markForm.subjectName}
              onChange={(e) => setMarkForm((prev) => ({ ...prev, subjectName: e.target.value }))}
              className="rounded-lg border border-brand-ink/20 px-3 py-2"
            />
            <input
              type="number"
              placeholder="Total"
              value={markForm.total}
              onChange={(e) => setMarkForm((prev) => ({ ...prev, total: Number(e.target.value) }))}
              className="rounded-lg border border-brand-ink/20 px-3 py-2"
            />
          </div>
          <button className="mt-3 rounded-lg bg-brand-ink px-4 py-2 text-white">Upload Marks</button>
        </form>

        <form onSubmit={submitAttendance} className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Upload Attendance</h3>
          <div className="mt-3 grid gap-3">
            <input
              type="number"
              placeholder="Total Classes"
              value={attendanceForm.totalClasses}
              onChange={(e) => setAttendanceForm((prev) => ({ ...prev, totalClasses: Number(e.target.value) }))}
              className="rounded-lg border border-brand-ink/20 px-3 py-2"
            />
            <input
              type="number"
              placeholder="Attended Classes"
              value={attendanceForm.attendedClasses}
              onChange={(e) => setAttendanceForm((prev) => ({ ...prev, attendedClasses: Number(e.target.value) }))}
              className="rounded-lg border border-brand-ink/20 px-3 py-2"
            />
          </div>
          <button className="mt-3 rounded-lg bg-brand-ocean px-4 py-2 text-white">Upload Attendance</button>
        </form>
      </section>
    </div>
  );
}
