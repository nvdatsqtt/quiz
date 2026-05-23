import { NextResponse } from "next/server";
import client, { initDb } from "@/lib/turso";

export const dynamic = 'force-dynamic';

let isDbInitialized = false;

async function ensureDb() {
  if (!isDbInitialized) {
    await initDb();
    isDbInitialized = true;
  }
}

const stripHtml = (html) => html ? html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() : '';

/**
 * API GET: Lấy thống kê câu hỏi sai & câu hỏi đã gặp của user.
 * Trả về định dạng tương thích ngược để client hiển thị số câu đã làm (appears_count > 0).
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

    // 1. Lấy dữ liệu need_practice_questions và encountered_questions từ DB
    const userResult = await client.execute({
      sql: "SELECT need_practice_questions, encountered_questions FROM users WHERE username = ?",
      args: [username]
    });
    
    const userRow = userResult.rows[0];
    if (!userRow) {
      return NextResponse.json([]);
    }

    let needPractice = [];
    try {
      needPractice = JSON.parse(userRow.need_practice_questions || "[]");
      if (!Array.isArray(needPractice)) needPractice = [];
    } catch (e) {
      needPractice = [];
    }

    let encountered = [];
    try {
      encountered = JSON.parse(userRow.encountered_questions || "[]");
      if (!Array.isArray(encountered)) encountered = [];
    } catch (e) {
      encountered = [];
    }

    // 2. Lấy danh sách câu hỏi thuộc chủ đề (subject) chỉ định để lọc
    const qResult = await client.execute({
      sql: `SELECT q.id, q.question 
            FROM questions q 
            JOIN subjects s ON q.subject_id = s.id 
            WHERE LOWER(s.name) = LOWER(?)`,
      args: [subjectName]
    });

    const subjectQuestions = qResult.rows;
    const statsResponse = [];

    // 3. Gom nhóm tất cả ID đã gặp hoặc đang sai
    const allIds = Array.from(new Set([
      ...encountered,
      ...needPractice.map(item => item.id)
    ]));

    allIds.forEach(id => {
      const qMatch = subjectQuestions.find(q => q.id === id);
      if (qMatch) {
        const wrongItem = needPractice.find(item => item.id === id);
        statsResponse.push({
          id: qMatch.id, // Bổ sung UUID câu hỏi để client đối chiếu tuyệt đối chính xác
          question_text: qMatch.question,
          appears_count: 1, // Đã từng gặp ít nhất 1 lần (tracking hoạt động)
          wrong_count: wrongItem ? wrongItem.wrong_count : 0
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
 * API POST: Nhận kết quả lượt thi, lưu vết câu đã gặp & cập nhật câu sai vào JSON
 */
export async function POST(request) {
  try {
    await ensureDb();
    const data = await request.json();

    const { username, stats } = data;

    if (!username || !Array.isArray(stats)) {
      return NextResponse.json(
        { error: "Dữ liệu yêu cầu không hợp lệ" },
        { status: 400 }
      );
    }

    if (stats.length === 0) {
      return NextResponse.json({ success: true, message: "Không có thống kê để cập nhật." });
    }

    // 1. Lấy danh sách câu hỏi để mapping question_text -> id
    const allQsResult = await client.execute("SELECT id, question FROM questions");
    const qMap = {};
    allQsResult.rows.forEach(q => {
      if (q.question) {
        const cleanText = stripHtml(q.question);
        qMap[cleanText] = q.id;
        qMap[q.question.trim()] = q.id;
      }
    });

    // 2. Lấy dữ liệu stats hiện tại của user
    const userResult = await client.execute({
      sql: "SELECT need_practice_questions, encountered_questions FROM users WHERE username = ?",
      args: [username]
    });

    const userRow = userResult.rows[0];
    if (!userRow) {
      return NextResponse.json({ error: "Không tìm thấy người dùng." }, { status: 404 });
    }

    let needPractice = [];
    try {
      needPractice = JSON.parse(userRow.need_practice_questions || "[]");
      if (!Array.isArray(needPractice)) needPractice = [];
    } catch (e) {
      needPractice = [];
    }

    let encountered = [];
    try {
      encountered = JSON.parse(userRow.encountered_questions || "[]");
      if (!Array.isArray(encountered)) encountered = [];
    } catch (e) {
      encountered = [];
    }

    // 3. Xử lý cập nhật danh sách thống kê câu hỏi
    stats.forEach(s => {
      // Ưu tiên sử dụng ID (UUID) câu hỏi trực tiếp từ client gửi lên để triệt tiêu hoàn toàn lỗi lệch khoảng trắng/HTML
      const cleanStatText = stripHtml(s.question_text || "");
      const qId = s.id || qMap[cleanStatText] || qMap[(s.question_text || "").trim()];

      if (!qId) {
        console.warn(`[Stats Sync Warning]: Không tìm thấy ID cho câu: "${(s.question_text || "").substring(0, 30)}..."`);
        return;
      }

      // Ghi nhận câu hỏi đã gặp: khi người dùng đã trả lời (isAnswered) hoặc đã đi qua (isEncountered)
      if (s.isAnswered || s.isEncountered) {
        if (!encountered.includes(qId)) {
          encountered.push(qId);
        }
      }

      // Chỉ cập nhật tiến trình luyện tập (làm sai/đúng) đối với câu hỏi thực sự đã được trả lời
      if (s.isAnswered) {
        const existingIndex = needPractice.findIndex(item => item.id === qId);

        if (s.isCorrect === false) {
          // Trả lời SAI -> Cộng wrong_count
          if (existingIndex > -1) {
            needPractice[existingIndex].wrong_count += 1;
          } else {
            needPractice.push({ id: qId, wrong_count: 1 });
          }
        } else if (s.isCorrect === true) {
          // Trả lời ĐÚNG -> Xóa vĩnh viễn khỏi danh sách câu sai
          if (existingIndex > -1) {
            needPractice.splice(existingIndex, 1);
          }
        }
      }
    });

    // 4. Lưu lại cả hai mảng JSON vào DB
    await client.execute({
      sql: "UPDATE users SET need_practice_questions = ?, encountered_questions = ? WHERE username = ?",
      args: [JSON.stringify(needPractice), JSON.stringify(encountered), username]
    });

    return NextResponse.json({ success: true, count: stats.length });
  } catch (error) {
    console.error("[API POST Question Stats Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
