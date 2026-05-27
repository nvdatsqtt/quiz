import client from "@/lib/turso";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const role = url.searchParams.get("role");

    if (role !== 'Admin') {
      return new Response(JSON.stringify({ error: "Không có quyền thực hiện." }), { 
        status: 403, headers: { "Content-Type": "application/json" } 
      });
    }

    const res = await client.execute(`SELECT id, subject_id, question, options, hint_text, hint_status, hint_pending_text, hint_updated_by FROM questions WHERE hint_status = 'pending' OR hint_status = 'auto_accepted'`);

    return new Response(JSON.stringify({ pendingHints: res.rows }), { 
      status: 200, headers: { "Content-Type": "application/json" } 
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách duyệt hint:", error);
    return new Response(JSON.stringify({ error: "Lỗi máy chủ nội bộ." }), { 
      status: 500, headers: { "Content-Type": "application/json" } 
    });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { role, questionId, action, hintStatus, updatedHintText } = body; // action: 'approve', 'reject' hoặc 'update'

    if (role !== 'Admin') {
      return new Response(JSON.stringify({ error: "Không có quyền thực hiện." }), { 
        status: 403, headers: { "Content-Type": "application/json" } 
      });
    }

    if (action === 'approve') {
      // Nếu Admin có sửa nội dung trước khi duyệt
      const finalHintText = updatedHintText || null;

      if (hintStatus === 'pending') {
        if (finalHintText) {
          await client.execute({
            sql: `UPDATE questions SET hint_text = ?, hint_status = 'approved', hint_pending_text = NULL WHERE id = ?`,
            args: [finalHintText, questionId]
          });
        } else {
          await client.execute({
            sql: `UPDATE questions SET hint_text = hint_pending_text, hint_status = 'approved', hint_pending_text = NULL WHERE id = ?`,
            args: [questionId]
          });
        }
      } else if (hintStatus === 'auto_accepted') {
        if (finalHintText) {
          await client.execute({
            sql: `UPDATE questions SET hint_text = ?, hint_status = 'approved' WHERE id = ?`,
            args: [finalHintText, questionId]
          });
        } else {
          await client.execute({
            sql: `UPDATE questions SET hint_status = 'approved' WHERE id = ?`,
            args: [questionId]
          });
        }
      }
    } else if (action === 'reject') {
      if (hintStatus === 'pending') {
        await client.execute({
          sql: `UPDATE questions SET hint_status = 'approved', hint_pending_text = NULL WHERE id = ?`, 
          // nếu từ chối hint mới thì trả status về approved (vì đang có hint_text cũ)
          args: [questionId]
        });
      } else if (hintStatus === 'auto_accepted') {
        await client.execute({
          sql: `UPDATE questions SET hint_text = NULL, hint_status = 'none' WHERE id = ?`,
          args: [questionId]
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, headers: { "Content-Type": "application/json" } 
    });
  } catch (error) {
    console.error("Lỗi duyệt hint:", error);
    return new Response(JSON.stringify({ error: "Lỗi máy chủ nội bộ." }), { 
      status: 500, headers: { "Content-Type": "application/json" } 
    });
  }
}
