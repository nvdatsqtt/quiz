/**
 * Tác giả: Nguyễn Văn Đạt | Email: nguyenvandatsqtt@gmail.com
 * Mô tả: Next.js API Route Handler (App Router) xử lý lưu trữ và truy vấn thống kê câu hỏi (Số lần xuất hiện & Số lần làm sai).
 * Hỗ trợ GET (lấy danh sách thống kê) và POST (cập nhật hoặc chèn mới đồng loạt thống kê câu hỏi).
 */

import { NextResponse } from "next/server";
import client, { initDb } from "@/lib/turso";

// Biến trạng thái để kiểm soát việc chạy hàm khởi tạo database duy nhất 1 lần
let isDbInitialized = false;

async function ensureDb() {
  if (!isDbInitialized) {
    await initDb();
    isDbInitialized = true;
  }
}

/**
 * API GET: Lấy thống kê câu hỏi của học viên hiện tại đối với chủ đề ôn luyện.
 * Tham số URL:
 * - username: Tên đăng nhập học viên
 * - subject: Tên chủ đề ôn luyện
 */
export async function GET(request) {
  try {
    await ensureDb();

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    const subject = searchParams.get("subject");

    if (!username || !subject) {
      return NextResponse.json(
        { error: "Thiếu tham số bắt buộc username hoặc subject" },
        { status: 400 }
      );
    }

    const query = `
      SELECT question_text, appears_count, wrong_count 
      FROM question_stats 
      WHERE username = ? AND subject = ?
    `;
    const result = await client.execute({ sql: query, args: [username, subject] });

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[API GET Question Stats Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * API POST: Cập nhật đồng loạt tiến trình xuất hiện và trả lời sai của câu hỏi.
 * Cấu trúc request body:
 * {
 *   "username": "...",
 *   "subject": "...",
 *   "stats": [
 *     { "question_text": "...", "isCorrect": true/false/null, "isAnswered": true/false }
 *   ]
 * }
 */
export async function POST(request) {
  try {
    await ensureDb();
    const data = await request.json();

    const { username, subject, stats } = data;

    if (!username || !subject || !Array.isArray(stats)) {
      return NextResponse.json(
        { error: "Dữ liệu yêu cầu không hợp lệ (yêu cầu username, subject và mảng stats)" },
        { status: 400 }
      );
    }

    if (stats.length === 0) {
      return NextResponse.json({ success: true, message: "Không có thống kê nào để cập nhật." });
    }

    // Sử dụng cơ chế libsql client.batch() để tối ưu hóa việc chạy nhiều truy vấn trong một transaction
    // [Học tập AI - Điểm tin cậy: 8/10] - Cấu trúc cập nhật trọng số động cho câu hỏi sai (giảm khi trả lời đúng)
    const transactions = stats.map((s) => {
      // Tính toán sự thay đổi trọng số (wrongDelta):
      // - Nếu người dùng trả lời SAI: +1 điểm sai
      // - Nếu người dùng trả lời ĐÚNG: -1 điểm sai (để giảm dần gánh nặng câu hỏi sai)
      // - Nếu người dùng không trả lời hoặc bỏ qua: 0
      let wrongDelta = 0;
      if (s.isAnswered) {
        if (s.isCorrect === false) {
          wrongDelta = 1;
        } else if (s.isCorrect === true) {
          wrongDelta = -1;
        }
      }

      // Giá trị sai ban đầu khi chèn mới bản ghi (INSERT)
      // Không được phép chèn số âm, nếu làm đúng lần đầu tiên thì điểm sai khởi tạo là 0
      const initialWrong = wrongDelta < 0 ? 0 : wrongDelta;

      return {
        sql: `
          INSERT INTO question_stats (username, subject, question_text, appears_count, wrong_count)
          VALUES (?, ?, ?, 1, ?)
          ON CONFLICT(username, subject, question_text)
          DO UPDATE SET 
            appears_count = appears_count + 1,
            wrong_count = CASE WHEN wrong_count + ? < 0 THEN 0 ELSE wrong_count + ? END
        `,
        args: [username, subject, s.question_text, initialWrong, wrongDelta, wrongDelta],
      };
    });

    // Thực hiện batch transaction
    await client.batch(transactions);

    return NextResponse.json({ success: true, count: stats.length });
  } catch (error) {
    console.error("[API POST Question Stats Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
