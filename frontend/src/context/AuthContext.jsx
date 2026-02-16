import { createContext, useContext, useState, useEffect } from 'react';
import { authMe, authLogin, authRegister } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authMe()
      .then((data) => (data ? setUser(data.user) : setUser(null)))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { user: u, token } = await authLogin(email, password);
    localStorage.setItem('hemolink_token', token);
    setUser(u);
    return u;
  };

  const register = async (email, password, name, role) => {
    const { user: u, token } = await authRegister(email, password, name, role);
    localStorage.setItem('hemolink_token', token);
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('hemolink_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
