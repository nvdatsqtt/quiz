'use client';

/**
 * Tác giả: Nguyễn Văn Đạt | Email: nguyenvandatsqtt@gmail.com
 * Mô tả: Trang chủ hiển thị danh sách các chủ đề trắc nghiệm để người dùng lựa chọn luyện tập.
 * Dành riêng cho mục đích ôn luyện nội bộ.
 */

import { useEffect, useState } from "react";
import SubjectCard from '@/components/SubjectCard';
// Import trực tiếp câu hỏi tĩnh từ file JSON để tải ngay lập tức, tránh lỗi mạng ở chế độ dev
import questionsData from "../../public/data/questions.json";

export default function Home() {
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center">
      {/* Tiêu đề ứng dụng (Đổi thành tên chung chung theo yêu cầu của tác giả) */}
      <h1 className="text-4xl font-bold text-blue-600 mb-6">Website trắc nghiệm</h1>
      
      {/* Ghi chú và hướng dẫn ôn tập tiếng Việt */}
      <p className="text-lg text-gray-700 mb-8">
        Hệ thống ôn luyện trắc nghiệm nội bộ. Vui lòng chọn một chủ đề bên dưới để bắt đầu kiểm tra kiến thức!
      </p>

      {/* Grid hiển thị các chủ đề */}
      <div className="w-full max-w-screen-lg flex justify-center">
        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg text-gray-500 animate-pulse">Đang tải danh sách câu hỏi...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-5 rounded-xl shadow-sm text-center max-w-md w-full">
            <h3 className="font-bold text-lg mb-2">Không thể tải ngân hàng câu hỏi</h3>
            <p className="text-sm mb-4 text-red-600">{error}</p>
            <button
              onClick={fetchSubjects}
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
      </div>
    </div>
  );
}
