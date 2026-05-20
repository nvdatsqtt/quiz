"use client";

/**
 * Tác giả: Nguyễn Văn Đạt | Email: nguyenvandatsqtt@gmail.com
 * Mô tả: Trang Quiz hiển thị giao diện làm bài ôn luyện trắc nghiệm cho chủ đề đã chọn.
 * Giao diện đã được nâng cấp chuyên nghiệp: rộng hơn trên laptop (max-w-5xl),
 * thanh trạng thái tích hợp số câu đã làm, số câu đúng/sai dạng icon hover tooltip,
 * nhãn "Câu x:" màu đen hiển thị cùng dòng với nội dung câu hỏi, phương án có tiền tố A, B, C, D.
 * Dành riêng cho mục đích ôn luyện nội bộ.
 */

import { useEffect, useState } from "react";
import { usePoints } from "@/context/PointsContext";
import QuestionTimer from "@/components/QuestionTimer";
import Results from "@/components/Results";
// Import thêm các icon phục vụ bảng thống kê trạng thái làm bài thời gian thực
import { FaPen, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
// Import trực tiếp dữ liệu câu hỏi để hiển thị tức thì, không bị lỗi mạng ở chế độ dev
import questionsData from "../../../../public/data/questions.json";

const Quiz = ({ params }) => {
  const { subject } = params;
  const { points, setPoints } = usePoints();

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [unattemptedQuestions, setUnattemptedQuestions] = useState(0);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [timePerQuestion, setTimePerQuestion] = useState(0);

  useEffect(() => {
    try {
      // Giải mã ký tự tiếng Việt từ URL (URI encoded) để đối chiếu chính xác với cơ sở dữ liệu
      const decodedSubject = decodeURIComponent(subject || "").toLowerCase();
      
      const subjectData = questionsData.subjects.find(
        (s) => s.name.toLowerCase() === decodedSubject
      );
      setQuestions(subjectData ? subjectData.questions : []);
    } catch (err) {
      console.error("Lỗi tải câu hỏi:", err);
      setQuestions([]);
    }
  }, [subject]);

  // Xử lý khi người dùng chọn phương án trả lời
  const handleAnswer = (option) => {
    if (isAnswered) return;

    setSelectedOption(option);
    setIsAnswered(true);

    // Tính lũy tổng thời gian đã sử dụng
    setTotalTimeSpent(totalTimeSpent + timePerQuestion);

    // Cộng điểm tích lũy (4 điểm cho 1 câu đúng) và phân loại đúng/sai
    if (option === questions[currentQuestionIndex].answer) {
      setPoints(points + 4); 
      setCorrectAnswers(correctAnswers + 1);
    } else {
      setWrongAnswers(wrongAnswers + 1);
    }
  };

  // Chuyển sang câu hỏi tiếp theo
  const handleNext = () => {
    const nextQuestion = currentQuestionIndex + 1;
    if (nextQuestion < questions.length) {
      setCurrentQuestionIndex(nextQuestion);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimePerQuestion(0); // Đặt lại bộ đếm thời gian cho câu hỏi tiếp theo
    } else {
      setShowResults(true); // Hiển thị bảng kết quả khi kết thúc tất cả câu hỏi
    }
  };

  // Xử lý khi hết thời gian giới hạn (30 giây)
  const handleTimeUp = () => {
    setIsAnswered(true); // Đánh dấu là câu hỏi đã kết thúc (không thể chọn tiếp)
    setUnattemptedQuestions(unattemptedQuestions + 1); // Tăng đếm số câu chưa làm
    setTotalTimeSpent(totalTimeSpent + 30); // Cộng thời gian phạt 30 giây khi hết giờ
    handleNext(); // Tự động nhảy sang câu tiếp theo
  };

  // Kiểm tra an toàn nếu chưa tải xong câu hỏi hoặc danh sách câu hỏi rỗng để tránh chia cho 0
  if (!questions || questions.length === 0) {
    return (
      <div className="p-4 sm:p-6 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-500 animate-pulse">Đang tải câu hỏi ôn luyện...</p>
        </div>
      </div>
    );
  }

  // Tính tỷ lệ phần trăm trả lời đúng
  const percentage = Math.round((correctAnswers / questions.length) * 100);
  const averageTimePerQuestion = (totalTimeSpent / questions.length).toFixed(2);

  // Phân tích cú pháp câu hỏi để hiển thị label "Câu x: " và Nhóm chuyên đề cùng dòng
  const rawQuestionText = questions[currentQuestionIndex]?.question || "";
  const regexWithGroup = /^([[^]]+])s*Câus*d+s*:s*(.+)$/i;
  const regexNoGroup = /^Câus*d+s*:s*(.+)$/i;

  let groupText = "";
  let cleanQuestionText = rawQuestionText;

  const matchGroup = rawQuestionText.match(regexWithGroup);
  if (matchGroup) {
    groupText = matchGroup[1]; // Ví dụ: [CÁC VĂN BẢN QUÁN TRIỆT]
    cleanQuestionText = matchGroup[2]; // Phần câu hỏi thực tế sau dấu hai chấm
  } else {
    const matchNoGroup = rawQuestionText.match(regexNoGroup);
    if (matchNoGroup) {
      cleanQuestionText = matchNoGroup[1];
    }
  }

  // Khai báo các nhãn tiền tố cho 4 phương án trắc nghiệm
  const optionPrefixes = ["A", "B", "C", "D"];

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-screen">
      {!showResults ? (
        // Khung làm bài được mở rộng lên max-w-5xl để hiển thị cực tốt trên laptop/máy tính bàn và responsive trên mobile
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-5 sm:p-8 relative transition-all duration-300">
          
          {/* Thanh Tiến độ làm bài (Progress Bar) */}
          <div 
            className="absolute top-0 left-0 h-2 bg-blue-500 transition-all duration-300 rounded-t-2xl" 
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          ></div>
          
          {/* Thanh Trạng thái (Thống kê kết quả thời gian thực bên trái & Đồng hồ đếm ngược bên phải) */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 border-b pb-4 mt-2">
            
            {/* Bảng thống kê tiến trình làm bài thời gian thực */}
            <div className="flex gap-4">
              
              {/* Thống kê Số câu đã trả lời */}
              <div className="group relative flex items-center justify-center w-10 h-10 cursor-pointer bg-blue-50 rounded-full border border-blue-100 shadow-sm text-blue-700 hover:bg-blue-100 transition duration-300">
                <FaPen className="text-blue-600 text-sm" />
                <span className="absolute -bottom-1 -right-1 flex items-center justify-center bg-blue-600 text-white rounded-full text-[10px] w-5 h-5 font-bold border border-white">
                  {correctAnswers + wrongAnswers}
                </span>
                {/* Tooltip khi di chuột qua */}
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-xs rounded-lg py-1.5 px-3 whitespace-nowrap shadow-lg z-10 transition-all duration-200">
                  Số câu đã trả lời
                </div>
              </div>

              {/* Thống kê Số câu đúng */}
              <div className="group relative flex items-center justify-center w-10 h-10 cursor-pointer bg-green-50 rounded-full border border-green-100 shadow-sm text-green-700 hover:bg-green-100 transition duration-300">
                <FaCheckCircle className="text-green-600 text-sm" />
                <span className="absolute -bottom-1 -right-1 flex items-center justify-center bg-green-600 text-white rounded-full text-[10px] w-5 h-5 font-bold border border-white">
                  {correctAnswers}
                </span>
                {/* Tooltip khi di chuột qua */}
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-xs rounded-lg py-1.5 px-3 whitespace-nowrap shadow-lg z-10 transition-all duration-200">
                  Số câu trả lời đúng
                </div>
              </div>

              {/* Thống kê Số câu sai */}
              <div className="group relative flex items-center justify-center w-10 h-10 cursor-pointer bg-red-50 rounded-full border border-red-100 shadow-sm text-red-700 hover:bg-red-100 transition duration-300">
                <FaTimesCircle className="text-red-600 text-sm" />
                <span className="absolute -bottom-1 -right-1 flex items-center justify-center bg-red-600 text-white rounded-full text-[10px] w-5 h-5 font-bold border border-white">
                  {wrongAnswers}
                </span>
                {/* Tooltip khi di chuột qua */}
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-xs rounded-lg py-1.5 px-3 whitespace-nowrap shadow-lg z-10 transition-all duration-200">
                  Số câu trả lời sai
                </div>
              </div>

            </div>

            {/* Bộ đếm ngược thời gian giới hạn (Tự động đổi màu và hiển thị đồng hồ) */}
            <QuestionTimer
              onTimeUp={handleTimeUp}
              setTimePerQuestion={setTimePerQuestion}
              isAnswered={isAnswered}
              resetTimer={currentQuestionIndex}
            />

          </div>

          {/* Nội dung câu hỏi (Câu x in đậm màu đen, nhóm chuyên đề ở dòng trên, câu hỏi cùng dòng màu xanh navy) */}
          <div className="text-left p-5 sm:p-6 bg-slate-50 border border-slate-200 rounded-xl shadow-sm leading-relaxed mb-6">
            {/* Nhãn nhóm chuyên đề hiển thị nhỏ gọn ở dòng trên */}
            {groupText && (
              <div className="mb-3">
                <span className="text-blue-700 bg-blue-50 border-blue-200 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider shadow-sm">
                  {groupText}
                </span>
              </div>
            )}
            
            <p className="text-lg sm:text-xl leading-relaxed flex flex-wrap items-baseline">
              {/* Số thứ tự câu hỏi màu đen đậm */}
              <span className="text-black font-black text-2xl mr-2 shrink-0 select-none">
                Câu {currentQuestionIndex + 1}:
              </span>
              
              {/* Nội dung chính của câu hỏi khác màu (màu xanh navy sẫm) */}
              <span className="text-blue-900 font-bold">
                {cleanQuestionText}
              </span>
            </p>
          </div>

          {/* Danh sách các phương án lựa chọn (Có thêm tiền tố A, B, C, D trong vòng tròn đổi màu) */}
          <div className="mt-6 space-y-4">
            {questions[currentQuestionIndex]?.options?.map((option, index) => (
              <button
                key={option}
                onClick={() => handleAnswer(option)}
                disabled={isAnswered}
                className={`w-full py-4 px-6 rounded-xl text-base sm:text-lg font-semibold text-left transition-all duration-300 focus:outline-none flex items-center gap-3 border shadow-sm ${
                  isAnswered && option === questions[currentQuestionIndex].answer
                    ? "bg-green-600 text-white border-green-600 shadow-green-100"
                    : isAnswered && option === selectedOption
                    ? "bg-red-600 text-white border-red-600 shadow-red-100"
                    : "bg-slate-50 hover:bg-blue-50 hover:border-blue-300 focus:bg-blue-50 text-slate-800 border-slate-200 hover:shadow"
                }`}
              >
                {/* Vòng tròn nhãn A, B, C, D phía trước phương án, tự động đổi màu tương ứng */}
                <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-bold border transition-all duration-300 shrink-0 shadow-sm ${
                  isAnswered && option === questions[currentQuestionIndex].answer
                    ? "bg-white text-green-600 border-white"
                    : isAnswered && option === selectedOption
                    ? "bg-white text-red-600 border-white"
                    : "bg-white text-blue-600 border-blue-100 group-hover:bg-blue-600 group-hover:text-white"
                }`}>
                  {optionPrefixes[index]}
                </span>
                
                <span className="flex-1 leading-snug">{option}</span>
              </button>
            ))}
          </div>

          {/* Nút điều hướng tiếp theo / Nộp bài */}
          {isAnswered && (
            <button
              onClick={handleNext}
              className="mt-8 w-full py-4 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition shadow"
            >
              {currentQuestionIndex === questions.length - 1 ? "Nộp bài và xem kết quả" : "Câu hỏi tiếp theo"}
            </button>
          )}
        </div>
      ) : (
        <Results
          score={points}
          totalQuestions={questions.length}
          correctAnswers={correctAnswers}
          wrongAnswers={wrongAnswers}
          unattemptedQuestions={unattemptedQuestions}
          percentage={percentage}
          timeSpent={totalTimeSpent}
          averageTimePerQuestion={averageTimePerQuestion}
        />
      )}
    </div>
  );
};

export default Quiz;
