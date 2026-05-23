"use client";

/**
 * Tác giả: Nguyễn Văn Đạt | Email: nguyenvandatsqtt@gmail.com
 * Mô tả: Thành phần Header hiển thị thanh điều hướng đầu trang, thông tin người dùng và số điểm tích lũy.
 */

import { FaCoins, FaSignOutAlt, FaUserCircle, FaShieldAlt } from "react-icons/fa";
import Link from "next/link";
import Image from "next/image";
import { usePoints } from "@/context/PointsContext";
import { useAuth } from "@/context/AuthContext";

const Header = () => {
  const { points } = usePoints();
  const { user, logout } = useAuth();

  return (
    <header className="bg-gray-900 text-white py-4 px-6 flex justify-between items-center shadow-lg border-b border-gray-800">
      {/* Logo / Link quay về Trang chủ */}
      <Link
        href="/"
        className="flex items-center gap-3 text-2xl sm:text-3xl font-black text-white hover:text-blue-400 transition-all duration-300 uppercase tracking-tighter"
      >
        <div className="relative w-8 h-6 sm:w-10 sm:h-7 shadow-sm border border-white/10 overflow-hidden rounded-sm">
          <Image
            src="/images/vietnam-flag.svg"
            alt="Vietnam Flag"
            fill
            className="object-cover"
          />
        </div>
        <span>Website trắc nghiệm</span>
      </Link>

      <div className="flex items-center gap-4 sm:gap-8">
        {/* Phần hiển thị điểm tích lũy */}
        <div className="hidden sm:flex items-center bg-gray-800 px-4 py-2 rounded-2xl border border-gray-700 shadow-inner">
          <FaCoins className="text-yellow-500 text-xl mr-2" />
          <span className="text-gray-400 text-sm font-bold mr-2 uppercase">Điểm:</span>
          <span className="font-black text-blue-400 text-lg">{points}</span>
        </div>

        {/* Thông tin người dùng và Đăng xuất */}
        {user && (
          <div className="flex items-center gap-3 border-l border-gray-700 pl-4 sm:pl-8">
            {user.isAdmin && (
              <div className="relative group mr-2">
                <button 
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-900/50 hover:bg-blue-800 text-blue-300 border border-blue-800 rounded-lg text-sm font-bold transition shadow-md"
                >
                  <FaShieldAlt /> Admin Panel
                </button>
                {/* 
                  Sử dụng phần bọc ngoài có absolute bắt đầu từ 100% chiều cao nút, có pt-2 (padding-top) 
                  tạo khoảng cách 8px ảo giúp di chuyển chuột không bị mất hover (dead-zone)
                */}
                <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-50">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                    <Link 
                      href="/admin/questions"
                      className="block px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition"
                    >
                      📝 Quản lý câu hỏi
                    </Link>
                    <Link 
                      href="/admin/hints"
                      className="block px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white border-t border-slate-700 transition"
                    >
                      💡 Duyệt Gợi ý
                  </Link>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col items-end hidden md:flex">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Học viên</span>
              <span className="text-sm font-black text-blue-300">{user.username}</span>
            </div>
            <div className="group relative">
              <button 
                onClick={logout}
                className="w-10 h-10 bg-gray-800 hover:bg-red-900/40 text-gray-400 hover:text-red-400 rounded-xl flex items-center justify-center transition-all duration-300 border border-gray-700 hover:border-red-900/50"
                title="Đăng xuất"
              >
                <FaSignOutAlt className="text-lg" />
              </button>
              <div className="absolute right-0 top-full mt-2 hidden group-hover:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-50">
                Đăng xuất
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
