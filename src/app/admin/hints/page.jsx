'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AdminHintsReview() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [hints, setHints] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleAction = async (questionId, action, hintStatus) => {
    try {
      const res = await fetch('/api/admin/hints/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'Admin', questionId, action, hintStatus })
      });
      if (res.ok) {
        alert(action === 'approve' ? 'Đã duyệt gợi ý' : 'Đã từ chối gợi ý');
        fetchHints();
      } else {
        alert('Lỗi khi thực hiện hành động');
      }
    } catch (e) {
      console.error(e);
      alert('Lỗi hệ thống');
    }
  };

  const getHintDisplay = (hintStr) => {
    if (!hintStr) return '(Trống)';
    try {
      const parsed = JSON.parse(hintStr);
      if (parsed && typeof parsed === 'object' && parsed.text !== undefined) {
        return parsed.text;
      }
    } catch(e) {}
    return hintStr;
  };

  if (authLoading || loading) return <div className="p-8 text-center font-bold text-gray-500">Đang tải dữ liệu...</div>;
  if (!user?.isAdmin) return null;

  return (
    <div className="max-w-4xl mx-auto p-6 min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black text-blue-800 uppercase">Duyệt Gợi Ý Cộng Tác</h1>
        <button onClick={() => router.push('/')} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300">
          Về trang chủ
        </button>
      </div>
      
      {hints.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
          <p className="text-gray-500 font-medium">Tuyệt vời! Hiện không có gợi ý nào cần phê duyệt.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {hints.map((hint) => (
            <div key={hint.id} className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="mb-4">
                <span className={`inline-block text-xs px-3 py-1 rounded-full font-black mb-3 uppercase tracking-wide ${hint.hint_status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                  {hint.hint_status === 'pending' ? 'Bản nháp chờ duyệt' : 'Tự động duyệt (Chờ xem xét)'}
                </span>
                <p className="font-bold text-gray-800 text-lg">Câu hỏi: {hint.question}</p>
                <p className="text-sm text-gray-500 mt-2 font-medium">Người đóng góp: <span className="text-blue-600 font-bold">{hint.hint_updated_by || 'Unknown'}</span></p>
              </div>
              
              <div className="bg-slate-50 p-5 rounded-xl mb-5 border border-slate-100">
                {hint.hint_status === 'pending' ? (
                  <>
                    <p className="text-sm text-slate-500 mb-1 font-bold">Gợi ý hiện tại (Đang hiển thị):</p>
                    <p className="text-slate-700 mb-4 bg-white p-3 rounded border">{getHintDisplay(hint.hint_text)}</p>
                    <p className="text-sm text-blue-600 font-black mb-1">Gợi ý mới đề xuất:</p>
                    <p className="text-blue-900 font-medium bg-blue-50/50 p-3 rounded border border-blue-100">{getHintDisplay(hint.hint_pending_text)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-blue-600 font-black mb-1">Gợi ý mới (Đã tự động hiển thị cho người dùng):</p>
                    <p className="text-blue-900 font-medium bg-blue-50/50 p-3 rounded border border-blue-100">{getHintDisplay(hint.hint_text)}</p>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => handleAction(hint.id, 'approve', hint.hint_status)}
                  className="px-6 py-2.5 bg-green-600 text-white font-black rounded-lg hover:bg-green-700 transition transform active:scale-95 shadow-sm"
                >
                  Phê duyệt
                </button>
                <button 
                  onClick={() => handleAction(hint.id, 'reject', hint.hint_status)}
                  className="px-6 py-2.5 bg-red-500 text-white font-black rounded-lg hover:bg-red-600 transition transform active:scale-95 shadow-sm"
                >
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
