'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FaUser, FaLock, FaSignInAlt } from 'react-icons/fa';
import Image from 'next/image';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const result = login(username, password);
    if (!result.success) {
      setError(result.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-16 bg-white border border-gray-100 rounded-lg shadow-sm mb-4 overflow-hidden relative">
            <Image
              src="/images/vietnam-flag.svg"
              alt="Vietnam Flag"
              fill
              className="object-cover"
            />
          </div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-wide">Đăng nhập</h1>
          <p className="text-slate-500 font-medium">Vui lòng đăng nhập để bắt đầu ôn luyện</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-slate-700 font-bold mb-2 ml-1">Tên đăng nhập</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaUser className="text-slate-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                placeholder="Nhập tên đăng nhập..."
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-2 ml-1">Mật khẩu</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaLock className="text-slate-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                placeholder="Nhập mật khẩu..."
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-shake">
              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95"
          >
            <FaSignInAlt /> ĐĂNG NHẬP
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            Hệ thống ôn luyện nội bộ
          </p>
        </div>
      </div>
    </div>
  );
}
