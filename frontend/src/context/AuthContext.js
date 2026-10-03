import { createContext, useState, useEffect } from "react";
import { logout as logoutApi, getCurrentUser, bootstrapCsrfCookie } from "../services/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [role, setRole] = useState(() => localStorage.getItem("role") || null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    if (role) {
      localStorage.setItem("role", role);
    } else {
      localStorage.removeItem("role");
    }
  }, [role]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await bootstrapCsrfCookie();

      const storedToken = localStorage.getItem("token");
      if (!storedToken) {
        if (!cancelled) setSessionChecked(true);
        return;
      }

      try {
        const me = await getCurrentUser();
        if (cancelled) return;

        if (me?.authenticated) {
          const resolvedRole = me.is_staff || me.is_superuser
            ? "admin"
            : (me.role || localStorage.getItem("role"))?.toLowerCase();
          setRole(resolvedRole);
        } else {
          setToken(null);
          setRole(null);
        }
      } catch {
        if (!cancelled) {
          setToken(null);
          setRole(null);
        }
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Validate stored session once on app load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * @param {string} tokenValue - Client marker (session cookie is authoritative)
   * @param {string} roleValue - student | parent | admin
   */
  const login = (tokenValue, roleValue) => {
    setToken(tokenValue);
    const normalized = roleValue?.toLowerCase() || roleValue;
    setRole(normalized);
    setSessionChecked(true);
  };

  const logout = async () => {
    await logoutApi();
    setToken(null);
    setRole(null);
    localStorage.removeItem("token");
    localStorage.removeItem("role");
  };

  const value = {
    token,
    role,
    login,
    logout,
    isAuthenticated: !!token,
    sessionChecked,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
