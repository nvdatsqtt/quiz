"use client";

/**
 * Tác giả: Nguyễn Văn Đạt | Email: nguyenvandatsqtt@gmail.com
 * Mô tả: Trang Quiz đã được nâng cấp toàn diện:
 * - Hệ thống đăng nhập tích hợp.
 * - Slider hiện đại chọn số lượng câu hỏi luyện tập.
 * - Sắp xếp câu hỏi xáo trộn ngẫu nhiên (Fisher-Yates Shuffle).
 * - Tự động chuyển câu sau 2 giây khi chọn đáp án đúng.
 * - Bảng Lịch sử học tập (HistorySection) hiển thị kết quả các lượt ôn tập.
 * - Thanh tiến trình số hóa hiện số x/N ở trung tâm phần màu xanh đã làm.
 */

import { useEffect, useState, useRef } from "react";
import { usePoints } from "@/context/PointsContext";
import { useAuth } from "@/context/AuthContext";
import QuestionTimer from "@/components/QuestionTimer";
import Results from "@/components/Results";
import Login from "@/components/Login";
import HistorySection from "@/components/HistorySection";
import { FaPen, FaCheckCircle, FaTimesCircle, FaUser, FaSlidersH, FaPlay, FaHistory } from "react-icons/fa";
import questionsData from "../../../../public/data/questions.json";

