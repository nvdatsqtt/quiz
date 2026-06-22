import { NextResponse } from "next/server";
import client, { initDb } from "@/lib/turso";

export const dynamic = 'force-dynamic';

let isDbInitialized = false;

async function ensureDb() {
  if (!isDbInitialized) {
    await initDb();
    // Đảm bảo cột question_stats tồn tại
    try {
      await client.execute("ALTER TABLE users ADD COLUMN question_stats TEXT;");
      console.log("[Turso Database]: Đã tự động thêm cột question_stats vào bảng users!");
    } catch (e) {
      // Bỏ qua lỗi nếu cột đã tồn tại
    }
    isDbInitialized = true;
  }
}

const stripHtml = (html) => html ? html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() : '';

/**
 * API GET: Lấy thống kê câu hỏi của user từ question_stats.
 */
export async function GET(request) {
  try {
    await ensureDb();

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    const subjectName = searchParams.get("subject");

    if (!username || !subjectName) {
      return NextResponse.json(
        { error: "Thiếu tham số bắt buộc username hoặc subject" },
        { status: 400 }
      );
    }

    const userResult = await client.execute({
      sql: "SELECT question_stats FROM users WHERE username = ?",
      args: [username]
    });

    const userRow = userResult.rows[0];
    if (!userRow) {
      return NextResponse.json([]);
    }

    let stats = [];
    try {
      stats = JSON.parse(userRow.question_stats || "[]");
      if (!Array.isArray(stats)) stats = [];
    } catch (e) {
      stats = [];
    }

    const qResult = await client.execute({
      sql: `SELECT q.id, q.question
            FROM questions q
            JOIN subjects s ON q.subject_id = s.id
            WHERE LOWER(s.name) = LOWER(?)`,
      args: [subjectName]
    });

    const subjectQuestions = qResult.rows;
    const statsResponse = [];

    stats.forEach(item => {
      const qMatch = subjectQuestions.find(q => q.id === item.id);
      if (qMatch) {
        statsResponse.push({
          id: qMatch.id,
          question_text: qMatch.question,
          appears_count: item.countMeet || 0,
          wrong_count: item.countCorrect !== undefined ? (item.countCorrect < 0 ? -item.countCorrect : 0) : 0, // Fallback for UI if needed
          countMeet: item.countMeet || 0,
          countCorrect: item.countCorrect || 0
        });
      }
    });

    return NextResponse.json(statsResponse);
  } catch (error) {
    console.error("[API GET Question Stats Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * API POST: Cập nhật countMeet và countCorrect vào question_stats
 */
export async function POST(request) {
  try {
    await ensureDb();
    const data = await request.json();

    const { username, stats: clientStats } = data;

    if (!username || !Array.isArray(clientStats)) {
      return NextResponse.json(
        { error: "Dữ liệu yêu cầu không hợp lệ" },
        { status: 400 }
      );
    }

    if (clientStats.length === 0) {
      return NextResponse.json({ success: true, message: "Không có thống kê để cập nhật." });
    }

    const allQsResult = await client.execute("SELECT id, question FROM questions");
    const qMap = {};
    allQsResult.rows.forEach(q => {
      if (q.question) {
        const cleanText = stripHtml(q.question);
        qMap[cleanText] = q.id;
        qMap[q.question.trim()] = q.id;
      }
    });

    const userResult = await client.execute({
      sql: "SELECT question_stats FROM users WHERE username = ?",
      args: [username]
    });

    const userRow = userResult.rows[0];
    if (!userRow) {
      return NextResponse.json({ error: "Không tìm thấy người dùng." }, { status: 404 });
    }

    let stats = [];
    try {
      stats = JSON.parse(userRow.question_stats || "[]");
      if (!Array.isArray(stats)) stats = [];
    } catch (e) {
      stats = [];
    }

    clientStats.forEach(s => {
      const cleanStatText = stripHtml(s.question_text || "");
      const qId = s.id || qMap[cleanStatText] || qMap[(s.question_text || "").trim()];

      if (!qId) {
        console.warn(`[Stats Sync Warning]: Không tìm thấy ID cho câu: "${(s.question_text || "").substring(0, 30)}..."`);
        return;
      }

      let existingIndex = stats.findIndex(item => item.id === qId);
      if (existingIndex === -1) {
        stats.push({ id: qId, countMeet: 0, countCorrect: 0 });
        existingIndex = stats.length - 1;
      }

      if (s.isAnswered || s.isEncountered) {
        stats[existingIndex].countMeet += 1;
      }

      if (s.isAnswered) {
        if (s.isCorrect === true) {
          stats[existingIndex].countCorrect += 1;
        } else if (s.isCorrect === false) {
          stats[existingIndex].countCorrect -= 1;
        }
      }
    });

    await client.execute({
      sql: "UPDATE users SET question_stats = ? WHERE username = ?",
      args: [JSON.stringify(stats), username]
    });

    return NextResponse.json({ success: true, count: clientStats.length });
  } catch (error) {
    console.error("[API POST Question Stats Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
