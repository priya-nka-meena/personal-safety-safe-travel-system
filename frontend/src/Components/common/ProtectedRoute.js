import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

/**
 * ProtectedRoute component - Protects routes based on authentication and role
 * @param {React.ReactNode} children - Child components to render if authorized
 * @param {string} role - Required role to access this route (student, parent, admin)
 */
const ProtectedRoute = ({ children, role }) => {
  const { token, role: userRole, isAuthenticated, sessionChecked } = useContext(AuthContext);

  if (!sessionChecked) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  // Check role match (case-insensitive comparison)
  if (role && userRole && role.toLowerCase() !== userRole.toLowerCase()) {
    // Redirect to appropriate dashboard based on user's actual role
    if (userRole.toLowerCase() === "student") {
      return <Navigate to="/student-dashboard" replace />;
    } else if (userRole.toLowerCase() === "parent") {
      return <Navigate to="/parent-dashboard" replace />;
    } else if (userRole.toLowerCase() === "admin" || userRole.toLowerCase() === "staff") {
      return <Navigate to="/admin-dashboard" replace />;
    }
    // Fallback to login if role doesn't match any dashboard
    return <Navigate to="/login" replace />;
  }

  // User is authenticated and has correct role
  return children;
};

export default ProtectedRoute;
