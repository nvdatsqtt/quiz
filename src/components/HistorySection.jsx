'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  FaHistory, 
  FaCalendarAlt, 
  FaUser, 
  FaBookOpen,
  FaTrophy,
  FaFilter,
  FaTrash
} from "react-icons/fa";

const HistorySection = ({ currentUser, subjectFilter = null }) => {
  const [history, setHistory] = useState([]);
  const [displayHistory, setDisplayHistory] = useState([]);
  const [userFilter, setUserFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Hàm tải dữ liệu lịch sử thi từ API (Turso Database)
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      } else {
        console.error("[Turso Database Error]: Lỗi tải lịch sử từ API");
      }
    } catch (err) {
      console.error("[Turso Database Error]: Lỗi kết nối mạng khi tải lịch sử:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    let filtered = [...history];

    // Lọc theo môn học nếu có
    if (subjectFilter) {
      filtered = filtered.filter(h => h.subject === subjectFilter);
    }

    // Phân quyền hiển thị
    if (!currentUser.isAdmin) {
      // User thường chỉ thấy của mình
      filtered = filtered.filter(h => h.username === currentUser.username);
    } else if (userFilter !== "all") {
      // Admin có thể lọc theo user
      filtered = filtered.filter(h => h.username === userFilter);
    }

    setDisplayHistory(filtered);
  }, [history, currentUser, subjectFilter, userFilter]);

  const uniqueUsers = Array.from(new Set(history.map(h => h.username)));

  // Gửi yêu cầu DELETE đến máy chủ để xóa toàn bộ lịch sử thi (Chỉ Admin)
  const clearHistory = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử không?")) {
      try {
        const res = await fetch("/api/history", {
          method: "DELETE",
        });
        if (res.ok) {
          setHistory([]);
        } else {
          alert("Gặp lỗi từ máy chủ khi cố gắng xóa sạch lịch sử thi.");
        }
      } catch (err) {
        console.error("[Turso Database Error]: Lỗi mạng khi xóa lịch sử:", err);
      }
    }
  };

  return (
    <div className="w-full bg-white border border-slate-100 shadow-xl rounded-3xl p-6 sm:p-8 mt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 mb-6">
        <div className="flex items-center gap-3">
          <FaHistory className="text-indigo-600 text-2xl" />
          <h3 className="text-xl sm:text-2xl font-black text-slate-800">
            Lịch sử ôn tập {currentUser.isAdmin ? "(Tất cả thành viên)" : "(Cá nhân)"}
          </h3>
          <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs px-3 py-1.5 rounded-full font-bold">
            {displayHistory.length} lượt thi
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {currentUser.isAdmin && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <FaFilter className="text-slate-400 text-xs" />
              <select 
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">Tất cả thành viên</option>
                {uniqueUsers.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>
          )}
          
          {currentUser.isAdmin && (
            <button 
              onClick={clearHistory}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-bold transition-all border border-red-100"
            >
              <FaTrash className="text-xs" /> Xóa sạch
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center font-medium">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4 mx-auto"></div>
          <p className="animate-pulse">Đang tải lịch sử ôn tập từ database...</p>
        </div>
      ) : displayHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center font-medium">
          <FaTrophy className="text-5xl text-slate-200 mb-3 animate-pulse" />
          <p>Không tìm thấy lịch sử ôn tập nào.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="py-4 px-5">Học viên</th>
                <th className="py-4 px-5">Chủ đề</th>
                <th className="py-4 px-5">Thời gian</th>
                <th className="py-4 px-5">Kết quả</th>
                <th className="py-4 px-5">Tỷ lệ</th>
                <th className="py-4 px-5">Điểm</th>
                <th className="py-4 px-5 text-center">Đánh giá</th>
                <th className="py-4 px-5 text-center">Xem lại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayHistory.map((record) => {
                const itemPercentage = Math.round((record.correctAnswers / record.totalQuestions) * 100);
                
                let ratingLabel = "Cần cố gắng";
                let ratingColor = "bg-amber-50 text-amber-600 border-amber-100";
                if (itemPercentage >= 90) {
                  ratingLabel = "Xuất sắc";
                  ratingColor = "bg-green-50 text-green-700 border-green-100";
                } else if (itemPercentage >= 70) {
                  ratingLabel = "Khá";
                  ratingColor = "bg-blue-50 text-blue-700 border-blue-100";
                } else if (itemPercentage >= 50) {
                  ratingLabel = "Trung bình";
                  ratingColor = "bg-indigo-50 text-indigo-700 border-indigo-100";
                }

                return (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition duration-150">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <FaUser className="text-xs" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{record.username}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <FaBookOpen className="text-slate-400 text-xs" />
                        <span className="text-sm font-semibold text-slate-600">{record.subject}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-xs text-slate-700 font-bold">
                          <FaCalendarAlt className="text-slate-400 text-[10px]" />
                          {new Date(record.date).toLocaleDateString("vi-VN")}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          lúc {new Date(record.date).toLocaleTimeString("vi-VN", {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600 font-black">{record.correctAnswers}</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-600 font-bold">{record.totalQuestions}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-700 font-black">{itemPercentage}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-sm font-black text-indigo-600">
                      {record.score}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold border ${ratingColor} uppercase tracking-tight`}>
                        {ratingLabel}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center">
                      {record.list_questions ? (
                        <Link 
                          href={`/quiz/history/${record.id}`}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-all inline-block"
                        >
                          Chi tiết
                        </Link>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium italic">Không hỗ trợ</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HistorySection;
