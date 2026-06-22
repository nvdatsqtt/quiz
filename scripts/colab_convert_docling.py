import json
import re
from docling.document_converter import DocumentConverter

"""
Chuyển đổi file DOCX sang định dạng Markdown sử dụng Docling, 
sau đó trích xuất thông tin câu hỏi trắc nghiệm và xuất ra file JSON.

Input: File DOCX chứa câu hỏi
Output: File `questions.json` phù hợp với schema database hiện tại và `output.md` chứa nội dung gốc
"""

def extract_questions_from_markdown(md_text):
    """
    Phân tích cú pháp văn bản Markdown để trích xuất danh sách câu hỏi.
    
    @params:
        md_text (str): Văn bản Markdown cần phân tích (kết quả từ Docling)
    @returns:
        list: Danh sách các dictionary chứa thông tin câu hỏi (question, options, answer)
    """
    questions_list = []
    
    # Chia nhỏ văn bản dựa trên từ khóa "Câu [số]:" hoặc "Câu [số]."
    # NOTE: Nếu định dạng văn bản gốc không dùng "Câu X", cần điều chỉnh regex này.
    blocks = re.split(r'\n(?=Câu\s*\d+[\.\:])', md_text, flags=re.IGNORECASE)
    
    for block in blocks:
        block = block.strip()
        if not block.lower().startswith("câu"):
            continue
            
        lines = block.split('\n')
        question_text = ""
        options = []
        answer = ""
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Xử lý dòng tiêu đề câu hỏi
            if re.match(r'^Câu\s*\d+[\.\:]', line, re.IGNORECASE):
                # Loại bỏ chữ "Câu X:" ở đầu
                question_text += re.sub(r'^Câu\s*\d+[\.\:]\s*', '', line, flags=re.IGNORECASE) + "\n"
                
            # Xử lý các dòng đáp án (A, B, C, D)
            # WARNING: Docling có thể parse in đậm thành **A. Nội dung**
            elif re.match(r'^(?:\*\*)?[A-D][\.\:]', line, re.IGNORECASE):
                is_correct = False
                
                # Giả định đáp án đúng được bôi đậm (có ký tự **)
                if "**" in line:
                    is_correct = True
                    line = line.replace("**", "")
                
                # Giả định đáp án đúng được highlight/đánh dấu bằng thẻ HTML (nếu có)
                if "<mark>" in line or "<u>" in line:
                    is_correct = True
                    line = re.sub(r'<[^>]+>', '', line)
                    
                options.append(line)
                
                # Lưu đáp án đúng
                if is_correct:
                    answer = line
            else:
                # Nếu chưa có đáp án nào, đây vẫn là nội dung câu hỏi đang nối tiếp
                if len(options) == 0:
                    question_text += line + "\n"
        
        question_text = question_text.strip()
        
        # FIXME: Nếu regex chưa nhận dạng được đáp án đúng (answer rỗng), 
        # tạm thời gán bằng đáp án đầu tiên hoặc để trống tùy theo logic dự phòng.
        if question_text and options:
            if not answer:
                answer = options[0] 
                
            questions_list.append({
                "question": question_text,
                "options": options,
                "answer": answer
            })
            
    return questions_list


def main():
    # File đường dẫn khi tải lên Colab
    docx_path = "Cau-hoi-Hoi-thi-Bi_thu_doan.docx"
    
    print("1. Đang khởi tạo Docling DocumentConverter...")
    converter = DocumentConverter()
    
    print(f"2. Đang đọc và chuyển đổi tệp {docx_path}...")
    result = converter.convert(docx_path)
    md_text = result.document.export_to_markdown()
    
    # Ghi file MD để đối chiếu nếu JSON parse bị sai
    with open("output.md", "w", encoding="utf-8") as f:
        f.write(md_text)
    print("   -> Đã lưu bản sao Markdown vào output.md")
    
    print("3. Đang trích xuất câu hỏi từ văn bản...")
    extracted_questions = extract_questions_from_markdown(md_text)
    
    # Format dữ liệu theo đúng chuẩn import-questions.js
    output_data = {
        "subjects": [
            {
                "name": "Hội thi Bí thư chi đoàn",
                "image": "",
                "questions": extracted_questions
            }
        ]
    }
    
    print(f"4. Đang lưu {len(extracted_questions)} câu hỏi vào file questions.json...")
    with open("questions.json", "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
        
    print("Hoàn tất! Hãy copy file questions.json đè vào public/data/questions.json")


if __name__ == "__main__":
    main()
