"use client";

/**
 * Tác giả: Nguyễn Văn Đạt | Email: nguyenvandatsqtt@gmail.com
 * Mô tả: Thành phần Results hiển thị bảng thống kê chi tiết kết quả ôn luyện trắc nghiệm của người dùng.
 * Đã được Việt hóa hoàn toàn và tối ưu hóa giao diện trực quan.
 * Dành riêng cho mục đích ôn luyện nội bộ.
 */

import { useEffect, useState } from "react";
import { FaTrophy, FaCheckCircle, FaTimesCircle, FaQuestionCircle, FaPercentage, FaClock, FaStopwatch } from "react-icons/fa";
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

const Results = ({
  score,
  totalQuestions,
  correctAnswers,
  wrongAnswers,
  unattemptedQuestions,
  percentage,
  timeSpent,
  averageTimePerQuestion,
}) => {
  // Hiệu ứng pháo hoa chúc mừng
  const [showConfetti, setShowConfetti] = useState(true);
  const { width, height } = useWindowSize();

  // Tắt hiệu ứng pháo hoa sau 7 giây để tiết kiệm tài nguyên
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 7000); 
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center">
      {showConfetti && <Confetti width={width} height={height} numberOfPieces={700} />}

      <h2 className="text-3xl font-bold mb-6 text-center text-blue-600">
        Kết quả ôn luyện
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-4xl">
        
        {/* Tổng điểm tích lũy */}
        <div className="p-5 bg-white shadow-md rounded-lg flex items-center justify-between hover:shadow-lg transition-shadow duration-300">
          <div>
            <p className="text-xl font-semibold text-gray-700">Tổng điểm tích lũy</p>
            <p className="text-lg font-bold text-green-600">{score}</p>
          </div>
          <FaTrophy className="text-yellow-500 text-3xl" />
        </div>

        {/* Điểm đạt được */}
        <div className="p-5 bg-white shadow-md rounded-lg flex items-center justify-between hover:shadow-lg transition-shadow duration-300">
          <div>
            <p className="text-xl font-semibold text-gray-700">Điểm đạt được</p>
            <p className="text-lg font-bold text-green-600">{correctAnswers * 4}</p>
          </div>
          <FaTrophy className="text-yellow-500 text-3xl" />
        </div>

        {/* Số câu trả lời đúng */}
        <div className="p-5 bg-white shadow-md rounded-lg flex items-center justify-between hover:shadow-lg transition-shadow duration-300">
          <div>
            <p className="text-xl font-semibold text-gray-700">Trả lời đúng</p>
            <p className="text-lg font-bold text-green-600">{correctAnswers}</p>
          </div>
          <FaCheckCircle className="text-green-500 text-3xl" />
        </div>

        {/* Số câu trả lời sai */}
        <div className="p-5 bg-white shadow-md rounded-lg flex items-center justify-between hover:shadow-lg transition-shadow duration-300">
          <div>
            <p className="text-xl font-semibold text-gray-700">Trả lời sai</p>
            <p className="text-lg font-bold text-red-600">{wrongAnswers}</p>
          </div>
          <FaTimesCircle className="text-red-500 text-3xl" />
        </div>

        {/* Số câu chưa trả lời / Hết giờ */}
        <div className="p-5 bg-white shadow-md rounded-lg flex items-center justify-between hover:shadow-lg transition-shadow duration-300">
          <div>
            <p className="text-xl font-semibold text-gray-700">Chưa làm / Hết giờ</p>
            <p className="text-lg font-bold text-yellow-600">{unattemptedQuestions}</p>
          </div>
          <FaQuestionCircle className="text-yellow-500 text-3xl" />
        </div>

        {/* Tỷ lệ chính xác */}
        <div className="p-5 bg-white shadow-md rounded-lg flex items-center justify-between hover:shadow-lg transition-shadow duration-300">
          <div>
            <p className="text-xl font-semibold text-gray-700">Tỷ lệ chính xác</p>
            <p className="text-lg font-bold text-blue-600">{percentage}%</p>
          </div>
          <FaPercentage className="text-blue-500 text-3xl" />
        </div>

        {/* Tổng thời gian làm bài */}
        <div className="p-5 bg-white shadow-md rounded-lg flex items-center justify-between hover:shadow-lg transition-shadow duration-300">
          <div>
            <p className="text-xl font-semibold text-gray-700">Tổng thời gian</p>
            <p className="text-lg font-bold text-purple-600">{timeSpent.toFixed(2)} giây</p>
          </div>
          <FaClock className="text-purple-500 text-3xl" />
        </div>

        {/* Thời gian trung bình mỗi câu */}
        <div className="p-5 bg-white shadow-md rounded-lg flex items-center justify-between hover:shadow-lg transition-shadow duration-300">
          <div>
            <p className="text-xl font-semibold text-gray-700">T.gian trung bình/Câu</p>
            <p className="text-lg font-bold text-indigo-600">{averageTimePerQuestion} giây</p>
          </div>
          <FaStopwatch className="text-indigo-500 text-3xl" />
        </div>

        {/* Đánh giá chung */}
        <div className="p-5 bg-white shadow-md rounded-lg flex items-center justify-between col-span-1 md:col-span-3 text-center hover:shadow-lg transition-shadow duration-300">
          <p className="text-xl font-bold w-full text-blue-600">
            Bạn đã đạt được {correctAnswers * 4} trên tổng số {totalQuestions * 4} điểm!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Results;
