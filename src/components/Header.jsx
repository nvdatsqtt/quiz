"use client";

/**
 * Tác giả: Nguyễn Văn Đạt | Email: nguyenvandatsqtt@gmail.com
 * Mô tả: Thành phần Header hiển thị thanh điều hướng đầu trang và số điểm tích lũy của người dùng.
 * Dành riêng cho mục đích ôn luyện nội bộ.
 */

import { FaCoins } from "react-icons/fa6";
import Link from "next/link";
import { usePoints } from "@/context/PointsContext";

const Header = () => {
  const { points } = usePoints();

  return (
    <header className="bg-gray-900 text-white py-4 px-6 flex justify-between items-center shadow-md">
      {/* Logo / Link quay về Trang chủ (Đổi tên ứng dụng thành Website trắc nghiệm) */}
      <Link
        href="/"
        className="text-3xl font-bold text-white hover:text-blue-400 transition-colors duration-300"
      >
        Website trắc nghiệm
      </Link>

      {/* Phần hiển thị điểm tích lũy của người ôn luyện */}
      <div className="text-lg font-medium flex items-center">
        <span>
          <FaCoins className="text-yellow-500 text-2xl mr-2" />
        </span>
        <span className="text-gray-300 mr-2">Điểm số:</span>
        <span className="font-semibold text-blue-300">{points}</span>
      </div>
    </header>
  );
};

export default Header;
