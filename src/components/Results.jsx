"use client";

/**
 * Tác giả: Nguyễn Văn Đạt | Email: nguyenvandatsqtt@gmail.com
 * Mô tả: Thành phần Results hiển thị bảng thống kê chi tiết kết quả ôn luyện trắc nghiệm của người dùng.
 * Được nâng cấp toàn diện:
 * - Hiển thị chi tiết kết quả lượt ôn luyện vừa kết thúc.
 * - Tự động tải và lọc lịch sử ôn tập của riêng thành viên hiện tại cho chủ đề hiện tại.
 * - Hiển thị bảng lịch sử tuyệt đẹp với hiệu ứng phân cấp màu sắc theo điểm số.
 * - Thêm nút "Làm bài thi mới" nổi bật giúp quay lại màn hình cấu hình.
 * - Đầy đủ chú thích tiếng Việt và thiết kế responsive cao cấp cho cả laptop và mobile.
 * Dành riêng cho mục đích ôn luyện nội bộ.
 */

import { useEffect, useState } from "react";
import { 
  FaTrophy, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaQuestionCircle, 
  FaPercentage, 
  FaClock, 
  FaStopwatch, 
  FaRedo, 
  FaHistory, 
  FaCalendarAlt, 
  FaUser, 
  FaBookOpen,
  FaAward
} from "react-icons/fa";
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

import HistorySection from "@/components/HistorySection";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";

