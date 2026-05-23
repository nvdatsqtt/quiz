const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

// Đọc cấu hình từ .env.local
const envPath = path.resolve(__dirname, '../.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf-8');
} catch (e) {
  console.error("Không tìm thấy file .env.local");
  process.exit(1);
}

const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    envVars[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
});

const url = envVars.TURSO_DATABASE_URL;
const authToken = envVars.TURSO_DATABASE_TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Thiếu TURSO_DATABASE_URL hoặc TURSO_DATABASE_TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function clearStats() {
  try {
    // Đảm bảo cột encountered_questions tồn tại
    try {
      await client.execute("ALTER TABLE users ADD COLUMN encountered_questions TEXT;");
      console.log("Đã thêm cột encountered_questions vào bảng users thành công!");
    } catch(e) {
      // Bỏ qua nếu cột đã tồn tại
    }

    await client.execute("UPDATE users SET need_practice_questions = '[]', encountered_questions = '[]';");
    console.log("Đã dọn dẹp sạch sẽ toàn bộ câu hỏi sai (need_practice_questions) và câu hỏi đã gặp (encountered_questions) của tất cả học viên!");
  } catch (error) {
    console.error("Lỗi khi dọn dẹp dữ liệu:", error);
  }
}

clearStats();
