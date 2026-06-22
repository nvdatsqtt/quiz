import re
import json

with open("backups/Doan-thanh-nien-output.md", "r", encoding="utf-8") as f:
    text = f.read()

# Tách thành các blocks dựa vào chữ Câu
blocks = re.split(r'(?=(?:\*\*)?Câu\s*\d+[\.\:])', text)

questions = []
for block in blocks:
    if "Câu " not in block:
        continue
        
    # Câu 51. Theo Hồ Chí Minh... gì?** A. Kinh tế\nB. Quân đội **C. Nhân dân** D. Chính phủ
    # Xử lý để đưa A, B, C, D xuống dòng
    block = block.strip()
    
    # Tìm question text (từ chữ Câu đến trước A, B, C, D đầu tiên)
    # Rất khó nếu A, B, C nằm chung hàng
    
    # Chuẩn hóa: thêm newline trước các lựa chọn A., B., C., D. (có hoặc không có **)
    block = re.sub(r'(?<!\n)(\s*)(\*\*)?([A-D])[\.\:]\s*', r'\n\2\3. ', block)
    
    lines = block.split('\n')
    q_text = ""
    opts = []
    ans = ""
    
    for line in lines:
        line = line.strip()
        if not line: continue
        
        if re.match(r'^(?:\*\*)?Câu\s*\d+', line):
            # remove "Câu X."
            q = re.sub(r'^(?:\*\*)?Câu\s*\d+[\.\:]\s*', '', line)
            # remove trailing **
            if q.endswith('**'): q = q[:-2]
            q_text += q + "\n"
        elif re.match(r'^(?:\*\*)?[A-D]\.', line):
            is_correct = "**" in line
            line = line.replace("**", "").strip()
            opts.append(line)
            if is_correct:
                ans = line
        else:
            if not opts:
                if line.endswith('**'): line = line[:-2]
                q_text += line + "\n"
                
    q_text = q_text.strip()
    if q_text and opts:
        if not ans: ans = opts[0]
        questions.append({
            "question": q_text,
            "options": opts,
            "answer": ans
        })

print(f"Parsed {len(questions)} questions")
for q in questions[:3]:
    print(q)