const Results = ({
  score,
  totalQuestions,
  correctAnswers,
  wrongAnswers,
  unattemptedQuestions,
  percentage,
  timeSpent,
  averageTimePerQuestion,
  username,
  subject,
  onRestart,
}) => {
  // Trạng thái pháo hoa chúc mừng
  const [showConfetti, setShowConfetti] = useState(true);
  const { width, height } = useWindowSize();
  const { user } = useAuth();
  
  // Tắt hiệu ứng pháo hoa sau 7 giây để tiết kiệm tài nguyên hệ thống
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 7000); 
    return () => clearTimeout(timer);
  }, []);

  // Xác định thông điệp đánh giá dựa trên tỷ lệ trả lời đúng
  const getFeedbackMessage = () => {
    if (percentage >= 90) return { text: "Xuất sắc! Bạn đã nắm rất vững kiến thức lý thuyết lý luận chính trị.", color: "text-green-600" };
    if (percentage >= 70) return { text: "Rất tốt! Hãy tiếp tục duy trì phong độ ôn luyện này nhé.", color: "text-blue-600" };
    if (percentage >= 50) return { text: "Khá ổn! Hãy rà soát lại các câu sai để ghi nhớ sâu hơn.", color: "text-indigo-600" };
    return { text: "Cần nỗ lực hơn! Hãy ôn tập lại ngân hàng câu hỏi để đạt điểm số cao hơn.", color: "text-amber-600" };
  };

  const feedback = getFeedbackMessage();

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
      {/* Hiệu ứng pháo hoa chúc mừng nếu đạt điểm số tốt (>= 50%) */}
      {showConfetti && percentage >= 50 && (
        <Confetti width={width} height={height} numberOfPieces={350} recycle={false} />
      )}

      {/* Panel thông tin người thi & môn thi */}
      <div className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl text-center mb-8 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-20 w-48 h-32 rotate-12">
          <Image
            src="/images/vietnam-flag.svg"
            alt="Vietnam Flag"
            fill
            className="object-cover"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider mb-2">
          Kết quả ôn luyện trắc nghiệm
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-4 text-sm sm:text-base font-semibold bg-white/10 backdrop-blur-sm py-2.5 px-6 rounded-2xl w-fit mx-auto border border-white/10">
          <span className="flex items-center gap-2">
            <FaUser className="text-yellow-300" />
            Học viên: <strong className="text-yellow-200">{username}</strong>
          </span>
          <span className="hidden sm:inline text-white/30">|</span>
          <span className="flex items-center gap-2">
            <FaBookOpen className="text-yellow-300" />
            Chủ đề: <strong className="text-yellow-200">{subject}</strong>
          </span>
        </div>
      </div>

      {/* Grid các chỉ số kết quả chi tiết */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full mb-8">
        
        {/* Điểm số tích lũy */}
        <div className="p-5 bg-white border border-slate-100 shadow-md rounded-2xl flex items-center justify-between hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Điểm tích lũy</p>
            <p className="text-2xl font-black text-blue-600">+{correctAnswers * 4} <span className="text-xs text-slate-500 font-semibold">điểm</span></p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-500">
            <FaTrophy className="text-2xl text-yellow-500" />
          </div>
        </div>

        {/* Số câu trả lời đúng */}
        <div className="p-5 bg-white border border-slate-100 shadow-md rounded-2xl flex items-center justify-between hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Trả lời đúng</p>
            <p className="text-2xl font-black text-green-600">{correctAnswers} / {totalQuestions} <span className="text-xs text-slate-500 font-semibold">câu</span></p>
          </div>
          <div className="p-3 bg-green-50 rounded-xl text-green-500">
            <FaCheckCircle className="text-2xl" />
          </div>
        </div>

        {/* Số câu trả lời sai */}
        <div className="p-5 bg-white border border-slate-100 shadow-md rounded-2xl flex items-center justify-between hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Trả lời sai</p>
            <p className="text-2xl font-black text-red-600">{wrongAnswers} / {totalQuestions} <span className="text-xs text-slate-500 font-semibold">câu</span></p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl text-red-500">
            <FaTimesCircle className="text-2xl" />
          </div>
        </div>

        {/* Chưa trả lời / Hết giờ */}
        <div className="p-5 bg-white border border-slate-100 shadow-md rounded-2xl flex items-center justify-between hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bỏ qua / Hết giờ</p>
            <p className="text-2xl font-black text-amber-500">{unattemptedQuestions} / {totalQuestions} <span className="text-xs text-slate-500 font-semibold">câu</span></p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-500">
            <FaQuestionCircle className="text-2xl" />
          </div>
        </div>

        {/* Tỷ lệ chính xác */}
        <div className="p-5 bg-white border border-slate-100 shadow-md rounded-2xl flex items-center justify-between hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tỷ lệ chính xác</p>
            <p className="text-2xl font-black text-indigo-600">{percentage}%</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-500">
            <FaPercentage className="text-2xl" />
          </div>
        </div>

        {/* Tổng thời gian hoàn thành */}
        <div className="p-5 bg-white border border-slate-100 shadow-md rounded-2xl flex items-center justify-between hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tổng thời gian</p>
            <p className="text-2xl font-black text-purple-600">{Math.round(timeSpent)} <span className="text-xs text-slate-500 font-semibold">giây</span></p>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-purple-500">
            <FaClock className="text-2xl" />
          </div>
        </div>

        {/* Thời gian trung bình mỗi câu */}
        <div className="p-5 bg-white border border-slate-100 shadow-md rounded-2xl flex items-center justify-between hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">T.gian TB / Câu</p>
            <p className="text-2xl font-black text-cyan-600">{averageTimePerQuestion} <span className="text-xs text-slate-500 font-semibold">giây</span></p>
          </div>
          <div className="p-3 bg-cyan-50 rounded-xl text-cyan-500">
            <FaStopwatch className="text-2xl" />
          </div>
        </div>

        {/* Xếp loại/Đánh giá ôn luyện */}
        <div className="p-5 bg-white border border-slate-100 shadow-md rounded-2xl flex items-center justify-between hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Xếp loại ôn tập</p>
            <p className={`text-xl font-black ${
              percentage >= 90 ? "text-green-600" : percentage >= 70 ? "text-blue-600" : percentage >= 50 ? "text-indigo-600" : "text-amber-500"
            }`}>
              {percentage >= 90 ? "XUẤT SẮC" : percentage >= 70 ? "KHÁ - GIỎI" : percentage >= 50 ? "TRUNG BÌNH" : "CẦN CỐ GẮNG"}
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl text-yellow-500">
            <FaTrophy className="text-2xl animate-bounce" />
          </div>
        </div>

      </div>

      {/* Khung nhận xét đánh giá tổng quan */}
      <div className="w-full bg-white border border-slate-100 shadow-md rounded-3xl p-6 text-center mb-8 hover:shadow-lg transition-all duration-300">
        <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Nhận xét ôn tập</p>
        <h3 className={`text-lg sm:text-xl font-black ${feedback.color} leading-relaxed`}>
          &quot;{feedback.text}&quot;
        </h3>
      </div>

      {/* Nút hành động "Làm bài thi mới" nổi bật thu hút */}
      <div className="w-full text-center mb-12">
        <button
          onClick={onRestart}
          className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-black text-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.03] active:scale-95 transform cursor-pointer group"
        >
          <FaRedo className="text-lg group-hover:rotate-180 transition-all duration-500" />
          LÀM LƯỢT ÔN TẬP MỚI
        </button>
      </div>

      {/* Bảng Lịch sử ôn tập chi tiết */}
      <HistorySection currentUser={user} subjectFilter={subject} />
    </div>
  );
};

export default Results;
