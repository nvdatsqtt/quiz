import client from "@/lib/turso";

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Xác thực quyền Admin (cần truyền role từ client lên)
    if (body.role !== 'Admin') {
      return new Response(JSON.stringify({ error: "Không có quyền thực hiện." }), { 
        status: 403, headers: { "Content-Type": "application/json" } 
      });
    }

    const { question, options, answer } = body.data;

    await client.execute({
      sql: `UPDATE questions SET question = ?, options = ?, answer = ? WHERE id = ?`,
      args: [question, JSON.stringify(options), answer, id]
    });

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, headers: { "Content-Type": "application/json" } 
    });
  } catch (error) {
    console.error("Lỗi cập nhật câu hỏi:", error);
    return new Response(JSON.stringify({ error: "Lỗi máy chủ nội bộ." }), { 
      status: 500, headers: { "Content-Type": "application/json" } 
    });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const url = new URL(request.url);
    const role = url.searchParams.get("role");

    // Xác thực quyền Admin (truyền qua query param)
    if (role !== 'Admin') {
      return new Response(JSON.stringify({ error: "Không có quyền thực hiện." }), { 
        status: 403, headers: { "Content-Type": "application/json" } 
      });
    }

    await client.execute({
      sql: `DELETE FROM questions WHERE id = ?`,
      args: [id]
    });

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, headers: { "Content-Type": "application/json" } 
    });
  } catch (error) {
    console.error("Lỗi xóa câu hỏi:", error);
    return new Response(JSON.stringify({ error: "Lỗi máy chủ nội bộ." }), { 
      status: 500, headers: { "Content-Type": "application/json" } 
    });
  }
}
