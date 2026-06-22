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
global.isDbInitialized = global.isDbInitialized || false;
global.dbInitPromise = global.dbInitPromise || null;

/**
 * Hàm khởi tạo bảng quiz_history trong cơ sở dữ liệu nếu bảng này chưa tồn tại.
 * Giúp tự động thiết lập schema mà không cần chạy lệnh SQL thủ công từ Dashboard.
 */
export async function initDb() {
  if (global.isDbInitialized) {
    return; // Đã khởi tạo thành công, bỏ qua
  }

  if (global.dbInitPromise) {
    return global.dbInitPromise; // Đang chạy khởi tạo ở một request song song, trả về promise đang chờ
  }

  // Tạo khóa hứa (promise lock) toàn cục để tránh race condition khi có nhiều request đồng thời lúc startup
  global.dbInitPromise = (async () => {
    try {
      // Bảng người dùng
      await client.execute(`
        CREATE TABLE IF NOT EXISTS users (
          username TEXT PRIMARY KEY,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'User',
          need_practice_questions TEXT,
          encountered_questions TEXT
        );
      `);
      console.log("[Turso Database]: Đã kiểm tra và khởi tạo bảng users thành công!");

      // Đảm bảo các cột tồn tại ở các DB cũ
      try {
        await client.execute("ALTER TABLE users ADD COLUMN need_practice_questions TEXT;");
        console.log("[Turso Database]: Đã thêm cột need_practice_questions vào bảng users!");
      } catch (e) {}

      try {
        await client.execute("ALTER TABLE users ADD COLUMN encountered_questions TEXT;");
        console.log("[Turso Database]: Đã thêm cột encountered_questions vào bảng users!");
      } catch (e) {}

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
          averageTime TEXT NOT NULL,
          list_questions TEXT
        );
      `);
      console.log("[Turso Database]: Đã kiểm tra và khởi tạo bảng quiz_history thành công!");

      // Đảm bảo cột list_questions tồn tại ở các DB cũ
      try {
        await client.execute("ALTER TABLE quiz_history ADD COLUMN list_questions TEXT;");
        console.log("[Turso Database]: Đã thêm cột list_questions vào bảng quiz_history!");
      } catch (e) {
        // Bỏ qua lỗi nếu cột đã tồn tại
      }

      // Tự động Migrate dữ liệu từ question_stats cũ sang users.need_practice_questions
      try {
        const statsTableCheck = await client.execute(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='question_stats';"
        );
        if (statsTableCheck.rows.length > 0) {
          console.log("[Turso Database]: Phát hiện bảng question_stats cũ. Bắt đầu di chuyển dữ liệu sang users.need_practice_questions...");
          
          // Lấy tất cả câu hỏi để lập bản đồ từ question_text sang id
          const allQs = await client.execute("SELECT id, question FROM questions;");
          const qMap = {};
          const stripHtml = (html) => html ? html.replace(/<[^>]*>/g, '').trim() : '';

          allQs.rows.forEach(q => {
            if (q.question) {
              const cleanText = stripHtml(q.question);
              qMap[cleanText] = q.id;
              qMap[q.question.trim()] = q.id;
            }
          });

          // Lấy toàn bộ dữ liệu question_stats có câu sai
          const oldStats = await client.execute("SELECT * FROM question_stats WHERE wrong_count > 0;");
          
          const userStatsMap = {};
          oldStats.rows.forEach(stat => {
            if (stat.question_text) {
              const cleanStatText = stripHtml(stat.question_text);
              const qId = qMap[cleanStatText] || qMap[stat.question_text.trim()];
              
              if (qId) {
                if (!userStatsMap[stat.username]) {
                  userStatsMap[stat.username] = [];
                }
                const existing = userStatsMap[stat.username].find(item => item.id === qId);
                if (existing) {
                  existing.wrong_count += stat.wrong_count;
                } else {
                  userStatsMap[stat.username].push({
                    id: qId,
                    wrong_count: stat.wrong_count
                  });
                }
              } else {
                console.log(`[Turso Migration]: Không tìm thấy ID khớp cho câu hỏi: "${stat.question_text.substring(0, 30)}...". Bỏ qua.`);
              }
            }
          });

          // Cập nhật dữ liệu vào bảng users
          for (const username of Object.keys(userStatsMap)) {
            const jsonStr = JSON.stringify(userStatsMap[username]);
            await client.execute({
              sql: "UPDATE users SET need_practice_questions = ? WHERE username = ?",
              args: [jsonStr, username]
            });
            console.log(`[Turso Migration]: Đã di chuyển ${userStatsMap[username].length} câu sai cho user: ${username}`);
          }

          // Xóa bảng cũ
          await client.execute("DROP TABLE question_stats;");
          console.log("[Turso Database]: Hoàn thành di chuyển và DROP bảng question_stats thành công!");
        }
      } catch (migError) {
        console.error("[Turso Database Migration Error]: Lỗi khi chạy migration:", migError);
      }

      // Đánh dấu đã khởi tạo thành công
      global.isDbInitialized = true;
    } catch (err) {
      console.error("[Turso Database Error]: Lỗi khi tự động khởi tạo bảng:", err);
      // Reset promise khóa để cho phép thử lại ở lượt sau
      global.dbInitPromise = null;
      throw err;
    }
  })();

  return global.dbInitPromise;
}

export default client;
