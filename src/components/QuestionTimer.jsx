"use client";

/**
 * Tác giả: Nguyễn Văn Đạt | Email: nguyenvandatsqtt@gmail.com
 * Mô tả: Thành phần QuestionTimer xử lý và hiển thị bộ đếm ngược thời gian giới hạn cho từng câu hỏi.
 * Hiển thị dưới dạng icon đồng hồ đổi màu sắc động: Xanh (>15s), Vàng (>5s), Đỏ (<=5s và nhấp nháy).
 * Dành riêng cho mục đích ôn luyện nội bộ.
 */

import { useState, useEffect } from "react";
import { FaClock } from "react-icons/fa";

const QuestionTimer = ({ onTimeUp, setTimePerQuestion, isAnswered, resetTimer }) => {
  // Đặt thời gian giới hạn là 30 giây cho mỗi câu hỏi
  const [seconds, setSeconds] = useState(30); 

  useEffect(() => {
    // Nếu chưa trả lời và thời gian còn lại lớn hơn 0, tiếp tục đếm ngược
    if (!isAnswered && seconds > 0) {
      const timer = setTimeout(() => {
        setSeconds((prev) => prev - 1);
        setTimePerQuestion(30 - seconds); // Tính toán thời gian đã dành cho câu hỏi này
      }, 1000);
      return () => clearTimeout(timer);
    } else if (seconds === 0 && !isAnswered) {
      // Hết giờ mà chưa trả lời, kích hoạt sự kiện hết giờ
      onTimeUp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, isAnswered]);

  // Đặt lại bộ đếm về 30 giây mỗi khi chuyển sang câu hỏi mới
  useEffect(() => {
    setSeconds(30); 
  }, [resetTimer]); // `resetTimer` thay đổi khi câu hỏi hiện tại thay đổi

  // Xác định màu sắc động dựa trên số giây còn lại
  let timerColorClass = "";
  if (seconds > 15) {
    // Màu xanh khi còn nhiều thời gian (>15 giây)
    timerColorClass = "text-green-600 bg-green-50 border-green-200";
  } else if (seconds >= 5) {
    // Màu vàng khi thời gian sắp hết (>=5 và <=15 giây)
    timerColorClass = "text-yellow-600 bg-yellow-50 border-yellow-200";
  } else {
    // Màu đỏ nhấp nháy khi cực kỳ khẩn cấp (<5 giây)
    timerColorClass = "text-red-600 bg-red-50 border-red-200 animate-pulse font-extrabold";
  }

  return (
    <div className={`flex items-center gap-2 text-lg px-4 py-1.5 rounded-full border shadow-sm transition-colors duration-300 ${timerColorClass}`}>
      <FaClock className="text-xl" />
      <span>{seconds} giây</span>
    </div>
  );
};

export default QuestionTimer;
