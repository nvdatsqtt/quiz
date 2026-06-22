import json
import argparse
import sys
import re

def main():
    parser = argparse.ArgumentParser(description="Áp dụng hints từ file Markdown hoặc JSON vào public/data/questions.json")
    parser.add_argument("input_file", type=str, help="File chứa dữ liệu hint (Markdown chứa block JSON hoặc file JSON thuần)")
    parser.add_argument("--subject", type=str, default="Hội thi ĐTN", help="Tên chủ đề")
    args = parser.parse_args()

    # Đọc nội dung file input
    try:
        with open(args.input_file, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Không tìm thấy file: {args.input_file}")
        sys.exit(1)

    # Nếu là Markdown, cố gắng trích xuất block JSON
    if args.input_file.endswith(".md"):
        match = re.search(r'```json\s+(.*?)\s+```', content, re.DOTALL)
        if match:
            json_str = match.group(1)
        else:
            print("Không tìm thấy block JSON trong file Markdown.")
            sys.exit(1)
    else:
        json_str = content

    try:
        updates = json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"Lỗi parse JSON: {e}")
        sys.exit(1)

    if not isinstance(updates, list):
        print("Dữ liệu JSON phải là một mảng (list) các object có dạng {'index': ..., 'hint': ...}")
        sys.exit(1)

    # Đọc questions.json
    try:
        with open("public/data/questions.json", "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print("Không tìm thấy file public/data/questions.json")
        sys.exit(1)

    subject_idx = -1
    for i, s in enumerate(data.get("subjects", [])):
        if s.get("name") == args.subject:
            subject_idx = i
            break

    if subject_idx == -1:
        print(f"Không tìm thấy chủ đề: {args.subject}")
        sys.exit(1)

    questions = data["subjects"][subject_idx]["questions"]
    updated_count = 0

    for update in updates:
        idx = update.get("index")
        hint = update.get("hint")
        if idx is not None and hint is not None:
            if 0 <= idx < len(questions):
                questions[idx]["hint"] = hint
                questions[idx]["hint_status"] = "done"
                updated_count += 1
            else:
                print(f"Index {idx} vượt quá giới hạn số câu hỏi.")
        else:
            print(f"Cấu trúc cập nhật không hợp lệ: {update}")

    # Ghi lại file
    with open("public/data/questions.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Đã cập nhật thành công {updated_count} câu hỏi.")
    pending_count = sum(1 for q in questions if q.get("hint_status") != "done")
    print(f"Số câu hỏi còn lại chưa xử lý: {pending_count}")

if __name__ == "__main__":
    main()
