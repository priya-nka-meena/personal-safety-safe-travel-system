import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./Components/auth/Login";
import Register from "./Components/auth/Register";

import ProtectedRoute from "./Components/common/ProtectedRoute";

import StudentDashboard from "./Components/dashboards/StudentDashboard";
import ParentDashboard from "./Components/dashboards/ParentDashboard";
import AdminDashboard from "./Components/dashboards/AdminDashboard";
import { bootstrapCsrfCookie } from "./services/api";

function App() {
  useEffect(() => {
    bootstrapCsrfCookie();
  }, []);

  return (
    <BrowserRouter>
      <Routes>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Student dashboard */}
        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute role="STUDENT">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* Parent dashboard */}
        <Route
          path="/parent-dashboard"
          element={
            <ProtectedRoute role="PARENT">
              <ParentDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin dashboard */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute role="ADMIN">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Backward compatible routes */}
        <Route path="/student" element={<Navigate to="/student-dashboard" replace />} />
        <Route path="/parent" element={<Navigate to="/parent-dashboard" replace />} />
        <Route path="/admin" element={<Navigate to="/admin-dashboard" replace />} />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;