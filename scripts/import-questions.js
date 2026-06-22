const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');
const crypto = require('crypto');

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

async function importData() {
  try {
    // Đảm bảo các bảng đã được tạo bằng cách thực thi lại (nếu cần) hoặc dựa vào ứng dụng đã tạo
    // Tuy nhiên, để an toàn, ta gọi các lệnh tạo bảng cơ bản (như trong src/lib/turso.js)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        image TEXT
      );
    `);
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,
        question TEXT NOT NULL,
        options TEXT NOT NULL,         
        answer TEXT NOT NULL,          
        hint_text TEXT,                
        hint_status TEXT,              
        hint_pending_text TEXT,        
        hint_updated_by TEXT,          
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      );
    `);

    const dataPath = path.resolve(__dirname, '../public/data/questions.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    for (const subjectData of data.subjects) {
      let subjectId = crypto.randomUUID();
      
      const existingSubject = await client.execute({
        sql: `SELECT id FROM subjects WHERE name = ?`,
        args: [subjectData.name]
      });

      if (existingSubject.rows.length > 0) {
        subjectId = existingSubject.rows[0].id;
        console.log(`Chủ đề '${subjectData.name}' đã tồn tại (ID: ${subjectId}). Đang xóa câu hỏi cũ...`);
        await client.execute({
          sql: `DELETE FROM questions WHERE subject_id = ?`,
          args: [subjectId]
        });
      } else {
        await client.execute({
          sql: `INSERT INTO subjects (id, name, image) VALUES (?, ?, ?)`,
          args: [subjectId, subjectData.name, subjectData.image || '']
        });
        console.log(`Đã tạo chủ đề mới: ${subjectData.name}`);
      }

      let inserted = 0;
      for (const q of subjectData.questions) {
        const qId = crypto.randomUUID();
        await client.execute({
          sql: `INSERT INTO questions (id, subject_id, question, options, answer, hint_text, hint_status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            qId, 
            subjectId, 
            q.question, 
            JSON.stringify(q.options), 
            q.answer,
            q.hint ? JSON.stringify(q.hint) : null,
            q.hint_status || null
          ]
        });
        inserted++;
      }
      console.log(`Đã import ${inserted} câu hỏi cho chủ đề '${subjectData.name}'`);
    }
  } catch (error) {
    console.error("Lỗi khi import:", error);
  }
}

importData();
