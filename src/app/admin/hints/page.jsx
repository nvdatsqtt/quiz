'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// Hàm helper để phân tách hint JSON v3 có chú thích tiếng Việt
const parseHint = (hintStr, questionData) => {
  if (!hintStr) return { question_highlight: questionData?.question || "", options: (questionData?.options ? JSON.parse(questionData.options) : []).map(o => ({ text: o, hint: "" })) };
  try {
    const parsed = JSON.parse(hintStr);
    if (parsed && typeof parsed === 'object' && parsed.options) {
      return parsed;
    }
  } catch (e) {}
  
  // Trạng thái fallback cho dữ liệu gợi ý cũ
  return {
    question_highlight: questionData?.question || "",
    options: (questionData?.options ? JSON.parse(questionData.options) : []).map((o, i) => ({
      text: o,
      hint: i === 0 ? hintStr : "" // Chuyển tạm vào đáp án đầu tiên
    }))
  };
};

// Component xem chi tiết gợi ý dạng cũ (nếu cần)
const HintV3View = ({ hintData }) => {
  if (!hintData) return <p className="text-gray-400 italic">Không có dữ liệu gợi ý.</p>;
  
  return (
    <div className="space-y-4 text-sm">
      <div className="p-3 bg-white rounded border border-gray-100 shadow-sm">
        <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Câu hỏi (Định dạng):</p>
        <div 
          className="text-gray-800 font-medium leading-relaxed dangerously-html"
          dangerouslySetInnerHTML={{ __html: hintData.question_highlight || 'Nội dung câu hỏi...' }} 
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {hintData.options?.map((opt, idx) => (
          <div key={idx} className="p-3 bg-white rounded border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Phương án {String.fromCharCode(65 + idx)}:</p>
            <div 
              className="text-gray-700 mb-2 dangerously-html"
              dangerouslySetInnerHTML={{ __html: opt.text || '...' }} 
            />
            {opt.hint && (
              <div className="mt-2 p-2 bg-blue-50/50 rounded border-l-2 border-blue-400">
                <p className="text-[10px] font-bold text-blue-600 uppercase mb-0.5">Giải thích:</p>
                <p className="text-blue-900 text-xs italic">{opt.hint}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Component so sánh trực quan sự khác biệt giữa gợi ý cũ (đang hiển thị) và gợi ý mới đề xuất
const HintV3CompareView = ({ currentData, pendingData }) => {
  if (!pendingData) return <p className="text-gray-400 italic">Không có dữ liệu gợi ý đề xuất.</p>;
  
  // Kiểm tra xem nội dung câu hỏi có bị thay đổi/highlight khác không
  const isQuestionDifferent = currentData?.question_highlight !== pendingData?.question_highlight;

  return (
    <div className="space-y-6 text-sm text-slate-800">
      {/* 1. Phần so sánh Câu hỏi */}
      <div className={`p-4 rounded-xl border ${isQuestionDifferent ? 'bg-amber-50/30 border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex justify-between items-center mb-3 border-b pb-2 border-slate-200/60">
          <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Nội dung câu hỏi</p>
          {isQuestionDifferent && (
            <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 font-black rounded-full uppercase tracking-wider animate-pulse">
              ● Đề xuất thay đổi highlight câu hỏi
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Trạng thái hiện tại:</p>
            <div 
              className="p-3 bg-white rounded border border-slate-100 text-slate-700 leading-relaxed min-h-[50px] dangerously-html"
              dangerouslySetInnerHTML={{ __html: currentData?.question_highlight || 'Nội dung câu hỏi...' }} 
            />
          </div>
          <div>
            <p className="text-[10px] font-bold text-blue-600 uppercase mb-1.5">Đề xuất thay đổi:</p>
            <div 
              className={`p-3 rounded border leading-relaxed min-h-[50px] dangerously-html ${isQuestionDifferent ? 'bg-amber-50/50 border-amber-300 font-medium text-amber-950' : 'bg-white border-slate-100 text-slate-700'}`}
              dangerouslySetInnerHTML={{ __html: pendingData?.question_highlight || 'Nội dung câu hỏi...' }} 
            />
          </div>
        </div>
      </div>
      
      {/* 2. Phần so sánh các phương án (Options) */}
      <div className="space-y-4">
        <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider mb-2">So sánh các Phương án & Giải thích gợi ý</p>
        
        <div className="grid grid-cols-1 gap-4">
          {(pendingData.options && pendingData.options.length > 0 ? pendingData.options : currentData.options)?.map((pendingOpt, idx) => {
            const currentOpt = currentData?.options?.[idx] || { text: "", hint: "" };
            
            // So sánh sự khác biệt của text phương án và text giải thích (hint)
            const isTextDiff = pendingOpt.text !== currentOpt.text;
            const isHintDiff = pendingOpt.hint !== currentOpt.hint;
            const isOptionChanged = isTextDiff || isHintDiff;

            return (
              <div 
                key={idx} 
                className={`p-4 rounded-xl border-2 transition-all ${
                  isOptionChanged 
                    ? 'bg-amber-50/10 border-amber-300 shadow-sm ring-1 ring-amber-100' 
                    : 'bg-white border-slate-100'
                }`}
              >
                <div className="flex justify-between items-center mb-3 border-b pb-2 border-slate-100">
                  <p className="text-sm font-black text-slate-700 uppercase">
                    Phương án {String.fromCharCode(65 + idx)}
                  </p>
                  {isOptionChanged && (
                    <span className="text-[10px] px-2.5 py-0.5 bg-amber-100 text-amber-900 font-black rounded-full uppercase tracking-wider">
                      {isTextDiff && isHintDiff ? "● Đổi chữ & Giải thích" : isTextDiff ? "● Đổi chữ phương án" : "● Đổi giải thích"}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cột trái: Hiện tại */}
                  <div className="space-y-2.5 opacity-90">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hiện tại:</p>
                    
                    <div className="p-3 bg-slate-50/80 rounded border border-slate-100 text-slate-600">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Chữ phương án:</p>
                      <div dangerouslySetInnerHTML={{ __html: currentOpt.text || '...' }} />
                    </div>
                    
                    {currentOpt.hint ? (
                      <div className="p-3 bg-slate-50/50 rounded border-l-2 border-slate-300 text-slate-600">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Giải thích:</p>
                        <p className="text-xs italic leading-relaxed">{currentOpt.hint}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic pl-1">Chưa có giải thích.</p>
                    )}
                  </div>

                  {/* Cột phải: Đề xuất đóng góp */}
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Đề xuất mới:</p>
                    
                    <div className={`p-3 rounded border ${isTextDiff ? 'bg-amber-50 border-amber-300 font-medium text-amber-950 shadow-inner' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Chữ phương án đề xuất:</p>
                      <div dangerouslySetInnerHTML={{ __html: pendingOpt.text || '...' }} />
                    </div>
                    
                    {pendingOpt.hint ? (
                      <div className={`p-3 rounded border-l-2 text-xs leading-relaxed ${
                        isHintDiff 
                          ? 'bg-amber-50 border-amber-300 border-l-amber-500 text-amber-950 font-medium shadow-sm' 
                          : 'bg-blue-50/30 border-blue-100 border-l-blue-400 text-blue-900'
                      }`}>
                        <p className="text-[9px] font-bold text-blue-600 uppercase mb-1 not-italic">Giải thích đề xuất:</p>
                        <p className="italic">{pendingOpt.hint}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-red-400 italic pl-1">Đề xuất trống giải thích.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function AdminHintsReview() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [hints, setHints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State phục vụ việc chỉnh sửa nhanh của Admin
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchHints();
    }
  }, [user]);

  const fetchHints = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/hints/review?role=Admin');
      if (res.ok) {
        const data = await res.json();
        setHints(data.pendingHints || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (questionId, action, hintStatus, updatedText = null) => {
    try {
      const res = await fetch('/api/admin/hints/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          role: 'Admin', 
          questionId, 
          action, 
          hintStatus,
          updatedHintText: updatedText 
        })
      });
      if (res.ok) {
        alert(action === 'approve' ? 'Đã duyệt gợi ý thành công' : 'Đã từ chối gợi ý');
        setEditingId(null);
        fetchHints();
      } else {
        alert('Lỗi khi thực hiện hành động');
      }
    } catch (e) {
      console.error(e);
      alert('Lỗi hệ thống');
    }
  };

  const startEditing = (hint) => {
    const data = parseHint(hint.hint_pending_text || hint.hint_text, hint);
    setEditData(data);
    setEditingId(hint.id);
  };

  const handleSaveEdit = () => {
    if (!editData) return;
    const jsonStr = JSON.stringify(editData);
    handleAction(editingId, 'approve', hints.find(h => h.id === editingId).hint_status, jsonStr);
  };

  const updateEditOptionHint = (idx, val) => {
    const newOptions = [...editData.options];
    newOptions[idx].hint = val;
    setEditData({ ...editData, options: newOptions });
  };

  if (authLoading || loading) return <div className="p-8 text-center font-bold text-gray-500">Đang tải dữ liệu...</div>;
  if (!user?.isAdmin) return null;

  return (
    <div className="max-w-5xl mx-auto p-6 min-h-screen bg-gray-50 pb-20">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-3xl font-black text-blue-900 uppercase tracking-tighter">Duyệt Gợi Ý Cộng Tác</h1>
          <p className="text-gray-500 font-medium">Phê duyệt hoặc chỉnh sửa các đóng góp gợi ý từ học viên.</p>
        </div>
        <button onClick={() => router.push('/')} className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition shadow-sm">
          Về trang chủ
        </button>
      </div>
      
      {hints.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-gray-200 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <p className="text-gray-500 font-bold text-xl">Tuyệt vời! Hiện không có gợi ý nào cần phê duyệt.</p>
          <p className="text-gray-400 text-sm mt-1">Hãy quay lại sau khi có học viên đóng góp mới.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {hints.map((hint) => {
            const isEditing = editingId === hint.id;
            const currentHintData = parseHint(hint.hint_text, hint);
            const pendingHintData = parseHint(hint.hint_pending_text, hint);

            return (
              <div key={hint.id} className={`p-6 bg-white border-2 rounded-2xl shadow-sm transition-all ${isEditing ? 'border-blue-500 ring-4 ring-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                  <div className="flex-1">
                    <span className={`inline-block text-[10px] px-3 py-1 rounded-full font-black mb-3 uppercase tracking-widest ${hint.hint_status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                      {hint.hint_status === 'pending' ? '● Bản nháp chờ duyệt' : '● Tự động duyệt (Chờ xem xét)'}
                    </span>
                    <h3 className="font-bold text-gray-900 text-xl leading-snug">
                      <span className="text-blue-600 mr-2">Câu hỏi:</span> {hint.question}
                    </h3>
                    <div className="flex items-center mt-3 text-sm text-gray-500 font-medium">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-2 text-xs">
                        {(hint.hint_updated_by || 'U').charAt(0).toUpperCase()}
                      </div>
                      Người đóng góp: <span className="text-blue-600 font-bold ml-1">{hint.hint_updated_by || 'Ẩn danh'}</span>
                    </div>
                  </div>
                </div>
                
                {/* Bố cục Full-Width mới: Nếu đang edit thì hiện form edit rộng rãi, ngược lại hiện bảng so sánh Before/After chi tiết */}
                {isEditing ? (
                  <div className="p-6 bg-blue-50/30 border-2 border-blue-200 rounded-2xl shadow-inner mt-6">
                    <h4 className="text-xs font-black text-blue-500 uppercase mb-4 tracking-widest">Chế độ chỉnh sửa Admin</h4>
                    <div className="space-y-4">
                      <div className="p-3 bg-white rounded border border-blue-200 shadow-sm">
                         <p className="text-[10px] font-black uppercase text-blue-400 mb-1">Câu hỏi highlight (Admin không sửa định dạng ở đây):</p>
                         <div className="text-sm text-gray-800 dangerously-html font-medium" dangerouslySetInnerHTML={{ __html: editData.question_highlight }} />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {editData.options?.map((opt, idx) => (
                          <div key={idx} className="p-3 bg-white rounded border border-blue-200 shadow-sm">
                            <p className="text-[10px] font-black uppercase text-blue-400 mb-1">Giải thích cho: <span dangerouslySetInnerHTML={{ __html: opt.text }} /></p>
                            <textarea 
                              value={opt.hint}
                              onChange={(e) => updateEditOptionHint(idx, e.target.value)}
                              className="w-full mt-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[90px]"
                              placeholder="Viết giải thích tại đây..."
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-slate-100 max-w-md mx-auto">
                        <button 
                          onClick={handleSaveEdit}
                          className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-md transform active:scale-95 transition flex items-center justify-center gap-1.5 text-sm"
                        >
                          <span>✓</span> Lưu & Phê duyệt
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="px-6 py-3 bg-white border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition text-sm"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 space-y-6">
                    <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-200/80">
                      <h4 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Bảng so sánh chi tiết đề xuất chỉnh sửa</h4>
                      <HintV3CompareView currentData={currentHintData} pendingData={pendingHintData} />
                    </div>

                    <div className="flex flex-wrap gap-4 justify-center pt-2 max-w-2xl mx-auto">
                      <button 
                        onClick={() => handleAction(hint.id, 'approve', hint.hint_status)}
                        className="flex-1 min-w-[180px] py-3.5 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 transition transform active:scale-95 shadow-lg shadow-green-100 flex items-center justify-center gap-2 text-sm"
                      >
                        <span>✓</span> Phê duyệt đề xuất
                      </button>
                      <button 
                        onClick={() => startEditing(hint)}
                        className="flex-1 min-w-[180px] py-3.5 bg-white border-2 border-blue-500 text-blue-600 font-black rounded-xl hover:bg-blue-50 transition transform active:scale-95 shadow-sm flex items-center justify-center gap-2 text-sm"
                      >
                        <span>✎</span> Sửa nội dung
                      </button>
                      <button 
                        onClick={() => handleAction(hint.id, 'reject', hint.hint_status)}
                        className="px-6 py-3.5 bg-white border-2 border-red-200 text-red-500 font-bold rounded-xl hover:bg-slate-50 hover:border-red-300 transition transform active:scale-95 flex items-center justify-center text-sm gap-2"
                        title="Từ chối"
                      >
                        <span>✕</span> Từ chối đề xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
