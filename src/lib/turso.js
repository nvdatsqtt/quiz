/**
 * Tác giả: Nguyễn Văn Đạt | Email: nguyenvandatsqtt@gmail.com
 * Mô tả: Cấu hình kết nối cơ sở dữ liệu Turso libSQL Database thông qua thư viện @libsql/client.
 * File này hoạt động ở môi trường Server-side.
 */

import { createClient } from "@libsql/client";
import crypto from "crypto";

// Khởi tạo client kết nối đến database Turso sử dụng các biến môi trường cấu hình tại .env.local
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_DATABASE_TURSO_AUTH_TOKEN || "",
});

export function hashPassword(password) {
  const salt = process.env.AUTH_SALT || "quiz_app_secure_salt_2026";
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// Sử dụng biến toàn cục NodeJS để tránh việc khởi tạo lại bảng trùng lặp khi chạy Next.js Hot Module Replacement (HMR) reload và Serverless environments
let isDbInitialized = global.isDbInitialized || false;

/**
 * Hàm khởi tạo bảng quiz_history trong cơ sở dữ liệu nếu bảng này chưa tồn tại.
 * Giúp tự động thiết lập schema mà không cần chạy lệnh SQL thủ công từ Dashboard.
 */
export async function initDb() {
  if (isDbInitialized) {
    return; // Đã khởi tạo thành công trong process NodeJS này, bỏ qua để tối ưu hóa tốc độ phản hồi API và giảm số lượt truy vấn SQL lãng phí
  }

  try {
    // Bảng người dùng
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'User'
      );
    `);
    console.log("[Turso Database]: Đã kiểm tra và khởi tạo bảng users thành công!");

    // Seed data cho 3 tài khoản mặc định
    const adminPassword = hashPassword("123456@");
    const userPassword = hashPassword("123456a");

    await client.execute({
      sql: `INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`,
      args: ["Admin", adminPassword, "Admin"]
    });
    await client.execute({
      sql: `INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`,
      args: ["User2", userPassword, "User"]
    });
    await client.execute({
      sql: `INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`,
      args: ["User3", userPassword, "User"]
    });

    // Bảng subjects
    await client.execute(`
      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        image TEXT
      );
    `);
    console.log("[Turso Database]: Đã kiểm tra và khởi tạo bảng subjects thành công!");

    // Bảng questions
    await client.execute(`
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,
        question TEXT NOT NULL,
        options TEXT NOT NULL,         
        answer TEXT NOT NULL,          
        hint_text TEXT,                
        hint_status TEXT,              
        hint_pending_text TEXT,        
        hint_updated_by TEXT,          
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      );
    `);
    console.log("[Turso Database]: Đã kiểm tra và khởi tạo bảng questions thành công!");

    // Thực hiện truy vấn tạo bảng nếu chưa có (quiz_history)
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

    // Đánh dấu đã khởi tạo thành công để không chạy lại nữa trong process hiện tại
    isDbInitialized = true;
    global.isDbInitialized = true;
  } catch (err) {
    console.error("[Turso Database Error]: Lỗi khi tự động khởi tạo bảng:", err);
  }
}

export default client;
