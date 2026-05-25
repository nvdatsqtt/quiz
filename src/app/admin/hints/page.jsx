'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// Helper function to parse hint
const parseHint = (hintStr, questionData) => {
  if (!hintStr) return { question_highlight: questionData?.question || "", options: (questionData?.options ? JSON.parse(questionData.options) : []).map(o => ({ text: o, hint: "" })) };
  try {
    const parsed = JSON.parse(hintStr);
    if (parsed && typeof parsed === 'object' && parsed.options) {
      return parsed;
    }
  } catch (e) {}
  
  // Fallback for old hint_text
  return {
    question_highlight: questionData?.question || "",
    options: (questionData?.options ? JSON.parse(questionData.options) : []).map((o, i) => ({
      text: o,
      hint: i === 0 ? hintStr : "" // Just a guess for old hints
    }))
  };
};

const HintV3View = ({ hintData }) => {
  if (!hintData) return <p className="text-gray-400 italic">Không có dữ liệu gợi ý.</p>;
  
  return (
    <div className="space-y-4 text-sm">
      <div className="p-3 bg-white rounded border border-gray-100 shadow-sm">
        <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Câu hỏi (Định dạng):</p>
        <div 
          className="text-gray-800 font-medium leading-relaxed"
          dangerouslySetInnerHTML={{ __html: hintData.question_highlight || 'Nội dung câu hỏi...' }} 
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {hintData.options?.map((opt, idx) => (
          <div key={idx} className="p-3 bg-white rounded border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Phương án {String.fromCharCode(65 + idx)}:</p>
            <div 
              className="text-gray-700 mb-2"
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

export default function AdminHintsReview() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [hints, setHints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for editing
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
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Cột Trái: Gợi ý hiện tại */}
                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Gợi ý hiện tại (Đang hiển thị)</h4>
                    <HintV3View hintData={currentHintData} />
                  </div>

                  {/* Cột Phải: Gợi ý đề xuất hoặc Form Edit */}
                  <div className={`p-5 rounded-xl border-2 ${isEditing ? 'bg-blue-50/30 border-blue-200' : 'bg-blue-50 border-blue-100'}`}>
                    <h4 className="text-xs font-black text-blue-400 uppercase mb-4 tracking-widest">
                      {isEditing ? 'Chế độ chỉnh sửa Admin' : 'Gợi ý mới đề xuất'}
                    </h4>
                    
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="p-3 bg-white rounded border border-blue-200 shadow-sm">
                           <p className="text-[10px] font-black uppercase text-blue-400 mb-1">Câu hỏi highlight (Admin không sửa định dạng ở đây):</p>
                           <div className="text-sm text-gray-800 dangerously-html" dangerouslySetInnerHTML={{ __html: editData.question_highlight }} />
                        </div>
                        
                        <div className="space-y-3">
                          {editData.options?.map((opt, idx) => (
                            <div key={idx} className="p-3 bg-white rounded border border-blue-200 shadow-sm">
                              <p className="text-[10px] font-black uppercase text-blue-400 mb-1">Giải thích cho: <span dangerouslySetInnerHTML={{ __html: opt.text }} /></p>
                              <textarea 
                                value={opt.hint}
                                onChange={(e) => updateEditOptionHint(idx, e.target.value)}
                                className="w-full mt-1 p-2 text-sm bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[60px]"
                                placeholder="Viết giải thích tại đây..."
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button 
                            onClick={handleSaveEdit}
                            className="flex-1 py-2.5 bg-blue-600 text-white font-black rounded-lg hover:bg-blue-700 shadow-md transform active:scale-95 transition"
                          >
                            Lưu & Phê duyệt
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-500 font-bold rounded-lg hover:bg-slate-50 transition"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <HintV3View hintData={pendingHintData} />
                        <div className="mt-6 flex gap-3">
                          <button 
                            onClick={() => handleAction(hint.id, 'approve', hint.hint_status)}
                            className="flex-1 py-3 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 transition transform active:scale-95 shadow-lg shadow-green-100 flex items-center justify-center gap-2"
                          >
                            <span>✓</span> Phê duyệt ngay
                          </button>
                          <button 
                            onClick={() => startEditing(hint)}
                            className="flex-1 py-3 bg-white border-2 border-blue-500 text-blue-600 font-black rounded-xl hover:bg-blue-50 transition transform active:scale-95 shadow-sm flex items-center justify-center gap-2"
                          >
                            <span>✎</span> Sửa nội dung
                          </button>
                          <button 
                            onClick={() => handleAction(hint.id, 'reject', hint.hint_status)}
                            className="px-4 py-3 bg-white border-2 border-red-100 text-red-400 font-bold rounded-xl hover:bg-red-50 hover:border-red-200 transition transform active:scale-95 flex items-center justify-center"
                            title="Từ chối"
                          >
                            ✕
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
