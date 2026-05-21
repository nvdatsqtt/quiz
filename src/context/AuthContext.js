'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Kiểm tra thông tin đăng nhập từ localStorage khi khởi tạo
    const savedUser = localStorage.getItem('quiz_logged_in_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const userData = { username: data.username, isAdmin: data.role === 'Admin', role: data.role };
        setUser(userData);
        localStorage.setItem('quiz_logged_in_user', JSON.stringify(userData));
        return { success: true };
      } else {
        return { success: false, message: data.error || 'Đăng nhập thất bại' };
      }
    } catch (error) {
      console.error('Lỗi khi gọi API đăng nhập:', error);
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('quiz_logged_in_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
