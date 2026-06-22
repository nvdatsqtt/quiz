import client from "@/lib/turso";

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { role, new_hint, username } = body;

    if (!new_hint || new_hint.trim() === '') {
      return new Response(JSON.stringify({ error: "Nội dung gợi ý không được để trống." }), { 
        status: 400, headers: { "Content-Type": "application/json" } 
      });
    }

    // Lấy câu hỏi hiện tại
    const res = await client.execute({ sql: `SELECT * FROM questions WHERE id = ?`, args: [id] });
    if (res.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Không tìm thấy câu hỏi." }), { 
        status: 404, headers: { "Content-Type": "application/json" } 
      });
    }
    const question = res.rows[0];

    if (role === 'Admin') {
      await client.execute({
        sql: `UPDATE questions SET hint_text = ?, hint_status = 'approved', hint_pending_text = NULL, hint_updated_by = ? WHERE id = ?`,
        args: [new_hint, username, id]
      });
      return new Response(JSON.stringify({ success: true, message: "Đã cập nhật gợi ý trực tiếp (Admin)." }), { 
        status: 200, headers: { "Content-Type": "application/json" } 
      });
    } else {
      if (!question.hint_text) {
        // Chưa có hint
        await client.execute({
          sql: `UPDATE questions SET hint_text = ?, hint_status = 'auto_accepted', hint_pending_text = NULL, hint_updated_by = ? WHERE id = ?`,
          args: [new_hint, username, id]
        });
        return new Response(JSON.stringify({ success: true, message: "Gợi ý đã được chấp nhận tự động." }), { 
          status: 200, headers: { "Content-Type": "application/json" } 
        });
      } else {
        // Đã có hint -> chờ duyệt
        await client.execute({
          sql: `UPDATE questions SET hint_pending_text = ?, hint_status = 'pending', hint_updated_by = ? WHERE id = ?`,
          args: [new_hint, username, id]
        });
        return new Response(JSON.stringify({ success: true, message: "Gợi ý đã được gửi và đang chờ duyệt." }), { 
          status: 200, headers: { "Content-Type": "application/json" } 
        });
      }
    }
  } catch (error) {
    console.error("Lỗi đóng góp hint:", error);
    return new Response(JSON.stringify({ error: "Lỗi máy chủ nội bộ." }), { 
      status: 500, headers: { "Content-Type": "application/json" } 
    });
  }
}
