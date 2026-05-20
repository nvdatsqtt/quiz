'use client';

/**
 * Tác giả: Nguyễn Văn Đạt | Email: nguyenvandatsqtt@gmail.com
 * Mô tả: Trang chủ hiển thị danh sách các chủ đề trắc nghiệm để người dùng lựa chọn luyện tập.
 * Đã cập nhật hệ thống đăng nhập và hiển thị lịch sử ôn tập.
 */

import { useEffect, useState } from "react";
import SubjectCard from '@/components/SubjectCard';
import Login from '@/components/Login';
import HistorySection from '@/components/HistorySection';
import { useAuth } from '@/context/AuthContext';
// Import trực tiếp câu hỏi tĩnh từ file JSON để tải ngay lập tức, tránh lỗi mạng ở chế độ dev
import questionsData from "../../public/data/questions.json";

export default function Home() {
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  // Tải danh sách các chủ đề trực tiếp từ dữ liệu JSON được import tĩnh
  const loadSubjects = () => {
    setLoading(true);
    setError(null);
    try {
      if (questionsData && questionsData.subjects) {
        setSubjects(questionsData.subjects);
      } else {
        throw new Error("Định dạng dữ liệu câu hỏi không hợp lệ (thiếu subjects)");
      }
    } catch (err) {
      console.error("Lỗi tải danh sách chủ đề:", err);
      setError(err.message || "Lỗi xử lý dữ liệu câu hỏi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center">
      {/* Tiêu đề ứng dụng */}
      <h1 className="text-4xl font-bold text-blue-600 mb-2 uppercase tracking-tight">Website trắc nghiệm</h1>
      
      {/* Chào mừng người dùng */}
      <div className="bg-white px-6 py-2 rounded-full shadow-sm border border-blue-100 mb-8 flex items-center gap-2">
        <span className="text-gray-500 font-medium">Chào mừng học viên:</span>
        <span className="text-blue-700 font-black">{user.username}</span>
      </div>

      {/* Grid hiển thị các chủ đề */}
      <div className="w-full max-w-screen-xl space-y-12">
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-2 bg-blue-600 rounded-full"></div>
            <h2 className="text-2xl font-black text-slate-800 uppercase">Danh sách chủ đề ôn luyện</h2>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-lg text-gray-500 animate-pulse">Đang tải danh sách câu hỏi...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-5 rounded-xl shadow-sm text-center max-w-md w-full mx-auto">
              <h3 className="font-bold text-lg mb-2">Không thể tải ngân hàng câu hỏi</h3>
              <p className="text-sm mb-4 text-red-600">{error}</p>
              <button
                onClick={loadSubjects}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300 shadow-sm"
              >
                Thử tải lại
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full">
              {subjects.map((subject) => (
                <SubjectCard key={subject.name} subject={subject} />
              ))}
            </div>
          )}
        </section>

        {/* Lịch sử ôn tập */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-2 bg-indigo-600 rounded-full"></div>
            <h2 className="text-2xl font-black text-slate-800 uppercase">Lịch sử ôn tập gần đây</h2>
          </div>
          <HistorySection currentUser={user} />
        </section>
      </div>
    </div>
  );
}
