import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register, formatApiError, bootstrapCsrfCookie } from "../../services/api";
import RoleSelect from "./RoleSelect";
import "./Login.css";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "STUDENT",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      await bootstrapCsrfCookie();
      const nameParts = formData.name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      const username = formData.email.split("@")[0];

      const response = await register(
        username,
        formData.email,
        formData.password,
        formData.role, // STUDENT or PARENT
        firstName,
        lastName
      );

      if (response.success) {
        alert("Registration successful! Please sign in with your new account.");
        navigate("/login");
      } else {
        setError(response.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      const data = err.response?.data || err;
      let errorMessage = formatApiError(err);

      if (data?.errors && typeof data.errors === "object") {
        const errorFields = Object.keys(data.errors);
        const firstError = errorFields[0];
        if (firstError) {
          const firstErrorMsg = Array.isArray(data.errors[firstError])
            ? data.errors[firstError][0]
            : data.errors[firstError];
          errorMessage = `${firstError}: ${firstErrorMsg}`;
        }
      } else if (data?.username) {
        errorMessage = `Username: ${Array.isArray(data.username) ? data.username[0] : data.username}`;
      } else if (data?.email) {
        errorMessage = `Email: ${Array.isArray(data.email) ? data.email[0] : data.email}`;
      } else if (data?.password) {
        errorMessage = `Password: ${Array.isArray(data.password) ? data.password[0] : data.password}`;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="card shadow-lg">
          <div className="card-body p-5">
            <h2 className="text-center mb-4">Create Account</h2>
            <p className="text-center text-muted small mb-4">
              Join the Safe Travel System as a student or parent
            </p>
            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                className="form-control mb-2"
                disabled={loading}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="form-control mb-2"
                disabled={loading}
                required
              />
              <RoleSelect
                value={formData.role}
                onChange={(val) => setFormData({ ...formData, role: val })}
                disabled={loading}
              />
              <input
                type="password"
                name="password"
                placeholder="Password (min 8 characters)"
                value={formData.password}
                onChange={handleChange}
                className="form-control mb-2"
                disabled={loading}
                required
              />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-control mb-3"
                disabled={loading}
                required
              />
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Registering…
                  </>
                ) : (
                  "Register"
                )}
              </button>
            </form>

            <p className="text-center mt-3">
              Already have an account? <Link to="/login">Login here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
