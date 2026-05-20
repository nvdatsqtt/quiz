'use client';

/**
 * Tác giả: Nguyễn Văn Đạt | Email: nguyenvandatsqtt@gmail.com
 * Mô tả: Thành phần SubjectCard hiển thị thẻ thông tin cho từng chủ đề trắc nghiệm.
 * Hỗ trợ chuyển hướng an toàn đối với các tên chủ đề tiếng Việt có dấu.
 * Dành riêng cho mục đích ôn luyện nội bộ.
 */

import Image from 'next/image';
import { useRouter } from "next/navigation";

export default function SubjectCard({ subject }) {
  const router = useRouter();

  // Xử lý sự kiện nhấp vào thẻ chủ đề
  const handleClick = () => {
    // Sử dụng encodeURIComponent để mã hóa tên chủ đề tiếng Việt có dấu khi truyền qua URL
    router.push(`/quiz/${encodeURIComponent(subject.name.toLowerCase())}`);
  };

  return (
    <div
      onClick={handleClick}
      className="group relative border rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 cursor-pointer transform hover:-translate-y-2 hover:scale-105"
    >
      {/* Hình ảnh đại diện cho chủ đề với hiệu ứng thu phóng nhẹ */}
      <div className="overflow-hidden bg-blue-50">
        <Image
          src={subject.image} 
          alt={`${subject.name} image`}
          width={400} 
          height={300} 
          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
        />
      </div>

      {/* Phần thông tin văn bản */}
      <div className="p-4 bg-gradient-to-b from-white to-gray-50">
        {/* Tên chủ đề */}
        <h2 className="text-2xl font-bold text-center text-black group-hover:text-blue-600 transition-colors duration-300">
          {subject.name}
        </h2>
        {/* Số lượng câu hỏi của chủ đề */}
        <p className="text-center text-gray-700 text-lg mt-2 font-medium">
          {subject.questions.length} Câu hỏi
        </p>
      </div>

      {/* Đường trang trí động phía dưới thẻ */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-green-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
    </div>
  );
}
