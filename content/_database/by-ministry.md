---
title: "กฎหมายแยกตามกระทรวง"
cssclasses: [ministry-page]
---

# 🏛 กฎหมายความปลอดภัย — แยกตามกระทรวง

---

## 📊 สรุปจำนวนตามกระทรวง

```dataview
TABLE WITHOUT ID
  ministry AS "กระทรวง",
  length(rows) AS "จำนวน (ฉบับ)"
FROM ""
WHERE ministry
GROUP BY ministry
SORT length(rows) DESC
```

---

## 🟦 กระทรวงแรงงาน

```dataview
TABLE WITHOUT ID
  file.link AS "กฎหมาย",
  law_type AS "ประเภท",
  gazette_date AS "วันประกาศ",
  status AS "สถานะ"
FROM ""
WHERE ministry = "กระทรวงแรงงาน"
SORT gazette_date DESC
```

---

## 🟧 กระทรวงอุตสาหกรรม

```dataview
TABLE WITHOUT ID
  file.link AS "กฎหมาย",
  law_type AS "ประเภท",
  gazette_date AS "วันประกาศ",
  status AS "สถานะ"
FROM ""
WHERE ministry = "กระทรวงอุตสาหกรรม"
SORT gazette_date DESC
```

---

## 🔗 Cross-reference — กฎหมายที่เกี่ยวพันระหว่างกระทรวง

```dataview
TABLE WITHOUT ID
  file.link AS "กฎหมาย",
  ministry AS "กระทรวง",
  law_type AS "ประเภท"
FROM ""
WHERE ministry AND (
  contains(tags, "สารเคมี") OR 
  contains(tags, "chemical") OR 
  contains(tags, "อัคคีภัย") OR 
  contains(tags, "fire") OR
  contains(tags, "ไฟฟ้า") OR
  contains(tags, "electrical")
)
SORT ministry ASC
```
