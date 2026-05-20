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

  const login = (username, password) => {
    // Danh sách người dùng cố định
    const users = {
      'Admin': '123456@',
      'User2': '123456a',
      'User3': '123456a'
    };

    if (users[username] && users[username] === password) {
      const userData = { username, isAdmin: username === 'Admin' };
      setUser(userData);
      localStorage.setItem('quiz_logged_in_user', JSON.stringify(userData));
      return { success: true };
    }
    return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác' };
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
