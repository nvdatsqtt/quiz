import fs from 'fs';
import path from 'path';

// Manual env loading BEFORE importing turso.js
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            let val = valueParts.join('=').trim();
            // Remove surrounding quotes
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length - 1);
            }
            process.env[key.trim()] = val;
        }
    });
}

// Now import turso.js
const { default: client } = await import('../src/lib/turso.js');

async function backup() {
    console.log("🚀 Đang thực hiện sao lưu bảng questions...");
    try {
        const res = await client.execute("SELECT * FROM questions");
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(process.cwd(), 'backups');
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }
        
        const filePath = path.join(backupDir, `db_backup_questions_${timestamp}.json`);
        const tempPath = path.join(backupDir, `db_temp.json`);
        
        const data = JSON.stringify(res.rows, null, 2);
        fs.writeFileSync(filePath, data);
        fs.writeFileSync(tempPath, data);
        
        console.log(`✅ Sao lưu thành công: ${filePath}`);
        console.log(`✅ File tạm db_temp.json đã được tạo.`);
    } catch (e) {
        console.error("❌ Lỗi sao lưu:", e);
        process.exit(1);
    }
}

backup();
