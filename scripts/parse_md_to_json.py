import re
import json

def parse_md_to_json(md_path, json_path):
    with open(md_path, "r", encoding="utf-8") as f:
        text = f.read()

    # Tách văn bản thành các khối tương ứng với từng câu hỏi
    blocks = re.split(r'(?=(?:\*\*)?Câu\s*\d+[\.\:])', text)

    questions = []
    for block in blocks:
        if "Câu " not in block:
            continue
            
        block = block.strip()
        
        # Tiền xử lý: Có nhiều đáp án A, B, C, D nằm cùng một dòng,
        # regex này sẽ tách chúng xuống dòng mới để dễ phân tích
        block = re.sub(r'(?<!\n)(\s*)(\*\*)?([A-D])[\.\:]\s*', r'\n\2\3. ', block)
        
        lines = block.split('\n')
        q_text = ""
        opts = []
        ans = ""
        
        for line in lines:
            line = line.strip()
            if not line: continue
            
            # Nếu là dòng tiêu đề câu hỏi
            if re.match(r'^(?:\*\*)?Câu\s*\d+', line):
                q = re.sub(r'^(?:\*\*)?Câu\s*\d+[\.\:]\s*', '', line)
                if q.endswith('**'): q = q[:-2]
                q_text += q + "\n"
                
            # Nếu là dòng đáp án
            elif re.match(r'^(?:\*\*)?[A-D]\.', line):
                is_correct = "**" in line
                line = line.replace("**", "").strip()
                opts.append(line)
                if is_correct:
                    ans = line
                    
            # Nếu là nội dung nối tiếp của câu hỏi
            else:
                if not opts:
                    if line.endswith('**'): line = line[:-2]
                    q_text += line + "\n"
                    
        q_text = q_text.strip()
        if q_text and opts:
            # Gán đáp án mặc định nếu chưa tìm thấy ký hiệu in đậm (hoặc do định dạng lỗi)
            if not ans: ans = opts[0]
            questions.append({
                "question": q_text,
                "options": opts,
                "answer": ans
            })

    output_data = {
        "subjects": [
            {
                "name": "Hội thi Bí thư chi đoàn",
                "image": "",
                "questions": questions
            }
        ]
    }

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"Đã xử lý thành công {len(questions)} câu hỏi và lưu vào {json_path}")

if __name__ == "__main__":
    parse_md_to_json("backups/Doan-thanh-nien-output.md", "public/data/questions.json")
