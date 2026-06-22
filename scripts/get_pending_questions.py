import json
import argparse
import sys

def main():
    parser = argparse.ArgumentParser(description="Lấy danh sách các câu hỏi chưa có hint.")
    parser.add_argument("--limit", type=int, default=20, help="Số lượng câu hỏi cần lấy (mặc định 20)")
    parser.add_argument("--subject", type=str, default="Hội thi ĐTN", help="Tên chủ đề")
    parser.add_argument("--out", type=str, default=None, help="File xuất ra (định dạng JSON)")
    args = parser.parse_args()

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
    pending = []
    
    for i, q in enumerate(questions):
        if q.get("hint_status") != "done":
            pending.append({
                "index": i,
                "question": q["question"],
                "options": q["options"],
                "answer": q["answer"]
            })
            if len(pending) >= args.limit:
                break
    
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(pending, f, ensure_ascii=False, indent=2)
        print(f"Đã lưu {len(pending)} câu hỏi vào file {args.out}")
    else:
        print(json.dumps(pending, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
