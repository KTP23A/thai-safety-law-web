---
title: "Timeline กฎหมายความปลอดภัย"
cssclasses: [timeline-page]
---

# 📅 Timeline กฎหมายความปลอดภัย

---

## 📊 จำนวนกฎหมายแยกตามปี

```dataview
TABLE WITHOUT ID
  year_be AS "ปี พ.ศ.",
  length(rows) AS "จำนวน (ฉบับ)",
  join(map(sort(rows, (r) => r.gazette_date), (r) => r.file.link), ", ") AS "กฎหมาย"
FROM ""
WHERE year_be AND ministry
GROUP BY year_be
SORT year_be DESC
```

---

## 📋 รายชื่อกฎหมายทั้งหมด เรียงตามวันที่ประกาศ

```dataview
TABLE WITHOUT ID
  file.link AS "กฎหมาย",
  ministry AS "กระทรวง",
  law_type AS "ประเภท",
  gazette_date AS "วันประกาศ",
  status AS "สถานะ"
FROM ""
WHERE gazette_date AND ministry
SORT gazette_date DESC
```

---

## 🔢 สรุปจำนวนตามประเภท

```dataview
TABLE WITHOUT ID
  law_type AS "ประเภท",
  length(rows) AS "จำนวน (ฉบับ)"
FROM ""
WHERE law_type AND ministry
GROUP BY law_type
SORT length(rows) DESC
```
