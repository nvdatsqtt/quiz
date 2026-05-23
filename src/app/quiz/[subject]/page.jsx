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

import { useEffect, useState, useRef, useCallback, memo } from "react";
import { usePoints } from "@/context/PointsContext";
import { useAuth } from "@/context/AuthContext";
import QuestionTimer from "@/components/QuestionTimer";
import Results from "@/components/Results";
import Login from "@/components/Login";
import HistorySection from "@/components/HistorySection";
import { FaPen, FaCheckCircle, FaTimesCircle, FaUser, FaSlidersH, FaPlay, FaHistory, FaBookOpen } from "react-icons/fa";

// Component chỉnh sửa nội dung tối ưu hóa hiệu năng, triệt tiêu hoàn toàn re-render khi bôi đen
// Tác giả: Nguyễn Văn Đạt | Giúp bảo toàn selection và cursor của trình duyệt
const EditableContent = memo(({ id, className, initialHtml }) => {
  return (
    <div
      id={id}
      contentEditable="true"
      suppressContentEditableWarning={true}
      className={className}
      dangerouslySetInnerHTML={{ __html: initialHtml }}
    />
  );
});
EditableContent.displayName = "EditableContent";

const Quiz = ({ params }) => {
  const { subject } = params;
  const { points, setPoints } = usePoints();
  const { user, loading: authLoading } = useAuth();

  // State cấu hình (Setup Screen)
  const [isConfigured, setIsConfigured] = useState(false);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(10);
  const [rawQuestions, setRawQuestions] = useState([]);
  
  // Các state mới hỗ trợ Thống kê câu hỏi & Chế độ ôn tập
  const [questionStatsMap, setQuestionStatsMap] = useState({}); // Lưu trữ map thống kê: { question_text: { appears_count, wrong_count } }
  const [practiceMode, setPracticeMode] = useState("normal"); // Chế độ làm bài: "normal" (thường) hoặc "wrong" (ôn câu hay sai)
  const [statsLoading, setStatsLoading] = useState(false); // Trạng thái tải thống kê từ database

  // State làm bài trắc nghiệm
  const [questions, setQuestions] = useState([]);
  const [editingQuestion, setEditingQuestion] = useState(null); // Quản lý Inline-edit
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  
  // State quản lý Gợi ý (Hint)
  const [showHint, setShowHint] = useState(false);
  const [showHintForm, setShowHintForm] = useState(false);
  const [hintInput, setHintInput] = useState("");
  const [isSubmittingHint, setIsSubmittingHint] = useState(false);

  // --- HỆ THỐNG STATE HINT & HIGHLIGHT V3 (TOÀN DIỆN MỚI) ---
  const [isEditingHint, setIsEditingHint] = useState(false); // Trạng thái đang chỉnh sửa gợi ý/highlight v3
  const [hintInputs, setHintInputs] = useState(["", "", "", ""]); // Quản lý 4 ô nhập giải thích tương ứng với 4 đáp án
  const [selectedOptionForEdit, setSelectedOptionForEdit] = useState(null); // Giữ lại tương thích hoặc phục vụ các logic phụ nếu cần
  const [toolbarState, setToolbarState] = useState({
    show: false,
    top: 0,
    left: 0,
    targetType: "", // "question" hoặc "option"
    optionIndex: -1
  });

  const [showResults, setShowResults] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [unattemptedQuestions, setUnattemptedQuestions] = useState(0);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [timePerQuestion, setTimePerQuestion] = useState(0);
  const [autoNextCountdown, setAutoNextCountdown] = useState(null);

  // Lưu trữ trạng thái từng câu hỏi để hỗ trợ Quay lại (Back)
  const [quizProgress, setQuizProgress] = useState({});

  // Ref quản lý timer tự nhảy câu hỏi
  const autoNextTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Helper kiểm tra chuỗi HTML trống hoặc chỉ chứa thẻ rác (như <br>, &nbsp;, các thẻ block rỗng)
  // Tác giả: Nguyễn Văn Đạt | Giúp ngăn ngừa việc hiển thị một dòng trống khi người dùng xóa hết chữ trong contentEditable
  const isEmptyHTML = useCallback((html) => {
    if (!html) return true;
    const cleanText = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim();
    return cleanText === "";
  }, []);

  // Helper cắt bỏ các thẻ HTML để hiển thị chữ thuần tuý
  const stripHTMLTags = useCallback((html) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  }, []);

  // Helper an toàn phân tách text gợi ý và highlight theo kiến trúc V3 (Tương thích ngược hoàn hảo)
  // Tác giả: Nguyễn Văn Đạt | Đảm bảo an toàn dữ liệu và giải quyết triệt để lỗi xáo trộn đáp án bằng thuật toán so khớp nội dung văn bản gốc
  const parseHint = useCallback((hintString, q) => {
    // Cấu trúc mặc định nếu không có dữ liệu gợi ý (DB bảng questions sử dụng trường question)
    const defaultStructure = {
      question_highlight: q?.question || "",
      options: q?.options?.map(opt => ({ text: opt, hint: "" })) || []
    };

    if (!hintString) return defaultStructure;

    try {
      const parsed = JSON.parse(hintString);
      if (parsed && typeof parsed === "object") {
        // 1. Nếu là định dạng v3 mới (chứa question_highlight hoặc options dạng mảng)
        if ("question_highlight" in parsed || "options" in parsed) {
          const qHighlight = (!parsed.question_highlight || isEmptyHTML(parsed.question_highlight))
            ? (q?.question || "")
            : parsed.question_highlight;

          // Giải quyết lỗi lệch index do xáo trộn đáp án: So khớp phương án theo text thuần
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
        
        // 2. Nếu là định dạng v2 cũ (chứa text giải thích chung và highlight riêng lẻ)
        if ("text" in parsed) {
          const options = q?.options?.map((opt) => {
            const isCorrect = opt === q?.answer;
            const optClean = stripHTMLTags(opt);
            // Tìm trong highlightedOptions phần tử nào có text thuần trùng khớp
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
    } catch (e) {
      // Bắt lỗi cú pháp JSON và xử lý như text thuần bên dưới
    }

    // 3. Nếu hintString chỉ là text giải thích thuần tuý (v1) -> Map gợi ý đó vào đáp án đúng
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

  // Áp dụng bôi đen Highlight tạm thời trên các thẻ contentEditable của V3
  const applyHighlight = useCallback((styleType) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    
    let wrapper = document.createElement("span");
    if (styleType === "strong") {
      wrapper = document.createElement("strong");
    } else if (styleType === "red") {
      wrapper.className = "text-red-500 font-bold";
      wrapper.style.color = "#ef4444";
      wrapper.style.fontWeight = "bold";
    } else if (styleType === "u") {
      wrapper = document.createElement("u");
    } else if (styleType === "s") {
      wrapper = document.createElement("s");
    } else if (styleType === "clear") {
      // Xóa định dạng bằng cách tách lấy text node thuần túy
      const div = document.createElement("div");
      div.appendChild(range.extractContents());
      const textContent = div.innerText || div.textContent;
      const textNode = document.createTextNode(textContent);
      range.insertNode(textNode);
      selection.removeAllRanges();
      setToolbarState(prev => ({ ...prev, show: false }));
      return;
    }

    try {
      range.surroundContents(wrapper);
    } catch (e) {
      // Trường hợp bôi đen mixed nodes phức tạp (ví dụ bôi đen trúng thẻ có sẵn)
      const div = document.createElement("div");
      div.appendChild(range.extractContents());
      if (styleType === "strong") {
        wrapper.innerHTML = `<strong>${div.innerHTML}</strong>`;
      } else if (styleType === "red") {
        wrapper.innerHTML = `<span class="text-red-500 font-bold" style="color:#ef4444; font-weight:bold">${div.innerHTML}</span>`;
      } else if (styleType === "u") {
        wrapper.innerHTML = `<u>${div.innerHTML}</u>`;
      } else if (styleType === "s") {
        wrapper.innerHTML = `<s>${div.innerHTML}</s>`;
      }
      range.insertNode(wrapper);
    }

    selection.removeAllRanges();
    setToolbarState(prev => ({ ...prev, show: false }));
  }, []);

  const clearHighlight = () => {
    applyHighlight("clear");
  };

  useEffect(() => {
    setShowHint(false);
    setShowHintForm(false);
    setHintInput("");
    setIsEditingHint(false); // Reset chế độ sửa gợi ý khi đổi câu hỏi
    setSelectedOptionForEdit(null);
    setToolbarState({ show: false, top: 0, left: 0, targetType: "", optionIndex: -1 });
  }, [currentQuestionIndex]);

  // Lắng nghe sự kiện kết thúc bôi đen (mouseup/keyup) trong chế độ Chỉnh sửa Gợi ý & Highlight V3
  // Giúp tối ưu hóa hiệu năng, triệt tiêu hoàn toàn re-render liên tục gây mất selection và nhảy con trỏ chuột
  useEffect(() => {
    if (!isConfigured || showResults || !isEditingHint) {
      setToolbarState(prev => prev.show ? { ...prev, show: false } : prev);
      return;
    }

    const handleSelectionCheck = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setToolbarState(prev => prev.show ? { ...prev, show: false } : prev);
        return;
      }

      const range = selection.getRangeAt(0);
      const questionEl = document.getElementById("question-text-content-edit");
      let validContainer = null;
      let targetType = "";
      let optionIndex = -1;

      if (questionEl && questionEl.contains(range.commonAncestorContainer)) {
        validContainer = questionEl;
        targetType = "question";
      } else {
        const optionsCount = questions[currentQuestionIndex]?.options?.length || 0;
        for (let i = 0; i < optionsCount; i++) {
          const optEl = document.getElementById(`option-text-edit-${i}`);
          if (optEl && optEl.contains(range.commonAncestorContainer)) {
            validContainer = optEl;
            targetType = "option";
            optionIndex = i;
            break;
          }
        }
      }

      if (!validContainer) {
        setToolbarState(prev => prev.show ? { ...prev, show: false } : prev);
        return;
      }

      const rect = range.getBoundingClientRect();
      // Sử dụng Fixed Position (tọa độ Viewport) để tối ưu Mobile
      setToolbarState({
        show: true,
        top: Math.max(10, rect.top - 50), // Tránh bị tràn lên trên cùng
        left: rect.left + (rect.width / 2),
        targetType: targetType,
        optionIndex: optionIndex
      });
    };

    // Lắng nghe khi người dùng nhả chuột hoặc thả phím để kết thúc quá trình bôi đen
    document.addEventListener("mouseup", handleSelectionCheck);
    document.addEventListener("keyup", handleSelectionCheck);
    return () => {
      document.removeEventListener("mouseup", handleSelectionCheck);
      document.removeEventListener("keyup", handleSelectionCheck);
    };
  }, [isConfigured, showResults, isEditingHint, currentQuestionIndex, questions]);

  // 1. Hàm tải thống kê câu hỏi từ API Turso Database (bảo mật Server-side)
  const fetchQuestionStats = useCallback(async () => {
    if (!user || !subject) return;
    setStatsLoading(true);
    try {
      const decodedSubject = decodeURIComponent(subject || "");
      const res = await fetch(
        `/api/question-stats?username=${encodeURIComponent(user.username)}&subject=${encodeURIComponent(decodedSubject)}`
      );
      if (res.ok) {
        const data = await res.json();
        // Chuyển danh sách dữ liệu từ DB thành Map Object để tra cứu cực nhanh O(1)
        const statsMap = {};
        data.forEach((item) => {
          statsMap[item.question_text] = {
            appears_count: item.appears_count,
            wrong_count: item.wrong_count,
          };
        });
        setQuestionStatsMap(statsMap);
      } else {
        console.error("[Turso Database]: Lỗi khi gọi API tải thống kê câu hỏi.");
      }
    } catch (err) {
      console.error("[Turso Database Error]: Lỗi mạng khi tải thống kê câu hỏi:", err);
    } finally {
      setStatsLoading(false);
    }
  }, [user, subject]);

  // 2. Tải ngân hàng câu hỏi gốc khi mount
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const decodedSubject = decodeURIComponent(subject || "").toLowerCase();
        
        const res = await fetch('/api/questions');
        if (!res.ok) throw new Error("Lỗi mạng khi lấy câu hỏi");
        const data = await res.json();
        
        const subjectData = data.subjects?.find(
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
    };
    fetchQuestions();
  }, [subject]);

  useEffect(() => {
    if (user && !isConfigured) {
      fetchQuestionStats();
    }
  }, [user, isConfigured, fetchQuestionStats]);



  // --- Admin Handlers ---
  const handleDeleteQuestion = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này không?")) return;
    try {
      const res = await fetch(`/api/questions/${id}?role=Admin`, { method: "DELETE" });
      if (res.ok) {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
        setRawQuestions((prev) => prev.filter((q) => q.id !== id));
      } else {
        alert("Xóa thất bại!");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi khi xóa câu hỏi.");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion) return;
    try {
      const res = await fetch(`/api/questions/${editingQuestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "Admin", data: editingQuestion }),
      });
      if (res.ok) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === editingQuestion.id ? { ...q, ...editingQuestion } : q))
        );
        setRawQuestions((prev) =>
          prev.map((q) => (q.id === editingQuestion.id ? { ...q, ...editingQuestion } : q))
        );
        setEditingQuestion(null);
      } else {
        alert("Cập nhật thất bại!");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi khi cập nhật câu hỏi.");
    }
  };

  const cancelAutoNext = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setAutoNextCountdown(null);
  }, []);

  // Khởi chạy chế độ chỉnh sửa gợi ý & highlight v3
  const handleStartEditHint = useCallback(() => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;

    // Hủy bỏ việc tự động chuyển câu tiếp theo nếu đang đếm ngược (khi làm đúng)
    cancelAutoNext();

    const parsed = parseHint(currentQ.hint_text, currentQ);
    // Đồng bộ hint hiện có của 4 đáp án vào mảng state hintInputs
    setHintInputs(parsed.options.map(o => o.hint || ""));
    setIsEditingHint(true);
  }, [questions, currentQuestionIndex, parseHint, cancelAutoNext]);

  const saveResultToHistory = useCallback(async (overrideUnattempted, overrideTimeSpent) => {
    if (!user) return; // Bảo vệ nếu user chưa được tải

    const record = {
      id: Date.now().toString(),
      username: user.username,
      subject: decodeURIComponent(subject || ""),
      date: new Date().toISOString(),
      score: points,
      totalQuestions: questions.length,
      correctAnswers: correctAnswers,
      wrongAnswers: wrongAnswers,
      unattemptedQuestions: overrideUnattempted !== undefined ? overrideUnattempted : unattemptedQuestions,
      timeSpent: overrideTimeSpent !== undefined ? overrideTimeSpent : totalTimeSpent,
      averageTime: ((overrideTimeSpent !== undefined ? overrideTimeSpent : totalTimeSpent) / questions.length).toFixed(1)
    };

    try {
      // Gửi yêu cầu chèn kết quả thi lên Turso Database qua API Route
      const res = await fetch("/api/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(record),
      });

      if (!res.ok) {
        console.error("[Turso Database]: Gặp lỗi khi lưu kết quả thi lên Server.");
      }
    } catch (err) {
      console.error("[Turso Database Error]: Lỗi mạng khi cố gắng lưu lịch sử thi:", err);
    }
  }, [user, subject, points, questions.length, correctAnswers, wrongAnswers, unattemptedQuestions, totalTimeSpent]);

  // 4. Hàm đồng bộ thống kê tần suất xuất hiện và số lần làm sai của từng câu hỏi lên Turso Database
  const saveQuestionStats = useCallback(async () => {
    if (!user || !subject || questions.length === 0) return;

    // Tổng hợp tiến trình làm bài của từng câu hỏi từ danh sách đề thi hiện tại
    const stats = questions.map((q, idx) => {
      const progress = quizProgress[idx];
      return {
        question_text: q.question,
        isCorrect: progress ? progress.isCorrect : null, // true nếu đúng, false nếu sai, null nếu chưa làm/bỏ qua
        isAnswered: progress ? progress.isAnswered : false, // true nếu đã chọn đáp án, false nếu bỏ qua
      };
    });

    try {
      const decodedSubject = decodeURIComponent(subject || "");
      const res = await fetch("/api/question-stats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: user.username,
          subject: decodedSubject,
          stats: stats,
        }),
      });

      if (!res.ok) {
        console.error("[Turso Database]: Gặp lỗi khi lưu thống kê câu hỏi lên Server.");
      }
    } catch (err) {
      console.error("[Turso Database Error]: Lỗi mạng khi cố gắng lưu thống kê câu hỏi:", err);
    }
  }, [user, subject, questions, quizProgress]);

  // Khai báo handleNext trước để handleAnswer có thể sử dụng (đã bọc useCallback)
  const handleNext = useCallback(async () => {
    // Nếu đang trong quá trình đếm ngược, việc bấm nút sẽ DỪNG đếm ngược
    if (autoNextCountdown !== null) {
      cancelAutoNext();
      return;
    }

    cancelAutoNext();

    let nextUnattempted = unattemptedQuestions;
    let nextTimeSpent = totalTimeSpent;

    if (!isAnswered && !quizProgress[currentQuestionIndex]?.isSkipped) {
      nextUnattempted += 1;
      nextTimeSpent += timePerQuestion;
      setUnattemptedQuestions(nextUnattempted);
      setTotalTimeSpent(nextTimeSpent);

      const newProgress = { ...quizProgress };
      newProgress[currentQuestionIndex] = {
        isAnswered: false,
        isSkipped: true,
        timeSpent: timePerQuestion
      };
      setQuizProgress(newProgress);
    }

    const nextQuestion = currentQuestionIndex + 1;
    if (nextQuestion < questions.length) {
      setCurrentQuestionIndex(nextQuestion);

      const savedState = quizProgress[nextQuestion];
      if (savedState) {
        setSelectedOption(savedState.selectedOption);
        setIsAnswered(savedState.isAnswered);
      } else {
        setSelectedOption(null);
        setIsAnswered(false);
      }

      setTimePerQuestion(0);
    } else {
      // Đợi lưu lịch sử và thống kê hoàn thành đồng thời để tránh race condition khi component Results render HistorySection
      await Promise.all([
        saveResultToHistory(nextUnattempted, nextTimeSpent),
        saveQuestionStats()
      ]);
      setShowResults(true);
    }
  }, [autoNextCountdown, cancelAutoNext, unattemptedQuestions, totalTimeSpent, isAnswered, quizProgress, currentQuestionIndex, timePerQuestion, questions.length, saveResultToHistory, saveQuestionStats]);

  const handleAnswer = useCallback((option) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);
    setTotalTimeSpent(totalTimeSpent + timePerQuestion);

    const isCorrect = option === questions[currentQuestionIndex].answer;

    const isAlreadyAnswered = quizProgress[currentQuestionIndex]?.isAnswered;
    const newProgress = { ...quizProgress };
    newProgress[currentQuestionIndex] = {
      selectedOption: option,
      isAnswered: true,
      isCorrect: isCorrect,
      timeSpent: timePerQuestion,
      isSkipped: false
    };
    setQuizProgress(newProgress);

    if (!isAlreadyAnswered) {
      if (isCorrect) {
        setPoints(points + 4);
        setCorrectAnswers(correctAnswers + 1);

        setAutoNextCountdown(3);

        const timer = setTimeout(() => {
          handleNext();
        }, 3000);
        autoNextTimerRef.current = timer;

        countdownIntervalRef.current = setInterval(() => {
          setAutoNextCountdown(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
      } else {
        setWrongAnswers(wrongAnswers + 1);
      }
    }
  }, [isAnswered, totalTimeSpent, timePerQuestion, questions, currentQuestionIndex, quizProgress, points, setPoints, correctAnswers, setCorrectAnswers, wrongAnswers, setWrongAnswers, handleNext]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      cancelAutoNext();
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);

      const savedState = quizProgress[prevIndex];
      if (savedState) {
        setSelectedOption(savedState.selectedOption);
        setIsAnswered(savedState.isAnswered);
      } else {
        setSelectedOption(null);
        setIsAnswered(false);
      }

      setTimePerQuestion(0);
    }
  }, [currentQuestionIndex, cancelAutoNext, quizProgress]);

  // 3. Xử lý nộp gợi ý giải thích và highlight v3 tổng hợp
  const handleSubmitHint = useCallback(async () => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;

    setIsSubmittingHint(true);

    try {
      // 1. Thu thập Highlight từ DOM các thẻ contentEditable
      const questionEl = document.getElementById("question-text-content-edit");
      const questionHighlight = questionEl ? questionEl.innerHTML.trim() : (currentQ.question || "");

      const updatedOptions = currentQ.options.map((opt, index) => {
        const optEl = document.getElementById(`option-text-edit-${index}`);
        const optHighlight = optEl ? optEl.innerHTML.trim() : opt;
        return {
          text: optHighlight,
          hint: (hintInputs[index] || "").trim()
        };
      });

      // 2. Đóng gói JSON v3 chuẩn
      const updatedHintObj = {
        question_highlight: questionHighlight,
        options: updatedOptions
      };
      const updatedHintString = JSON.stringify(updatedHintObj);

      // 3. Gọi API lưu trữ vào DB
      const res = await fetch(`/api/questions/${currentQ.id}/hint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: user?.isAdmin ? "Admin" : "User",
          new_hint: updatedHintString,
          username: user?.username || "Guest"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gặp lỗi khi gửi gợi ý giải thích.");
      }

      // Admin hoặc người dùng đóng góp tự động phê duyệt -> cập nhật ngay React states
      if (user?.isAdmin || !parseHint(currentQ.hint_text, currentQ).options.some(o => o.hint)) {
        setQuestions(prev => prev.map((q, idx) => 
          idx === currentQuestionIndex ? { ...q, hint_text: updatedHintString } : q
        ));
        setRawQuestions(prev => prev.map(q => 
          q.id === currentQ.id ? { ...q, hint_text: updatedHintString } : q
        ));
      }

      // Tự động tắt chế độ chỉnh sửa gợi ý và quay trở lại màn hình câu hỏi ngay lập tức mà không hiển thị popup thông báo (giúp UX mượt mà hơn)
      setIsEditingHint(false);
    } catch (err) {
      console.error("Lỗi khi submit hint v3:", err);
      alert(err.message || "Gặp lỗi mạng khi lưu gợi ý.");
    } finally {
      setIsSubmittingHint(false);
    }
  }, [questions, currentQuestionIndex, hintInputs, parseHint, user]);


  const handleForceFinish = async () => {
    cancelAutoNext();

    const remainingCount = questions.length - currentQuestionIndex - (isAnswered ? 1 : 0);
    const finalUnattempted = unattemptedQuestions + remainingCount;
    const finalTime = totalTimeSpent + (isAnswered ? 0 : timePerQuestion);
    setUnattemptedQuestions(finalUnattempted);
    setTotalTimeSpent(finalTime);
    
    // Đợi lưu lịch sử và thống kê hoàn thành đồng thời để tránh race condition
    await Promise.all([
      saveResultToHistory(finalUnattempted, finalTime),
      saveQuestionStats()
    ]);
    setShowResults(true);
  };

  const handleRestartSetup = () => {
    setIsConfigured(false);
    setShowResults(false);
  };

  // 2. Xử lý phím tắt bàn phím
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Khóa phím tắt hoàn toàn khi form sửa gợi ý đang hiển thị, chưa cấu hình, hoặc đang ở trang kết quả
      if (showResults || !isConfigured || showHintForm || selectedOptionForEdit !== null) return;

      // Khóa phím tắt khi đang nhập liệu trong bất kỳ input, textarea hoặc phần tử contenteditable nào khác
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.hasAttribute('contenteditable') ||
        activeEl.getAttribute('contenteditable') === 'true' ||
        activeEl.isContentEditable
      )) {
        return;
      }

      const key = e.key.toLowerCase();

      const options = questions[currentQuestionIndex]?.options || [];
      if (['1', '2', '3', '4'].includes(key)) {
        const index = parseInt(key) - 1;
        if (options[index]) handleAnswer(options[index]);
      } else if (['a', 'b', 'c', 'd'].includes(key)) {
        const index = key.charCodeAt(0) - 97;
        if (options[index]) handleAnswer(options[index]);
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (autoNextCountdown !== null) {
          cancelAutoNext();
        } else {
          handleNext();
        }
      }

      if (key === 'p') {
        handlePrevious();
      }

      if (key === 'n') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isConfigured, showResults, currentQuestionIndex, questions,
    autoNextCountdown, isAnswered, selectedOption,
    handleAnswer, handleNext, handlePrevious, cancelAutoNext,
    showHintForm, selectedOptionForEdit
  ]);

  const handleContainerClick = (e) => {
    // Nếu click trúng bất kỳ button, textarea, input, hoặc vùng contenteditable nào -> Bỏ qua không tự chuyển câu
    if (
      e.target.closest("button") ||
      e.target.closest("textarea") ||
      e.target.closest("input") ||
      e.target.closest("[contenteditable]")
    ) {
      return;
    }

    if (autoNextCountdown !== null) {
      cancelAutoNext();
      return;
    }

    if (isAnswered && selectedOption !== questions[currentQuestionIndex]?.answer) {
      // Bấm vào vùng trống thực tế khi làm sai sẽ chuyển câu
      handleNext();
    }
  };

  const percentage = questions.length > 0 ? Math.round((correctAnswers / questions.length) * 100) : 0;
  const averageTimePerQuestion = questions.length > 0 ? (totalTimeSpent / questions.length).toFixed(1) : "0.0";
  const rawQuestionText = questions[currentQuestionIndex]?.question || "";
  const optionPrefixes = ["A", "B", "C", "D", "E", "F"];

  // Logic xử lý Shuffle phụ trợ
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
    
    let selectedQuestions = [];
    if (practiceMode === "wrong") {
      // 1. Chế độ ôn tập câu hay sai:
      // Lọc ra các câu hỏi trong ngân hàng mà học viên này từng trả lời sai (wrong_count > 0)
      const wrongQuestions = rawQuestions.filter(q => (questionStatsMap[q.question]?.wrong_count || 0) > 0);
      
      // Sắp xếp theo số lần làm sai giảm dần (câu sai nhiều nhất lên trước)
      // Nếu bằng nhau, áp dụng xáo trộn ngẫu nhiên
      const sortedWrong = [...wrongQuestions].sort((a, b) => {
        const wrongA = questionStatsMap[a.question]?.wrong_count || 0;
        const wrongB = questionStatsMap[b.question]?.wrong_count || 0;
        if (wrongB !== wrongA) {
          return wrongB - wrongA;
        }
        return Math.random() - 0.5;
      });
      
      // Cắt lấy số lượng câu hỏi theo cấu hình slider (giới hạn bằng tổng số câu sai có sẵn)
      const limit = Math.min(selectedQuestionCount, sortedWrong.length);
      selectedQuestions = sortedWrong.slice(0, limit);
    } else {
      // 2. Chế độ thông thường: Ưu tiên các câu hỏi ít xuất hiện hơn để phủ khắp ngân hàng đề
      // Sắp xếp câu hỏi theo số lần xuất hiện (appears_count) tăng dần
      // Nếu số lần xuất hiện bằng nhau, xáo trộn ngẫu nhiên
      const sortedByAppears = [...rawQuestions].sort((a, b) => {
        const appearsA = questionStatsMap[a.question]?.appears_count || 0;
        const appearsB = questionStatsMap[b.question]?.appears_count || 0;
        if (appearsA !== appearsB) {
          return appearsA - appearsB;
        }
        return Math.random() - 0.5;
      });
      
      selectedQuestions = sortedByAppears.slice(0, selectedQuestionCount);
    }

    // Xáo trộn ngẫu nhiên thứ tự các đáp án cho từng câu hỏi được chọn để tránh học vẹt
    const questionsWithShuffledOptions = selectedQuestions.map(q => ({
      ...q,
      options: shuffleQuestions(q.options, q.options.length)
    }));

    setQuestions(questionsWithShuffledOptions);
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

  // --- TÍNH TOÁN CÁC BIẾN PHỤ TRỢ THỐNG KÊ (ĐẶT SAU TẤT CẢ CÁC HOOKS) ---
  const wrongQuestionsList = rawQuestions.filter(q => (questionStatsMap[q.question]?.wrong_count || 0) > 0);
  const answeredQuestionsCount = rawQuestions.filter(q => (questionStatsMap[q.question]?.appears_count || 0) > 0).length;

  // Hàm chuyển đổi chế độ làm bài và điều chỉnh slider tương ứng tránh vượt quá giới hạn
  const handleModeChange = (mode) => {
    setPracticeMode(mode);
    if (mode === "wrong") {
      const wrongCount = wrongQuestionsList.length;
      // Nếu số câu sai lớn hơn 10, để mặc định 10 câu. Nếu nhỏ hơn 5, lấy toàn bộ câu sai.
      setSelectedQuestionCount(wrongCount > 10 ? 10 : (wrongCount >= 5 ? 5 : wrongCount));
    } else {
      const totalCount = rawQuestions.length;
      setSelectedQuestionCount(totalCount > 20 ? 20 : totalCount);
    }
  };

  // --- CÁC RETURN CÓ ĐIỀU KIỆN PHẢI ĐẶT SAU TẤT CẢ CÁC HOOKS ---

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
    const maxSelectCount = practiceMode === "wrong" ? wrongQuestionsList.length : rawQuestions.length;
    const progressPercentage = Math.round((answeredQuestionsCount / rawQuestions.length) * 100);

    return (
      <div className="p-4 sm:p-6 bg-slate-50 min-h-screen flex flex-col items-center justify-start py-8">
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-6 sm:p-10 transition-all duration-300">
          <h1 className="text-3xl sm:text-4xl font-black text-center text-blue-600 mb-2 uppercase tracking-wide">
            Cấu hình ôn luyện trắc nghiệm
          </h1>
          <p className="text-center text-slate-500 mb-8 font-medium">
            Chủ đề: <span className="text-blue-900 font-bold">{decodeURIComponent(subject || "")}</span>
          </p>

          {/* 📊 PREMIUM DASHBOARD THỐNG KÊ TIẾN TRÌNH */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Widget 1: Tiến trình ôn luyện */}
            <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <FaHistory className="text-lg" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tiến trình ôn luyện</p>
                  <h4 className="text-lg font-black text-slate-800">Đã gặp trong đề thi</h4>
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-2xl font-black text-indigo-700">{answeredQuestionsCount} <span className="text-sm font-semibold text-slate-400">/ {rawQuestions.length} Câu</span></span>
                  <span className="text-sm font-extrabold text-indigo-600">{progressPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                </div>
              </div>
            </div>

            {/* Widget 2: Câu hỏi bị sai */}
            <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white">
                  <FaTimesCircle className="text-lg" />
                </div>
                <div>
                  <p className="text-xs text-rose-400 font-bold uppercase tracking-wider">Khắc phục điểm yếu</p>
                  <h4 className="text-lg font-black text-slate-800">Câu hỏi từng làm sai</h4>
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black text-rose-600">{wrongQuestionsList.length} <span className="text-sm font-semibold text-slate-400">Câu</span></span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-black border uppercase tracking-wider ${
                    wrongQuestionsList.length > 0 ? "bg-rose-100 text-rose-700 border-rose-200 animate-pulse" : "bg-green-100 text-green-700 border-green-200"
                  }`}>
                    {wrongQuestionsList.length > 0 ? "Cần ôn tập" : "Tuyệt vời!"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2 font-medium">Hệ thống ghi nhận để bạn ôn luyện lại các lỗi sai.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col mb-8">
            <div className="space-y-6 border-slate-100">
              
              {/* 👥 THÔNG TIN HỌC VIÊN */}
              <div>
                <label className="flex items-center gap-2 text-slate-700 font-bold mb-3">
                  <FaUser className="text-blue-600 text-lg" />
                  Học viên đang đăng nhập:
                </label>
                <div className="px-5 py-4 rounded-xl border-2 border-blue-500 bg-blue-50/50 text-blue-700 font-black flex items-center justify-between shadow-sm">
                  <span>{user.username}</span>
                  {user.isAdmin && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded uppercase font-bold tracking-wider">Quản trị viên</span>}
                </div>
              </div>

              {/* ⚡ CHỌN CHẾ ĐỘ ÔN TẬP */}
              <div>
                <label className="flex items-center gap-2 text-slate-700 font-bold mb-3">
                  <FaBookOpen className="text-blue-600 text-lg" />
                  Chọn chế độ làm bài:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Chế độ 1: Ôn luyện thông minh */}
                  <button
                    type="button"
                    onClick={() => handleModeChange("normal")}
                    className={`p-5 rounded-2xl border-2 text-left transition-all duration-300 flex gap-4 hover:shadow-md ${
                      practiceMode === "normal"
                        ? "border-blue-600 bg-blue-50/40 shadow-sm"
                        : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold ${
                      practiceMode === "normal" ? "bg-blue-600 text-white animate-pulse" : "bg-slate-100 text-slate-500"
                    }`}>
                      1
                    </div>
                    <div>
                      <h5 className="font-black text-slate-800 text-sm md:text-base">Ôn tập thông minh</h5>
                      <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                        Ưu tiên hiển thị các câu hỏi ít xuất hiện hơn để bạn ghi nhớ đều đặn toàn bộ ngân hàng câu hỏi.
                      </p>
                    </div>
                  </button>

                  {/* Chế độ 2: Ôn tập câu hỏi hay sai */}
                  <button
                    type="button"
                    disabled={wrongQuestionsList.length === 0}
                    onClick={() => handleModeChange("wrong")}
                    className={`p-5 rounded-2xl border-2 text-left transition-all duration-300 flex gap-4 ${
                      wrongQuestionsList.length === 0
                        ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60"
                        : practiceMode === "wrong"
                        ? "border-rose-500 bg-rose-50/40 shadow-sm hover:shadow-md"
                        : "border-slate-200 bg-white hover:border-rose-300 hover:shadow-md"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold ${
                      wrongQuestionsList.length === 0
                        ? "bg-slate-200 text-slate-300"
                        : practiceMode === "wrong"
                        ? "bg-rose-500 text-white animate-pulse"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      2
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className={`font-black text-sm md:text-base ${wrongQuestionsList.length === 0 ? "text-slate-400" : "text-slate-800"}`}>
                          Khắc phục điểm yếu
                        </h5>
                        {wrongQuestionsList.length > 0 && (
                          <span className="text-[9px] bg-rose-600 text-white font-extrabold px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                            {wrongQuestionsList.length}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                        {wrongQuestionsList.length === 0
                          ? "Bạn chưa có câu hỏi nào trả lời sai. Hãy luyện tập chế độ thường trước!"
                          : "Chỉ làm lại các câu bạn đã trả lời sai, ưu tiên câu sai nhiều lần nhất để nhớ lâu."}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 🎚️ SLIDER CHỌN SỐ LƯỢNG CÂU HỎI */}
              <div>
                <label className="flex items-center justify-between text-slate-700 font-bold mb-3">
                  <span className="flex items-center gap-2">
                    <FaSlidersH className="text-blue-600 text-lg" />
                    Số lượng câu hỏi:
                  </span>
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-extrabold shadow-sm">
                    {selectedQuestionCount} / {maxSelectCount} Câu
                  </span>
                </label>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs font-bold text-slate-400">
                    {maxSelectCount === 0 ? 0 : Math.min(5, maxSelectCount)}
                  </span>
                  <input
                    type="range"
                    min={maxSelectCount === 0 ? 0 : Math.min(5, maxSelectCount)}
                    max={maxSelectCount}
                    value={selectedQuestionCount}
                    disabled={maxSelectCount === 0}
                    onChange={(e) => setSelectedQuestionCount(parseInt(e.target.value))}
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
                  />
                  <span className="text-xs font-bold text-slate-400">{maxSelectCount}</span>
                </div>
              </div>

              {/* 🚀 NÚT BẮT ĐẦU */}
              <button
                onClick={handleStartQuiz}
                disabled={maxSelectCount === 0}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95"
              >
                <FaPlay /> {practiceMode === "wrong" ? "BẮT ĐẦU ÔN LUYỆN ĐIỂM YẾU" : "BẮT ĐẦU ÔN LUYỆN THÔNG MINH"}
              </button>
            </div>
          </div>

          <div className="border-t pt-4 text-center">
            <span className="text-red-600 font-black text-xs bg-red-50 border border-red-200 rounded px-3 py-1.5 uppercase select-none tracking-wider shadow-inner">
              Chỉ sử dụng nội bộ
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
              setTimePerQuestion={setTimePerQuestion}
              isAnswered={isAnswered}
              resetTimer={currentQuestionIndex}
            />
          </div>

          {editingQuestion?.id === questions[currentQuestionIndex]?.id ? (
            // KHỐI GIAO DIỆN CHỈNH SỬA CÂU HỎI TRỰC TIẾP CỦA ADMIN (Inline Edit)
            <div className="bg-white p-6 rounded-2xl shadow border border-blue-200 mb-6 relative z-10">
              <h3 className="font-bold text-lg mb-4 text-blue-800 flex items-center gap-2">
                <FaPen /> Chỉnh sửa Câu hỏi (Admin)
              </h3>
              <div className="space-y-4">
                <textarea
                  className="w-full p-3 border rounded-lg bg-slate-50 text-black font-medium focus:ring-2 focus:ring-blue-400 outline-none"
                  rows="3"
                  value={editingQuestion.question}
                  onChange={(e) => setEditingQuestion({...editingQuestion, question: e.target.value})}
                />
                {editingQuestion.options.map((opt, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <input
                      type="radio"
                      name="correct_answer"
                      checked={editingQuestion.answer === opt}
                      onChange={() => setEditingQuestion({...editingQuestion, answer: opt})}
                      className="w-5 h-5 cursor-pointer accent-blue-600"
                    />
                    <input
                      type="text"
                      className="flex-1 p-2 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-400 outline-none"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...editingQuestion.options];
                        newOpts[i] = e.target.value;
                        let newAnswer = editingQuestion.answer;
                        if (editingQuestion.answer === opt) newAnswer = e.target.value;
                        setEditingQuestion({...editingQuestion, options: newOpts, answer: newAnswer});
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={handleSaveEdit} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition">Lưu thay đổi</button>
                <button onClick={() => setEditingQuestion(null)} className="px-6 py-2 bg-slate-300 text-slate-800 font-bold rounded-lg hover:bg-slate-400 transition">Hủy</button>
              </div>
            </div>
          ) : isEditingHint ? (
            // KHỐI GIAO DIỆN CHỈNH SỬA HINT & HIGHLIGHT V3 (MỚI TRIỂN KHAI)
            <div className="flex flex-col gap-6 text-left">
              {/* 1. Phần Câu hỏi chỉnh sửa */}
              <div className="p-5 sm:p-6 bg-amber-50/50 border border-amber-200 rounded-2xl shadow-sm leading-relaxed relative">
                <div className="absolute top-2 right-2 px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] sm:text-xs font-black rounded-full select-none">
                  Chế độ chỉnh sửa Highlight
                </div>
                <div className="text-lg sm:text-xl leading-relaxed flex flex-col gap-2">
                  <span className="text-black font-black text-2xl mr-2 shrink-0 select-none">Câu {currentQuestionIndex + 1}:</span>
                  {/* Sử dụng component con EditableContent được bọc React.memo để ngăn chặn re-render mất con trỏ chuột */}
                  <EditableContent 
                    id="question-text-content-edit"
                    className="text-blue-900 font-bold outline-none border-b-2 border-dashed border-amber-300 focus:border-amber-500 w-full min-h-[1.5em] px-2 py-1 bg-white rounded shadow-inner"
                    initialHtml={parseHint(questions[currentQuestionIndex]?.hint_text, questions[currentQuestionIndex]).question_highlight}
                  />
                </div>
                <p className="text-[10px] sm:text-[11px] text-amber-600 mt-3 font-extrabold select-none leading-normal">
                  * HƯỚNG DẪN HIGHLIGHT: Bạn hãy bôi đen chữ trong câu hỏi để áp dụng các định dạng (In đậm, Chữ đỏ, Gạch chân, Gạch ngang) từ Floating Toolbar xuất hiện.
                </p>
              </div>

              {/* 2. Phần 4 Options & 4 Textareas */}
              <div className="space-y-6">
                {questions[currentQuestionIndex]?.options?.map((option, index) => {
                  const isCorrect = option === questions[currentQuestionIndex].answer;
                  const parsedData = parseHint(questions[currentQuestionIndex]?.hint_text, questions[currentQuestionIndex]);
                  return (
                    <div key={option} className="flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm relative">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-black border transition-all duration-300 shrink-0 shadow-sm ${isCorrect ? "bg-green-600 text-white border-green-600 shadow-green-100" : "bg-white text-blue-600 border-blue-100"}`}>
                          {optionPrefixes[index]}
                        </span>
                        {/* Sử dụng component con EditableContent được bọc React.memo để ngăn chặn re-render mất con trỏ chuột */}
                        <EditableContent 
                          id={`option-text-edit-${index}`} 
                          className="flex-1 leading-snug font-bold outline-none border-b-2 border-dashed border-amber-300 focus:border-amber-500 p-2 bg-white rounded shadow-inner"
                          initialHtml={parsedData.options[index]?.text || option}
                        />
                      </div>
                      
                      <p className="text-[10px] sm:text-[11px] text-amber-600 ml-12 font-extrabold select-none leading-normal">
                        * Bôi đen chữ của đáp án để áp dụng Highlight
                      </p>

                      {/* Textarea nhập hint giải thích riêng cho từng option */}
                      <div className="mt-2 ml-12">
                        <label className="block text-[11px] sm:text-xs font-black text-slate-500 mb-1.5 flex items-center gap-1.5 select-none">
                          <FaBookOpen className="text-blue-500" /> Giải thích gợi ý cho phương án {optionPrefixes[index]} {isCorrect && <span className="text-emerald-600 font-black">(Đáp án đúng)</span>}
                        </label>
                        <textarea
                          className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none text-slate-800 text-sm font-medium shadow-inner transition"
                          rows="2"
                          placeholder={`Giải thích tại sao phương án ${optionPrefixes[index]} đúng/sai...`}
                          value={hintInputs[index] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setHintInputs(prev => {
                              const next = [...prev];
                              next[index] = val;
                              return next;
                            });
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 3. Nút Lưu / Hủy */}
              <div className="mt-4 flex gap-4 p-4 bg-amber-50/50 border border-amber-200 rounded-2xl select-none">
                <button 
                  onClick={handleSubmitHint} 
                  disabled={isSubmittingHint}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black text-base shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingHint ? "Đang lưu thay đổi..." : "Lưu thay đổi"}
                </button>
                <button 
                  onClick={() => { setIsEditingHint(false); setToolbarState(prev => ({ ...prev, show: false })); }} 
                  className="py-3 px-6 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-black text-base shadow-md transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer"
                >
                  Hủy bỏ
                </button>
              </div>
            </div>
          ) : (
            // KHỐI RENDER MẶC ĐỊNH KHI KHÔNG TRONG CHẾ ĐỘ CHỈNH SỬA
            <>
              <div className="text-left p-5 sm:p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm leading-relaxed mb-6 select-none relative group">
                {user?.isAdmin && (
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={() => setEditingQuestion(questions[currentQuestionIndex])} className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition" title="Chỉnh sửa"><FaPen size={14} /></button>
                    <button onClick={() => handleDeleteQuestion(questions[currentQuestionIndex].id)} className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition" title="Xóa"><FaTimesCircle size={14} /></button>
                  </div>
                )}
                <p className="text-lg sm:text-xl leading-relaxed flex flex-wrap items-baseline">
                  <span className="text-black font-black text-2xl mr-2 shrink-0 select-none">Câu {currentQuestionIndex + 1}:</span>
                  {isAnswered ? (
                    <span 
                      id="question-text-content"
                      className="text-blue-900 font-bold"
                      dangerouslySetInnerHTML={{ __html: parseHint(questions[currentQuestionIndex]?.hint_text, questions[currentQuestionIndex]).question_highlight }}
                    />
                  ) : (
                    <span id="question-text-content" className="text-blue-900 font-bold">{stripHTMLTags(questions[currentQuestionIndex]?.question_text || rawQuestionText)}</span>
                  )}
                </p>
              </div>

              <div className="mt-6 space-y-4">
                {questions[currentQuestionIndex]?.options?.map((option, index) => {
                  const isCorrect = option === questions[currentQuestionIndex].answer;
                  const parsedHintData = parseHint(questions[currentQuestionIndex]?.hint_text, questions[currentQuestionIndex]);
                  return (
                    <div key={option} className="flex flex-col gap-2">
                      <button
                        onClick={() => !isAnswered && handleAnswer(option)}
                        className={`w-full py-4 px-6 rounded-2xl text-base sm:text-lg font-bold text-left transition-all duration-300 focus:outline-none flex items-center gap-3 border shadow-sm ${isAnswered && option === questions[currentQuestionIndex].answer
                            ? "bg-green-600 text-white border-green-600 shadow-green-100"
                            : isAnswered && option === selectedOption
                              ? "bg-red-600 text-white border-red-600 shadow-red-100"
                              : "bg-slate-50 hover:bg-blue-50 hover:border-blue-300 focus:bg-blue-50 text-slate-800 border-slate-200 hover:shadow"
                          }`}
                      >
                        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-black border transition-all duration-300 shrink-0 shadow-sm ${isAnswered && option === questions[currentQuestionIndex].answer
                            ? "bg-white text-green-600 border-white font-extrabold"
                            : isAnswered && option === selectedOption
                              ? "bg-white text-red-600 border-white font-extrabold"
                              : "bg-white text-blue-600 border-blue-100"
                          }`}>
                          {optionPrefixes[index]}
                        </span>
                        <span 
                          id={`option-text-${index}`} 
                          className="flex-1 leading-snug"
                          dangerouslySetInnerHTML={
                            isAnswered
                              ? { __html: parsedHintData.options[index]?.text || option }
                              : undefined
                          }
                        >
                          {!isAnswered ? stripHTMLTags(option) : undefined}
                        </span>
                      </button>

                      {/* Hiển thị Gợi ý giải thích của đáp án ĐÚNG tự động */}
                      {isAnswered && isCorrect && (
                        <div className="mt-1 mb-2 p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-left text-sm relative z-10 shadow-sm leading-relaxed">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-extrabold text-emerald-800 flex items-center gap-1.5">
                              <FaBookOpen className="text-emerald-600" /> Gợi ý giải thích đáp án
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Ngăn chặn nổi bọt sự kiện click lên container cha gây chuyển câu hỏi
                                handleStartEditHint();
                              }}
                              className="text-xs text-emerald-700 hover:underline font-extrabold flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-full transition"
                            >
                              <FaPen size={10} /> Sửa gợi ý & Highlight
                            </button>
                          </div>
                          <div>
                            {parsedHintData.options[index]?.hint ? (
                              <p className="text-slate-800 font-medium whitespace-pre-line leading-relaxed text-sm sm:text-base" dangerouslySetInnerHTML={{ __html: parsedHintData.options[index].hint }} />
                            ) : (
                              <p className="text-slate-500 italic font-bold">Chưa có gợi ý nào</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Hiển thị giải thích vì sao SAI cho phương án người dùng chọn sai */}
                      {isAnswered && !isCorrect && parsedHintData.options[index]?.hint && (
                        <div className="mt-1 mb-2 p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-sm relative z-10 shadow-sm leading-relaxed">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-slate-700 flex items-center gap-1.5">
                              <FaBookOpen className="text-blue-500" /> Giải thích vì sao sai
                            </span>
                          </div>
                          <p className="text-slate-700 font-medium whitespace-pre-line leading-relaxed text-sm sm:text-base" dangerouslySetInnerHTML={{ __html: parsedHintData.options[index].hint }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-8 flex flex-col gap-4 select-none">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className={`py-4 px-6 rounded-2xl font-black text-lg shadow-md transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95 ${currentQuestionIndex === 0
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-slate-700 hover:bg-slate-800 text-white cursor-pointer"
                  }`}
              >
                Quay lại câu trước
              </button>
              <button onClick={handleForceFinish} className="py-4 px-6 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-2xl font-black text-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer">
                Kết thúc ôn tập
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={handleNext} className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-black text-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer">
                {isAnswered
                  ? (currentQuestionIndex === questions.length - 1
                    ? "Nộp bài và xem kết quả"
                    : (autoNextCountdown !== null ? `Đang chuyển câu tiếp theo (${autoNextCountdown}s)` : "Câu hỏi tiếp theo")
                  )
                  : (currentQuestionIndex === questions.length - 1 ? "Bỏ qua & Xem kết quả" : "Bỏ qua & Câu tiếp theo")
                }
              </button>

              {/* Hướng dẫn khi trả lời đúng (đang đếm ngược) */}
              {autoNextCountdown !== null && (
                <p className="text-center text-[11px] text-blue-500 font-bold animate-pulse">
                  * Click vào vùng trống hoặc Nút trên để dừng chuyển trang tự động
                </p>
              )}

              {/* Hướng dẫn khi trả lời sai */}
              {isAnswered && selectedOption !== questions[currentQuestionIndex].answer && (
                <p className="text-center text-[11px] text-red-500 font-bold animate-pulse">
                  * Trả lời sai. Click vùng trống hoặc nút để tiếp tục
                </p>
              )}
            </div>

            {/* Hướng dẫn phím tắt bàn phím (PC) */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap justify-center gap-x-6 gap-y-3 text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-widest select-none">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-slate-600 shadow-sm">A,B,C,D</span>
                <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-slate-600 shadow-sm">1,2,3,4</span>
                <span>Chọn đáp án</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-slate-600 shadow-sm">Space</span>
                <span>Tiếp tục / Dừng tự động</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-slate-600 shadow-sm">P</span>
                <span>Câu trước</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-slate-600 shadow-sm">N</span>
                <span>Câu sau</span>
              </div>
            </div>

            {/* Floating Selection Toolbar (Fixed Position) */}
            {toolbarState.show && (
              <div
                className="fixed z-[9999] flex gap-1 bg-slate-800 p-1.5 rounded-lg shadow-2xl transition-all duration-200"
                style={{
                  top: `${toolbarState.top}px`,
                  left: `${toolbarState.left}px`,
                  transform: "translateX(-50%)",
                }}
              >
                {/* Thêm onMouseDown={(e) => e.preventDefault()} để ngăn chặn sự kiện mặc định cướp lấy focus/selection của trình duyệt khi click */}
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyHighlight("strong")} className="px-3 py-1.5 text-white hover:bg-slate-700 rounded font-black text-xs" title="In đậm">B</button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyHighlight("red")} className="px-3 py-1.5 text-red-400 hover:bg-slate-700 rounded font-black text-xs" title="Chữ đỏ">Red</button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyHighlight("u")} className="px-3 py-1.5 text-white hover:bg-slate-700 rounded font-black text-xs underline" title="Gạch chân">U</button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyHighlight("s")} className="px-3 py-1.5 text-slate-300 hover:bg-slate-700 rounded font-black text-xs line-through" title="Gạch ngang">S</button>
                <div className="w-[1px] bg-slate-600 mx-1"></div>
                <button onMouseDown={(e) => e.preventDefault()} onClick={clearHighlight} className="px-3 py-1.5 text-emerald-400 hover:bg-slate-700 rounded font-bold text-xs" title="Xóa định dạng">Clear</button>
              </div>
            )}
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
