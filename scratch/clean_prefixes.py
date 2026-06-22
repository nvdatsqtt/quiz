import json
import re

with open("public/data/questions.json", "r", encoding="utf-8") as f:
    data = json.load(f)

count = 0
for subject in data["subjects"]:
    if subject["name"] == "Hội thi ĐTN":
        for q in subject["questions"]:
            # Loại bỏ tiền tố A., B., C., D. ở đầu chuỗi đáp án và lựa chọn
            q["answer"] = re.sub(r'^[A-D][\.\:]\s*', '', q["answer"]).strip()
            q["options"] = [re.sub(r'^[A-D][\.\:]\s*', '', opt).strip() for opt in q["options"]]
            count += 1

with open("public/data/questions.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Đã làm sạch tiền tố cho {count} câu hỏi.")
