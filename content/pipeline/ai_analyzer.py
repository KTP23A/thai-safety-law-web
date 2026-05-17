"""
AI Analyzer — วิเคราะห์กฎหมายความปลอดภัยด้วย Claude
"""

import anthropic
import pdfplumber
import json
import re
from pathlib import Path
from datetime import datetime
from io import BytesIO

client = anthropic.Anthropic()

SYSTEM_PROMPT = """คุณคือผู้เชี่ยวชาญด้านกฎหมายความปลอดภัยและอาชีวอนามัยของไทย
วิเคราะห์เอกสารกฎหมายและสกัดข้อมูลออกมาในรูปแบบ JSON ที่ถูกต้องเสมอ
ตอบเป็น JSON เท่านั้น ไม่มีข้อความอื่น"""

ANALYSIS_PROMPT = """วิเคราะห์กฎหมายความปลอดภัยในการทำงานต่อไปนี้ แล้วตอบเป็น JSON:

```
{law_text}
```

โครงสร้าง JSON ที่ต้องการ:
{{
  "title": "ชื่อกฎหมายเต็ม",
  "law_type": "พระราชบัญญัติ หรือ กฎกระทรวง หรือ ประกาศกระทรวง",
  "year_be": 0000,
  "effective_date": "YYYY-MM-DD หรือ null",
  "gazette_date": "YYYY-MM-DD หรือ null",
  "topic": "หัวข้อหลัก เช่น อัคคีภัย / สารเคมี / ที่อับอากาศ / จป.",
  "summary_th": "สรุปสาระสำคัญ 3-5 ประโยค ภาษาเข้าใจง่าย",
  "key_actions": [
    "action item ที่ชัดเจน เช่น นายจ้างต้องทำ X ภายใน Y"
  ],
  "who_is_affected": {{
    "employers": "สิ่งที่นายจ้างต้องทำ",
    "employees": "สิทธิและหน้าที่ลูกจ้าง",
    "government": "หน่วยงานรัฐที่เกี่ยวข้อง"
  }},
  "penalties": "บทลงโทษหากฝ่าฝืน",
  "key_standards": [
    {{"item": "รายการ", "requirement": "ค่ามาตรฐาน/ข้อกำหนด"}}
  ],
  "relationships": {{
    "parent_law": "กฎหมายแม่ที่ออกภายใต้",
    "amends": ["กฎหมายที่แก้ไข"],
    "repeals": ["กฎหมายที่ยกเลิก"],
    "related": ["กฎหมายที่เชื่อมโยง"]
  }},
  "key_sections": [
    {{"section": "มาตรา X", "content": "สาระสำคัญ"}}
  ],
  "confidence": 0
}}"""


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    text_parts = []
    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages[:20]:
            text = page.extract_text()
            if text:
                text_parts.append(text)
    return "\n".join(text_parts)


def analyze_law(pdf_bytes: bytes, title: str = "") -> dict:
    print(f"[AI] วิเคราะห์: {title or 'unknown'}")
    law_text = extract_text_from_pdf(pdf_bytes)
    if not law_text.strip():
        return {"error": "ไม่สามารถอ่านข้อความจาก PDF ได้", "title": title}

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": ANALYSIS_PROMPT.format(law_text=law_text[:8000])}],
    )

    raw = response.content[0].text.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        result = json.loads(raw)
        result["analyzed_at"] = datetime.now().isoformat()
        result["source_title"] = title
        return result
    except json.JSONDecodeError:
        return {"error": "JSON parse failed", "raw": raw, "title": title}


def to_obsidian_markdown(data: dict, gazette_url: str = "") -> str:
    if "error" in data:
        return f"# Error\n{data.get('error')}"

    title = data.get("title", "")
    law_type = data.get("law_type", "")
    year_be = data.get("year_be", "")
    topic = data.get("topic", "")
    summary = data.get("summary_th", "")
    confidence = data.get("confidence", 0)
    analyzed_at = data.get("analyzed_at", "")

    actions = "\n".join(f"- [ ] {a}" for a in data.get("key_actions", []))
    affected = data.get("who_is_affected", {})
    rels = data.get("relationships", {})
    parent = rels.get("parent_law", "[[พ.ร.บ.ความปลอดภัยอาชีวอนามัยฯ-2554]]")
    related = "\n".join(f"- [[{r}]]" for r in rels.get("related", [])) or "- (ไม่มี)"

    standards = data.get("key_standards", [])
    std_table = "\n".join(f"| {s.get('item','')} | {s.get('requirement','')} |" for s in standards)
    std_section = f"## ค่ามาตรฐานสำคัญ\n| รายการ | ข้อกำหนด |\n|--------|----------|\n{std_table}\n" if std_table else ""

    sections = data.get("key_sections", [])
    sec_rows = "\n".join(f"| {s.get('section','')} | {s.get('content','')} |" for s in sections)
    sec_table = f"| มาตรา | เนื้อหาสำคัญ |\n|-------|-------------|\n{sec_rows}" if sec_rows else ""

    tags = json.dumps([law_type, "safety", topic, "ai-analyzed"], ensure_ascii=False)

    return f"""---
title: "{title}"
law_type: "{law_type}"
year_be: {year_be}
topic: "{topic}"
department: "กระทรวงแรงงาน"
effective_date: "{data.get('effective_date', '')}"
gazette_date: "{data.get('gazette_date', '')}"
status: "มีผลบังคับใช้"
tags: {tags}
---

# {title}

## สรุปสาระสำคัญ
{summary}

## ประเด็นสำคัญที่ต้องปฏิบัติ
{actions}

## ผู้ที่เกี่ยวข้อง
- **นายจ้าง:** {affected.get('employers', '')}
- **ลูกจ้าง:** {affected.get('employees', '')}
- **หน่วยงานรัฐ:** {affected.get('government', '')}

## บทลงโทษ
{data.get('penalties', '')}

{std_section}

## ความสัมพันธ์กับกฎหมายอื่น

### อ้างอิง / ออกตาม
- {parent}

### เชื่อมโยงกับ
{related}

## มาตราสำคัญ
{sec_table}

## เอกสารต้นฉบับ
- [ราชกิจจานุเบกษา]({gazette_url})

## บันทึกการวิเคราะห์ (AI)
> วิเคราะห์โดย Claude AI เมื่อ {analyzed_at} | ความเชื่อมั่น: {confidence}%
"""


def save_to_vault(data: dict, vault_root: Path, gazette_url: str = "") -> Path:
    law_type = data.get("law_type", "กฎกระทรวง")
    folder_map = {"พระราชบัญญัติ": "พระราชบัญญัติ", "กฎกระทรวง": "กฎกระทรวง", "ประกาศกระทรวง": "ประกาศกรมสวัสดิการฯ"}
    folder = vault_root / folder_map.get(law_type, "กฎกระทรวง")
    folder.mkdir(exist_ok=True)

    title = data.get("title", "unknown")
    safe = re.sub(r'[\\/*?:"<>|]', "", title)[:80]
    path = folder / f"{safe}.md"
    path.write_text(to_obsidian_markdown(data, gazette_url), encoding="utf-8")
    print(f"[vault] บันทึก: {path}")
    return path


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        pdf_path = Path(sys.argv[1])
        result = analyze_law(pdf_path.read_bytes(), pdf_path.stem)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        save_to_vault(result, Path(__file__).parent.parent)
    else:
        print("Usage: python ai_analyzer.py <pdf_file>")
