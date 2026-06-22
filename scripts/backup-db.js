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

async function backup() {
  try {
    console.log("Đang tải dữ liệu từ Turso DB để sao lưu...");
    
    // Kiểm tra xem bảng có tồn tại không trước khi query
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
    const tableNames = tables.rows.map(r => r.name);
    
    let subjects = [];
    let questions = [];
    
    if (tableNames.includes('subjects')) {
      const res = await client.execute("SELECT * FROM subjects");
      subjects = res.rows;
    }
    
    if (tableNames.includes('questions')) {
      const res = await client.execute("SELECT * FROM questions");
      questions = res.rows;
    }
    
    const backupData = {
      timestamp: new Date().toISOString(),
      subjects,
      questions
    };
    
    const backupDir = path.resolve(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    // Tạo file backup tạm thời theo chính sách db-backup-policy.md
    const backupPath = path.join(backupDir, `db_backup_${Date.now()}.json`);
    const tempBackupPath = path.join(backupDir, 'db_temp.json');
    
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
    fs.writeFileSync(tempBackupPath, JSON.stringify(backupData, null, 2), 'utf-8');
    
    console.log(`Sao lưu thành công!`);
    console.log(`- Bản lưu lịch sử: ${backupPath}`);
    console.log(`- Bản lưu tạm (temp): ${tempBackupPath}`);
  } catch (error) {
    console.error("Lỗi khi sao lưu dữ liệu:", error);
    process.exit(1);
  }
}

backup();
