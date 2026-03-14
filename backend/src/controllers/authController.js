import User from "../models/User.js";
import Student from "../models/Student.js";
import { signToken } from "../utils/jwt.js";

const normalizeIncomingRole = (role) => {
  if (role === "department") return "hod";
  return role;
};

export const register = async (req, res) => {
  const { name, email, password, role, department, studentProfile } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: "Email already registered" });
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    department,
    studentProfile
  });

  if (role === "student" && studentProfile) {
    await Student.findByIdAndUpdate(studentProfile, { email });
  }

  return res.status(201).json({
    success: true,
    message: "User registered",
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};

export const login = async (req, res) => {
  const { email, password, role } = req.body;
  const normalizedRole = normalizeIncomingRole(role);

  const user = await User.findOne({ email }).populate("department", "name code").populate("studentProfile");

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  if (normalizedRole && user.role !== normalizedRole) {
    return res.status(401).json({ success: false, message: "Role does not match this account" });
  }

  const token = signToken({ id: user._id, role: user.role });

  return res.status(200).json({
    success: true,
    token,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      studentProfile: user.studentProfile
    }
  });
};

export const me = async (req, res) => {
  return res.status(200).json({ success: true, data: req.user });
};

export const publicRegister = async (req, res) => {
  const { name, email, password, role, registrationNumber, facultyId } = req.body;
  const normalizedRole = normalizeIncomingRole(role);
  const allowedRoles = ["student", "hod", "admin", "faculty"];

  if (!allowedRoles.includes(normalizedRole)) {
    return res.status(400).json({ success: false, message: "Invalid role for signup" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: "Email already registered" });
  }

  if (normalizedRole === "student" && !registrationNumber?.trim()) {
    return res.status(400).json({ success: false, message: "Registration number is required for student signup" });
  }

  if (normalizedRole === "faculty" && !facultyId?.trim()) {
    return res.status(400).json({ success: false, message: "Faculty ID is required for faculty signup" });
  }

  if (registrationNumber?.trim()) {
    const existingRegistration = await User.findOne({ registrationNumber: registrationNumber.trim().toUpperCase() });
    if (existingRegistration) {
      return res.status(400).json({ success: false, message: "Registration number already exists" });
    }
  }

  if (facultyId?.trim()) {
    const existingFacultyId = await User.findOne({ facultyId: facultyId.trim().toUpperCase() });
    if (existingFacultyId) {
      return res.status(400).json({ success: false, message: "Faculty ID already exists" });
    }
  }

  const user = await User.create({
    name,
    email,
    password,
    role: normalizedRole,
    registrationNumber: registrationNumber?.trim() ? registrationNumber.trim().toUpperCase() : undefined,
    facultyId: facultyId?.trim() ? facultyId.trim().toUpperCase() : undefined
  });

  return res.status(201).json({
    success: true,
    message: "Signup successful. Please login.",
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      registrationNumber: user.registrationNumber,
      facultyId: user.facultyId
    }
  });
};
