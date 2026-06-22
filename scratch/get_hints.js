const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) envVars[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
});

const client = createClient({ url: envVars.TURSO_DATABASE_URL, authToken: envVars.TURSO_DATABASE_TURSO_AUTH_TOKEN });

async function getHints() {
  const res = await client.execute(`
    SELECT q.question, q.answer, q.hint_text 
    FROM questions q 
    JOIN subjects s ON q.subject_id = s.id 
    WHERE s.name = 'Kiểm tra chính trị 2026' AND q.hint_text IS NOT NULL AND q.hint_text != ''
    LIMIT 20
  `);
  console.log(JSON.stringify(res.rows, null, 2));
}
getHints();
