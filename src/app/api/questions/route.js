import client, { initDb } from "@/lib/turso";

export const dynamic = 'force-dynamic'; // Ngăn chặn Next.js cache tĩnh API này để luôn lấy dữ liệu mới nhất từ Turso DB

export async function GET() {
  try {
    await initDb();
    
    // Lấy tất cả chủ đề
    const subjectsResult = await client.execute("SELECT * FROM subjects");
    
    // Lấy tất cả câu hỏi
    const questionsResult = await client.execute("SELECT * FROM questions");

    // Lắp ráp lại thành cấu trúc JSON cũ để tương thích với các component client
    const subjects = subjectsResult.rows.map(sub => {
      const qs = questionsResult.rows
        .filter(q => q.subject_id === sub.id)
        .map(q => ({
          id: q.id,
          question: q.question,
          options: JSON.parse(q.options),
          answer: q.answer,
          hint_text: q.hint_text,
          hint_status: q.hint_status,
          hint_pending_text: q.hint_pending_text,
          hint_updated_by: q.hint_updated_by
        }));
      
      return {
        id: sub.id,
        name: sub.name,
        image: sub.image,
        questions: qs
      };
    });

    return new Response(JSON.stringify({ subjects }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Lỗi khi tải danh sách câu hỏi:", error);
    return new Response(JSON.stringify({ error: "Lỗi máy chủ nội bộ." }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
