import { useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const dashboardPath = (r) => {
  if (!r) return "/login";
  const x = r.toLowerCase();
  if (x === "student") return "/student-dashboard";
  if (x === "parent") return "/parent-dashboard";
  if (x === "admin" || x === "staff") return "/admin-dashboard";
  return "/login";
};

/**
 * Responsive safety-platform navbar with role-based home link.
 */
const AppNavbar = ({ title, subtitle }) => {
  const { role, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
      <div className="container-fluid">
        <Link className="navbar-brand fw-semibold text-white text-decoration-none" to={dashboardPath(role)}>
          <span className="me-1" aria-hidden="true">
            🛡️
          </span>
          {title}
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-controls="mainNavbar"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="mainNavbar">
          <div className="navbar-nav me-auto mb-2 mb-lg-0">
            {subtitle ? (
              <span className="nav-link text-white-50 small d-lg-inline py-lg-2">{subtitle}</span>
            ) : null}
          </div>
          <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-2">
            <span className="badge bg-light text-primary text-uppercase">{role || "unknown"}</span>
            <button type="button" className="btn btn-outline-light btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AppNavbar;
