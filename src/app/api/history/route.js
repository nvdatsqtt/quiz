/**
 * Tác giả: Nguyễn Văn Đạt | Email: nguyenvandatsqtt@gmail.com
 * Mô tả: Next.js API Route Handler (App Router) để quản lý lịch sử ôn tập.
 * Hỗ trợ các phương thức GET (lấy lịch sử), POST (thêm mới), DELETE (xóa sạch/xóa theo ID).
 * Tích hợp cơ chế tự động kiểm tra và tạo bảng cơ sở dữ liệu nếu chưa có.
 */

import { NextResponse } from "next/server";
import client, { initDb } from "@/lib/turso";

// Biến trạng thái để kiểm soát việc chạy hàm khởi tạo database duy nhất 1 lần khi server khởi động
let isDbInitialized = false;

/**
 * Hàm đảm bảo database đã được kiểm tra cấu trúc bảng trước khi thực hiện bất kỳ truy vấn nào.
 */
async function ensureDb() {
  if (!isDbInitialized) {
    await initDb();
    isDbInitialized = true;
  }
}

/**
 * API GET: Lấy lịch sử thi của học viên.
 * Hỗ trợ các tham số lọc:
 * - username: lọc theo tên học viên.
 * - subject: lọc theo chủ đề ôn luyện.
 * Trả về mảng các lượt thi sắp xếp theo ngày thi mới nhất lên đầu.
 */
export async function GET(request) {
  try {
    await ensureDb();

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    const subject = searchParams.get("subject");
    const id = searchParams.get("id");

    // Nếu truyền id: Lấy chi tiết 1 lượt thi kèm toàn bộ đề thi thực tế
    if (id) {
      const historyResult = await client.execute({
        sql: "SELECT * FROM quiz_history WHERE id = ?",
        args: [id]
      });

      const record = historyResult.rows[0];
      if (!record) {
        return NextResponse.json({ error: "Không tìm thấy lịch sử lượt thi này" }, { status: 404 });
      }

      let detailedQuestions = [];
      if (record.list_questions) {
        let listQuestions = [];
        try {
          listQuestions = JSON.parse(record.list_questions);
        } catch (e) {
          listQuestions = [];
        }

        if (listQuestions.length > 0) {
          // Lấy tất cả câu hỏi tương ứng trong CSDL
          const placeholders = listQuestions.map(() => "?").join(",");
          const ids = listQuestions.map(item => item.id);

          const qResult = await client.execute({
            sql: `SELECT * FROM questions WHERE id IN (${placeholders})`,
            args: ids
          });

          const questionsMap = {};
          qResult.rows.forEach(q => {
            questionsMap[q.id] = {
              ...q,
              options: JSON.parse(q.options)
            };
          });

          // Lắp ghép chi tiết và thứ tự câu hỏi đúng như lúc thi
          detailedQuestions = listQuestions.map(item => {
            const qDetail = questionsMap[item.id];
            if (qDetail) {
              return {
                ...qDetail,
                user_selected: item.selected // -1 hoặc index đáp án (0-3)
              };
            } else {
              // Xử lý Hard Delete: Câu hỏi đã bị xoá khỏi CSDL
              return {
                id: item.id,
                question: "Câu hỏi này đã bị xoá khỏi ngân hàng đề.",
                options: [],
                answer: "",
                user_selected: item.selected,
                is_deleted: true
              };
            }
          });
        }
      }

      return NextResponse.json({
        history: record,
        questions: detailedQuestions
      });
    }

    let query = "SELECT * FROM quiz_history";
    const params = [];

    // Xử lý các điều kiện lọc động
    if (username && subject) {
      query += " WHERE username = ? AND subject = ?";
      params.push(username, subject);
    } else if (username) {
      query += " WHERE username = ?";
      params.push(username);
    } else if (subject) {
      query += " WHERE subject = ?";
      params.push(subject);
    }

    // Sắp xếp lịch sử ôn tập: Mới nhất hiển thị lên đầu tiên
    query += " ORDER BY date DESC";

    const result = await client.execute({ sql: query, args: params });
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[API GET History Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * API POST: Lưu một kết quả thi mới từ học viên vào cơ sở dữ liệu.
 */
export async function POST(request) {
  try {
    await ensureDb();
    const data = await request.json();
    
    const {
      id,
      username,
      subject,
      date,
      score,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      unattemptedQuestions,
      timeSpent,
      averageTime,
      list_questions
    } = data;

    // Kiểm tra dữ liệu đầu vào bắt buộc
    if (!id || !username || !subject) {
      return NextResponse.json({ error: "Thiếu dữ liệu bắt buộc (id, username, subject)" }, { status: 400 });
    }

    // Thực hiện truy vấn chèn dữ liệu
    await client.execute({
      sql: `
        INSERT INTO quiz_history (
          id, username, subject, date, score, totalQuestions, 
          correctAnswers, wrongAnswers, unattemptedQuestions, timeSpent, averageTime, list_questions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        username,
        subject,
        date,
        score,
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        unattemptedQuestions,
        timeSpent,
        averageTime,
        list_questions ? JSON.stringify(list_questions) : null
      ]
    });

    return NextResponse.json({ success: true, record: data });
  } catch (error) {
    console.error("[API POST History Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * API DELETE: Xóa sạch hoặc xóa bản ghi lịch sử thi cụ thể.
 * - Nếu truyền tham số `id`: thực hiện xóa một bản ghi cụ thể.
 * - Nếu không truyền tham số: thực hiện xóa toàn bộ lịch sử ôn tập (chỉ dành cho tính năng Xóa sạch của Admin).
 */
export async function DELETE(request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      // Xóa 1 bản ghi cụ thể
      await client.execute({
        sql: "DELETE FROM quiz_history WHERE id = ?",
        args: [id]
      });
      return NextResponse.json({ success: true, message: `Đã xóa bản ghi ${id} thành công!` });
    } else {
      // Xóa toàn bộ lịch sử ôn tập (Chức năng Xóa sạch của Admin)
      await client.execute("DELETE FROM quiz_history");
      return NextResponse.json({ success: true, message: "Đã xóa toàn bộ lịch sử thi thành công!" });
    }
  } catch (error) {
    console.error("[API DELETE History Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
