'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  FaCalendarAlt, 
  FaUser, 
  FaBookOpen, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaExclamationCircle,
  FaClock, 
  FaLightbulb,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';

export default function QuizHistoryDetail({ params }) {
  const { id } = params;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [history, setHistory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedHints, setExpandedHints] = useState({}); // Lưu trạng thái ẩn/hiện giải thích của từng câu { [qId]: boolean }

  // Kiểm tra đăng nhập
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Tải dữ liệu lịch sử chi tiết
  useEffect(() => {
    if (user) {
      fetchDetail();
    }
  }, [user, id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/history?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history);
        setQuestions(data.questions || []);
      } else {
        alert("Không tìm thấy dữ liệu lượt thi.");
        router.push('/');
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  // Helper cắt bỏ các thẻ HTML để lấy chữ thuần tuý phục vụ so khớp
  const stripHTMLTags = useCallback((html) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  }, []);

  // Helper kiểm tra chuỗi HTML trống
  const isEmptyHTML = useCallback((html) => {
    if (!html) return true;
    const cleanText = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim();
    return cleanText === "";
  }, []);

  // Helper phân tích Hint v3/v2/v1 tương tự màn hình thi (Bảo toàn xáo trộn & Highlight)
  const parseHint = useCallback((hintString, q) => {
    const defaultStructure = {
      question_highlight: q?.question || "",
      options: q?.options?.map(opt => ({ text: opt, hint: "" })) || []
    };

    if (!hintString) return defaultStructure;

    try {
      const parsed = JSON.parse(hintString);
      if (parsed && typeof parsed === "object") {
        if ("question_highlight" in parsed || "options" in parsed) {
          const qHighlight = (!parsed.question_highlight || isEmptyHTML(parsed.question_highlight))
            ? (q?.question || "")
            : parsed.question_highlight;

          const mappedOptions = q?.options?.map((opt) => {
            const optClean = stripHTMLTags(opt);
            const foundSavedOpt = parsed.options?.find(
              (o) => stripHTMLTags(o.text || "") === optClean
            );
            return {
              text: foundSavedOpt ? foundSavedOpt.text : opt,
              hint: foundSavedOpt ? foundSavedOpt.hint : ""
            };
          }) || [];

          return {
            question_highlight: qHighlight,
            options: mappedOptions
          };
        }
        
        if ("text" in parsed) {
          const options = q?.options?.map((opt) => {
            const isCorrect = opt === q?.answer;
            const optClean = stripHTMLTags(opt);
            const highlightedText = parsed.highlightedOptions?.find(
              (hOpt) => stripHTMLTags(hOpt || "") === optClean
            ) || opt;
            const optText = (!highlightedText || isEmptyHTML(highlightedText)) ? opt : highlightedText;
            return {
              text: optText,
              hint: isCorrect ? parsed.text : ""
            };
          }) || [];

          const qHighlight = (!parsed.highlightedQuestion || isEmptyHTML(parsed.highlightedQuestion))
            ? (q?.question || "")
            : parsed.highlightedQuestion;

          return {
            question_highlight: qHighlight,
            options: options
          };
        }
      }
    } catch (e) {}

    const options = q?.options?.map((opt) => {
      const isCorrect = opt === q?.answer;
      return {
        text: opt,
        hint: isCorrect ? hintString : ""
      };
    }) || [];

    return {
      question_highlight: q?.question || "",
      options: options
    };
  }, [isEmptyHTML, stripHTMLTags]);

  const toggleHint = (qId) => {
    setExpandedHints(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  if (authLoading || loading) {
    return (
      <div className="p-8 text-center font-bold text-slate-400 bg-slate-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4 mx-auto"></div>
          <p className="animate-pulse">Đang tải chi tiết lượt ôn tập...</p>
        </div>
      </div>
    );
  }

  if (!user || !history) return null;

  const scorePercentage = Math.round((history.correctAnswers / history.totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation back */}
        <div className="mb-6 flex justify-between items-center">
          <button 
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition text-sm border border-slate-700 shadow-sm"
          >
            ← Quay về
          </button>
          <span className="text-slate-400 text-sm font-semibold">Chi Tiết Lượt Thi #{history.id}</span>
        </div>

        {/* Dashboard Card tổng quan */}
        <div className="bg-slate-800 border border-slate-700/60 rounded-3xl p-6 md:p-8 shadow-2xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-700/60 pb-6 mb-6">
            <div className="space-y-2">
              <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black text-xs uppercase rounded-full tracking-wider">
                {history.subject}
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-white">Kết quả ôn tập của {history.username}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400 text-xs font-semibold">
                <span className="flex items-center gap-1"><FaUser className="text-[10px]" /> {history.username}</span>
                <span className="flex items-center gap-1"><FaCalendarAlt className="text-[10px]" /> {new Date(history.date).toLocaleString("vi-VN")}</span>
              </div>
            </div>

            {/* Điểm số */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 text-center min-w-[140px] flex flex-col justify-center shadow-lg">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">Điểm số</span>
              <span className="text-4xl font-black text-indigo-400">{history.score}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-widest">{scorePercentage}% Tỉ lệ đúng</span>
            </div>
          </div>

          {/* Cards stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-700/40 flex items-center gap-3">
              <FaCheckCircle className="text-emerald-500 text-xl shrink-0" />
              <div>
                <span className="text-xs text-slate-500 block font-bold">Trả lời đúng</span>
                <span className="text-lg font-black text-emerald-400">{history.correctAnswers} <span className="text-xs font-semibold text-slate-500">/ {history.totalQuestions}</span></span>
              </div>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-700/40 flex items-center gap-3">
              <FaTimesCircle className="text-rose-500 text-xl shrink-0" />
              <div>
                <span className="text-xs text-slate-500 block font-bold">Trả lời sai</span>
                <span className="text-lg font-black text-rose-400">{history.wrongAnswers} <span className="text-xs font-semibold text-slate-500">/ {history.totalQuestions}</span></span>
              </div>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-700/40 flex items-center gap-3">
              <FaExclamationCircle className="text-slate-500 text-xl shrink-0" />
              <div>
                <span className="text-xs text-slate-500 block font-bold">Bỏ qua câu</span>
                <span className="text-lg font-black text-slate-300">{history.unattemptedQuestions}</span>
              </div>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-700/40 flex items-center gap-3">
              <FaClock className="text-indigo-400 text-xl shrink-0" />
              <div>
                <span className="text-xs text-slate-500 block font-bold">Thời gian làm</span>
                <span className="text-lg font-black text-indigo-400">{history.timeSpent}s <span className="text-xs font-semibold text-slate-500">({history.averageTime}s/c)</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Danh sách báo cáo dọc câu hỏi */}
        <h2 className="text-xl font-black text-indigo-400 uppercase tracking-wide mb-4">Chi tiết bài làm</h2>
        
        <div className="space-y-6">
          {questions.map((q, idx) => {
            // Lượt thi này câu đó bị xoá
            if (q.is_deleted) {
              return (
                <div key={q.id || idx} className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-5 shadow-lg flex items-center gap-3">
                  <FaExclamationCircle className="text-rose-500 text-xl" />
                  <div>
                    <span className="text-xs text-rose-500 block font-bold">Câu hỏi {idx + 1}</span>
                    <p className="text-slate-400 text-sm font-medium">Nội dung câu hỏi này đã bị quản trị viên xóa vĩnh viễn khỏi hệ thống.</p>
                  </div>
                </div>
              );
            }

            const parsed = parseHint(q.hint_text, q);
            const userChoiceIndex = q.user_selected; // -1 hoặc 0-3
            const rightChoiceIndex = q.options.indexOf(q.answer);

            const isCorrect = userChoiceIndex === rightChoiceIndex;
            const isSkipped = userChoiceIndex === -1;

            const hasAnyExplanation = parsed.options.some(o => o.hint && o.hint.trim());

            return (
              <div 
                key={q.id} 
                className={`bg-slate-800 border rounded-3xl p-5 md:p-6 shadow-xl relative transition hover:border-slate-600 ${isSkipped ? 'border-slate-700/60' : (isCorrect ? 'border-emerald-500/20' : 'border-rose-500/20')}`}
              >
                {/* Câu hỏi header */}
                <div className="flex justify-between items-center gap-4 mb-4 border-b border-slate-750 pb-3">
                  <span className="text-sm font-black text-indigo-400 uppercase">Câu hỏi {idx + 1}</span>
                  
                  {/* Badge đúng/sai/bỏ qua */}
                  {isSkipped ? (
                    <span className="px-2.5 py-1 rounded-full bg-slate-700 text-slate-400 text-xs font-bold border border-slate-600">Bỏ qua</span>
                  ) : isCorrect ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1">
                      <FaCheckCircle className="text-[10px]" /> Trả lời đúng
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-1">
                      <FaTimesCircle className="text-[10px]" /> Trả lời sai
                    </span>
                  )}
                </div>

                {/* Nội dung câu hỏi (hiển thị bôi đen highlight v3 trực tiếp) */}
                <p 
                  className="font-bold text-slate-200 mb-5 leading-relaxed" 
                  dangerouslySetInnerHTML={{ __html: parsed.question_highlight }}
                />

                {/* Danh sách 4 Đáp án */}
                <div className="space-y-3 mb-5">
                  {parsed.options.map((opt, oIdx) => {
                    const isUserChoice = userChoiceIndex === oIdx;
                    const isRightChoice = rightChoiceIndex === oIdx;

                    let optBg = "bg-slate-900/40 border-slate-750";
                    let optBorder = "border-slate-700/50";
                    let checkIcon = null;

                    if (isRightChoice) {
                      // Đáp án chính xác -> Luôn bôi xanh lá
                      optBg = "bg-emerald-500/10 text-emerald-300";
                      optBorder = "border-emerald-500/30";
                      checkIcon = <FaCheckCircle className="text-emerald-400 shrink-0 text-sm" />;
                    } else if (isUserChoice && !isCorrect) {
                      // Trả lời sai -> Bôi đỏ đáp án đã chọn của user
                      optBg = "bg-rose-500/10 text-rose-300";
                      optBorder = "border-rose-500/30";
                      checkIcon = <FaTimesCircle className="text-rose-400 shrink-0 text-sm" />;
                    }

                    return (
                      <div 
                        key={oIdx} 
                        className={`flex items-start gap-3 p-3.5 rounded-xl border ${optBg} ${optBorder} text-sm transition`}
                      >
                        <span className={`h-6 w-6 rounded-lg font-black font-mono text-xs flex items-center justify-center shrink-0 ${isRightChoice ? 'bg-emerald-500/20 text-emerald-300' : (isUserChoice ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-500')}`}>
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        
                        <div className="flex-grow font-semibold" dangerouslySetInnerHTML={{ __html: opt.text }} />

                        {checkIcon}
                      </div>
                    );
                  })}
                </div>

                {/* Collapsible toggle cho Hints/Giải thích chi tiết */}
                {hasAnyExplanation && (
                  <div className="pt-2 border-t border-slate-750">
                    <button 
                      onClick={() => toggleHint(q.id)}
                      className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-xs font-bold transition focus:outline-none py-1.5"
                    >
                      <FaLightbulb />
                      <span>{expandedHints[q.id] ? "Ẩn giải thích chi tiết" : "💡 Xem giải thích chi tiết"}</span>
                      {expandedHints[q.id] ? <FaChevronUp /> : <FaChevronDown />}
                    </button>

                    {expandedHints[q.id] && (
                      <div className="mt-3 bg-slate-900/60 border border-slate-750/70 p-4 rounded-2xl text-sm leading-relaxed space-y-3 animate-fadeIn">
                        {parsed.options.map((opt, oIdx) => {
                          if (!opt.hint) return null;
                          return (
                            <div key={oIdx} className="border-l-2 border-indigo-500/50 pl-3">
                              <span className="text-xs text-indigo-400 font-bold font-mono">Giải thích đáp án {String.fromCharCode(65 + oIdx)}:</span>
                              <p className="text-slate-300 mt-1 text-sm font-medium">{opt.hint}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
