/**
 * Tác giả: Nguyễn Văn Đạt | Email: nguyenvandatsqtt@gmail.com
 * Mô tả: Cấu hình kết nối cơ sở dữ liệu Turso libSQL Database thông qua thư viện @libsql/client.
 * File này hoạt động ở môi trường Server-side.
 */

import { createClient } from "@libsql/client";

// Khởi tạo client kết nối đến database Turso sử dụng các biến môi trường cấu hình tại .env.local
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_DATABASE_TURSO_AUTH_TOKEN || "",
});

/**
 * Hàm khởi tạo bảng quiz_history trong cơ sở dữ liệu nếu bảng này chưa tồn tại.
 * Giúp tự động thiết lập schema mà không cần chạy lệnh SQL thủ công từ Dashboard.
 */
export async function initDb() {
  try {
    // Thực hiện truy vấn tạo bảng nếu chưa có
    await client.execute(`
      CREATE TABLE IF NOT EXISTS quiz_history (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        subject TEXT NOT NULL,
        date TEXT NOT NULL,
        score INTEGER NOT NULL,
        totalQuestions INTEGER NOT NULL,
        correctAnswers INTEGER NOT NULL,
        wrongAnswers INTEGER NOT NULL,
        unattemptedQuestions INTEGER NOT NULL,
        timeSpent REAL NOT NULL,
        averageTime TEXT NOT NULL
      );
    `);
    console.log("[Turso Database]: Đã kiểm tra và khởi tạo bảng quiz_history thành công!");

    // Thực hiện truy vấn tạo bảng thống kê câu hỏi nếu chưa có
    // Dùng question_text làm khóa chính kết hợp vì câu hỏi trong câu hỏi JSON không có id cụ thể
    await client.execute(`
      CREATE TABLE IF NOT EXISTS question_stats (
        username TEXT NOT NULL,
        subject TEXT NOT NULL,
        question_text TEXT NOT NULL,
        appears_count INTEGER NOT NULL DEFAULT 0,
        wrong_count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (username, subject, question_text)
      );
    `);
    console.log("[Turso Database]: Đã kiểm tra và khởi tạo bảng question_stats thành công!");
  } catch (err) {
    console.error("[Turso Database Error]: Lỗi khi tự động khởi tạo bảng:", err);
  }
}

export default client;
