import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import HodDashboard from "./pages/HodDashboard.jsx";
import FacultyDashboard from "./pages/FacultyDashboard.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

const HomeRedirect = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/auth" replace />;
  return <Navigate to="/home" replace />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/start" element={<HomeRedirect />} />
      <Route path="/auth" element={<LoginPage />} />

      <Route
        path="/home"
        element={
          <ProtectedRoute allowedRoles={["admin", "hod", "faculty", "student"]}>
            <AppLayout>
              <HomePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AppLayout>
              <AdminDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/hod"
        element={
          <ProtectedRoute allowedRoles={["hod"]}>
            <AppLayout>
              <HodDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/faculty"
        element={
          <ProtectedRoute allowedRoles={["faculty", "hod"]}>
            <AppLayout>
              <FacultyDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <AppLayout>
              <StudentDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
