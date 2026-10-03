import { useEffect, useState } from "react";
import AppNavbar from "../common/AppNavbar";
import { getAdminOverview, formatApiError } from "../../services/api";
import "../Dashboard.css";

const StatCard = ({ title, value, hint, color = "primary" }) => (
  <div className="card shadow-sm h-100 border-0">
    <div className={`card-header bg-${color} text-white fw-semibold`}>{title}</div>
    <div className="card-body">
      {value === null || value === undefined ? (
        <div className="spinner-border spinner-border-sm text-secondary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      ) : (
        <div className="display-6 fw-bold">{value}</div>
      )}
      {hint ? <div className="text-muted small mt-2">{hint}</div> : null}
    </div>
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAdminOverview();
        if (!cancelled && data?.success) {
          setStats(data);
        } else if (!cancelled) {
          setError(data?.message || "Unable to load statistics.");
        }
      } catch (e) {
        if (!cancelled) setError(formatApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    { title: "Total users", key: "total_users", color: "primary", hint: "All accounts" },
    { title: "Students", key: "total_students", color: "success", hint: "Student role" },
    { title: "Parents", key: "total_parents", color: "info", hint: "Parent role" },
    {
      title: "Active travel sessions",
      key: "active_travel_sessions",
      color: "warning",
      hint: "In progress now",
    },
    { title: "SOS alerts", key: "sos_alerts", color: "danger", hint: "All-time alerts" },
    {
      title: "Active SOS alerts",
      key: "active_sos_alerts",
      color: "danger",
      hint: "Currently active",
    },
    {
      title: "Student–parent links",
      key: "student_parent_links",
      color: "secondary",
      hint: "Pairings in the system",
    },
  ];

  return (
    <div className="dashboard-container">
      <AppNavbar title="Admin Dashboard" subtitle="System statistics and health" />

      <div className="container py-4">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {loading && !error && (
          <div className="d-flex justify-content-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading…</span>
            </div>
          </div>
        )}

        {!loading && stats && (
          <div className="row g-4">
            {cards.map((c) => (
              <div className="col-12 col-md-6 col-xl-4" key={c.key}>
                <StatCard
                  title={c.title}
                  value={stats[c.key]}
                  hint={c.hint}
                  color={c.color}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
