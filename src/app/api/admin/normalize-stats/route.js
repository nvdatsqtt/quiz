import { NextResponse } from "next/server";
import client, { initDb } from "@/lib/turso";

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    if (role !== "Admin") {
      return NextResponse.json({ error: "Không có quyền thực hiện." }, { status: 403 });
    }

    await initDb();

    // Đảm bảo cột question_stats tồn tại
    try {
      await client.execute("ALTER TABLE users ADD COLUMN question_stats TEXT;");
    } catch (e) {
      // Bỏ qua nếu đã tồn tại
    }

    // Lấy tất cả user
    const usersRes = await client.execute("SELECT username, need_practice_questions, encountered_questions FROM users");

    let count = 0;
    for (const row of usersRes.rows) {
      const username = row.username;
      
      let needPractice = [];
      try {
        needPractice = JSON.parse(row.need_practice_questions || "[]");
        if (!Array.isArray(needPractice)) needPractice = [];
      } catch (e) {
        needPractice = [];
      }

      let encountered = [];
      try {
        encountered = JSON.parse(row.encountered_questions || "[]");
        if (!Array.isArray(encountered)) encountered = [];
      } catch (e) {
        encountered = [];
      }

      // Xây dựng question_stats mới theo yêu cầu:
      // countMeet = 0 cho tất cả, countCorrect = -1 nếu có trong needPractice (tức là có wrong_count)
      const statsMap = new Map();

      // Ghi nhận các ID trong encountered (mặc dù countMeet reset về 0, nhưng ghi vào mảng để sau này update tiếp)
      encountered.forEach(id => {
        statsMap.set(id, { id, countMeet: 0, countCorrect: 0 });
      });

      // Xử lý các câu làm sai
      needPractice.forEach(item => {
        if (item.id) {
          statsMap.set(item.id, {
            id: item.id,
            countMeet: 0,
            countCorrect: -1 // Yêu cầu từ user: gán countCorrect = -1 luôn
          });
        }
      });

      const newStats = Array.from(statsMap.values());

      // Cập nhật vào DB
      await client.execute({
        sql: "UPDATE users SET question_stats = ? WHERE username = ?",
        args: [JSON.stringify(newStats), username]
      });

      count++;
    }

    return NextResponse.json({ success: true, message: `Đã chuẩn hoá dữ liệu cho ${count} người dùng.` });
  } catch (error) {
    console.error("[API Admin Normalize Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
