import client, { initDb } from "@/lib/turso";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await initDb();
    const url = new URL(request.url);
    const role = url.searchParams.get("role");

    if (role !== 'Admin') {
      return new Response(JSON.stringify({ error: "Không có quyền thực hiện." }), { 
        status: 403, headers: { "Content-Type": "application/json" } 
      });
    }

    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "25", 10);
    const search = url.searchParams.get("search") || "";
    const subjectId = url.searchParams.get("subject_id") || "";

    // Lấy danh sách môn học để hiển thị filter & form dropdown
    const subjectsResult = await client.execute("SELECT * FROM subjects");
    const subjects = subjectsResult.rows;

    let query = "SELECT q.*, s.name as subject_name FROM questions q JOIN subjects s ON q.subject_id = s.id WHERE 1=1";
    let countQuery = "SELECT COUNT(*) as count FROM questions q JOIN subjects s ON q.subject_id = s.id WHERE 1=1";
    const args = [];
    const countArgs = [];

    if (search) {
      query += " AND (q.question LIKE ? OR q.id LIKE ?)";
      countQuery += " AND (q.question LIKE ? OR q.id LIKE ?)";
      const searchPattern = `%${search}%`;
      args.push(searchPattern, searchPattern);
      countArgs.push(searchPattern, searchPattern);
    }

    if (subjectId) {
      query += " AND q.subject_id = ?";
      countQuery += " AND q.subject_id = ?";
      args.push(subjectId);
      countArgs.push(subjectId);
    }

    // Tính tổng số câu
    const totalResult = await client.execute({ sql: countQuery, args: countArgs });
    const total = totalResult.rows[0]?.count || 0;

    // Phân trang
    const offset = (page - 1) * limit;
    query += " ORDER BY q.id DESC LIMIT ? OFFSET ?";
    args.push(limit, offset);

    const questionsResult = await client.execute({ sql: query, args });
    const questions = questionsResult.rows.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }));

    return new Response(JSON.stringify({ 
      questions, 
      subjects, 
      total, 
      page, 
      limit 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Lỗi khi tải câu hỏi quản trị:", error);
    return new Response(JSON.stringify({ error: "Lỗi máy chủ nội bộ." }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(request) {
  try {
    await initDb();
    const body = await request.json();

    if (body.role !== 'Admin') {
      return new Response(JSON.stringify({ error: "Không có quyền thực hiện." }), { 
        status: 403, headers: { "Content-Type": "application/json" } 
      });
    }

    const { subject_id, question, options, answer, hint_text } = body.data;

    if (!subject_id || !question || !options || !answer) {
      return new Response(JSON.stringify({ error: "Thiếu dữ liệu bắt buộc." }), { 
        status: 400, headers: { "Content-Type": "application/json" } 
      });
    }

    const newId = crypto.randomUUID();

    await client.execute({
      sql: `INSERT INTO questions (id, subject_id, question, options, answer, hint_text, hint_status) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newId, 
        subject_id, 
        question, 
        JSON.stringify(options), 
        answer, 
        hint_text || "", 
        "approved"
      ]
    });

    return new Response(JSON.stringify({ success: true, id: newId }), { 
      status: 200, headers: { "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error("Lỗi khi thêm mới câu hỏi:", error);
    return new Response(JSON.stringify({ error: "Lỗi máy chủ nội bộ." }), { 
      status: 500, headers: { "Content-Type": "application/json" } 
    });
  }
}

export async function DELETE(request) {
  try {
    await initDb();
    const body = await request.json();

    if (body.role !== 'Admin') {
      return new Response(JSON.stringify({ error: "Không có quyền thực hiện." }), { 
        status: 403, headers: { "Content-Type": "application/json" } 
      });
    }

    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ error: "Danh sách ID không hợp lệ." }), { 
        status: 400, headers: { "Content-Type": "application/json" } 
      });
    }

    // Thực hiện Hard Delete hàng loạt
    // SQLite không trực tiếp dùng array binding đơn giản trong raw execute của libsql, 
    // chúng ta sẽ tạo các placeholders ?, ?, ? cho câu lệnh SQL.
    const placeholders = ids.map(() => "?").join(",");
    await client.execute({
      sql: `DELETE FROM questions WHERE id IN (${placeholders})`,
      args: ids
    });

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, headers: { "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error("Lỗi xóa câu hỏi hàng loạt:", error);
    return new Response(JSON.stringify({ error: "Lỗi máy chủ nội bộ." }), { 
      status: 500, headers: { "Content-Type": "application/json" } 
    });
  }
}
