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

  const submitMarks = async (e) => {
    e.preventDefault();
    await client.post(`/faculty/students/${selectedStudent}/marks`, markForm);
    alert("Marks uploaded");
  };

  const submitAttendance = async (e) => {
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
