import { useContext, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { login as loginAPI, formatApiError } from "../../services/api";
import "./Login.css";

const dashboardForRole = (role) => {
  if (role === "admin") return "/admin-dashboard";
  if (role === "parent") return "/parent-dashboard";
  return "/student-dashboard";
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, role } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && role) {
      navigate(dashboardForRole(role), { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginAPI(email, password);

      if (response.success) {
        const token = `session_${response.user_id}_${Date.now()}`;
        let userRole = response.role?.toLowerCase() || "student";

        if (response.is_staff || response.is_superuser) {
          userRole = "admin";
        }

        login(token, userRole);

        if (userRole === "admin") {
          navigate("/admin-dashboard");
        } else if (userRole === "parent") {
          navigate("/parent-dashboard");
        } else {
          navigate("/student-dashboard");
        }
      } else {
        setError(response.message || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="card shadow-lg">
          <div className="card-body p-5">
            <div className="text-center mb-4">
              <h2 className="card-title mb-2">Safe Travel System</h2>
              <p className="text-muted">Personal safety monitoring — sign in to continue</p>
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">
                  Email or Username
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Enter email or username"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Enter password"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 mb-3"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </button>

              <div className="text-center">
                <p className="mb-0">
                  Don't have an account?{" "}
                  <Link to="/register" className="text-primary">
                    Register here
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
