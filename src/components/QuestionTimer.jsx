"use client";

/**
 * Tác giả: Nguyễn Văn Đạt | Email: nguyenvandatsqtt@gmail.com
 * Mô tả: Thành phần QuestionTimer xử lý và hiển thị thời gian đã trôi qua cho từng câu hỏi.
 * Hiển thị dưới dạng bộ đếm tiến (count-up), không giới hạn thời gian.
 * Dành riêng cho mục đích ôn luyện nội bộ.
 */

import { useState, useEffect } from "react";
import { FaClock } from "react-icons/fa";

const QuestionTimer = ({ onTimeUp, setTimePerQuestion, isAnswered, resetTimer }) => {
  // Đặt thời gian bắt đầu từ 0 giây cho mỗi câu hỏi
  const [seconds, setSeconds] = useState(0); 

  useEffect(() => {
    // Nếu chưa trả lời, tiếp tục đếm tiến
    if (!isAnswered) {
      const timer = setTimeout(() => {
        const nextSeconds = seconds + 1;
        setSeconds(nextSeconds);
        setTimePerQuestion(nextSeconds); // Cập nhật thời gian đã dành cho câu hỏi này
      }, 1000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, isAnswered]);

  // Đặt lại bộ đếm về 0 giây mỗi khi chuyển sang câu hỏi mới
  useEffect(() => {
    setSeconds(0); 
  }, [resetTimer]); // `resetTimer` thay đổi khi câu hỏi hiện tại thay đổi (currentQuestionIndex)

  // Màu sắc nhẹ nhàng cho bộ đếm thời gian (không còn áp lực đếm ngược)
  const timerColorClass = "text-blue-600 bg-blue-50 border-blue-200 font-bold";

  return (
    <div className={`flex items-center gap-2 text-lg px-4 py-1.5 rounded-full border shadow-sm transition-colors duration-300 ${timerColorClass}`}>
      <FaClock className="text-xl" />
      <span>{seconds} giây</span>
    </div>
  );
};

export default QuestionTimer;
