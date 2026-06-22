/**
 * Tác giả: Nguyễn Văn Đạt | Email: nguyenvandatsqtt@gmail.com
 * Mô tả: Thành phần Footer hiển thị thông tin bản quyền và ghi chú bảo mật ở chân trang.
 * Theo yêu cầu của tác giả, thông tin tác giả được lưu trữ tại đây trong mã nguồn hệ thống và không hiển thị ra UI.
 * Dành riêng cho mục đích ôn luyện nội bộ.
 */

const Footer = () => (
  <footer className="bg-gray-800 text-white py-6 px-4 text-center">
    <div className="max-w-screen-lg mx-auto flex flex-col sm:flex-row items-center justify-between text-gray-400 text-sm">
      <p>
        &copy; 2026. Tất cả các quyền được bảo lưu.
      </p>
      <p className="mt-2 sm:mt-0 font-semibold text-yellow-500 bg-gray-700 px-3 py-1 rounded">
        Chỉ dùng nội bộ
      </p>
    </div>
  </footer>
);

export default Footer;
