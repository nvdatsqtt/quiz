/**
 * Tác giả: Nguyễn Văn Đạt | Email: nguyenvandatsqtt@gmail.com
 * Mô tả: Script tự động phân tích cú pháp question-bank.md và chuyển đổi sang questions.json
 * Dành riêng cho mục đích ôn luyện nội bộ.
 */

const fs = require('fs');
const path = require('path');

const inputPath = '/mnt/UAV/personal/quiz/question-bank.md';
const outputPath = '/mnt/UAV/personal/quiz/public/data/questions.json';

const content = fs.readFileSync(inputPath, 'utf-8');
const lines = content.split('\n');

const questions = [];
let currentGroup = 'Chung';

let currentQuestion = null;
let currentOptions = [];
let state = 'none'; // 'none', 'question', 'option'

// Hàm làm sạch markdown in đậm, in nghiêng và khoảng trắng thừa
function cleanMarkdown(text) {
  return text.replace(/[\*\_]+/g, '').replace(/\s+/g, ' ').trim();
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  // 1. Kiểm tra xem có phải dòng Nhóm mới không
  // Ví dụ: ***NHÓM: CÁC VĂN BẢN QUÁN TRIỆT*** hoặc **NHÓM: ...**
  const groupMatch = line.match(/^[\*\_]{2,3}NHÓM:\s*(.+?)[\*\_]{2,3}$/i) || 
                     line.match(/^NHÓM:\s*(.+?)$/i) ||
                     line.match(/^\*\*NHÓM:\s*(.+?)\*\*$/i);
  if (groupMatch) {
    saveCurrentQuestion();
    currentGroup = groupMatch[1].trim();
    state = 'none';
    continue;
  }

  // 2. Kiểm tra xem có phải dòng Câu hỏi mới không
  // Ví dụ: **Câu 1: ...** hoặc **Câu 112: ...**
  const questionMatch = line.match(/^\*\*Câu\s*(\d+)\s*:\s*(.+)/i) || 
                        line.match(/^Câu\s*(\d+)\s*:\s*(.+)/i);
  if (questionMatch) {
    saveCurrentQuestion();
    
    const questionNum = questionMatch[1];
    const questionBody = questionMatch[2];
    
    currentQuestion = {
      num: questionNum,
      body: questionBody,
      group: currentGroup
    };
    currentOptions = [];
    state = 'question';
    continue;
  }

  // 3. Kiểm tra xem có phải dòng Phương án mới không
  // Ví dụ: ***a) Mở rộng phạm vi...*** hoặc b) Mở rộng quy mô... hoặc **B. Trở thành...**
  // Bắt đầu bằng a), b), c), d) hoặc A., B., C., D. (có hoặc không có ***, **)
  const optionMatch = line.match(/^([\*\_]{2,3})?([a-dA-D])[\)\.]\s*(.+)/);
  if (optionMatch) {
    saveCurrentOption();

    const leadingDecoration = optionMatch[1] || '';
    const optionChar = optionMatch[2].toUpperCase();
    const optionBody = optionMatch[3];

    // Xác định xem phương án này có chứa đánh dấu đáp án đúng không
    // Thường đáp án đúng sẽ có *** hoặc ** ở đầu/cuối dòng
    let isCorrect = leadingDecoration.length >= 2; 
    
    // Nếu dòng kết thúc bằng *** hoặc ** thì chắc chắn đúng
    if (line.endsWith('***') || line.endsWith('**')) {
      isCorrect = true;
    }
    
    state = 'option';
    currentOptions.push({
      char: optionChar,
      text: optionBody,
      isCorrect: isCorrect
    });
    continue;
  }

  // 4. Nếu là dòng văn bản bình thường (phần tiếp nối do ngắt dòng từ dòng trước)
  if (state === 'question' && currentQuestion) {
    currentQuestion.body += ' ' + line;
  } else if (state === 'option' && currentOptions.length > 0) {
    const lastOpt = currentOptions[currentOptions.length - 1];
    lastOpt.text += ' ' + line;
    
    // Nếu dòng tiếp nối này kết thúc bằng *** hoặc ** thì cập nhật trạng thái đúng
    if (line.endsWith('***') || line.endsWith('**')) {
      lastOpt.isCorrect = true;
    }
  }
}

// Lưu câu hỏi cuối cùng sau khi hết file
saveCurrentQuestion();

function saveCurrentOption() {
  if (state === 'option' && currentOptions.length > 0) {
    const lastOpt = currentOptions[currentOptions.length - 1];
    lastOpt.text = cleanMarkdown(lastOpt.text);
  }
}

function saveCurrentQuestion() {
  saveCurrentOption();
  if (currentQuestion && currentOptions.length > 0) {
    const cleanQuestionText = `[${currentQuestion.group}] Câu ${currentQuestion.num}: ${cleanMarkdown(currentQuestion.body)}`;
    
    let correctText = '';
    const cleanOpts = currentOptions.map(opt => {
      const txt = cleanMarkdown(opt.text);
      if (opt.isCorrect) {
        correctText = txt;
      }
      return txt;
    });

    // Dự phòng nếu không phát hiện được đáp án đúng qua định dạng markdown
    if (!correctText) {
      const foundCorrect = currentOptions.find(o => o.isCorrect);
      if (foundCorrect) {
        correctText = cleanMarkdown(foundCorrect.text);
      } else {
        // Mặc định lấy phương án đầu tiên
        correctText = cleanMarkdown(currentOptions[0].text);
      }
    }

    questions.push({
      question: cleanQuestionText,
      options: cleanOpts,
      answer: correctText
    });
    
    currentQuestion = null;
    currentOptions = [];
  }
}

// Đảm bảo thư mục đích tồn tại
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

// Ghi đè file questions.json
const outputData = {
  subjects: [
    {
      name: "Kiểm tra chính trị 2026",
      image: "/images/quiz.png",
      questions: questions
    }
  ]
};

fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 4), 'utf-8');
console.log(`SUCCESS: Imported ${questions.length} questions into ${outputPath}!`);
