/**
 * Tác giả: Nguyễn Văn Đạt | Email: nguyenvandatsqtt@gmail.com
 * Mô tả: Script tự động so sánh ngân hàng câu hỏi gốc tại question-bank.md với dữ liệu trong database Turso.
 * Giúp phát hiện lệch câu hỏi, sai đáp án đúng do các bug trước đó hoặc do xáo trộn.
 * 
 * Cách chạy: node scripts/compare-questions.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

// 1. Hàm làm sạch text để so sánh (bỏ markdown, khoảng trắng, viết thường)
function cleanText(text) {
  if (!text) return '';
  return text
    .toString()
    .replace(/\*\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/___/g, '')
    .replace(/__/g, '')
    .replace(/_/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/[\.\,\?\"\'\“\”\’\-\–\—\:\;]/g, '') // Bỏ dấu câu
    .replace(/\s+/g, ' ')                        // Gom khoảng trắng thừa
    .trim()
    .toLowerCase();
}

// 2. Hàm phân tích cú pháp file question-bank.md
function parseMarkdownBank(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const questions = [];
  let currentQuestion = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Bỏ qua các dòng nhóm/tiêu đề như "***NHÓM:..." hoặc "**NHÓM:..."
    if (line.match(/^\**NHÓM\s*:/i)) {
      continue;
    }

    // Phát hiện dòng câu hỏi: ví dụ "**Câu 1: ..." hoặc "**Câu 1:..."
    const questionMatch = line.match(/^\*\*Câu\s+(\d+)\s*:\s*(.*)$/i);
    if (questionMatch) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      let qText = questionMatch[2];
      if (qText.endsWith('**')) {
        qText = qText.slice(0, -2);
      }
      currentQuestion = {
        number: parseInt(questionMatch[1]),
        question: qText.trim(),
        options: [],
        answer: '',
        lastOptionWasAnswer: false // Flag để biết dòng gộp tiếp theo có thuộc đáp án đúng không
      };
      continue;
    }

    if (currentQuestion) {
      // Nhận diện phương án lựa chọn: a), b), c), d) hoặc A., B., C., D.
      // Loại bỏ tiền tố định dạng markdown để so khớp regex
      const cleanLineForMatch = line.replace(/^\*+|_+/g, '').trim();
      const optionMatch = cleanLineForMatch.match(/^([a-d])[\)\.]\s*(.*)$/i);
      
      if (optionMatch) {
        let optText = optionMatch[2];
        // Loại bỏ markdown ở cuối
        optText = optText.replace(/\*+$/g, '').replace(/_+$/g, '').trim();

        currentQuestion.options.push(optText);

        // Nhận diện đáp án đúng bằng ký tự *** hoặc ** ở đầu phương án
        const isBoldAndItalic = line.startsWith('***');
        const isBoldOnly = line.startsWith('**') && !line.startsWith('**Câu');
        
        if (isBoldAndItalic || isBoldOnly) {
          currentQuestion.answer = optText;
          currentQuestion.lastOptionWasAnswer = true;
        } else {
          currentQuestion.lastOptionWasAnswer = false;
        }
      } else {
        // Dòng này không phải phương án mới nhưng currentQuestion đang active
        // Nó có thể là dòng bổ sung (xuống dòng của phương án trước đó)
        if (currentQuestion.options.length > 0) {
          const lastIdx = currentQuestion.options.length - 1;
          let extraText = line.replace(/\*+$/g, '').replace(/_+$/g, '').trim();
          
          currentQuestion.options[lastIdx] += ' ' + extraText;
          
          // Nếu phương án trước đó là đáp án đúng, gộp luôn vào answer
          if (currentQuestion.lastOptionWasAnswer) {
            currentQuestion.answer += ' ' + extraText;
          }
        }
      }
    }
  }

  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  // Làm sạch các thẻ markdown trong câu hỏi và options sau khi đã parse xong
  questions.forEach(q => {
    q.question = cleanMarkdownText(q.question);
    q.answer = cleanMarkdownText(q.answer);
    q.options = q.options.map(opt => cleanMarkdownText(opt));
  });

  return questions;
}

function cleanMarkdownText(text) {
  if (!text) return '';
  return text
    .replace(/\*\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/___/g, '')
    .replace(/__/g, '')
    .replace(/_/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

// 3. Kết nối Database Turso qua .env.local
const envPath = path.resolve(__dirname, '../.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf-8');
} catch (e) {
  console.error("❌ Không tìm thấy file .env.local chứa cấu hình database!");
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
  console.error("❌ Thiếu cấu hình TURSO_DATABASE_URL hoặc TURSO_DATABASE_TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function compare() {
  console.log("=== 🚀 Bắt đầu quá trình đối chiếu dữ liệu câu hỏi ===");
  
  // A. Đọc và parse ngân hàng câu hỏi gốc question-bank.md
  const bankPath = path.resolve(__dirname, '../question-bank.md');
  if (!fs.existsSync(bankPath)) {
    console.error(`❌ Không tìm thấy file gốc tại: ${bankPath}`);
    return;
  }
  
  console.log("1. Đang đọc và phân tích file question-bank.md...");
  const originalQuestions = parseMarkdownBank(bankPath);
  console.log(`👉 Tìm thấy ${originalQuestions.length} câu hỏi gốc trong file markdown.`);

  // B. Đọc tất cả câu hỏi từ database Turso
  console.log("2. Đang kết nối và lấy dữ liệu câu hỏi từ Turso Database...");
  let dbQuestions = [];
  try {
    const result = await client.execute("SELECT id, question, options, answer, hint_text FROM questions");
    dbQuestions = result.rows;
    console.log(`👉 Lấy thành công ${dbQuestions.length} câu hỏi từ database.`);
  } catch (err) {
    console.error("❌ Lỗi khi truy vấn database:", err);
    return;
  }

  // C. Tiến hành đối chiếu
  console.log("3. Đang tiến hành đối chiếu từng câu hỏi...");
  let matchCount = 0;
  let mismatchAnswerCount = 0;
  let notFoundCount = 0;
  const reports = [];

  for (const dbQ of dbQuestions) {
    const dbQuestionClean = cleanText(dbQ.question);
    
    // Tìm câu hỏi gốc tương thích nhất bằng so khớp text
    const matchedOriginal = originalQuestions.find(origQ => {
      const origQuestionClean = cleanText(origQ.question);
      // So khớp chính xác hoặc câu này là con của câu kia (tránh sai lệch ký tự đặc biệt)
      return origQuestionClean === dbQuestionClean || 
             origQuestionClean.includes(dbQuestionClean) || 
             dbQuestionClean.includes(origQuestionClean);
    });

    if (matchedOriginal) {
      matchCount++;
      
      // So sánh đáp án đúng
      const dbAnswerClean = cleanText(dbQ.answer);
      const origAnswerClean = cleanText(matchedOriginal.answer);

      if (dbAnswerClean !== origAnswerClean) {
        mismatchAnswerCount++;
        reports.push({
          type: "LỆCH ĐÁP ÁN",
          number: matchedOriginal.number,
          question: matchedOriginal.question,
          dbAnswer: dbQ.answer,
          originalAnswer: matchedOriginal.answer
        });
      }
    } else {
      notFoundCount++;
      reports.push({
        type: "KHÔNG TÌM THẤY TRONG GỐC",
        question: dbQ.question,
        dbAnswer: dbQ.answer
      });
    }
  }

  // D. In báo cáo
  console.log("\n=== 📊 KẾT QUẢ ĐỐI CHIẾU ===");
  console.log(`- Số câu trùng khớp hoàn toàn nội dung: ${matchCount}/${dbQuestions.length}`);
  console.log(`- Số câu bị LỆCH ĐÁP ÁN ĐÚNG: ${mismatchAnswerCount}`);
  console.log(`- Số câu trong DB không tìm thấy trong file gốc: ${notFoundCount}`);
  
  if (reports.length > 0) {
    console.log("\n❌ CHI TIẾT CÁC LỖI PHÁT HIỆN:");
    reports.forEach((rep, index) => {
      if (rep.type === "LỆCH ĐÁP ÁN") {
        console.log(`\n[Lỗi #${index + 1}] Lệch đáp án đúng ở Câu ${rep.number}:`);
        console.log(`👉 Câu hỏi: "${rep.question}"`);
        console.log(`❌ Trong Database: "${rep.dbAnswer}"`);
        console.log(`✅ Trong File gốc: "${rep.originalAnswer}"`);
      } else if (rep.type === "KHÔNG TÌM THẤY TRONG GỐC") {
        console.log(`\n[Lỗi #${index + 1}] Câu hỏi trong DB không khớp với file gốc:`);
        console.log(`👉 Câu hỏi DB: "${rep.question}"`);
        console.log(`👉 Đáp án DB:  "${rep.dbAnswer}"`);
      }
    });
  } else {
    console.log("\n✅ TUYỆT VỜI! Không phát hiện bất kỳ sự sai lệch đáp án nào giữa Database và file gốc markdown.");
  }
  
  process.exit(reports.length > 0 ? 1 : 0);
}

compare();
