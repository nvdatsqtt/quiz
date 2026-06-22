'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AdminQuestionsManagement() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // State quản trị câu hỏi
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Bộ lọc & phân trang
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // Bulk select
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' hoặc 'edit'
  const [activeId, setActiveId] = useState(null);
  const [formData, setFormData] = useState({
    subject_id: '',
    question: '',
    options: ['', '', '', ''],
    answer: '',
    hint_text: ''
  });

  // Kiểm tra quyền Admin
  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Load danh sách câu hỏi khi filter/phân trang thay đổi
  useEffect(() => {
    if (user?.isAdmin) {
      fetchQuestions();
    }
    // Reset selectedIds khi đổi trang hoặc lọc
    setSelectedIds([]);
  }, [user, page, limit, selectedSubject]);

  // Tách biệt việc fetch dữ liệu
  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        role: 'Admin',
        page: page.toString(),
        limit: limit.toString(),
        search,
        subject_id: selectedSubject
      });
      const res = await fetch(`/api/admin/questions?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
        setSubjects(data.subjects || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error("Lỗi khi tải câu hỏi:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchQuestions();
  };

  // Checkbox handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(questions.map(q => q.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Thao tác xóa câu hỏi
  const handleDeleteSingle = async (id) => {
    if (!confirm("Bạn có chắc chắn muốn xóa câu hỏi này? Hành động này sẽ thực hiện xóa vĩnh viễn (Hard Delete).")) return;
    try {
      const res = await fetch(`/api/questions/${id}?role=Admin`, { method: 'DELETE' });
      if (res.ok) {
        alert("Đã xóa câu hỏi thành công!");
        fetchQuestions();
      } else {
        alert("Lỗi khi xóa câu hỏi.");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi máy chủ.");
    }
  };

  const handleDeleteBulk = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} câu hỏi đã chọn? Hành động này sẽ thực hiện xóa vĩnh viễn (Hard Delete).`)) return;
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'Admin', ids: selectedIds })
      });
      if (res.ok) {
        alert("Đã xóa hàng loạt câu hỏi thành công!");
        setSelectedIds([]);
        fetchQuestions();
      } else {
        alert("Lỗi khi xóa hàng loạt.");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi máy chủ.");
    }
  };

  // Mở modal Thêm / Sửa
  const openAddModal = () => {
    setModalMode('add');
    setFormData({
      subject_id: subjects[0]?.id || '',
      question: '',
      options: ['', '', '', ''],
      answer: '',
      hint_text: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (q) => {
    setModalMode('edit');
    setActiveId(q.id);
    setFormData({
      subject_id: q.subject_id,
      question: q.question,
      options: [...q.options],
      answer: q.answer,
      hint_text: q.hint_text || ''
    });
    setIsModalOpen(true);
  };

  const handleOptionChange = (idx, value) => {
    const newOptions = [...formData.options];
    newOptions[idx] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject_id || !formData.question || !formData.answer) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc.");
      return;
    }
    if (formData.options.some(opt => !opt.trim())) {
      alert("Vui lòng điền đầy đủ cả 4 phương án lựa chọn.");
      return;
    }

    try {
      if (modalMode === 'add') {
        const res = await fetch('/api/admin/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'Admin', data: formData })
        });
        if (res.ok) {
          alert("Thêm câu hỏi mới thành công!");
          setIsModalOpen(false);
          fetchQuestions();
        } else {
          alert("Lỗi khi thêm câu hỏi.");
        }
      } else {
        const res = await fetch(`/api/questions/${activeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'Admin', data: formData })
        });
        if (res.ok) {
          alert("Cập nhật câu hỏi thành công!");
          setIsModalOpen(false);
          fetchQuestions();
        } else {
          alert("Lỗi khi cập nhật câu hỏi.");
        }
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi máy chủ.");
    }
  };

  if (authLoading || (loading && questions.length === 0)) {
    return <div className="p-8 text-center font-bold text-gray-500 min-h-screen flex items-center justify-center">Đang tải dữ liệu ngân hàng câu hỏi...</div>;
  }
  if (!user?.isAdmin) return null;

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 uppercase tracking-tight">Ngân Hàng Câu Hỏi</h1>
            <p className="text-slate-400 text-sm md:text-base mt-1">Hệ thống quản lý, biên tập và thiết lập câu hỏi thi dành cho Quản trị viên.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => router.push('/')}
              className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition flex items-center gap-2 border border-slate-700 shadow-sm"
            >
              <span>Về trang chủ</span>
            </button>
            <button 
              onClick={openAddModal}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition flex items-center gap-2 shadow-lg shadow-indigo-900/40 active:scale-95"
            >
              <span>+ Thêm câu hỏi</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700/60 shadow-xl mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="w-full md:w-1/2 flex gap-2">
            <input 
              type="text" 
              placeholder="Tìm kiếm bằng nội dung câu hỏi hoặc UUID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition placeholder:text-slate-500"
            />
            <button type="submit" className="px-5 bg-slate-700 text-slate-200 rounded-xl font-bold hover:bg-slate-600 transition text-sm">
              Tìm kiếm
            </button>
          </form>

          <div className="w-full md:w-auto flex flex-wrap gap-3 items-center justify-end">
            {/* Filter Subject */}
            <select 
              value={selectedSubject}
              onChange={(e) => { setSelectedSubject(e.target.value); setPage(1); }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="">Tất cả chủ đề</option>
              {subjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>

            {/* Pagination Limit */}
            <select 
              value={limit}
              onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value={25}>25 hàng</option>
              <option value={50}>50 hàng</option>
              <option value={100}>100 hàng</option>
            </select>

            {/* Bulk Delete Button */}
            {selectedIds.length > 0 && (
              <button 
                onClick={handleDeleteBulk}
                className="px-4 py-2.5 bg-rose-600/90 text-white rounded-xl font-bold hover:bg-rose-500 transition text-sm flex items-center gap-2 shadow-lg shadow-rose-950/40"
              >
                <span>Xóa hàng loạt ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Bảng dữ liệu câu hỏi được thiết kế lại theo phong cách Compact, tối ưu chiều ngang và chiều dọc */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700/60 shadow-xl overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/60 bg-slate-900/40 text-slate-400 text-xs font-black uppercase tracking-wider">
                  <th className="py-4 px-5 w-12 text-center">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={questions.length > 0 && selectedIds.length === questions.length}
                      className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                  </th>
                  {/* Gộp toàn bộ thông tin mã đề, UUID, câu hỏi và đáp án lựa chọn vào 1 cột chính duy nhất */}
                  <th className="py-4 px-5">Thông tin câu hỏi & Các phương án</th>
                  <th className="py-4 px-5 w-36 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-750 text-sm text-slate-300">
                {questions.length === 0 ? (
                  <tr>
                    {/* colSpan đổi thành 3 do số cột đã được rút gọn còn 3 cột */}
                    <td colSpan={3} className="py-12 text-center text-slate-500 font-medium">Không tìm thấy câu hỏi nào thỏa mãn bộ lọc.</td>
                  </tr>
                ) : (
                  questions.map(q => (
                    <tr key={q.id} className="hover:bg-slate-750/30 transition">
                      <td className="py-4 px-5 text-center align-top pt-5">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(q.id)}
                          onChange={() => handleSelectRow(q.id)}
                          className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                      </td>
                      {/* Cột thông tin câu hỏi tích hợp Compact Mode */}
                      <td className="py-4 px-5 pr-8">
                        {/* Hàng 1: Chủ đề môn học + UUID đầy đủ có thể sao chép + Trạng thái gợi ý */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-black text-[10px] uppercase border border-indigo-500/20 tracking-wider">
                            {q.subject_name || 'Chủ đề'}
                          </span>
                          <span 
                            className="flex items-center gap-1 bg-slate-900/60 border border-slate-700/60 rounded px-2 py-0.5 text-[10px] text-slate-400 font-mono select-all tracking-tight cursor-pointer" 
                            title="Nhấp đúp để bôi đen và sao chép mã UUID đầy đủ"
                          >
                            <span className="text-slate-500 font-sans select-none">UUID:</span> {q.id}
                          </span>
                          {q.hint_text && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                              💡 Có gợi ý
                            </span>
                          )}
                        </div>

                        {/* Hàng 2: Nội dung câu hỏi chính (hỗ trợ bôi đậm HTML highlight) */}
                        <div 
                          className="font-semibold text-slate-200 text-sm mb-3 leading-relaxed" 
                          dangerouslySetInnerHTML={{ __html: q.question }} 
                        />

                        {/* Hàng 3: Danh sách 4 phương án lựa chọn được sắp xếp dưới dạng lưới 2 cột trên Desktop để siêu gọn */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border-t border-slate-750/55 pt-2">
                          {q.options && q.options.map((opt, idx) => {
                            // Kiểm tra xem phương án này có trùng khớp với đáp án đúng hay không
                            const isCorrect = opt === q.answer;
                            return (
                              <div 
                                key={idx} 
                                className={`flex items-start gap-2 p-1.5 rounded transition-colors text-xs ${
                                  isCorrect 
                                    ? 'bg-emerald-500/10 text-emerald-300 font-medium border border-emerald-500/20 shadow-sm shadow-emerald-950/20' 
                                    : 'hover:bg-slate-750/40 text-slate-400'
                                }`}
                              >
                                {/* Tiền tố phương án A, B, C, D */}
                                <span className={`font-mono font-black select-none shrink-0 ${isCorrect ? 'text-emerald-400' : 'text-slate-500'}`}>
                                  {String.fromCharCode(65 + idx)}.
                                </span>
                                {/* Nội dung phương án */}
                                <span className="break-words line-clamp-2" title={opt}>{opt}</span>
                                {/* Đánh dấu kiểm trực quan cho đáp án đúng */}
                                {isCorrect && (
                                  <span className="ml-auto text-emerald-400 font-black text-xs shrink-0 select-none px-1" title="Đáp án đúng">
                                    ✔
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      {/* Cột thao tác chỉnh sửa hoặc xóa câu hỏi */}
                      <td className="py-4 px-5 text-center align-top pt-4">
                        <div className="flex gap-2 justify-center">
                          <button 
                            onClick={() => openEditModal(q)}
                            className="px-3 py-1.5 bg-indigo-600/80 text-indigo-200 rounded-lg hover:bg-indigo-600 hover:text-white transition font-bold text-xs active:scale-95"
                          >
                            Sửa
                          </button>
                          <button 
                            onClick={() => handleDeleteSingle(q.id)}
                            className="px-3 py-1.5 bg-rose-600/80 text-rose-200 rounded-lg hover:bg-rose-600 hover:text-white transition font-bold text-xs active:scale-95"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Section */}
        {questions.length > 0 && (
          <div className="flex justify-between items-center text-sm text-slate-400">
            <span>Hiển thị <strong>{questions.length}</strong> trên <strong>{total}</strong> câu hỏi</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg font-bold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Trước
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`h-8 w-8 rounded-lg font-bold text-xs transition ${page === i + 1 ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700/60'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg font-bold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CRUD Modal dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transition-all duration-300">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700">
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 uppercase tracking-tight">
                {modalMode === 'add' ? '✨ Thêm câu hỏi mới' : '⚙️ Chỉnh sửa câu hỏi'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg focus:outline-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chọn Môn học */}
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">Môn học / Chủ đề <span className="text-rose-500">*</span></label>
                  <select 
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  >
                    {subjects.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                {/* Chọn Đáp án Đúng */}
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">Phương án đúng <span className="text-rose-500">*</span></label>
                  <select 
                    value={formData.answer}
                    onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  >
                    <option value="">-- Chọn đáp án --</option>
                    {formData.options.map((opt, i) => (
                      <option key={i} value={opt} disabled={!opt.trim()}>
                        {opt.trim() ? `Lựa chọn ${String.fromCharCode(65 + i)}: ${opt.substring(0, 30)}...` : `Điền lựa chọn ${String.fromCharCode(65 + i)} trước...`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nội dung câu hỏi */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Nội dung câu hỏi (Hỗ trợ thẻ HTML) <span className="text-rose-500">*</span></label>
                <textarea 
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="Ví dụ: Định luật nào phát biểu rằng..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* 4 Phương án lựa chọn */}
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase text-slate-400 mb-0.5">Các phương án lựa chọn <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {formData.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="font-mono text-slate-500 font-black">{String.fromCharCode(65 + idx)}.</span>
                      <input 
                        type="text" 
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Nội dung phương án ${String.fromCharCode(65 + idx)}`}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Hint giải thích */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Gợi ý & Giải thích (Hint - Tùy chọn)</label>
                <textarea 
                  value={formData.hint_text}
                  onChange={(e) => setFormData({ ...formData, hint_text: e.target.value })}
                  placeholder="Ví dụ: Sử dụng quy tắc bàn tay trái..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-700 text-slate-200 rounded-xl font-bold hover:bg-slate-600 transition"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition shadow-lg active:scale-95"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
