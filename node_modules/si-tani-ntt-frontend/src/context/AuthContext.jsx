import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("sitani_token");
    if (!token) {
      setReady(true);
      return;
    }

    api.get("/api/auth/me")
      .then(setUser)
      .catch(() => localStorage.removeItem("sitani_token"))
      .finally(() => setReady(true));
  }, []);

  const login = async (email, password) => {
    const data = await api.post("/api/auth/login", { email, password });
    localStorage.setItem("sitani_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = (payload) => api.post("/api/auth/register", payload);

  const logout = () => {
    localStorage.removeItem("sitani_token");
    setUser(null);
  };

  const value = useMemo(() => ({ user, ready, login, register, logout, setUser }), [user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