const Quiz = ({ params }) => {
  const { subject } = params;
  const { points, setPoints } = usePoints();
  const { user, loading: authLoading } = useAuth();

  // State cấu hình (Setup Screen)
  const [isConfigured, setIsConfigured] = useState(false);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(10);
  const [rawQuestions, setRawQuestions] = useState([]);
  
  // State làm bài trắc nghiệm
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

  // Ref quản lý timer tự nhảy câu hỏi
  const autoNextTimerRef = useRef(null);

  // 1. Tải ngân hàng câu hỏi gốc khi mount
  useEffect(() => {
    try {
      const decodedSubject = decodeURIComponent(subject || "").toLowerCase();
      const subjectData = questionsData.subjects.find(
        (s) => s.name.toLowerCase() === decodedSubject
      );
      
      if (subjectData) {
        setRawQuestions(subjectData.questions || []);
        const count = subjectData.questions.length;
        setSelectedQuestionCount(count > 20 ? 20 : count);
      }
    } catch (err) {
      console.error("Lỗi tải trang cấu hình:", err);
    }
  }, [subject]);

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

  const shuffleQuestions = (array, count) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  };

  const handleStartQuiz = () => {
    if (rawQuestions.length === 0) return;
    const selectedQuestions = shuffleQuestions(rawQuestions, selectedQuestionCount);
    setQuestions(selectedQuestions);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setShowResults(false);
    setCorrectAnswers(0);
    setWrongAnswers(0);
    setUnattemptedQuestions(0);
    setTotalTimeSpent(0);
    setTimePerQuestion(0);
    setPoints(0);
    setIsConfigured(true);
  };

  const handleAnswer = (option) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);
    setTotalTimeSpent(totalTimeSpent + timePerQuestion);
    const isCorrect = option === questions[currentQuestionIndex].answer;
    if (isCorrect) {
      setPoints(points + 4); 
      setCorrectAnswers(correctAnswers + 1);
      const timer = setTimeout(() => {
        handleNext();
      }, 2000);
      autoNextTimerRef.current = timer;
    } else {
      setWrongAnswers(wrongAnswers + 1);
    }
  };

  const handleNext = () => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    let nextUnattempted = unattemptedQuestions;
    let nextTimeSpent = totalTimeSpent;
    if (!isAnswered) {
      nextUnattempted += 1;
      nextTimeSpent += timePerQuestion;
      setUnattemptedQuestions(nextUnattempted);
      setTotalTimeSpent(nextTimeSpent);
    }
    const nextQuestion = currentQuestionIndex + 1;
    if (nextQuestion < questions.length) {
      setCurrentQuestionIndex(nextQuestion);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimePerQuestion(0);
    } else {
      saveResultToHistory(nextUnattempted, nextTimeSpent);
      setShowResults(true);
    }
  };

  const handleTimeUp = () => {
    setIsAnswered(true);
    const nextUnattempted = unattemptedQuestions + 1;
    const nextTimeSpent = totalTimeSpent + 30;
    setUnattemptedQuestions(nextUnattempted);
    setTotalTimeSpent(nextTimeSpent);
    const nextQuestion = currentQuestionIndex + 1;
    if (nextQuestion < questions.length) {
      setCurrentQuestionIndex(nextQuestion);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimePerQuestion(0);
    } else {
      saveResultToHistory(nextUnattempted, nextTimeSpent);
      setShowResults(true);
    }
  };

  const saveResultToHistory = (overrideUnattempted, overrideTimeSpent) => {
    const record = {
      id: Date.now().toString(),
      username: user.username,
      subject: decodeURIComponent(subject || ""),
      date: new Date().toISOString(),
      score: points + (overrideUnattempted !== undefined ? 0 : 0), // points is already updated in handleAnswer
      totalQuestions: questions.length,
      correctAnswers: correctAnswers,
      wrongAnswers: wrongAnswers,
      unattemptedQuestions: overrideUnattempted !== undefined ? overrideUnattempted : unattemptedQuestions,
      timeSpent: overrideTimeSpent !== undefined ? overrideTimeSpent : totalTimeSpent,
      averageTime: ((overrideTimeSpent !== undefined ? overrideTimeSpent : totalTimeSpent) / questions.length).toFixed(1)
    };
    const localHistory = JSON.parse(localStorage.getItem("quiz_history") || "[]");
    localStorage.setItem("quiz_history", JSON.stringify([record, ...localHistory]));
  };

  const handleForceFinish = () => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    const remainingCount = questions.length - currentQuestionIndex - (isAnswered ? 1 : 0);
    const finalUnattempted = unattemptedQuestions + remainingCount;
    const finalTime = totalTimeSpent + (isAnswered ? 0 : timePerQuestion);
    setUnattemptedQuestions(finalUnattempted);
    setTotalTimeSpent(finalTime);
    saveResultToHistory(finalUnattempted, finalTime);
    setShowResults(true);
  };

  const handleRestartSetup = () => {
    setIsConfigured(false);
    setShowResults(false);
  };

  const handleContainerClick = (e) => {
    if (isAnswered && selectedOption !== questions[currentQuestionIndex]?.answer) {
      if (e.target.closest("button") && e.target.closest("button").innerText.includes("Câu hỏi tiếp theo")) {
        return;
      }
      handleNext();
    }
  };

  const percentage = questions.length > 0 ? Math.round((correctAnswers / questions.length) * 100) : 0;
  const averageTimePerQuestion = questions.length > 0 ? (totalTimeSpent / questions.length).toFixed(1) : "0.0";
  const rawQuestionText = questions[currentQuestionIndex]?.question || "";
  const optionPrefixes = ["A", "B", "C", "D", "E", "F"];

  if (rawQuestions.length === 0) {
    return (
      <div className="p-4 sm:p-6 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-500 animate-pulse">Đang tải ngân hàng câu hỏi...</p>
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="p-4 sm:p-6 bg-slate-50 min-h-screen flex flex-col items-center justify-start py-8">
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-6 sm:p-10 transition-all duration-300">
          <h1 className="text-3xl sm:text-4xl font-black text-center text-blue-600 mb-2 uppercase tracking-wide">
            Cấu hình ôn luyện trắc nghiệm
          </h1>
          <p className="text-center text-slate-500 mb-8 font-medium">
            Chủ đề: <span className="text-blue-900 font-bold">{decodeURIComponent(subject || "")}</span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-6 border-r pr-0 md:pr-8 border-slate-100">
              <div>
                <label className="flex items-center gap-2 text-slate-700 font-bold mb-3">
                  <FaUser className="text-blue-600 text-lg" />
                  Học viên đang đăng nhập:
                </label>
                <div className="px-5 py-4 rounded-xl border-2 border-blue-500 bg-blue-50/50 text-blue-700 font-black flex items-center justify-between">
                  <span>{user.username}</span>
                  {user.isAdmin && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded uppercase">Quản trị viên</span>}
                </div>
              </div>

              <div>
                <label className="flex items-center justify-between text-slate-700 font-bold mb-3">
                  <span className="flex items-center gap-2">
                    <FaSlidersH className="text-blue-600 text-lg" />
                    Số lượng câu hỏi:
                  </span>
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-extrabold shadow-sm">
                    {selectedQuestionCount} / {rawQuestions.length} Câu
                  </span>
                </label>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs font-bold text-slate-400">5</span>
                  <input
                    type="range"
                    min="5"
                    max={rawQuestions.length}
                    value={selectedQuestionCount}
                    onChange={(e) => setSelectedQuestionCount(parseInt(e.target.value))}
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-xs font-bold text-slate-400">{rawQuestions.length}</span>
                </div>
              </div>

              <button
                onClick={handleStartQuiz}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95"
              >
                <FaPlay /> BẮT ĐẦU ÔN LUYỆN
              </button>
            </div>

            <div className="flex flex-col">
              <h3 className="flex items-center gap-2 text-slate-700 font-black text-xl mb-4">
                <FaHistory className="text-indigo-600" />
                Lịch sử ôn tập chủ đề này
              </h3>
              <div className="flex-1 overflow-y-auto max-h-[400px]">
                <HistorySection currentUser={user} subjectFilter={decodeURIComponent(subject || "")} />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 text-center">
            <span className="text-red-600 font-black text-xs bg-red-50 border border-red-200 rounded px-3 py-1.5 uppercase select-none tracking-wider">
              Hệ thống ôn luyện nội bộ - Nghiêm cấm sao chép
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={handleContainerClick} className="p-4 sm:p-6 bg-slate-50 min-h-screen flex items-start justify-center py-8">
      {!showResults ? (
        <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl p-5 sm:p-8 relative transition-all duration-300 border border-slate-100">
          <div className="absolute top-0 left-0 right-0 h-6 bg-slate-100 rounded-t-3xl overflow-hidden border-b border-slate-200 flex">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 flex items-center justify-center text-white text-[11px] font-black tracking-widest min-w-[55px] shadow-inner" 
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            >
              {currentQuestionIndex + 1}/{questions.length}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 border-b pb-4 mt-6">
            <div className="flex gap-4">
              <div className="group relative flex items-center justify-center w-10 h-10 bg-blue-50 rounded-full border border-blue-100 shadow-sm text-blue-700 hover:bg-blue-100 transition duration-300 select-none">
                <FaPen className="text-blue-600 text-sm" />
                <span className="absolute -bottom-1 -right-1 flex items-center justify-center bg-blue-600 text-white rounded-full text-[10px] w-5 h-5 font-extrabold border border-white">
                  {correctAnswers + wrongAnswers}
                </span>
              </div>
              <div className="group relative flex items-center justify-center w-10 h-10 bg-green-50 rounded-full border border-green-100 shadow-sm text-green-700 hover:bg-green-100 transition duration-300 select-none">
                <FaCheckCircle className="text-green-600 text-sm" />
                <span className="absolute -bottom-1 -right-1 flex items-center justify-center bg-green-600 text-white rounded-full text-[10px] w-5 h-5 font-extrabold border border-white">
                  {correctAnswers}
                </span>
              </div>
              <div className="group relative flex items-center justify-center w-10 h-10 bg-red-50 rounded-full border border-red-100 shadow-sm text-red-700 hover:bg-red-100 transition duration-300 select-none">
                <FaTimesCircle className="text-red-600 text-sm" />
                <span className="absolute -bottom-1 -right-1 flex items-center justify-center bg-red-600 text-white rounded-full text-[10px] w-5 h-5 font-extrabold border border-white">
                  {wrongAnswers}
                </span>
              </div>
            </div>
            <QuestionTimer
              onTimeUp={handleTimeUp}
              setTimePerQuestion={setTimePerQuestion}
              isAnswered={isAnswered}
              resetTimer={currentQuestionIndex}
            />
          </div>

          <div className="text-left p-5 sm:p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm leading-relaxed mb-6 select-none">
            <p className="text-lg sm:text-xl leading-relaxed flex flex-wrap items-baseline">
              <span className="text-black font-black text-2xl mr-2 shrink-0 select-none">Câu {currentQuestionIndex + 1}:</span>
              <span className="text-blue-900 font-bold">{rawQuestionText}</span>
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {questions[currentQuestionIndex]?.options?.map((option, index) => (
              <button
                key={option}
                onClick={() => handleAnswer(option)}
                disabled={isAnswered}
                className={`w-full py-4 px-6 rounded-2xl text-base sm:text-lg font-bold text-left transition-all duration-300 focus:outline-none flex items-center gap-3 border shadow-sm ${
                  isAnswered && option === questions[currentQuestionIndex].answer
                    ? "bg-green-600 text-white border-green-600 shadow-green-100"
                    : isAnswered && option === selectedOption
                    ? "bg-red-600 text-white border-red-600 shadow-red-100"
                    : "bg-slate-50 hover:bg-blue-50 hover:border-blue-300 focus:bg-blue-50 text-slate-800 border-slate-200 hover:shadow"
                }`}
              >
                <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-black border transition-all duration-300 shrink-0 shadow-sm ${
                  isAnswered && option === questions[currentQuestionIndex].answer
                    ? "bg-white text-green-600 border-white font-extrabold"
                    : isAnswered && option === selectedOption
                    ? "bg-white text-red-600 border-white font-extrabold"
                    : "bg-white text-blue-600 border-blue-100"
                }`}>
                  {optionPrefixes[index]}
                </span>
                <span className="flex-1 leading-snug">{option}</span>
              </button>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 select-none">
            <button onClick={handleForceFinish} className="py-4 px-6 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-2xl font-black text-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95">
              Kết thúc ôn tập
            </button>
            <button onClick={handleNext} className="py-4 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-black text-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95">
              {isAnswered ? (currentQuestionIndex === questions.length - 1 ? "Nộp bài và xem kết quả" : "Câu hỏi tiếp theo") : (currentQuestionIndex === questions.length - 1 ? "Bỏ qua & Xem kết quả" : "Bỏ qua & Câu tiếp theo")}
            </button>
          </div>
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
          username={user.username}
          subject={decodeURIComponent(subject || "")}
          onRestart={handleRestartSetup}
        />
      )}
    </div>
  );
};

export default Quiz;
