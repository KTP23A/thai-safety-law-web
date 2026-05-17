"""
Royal Gazette Scraper — Safety Law Focus
ดึงกฎหมายความปลอดภัยใหม่จากราชกิจจานุเบกษา
"""

import httpx
import asyncio
import hashlib
import json
from pathlib import Path
from datetime import datetime
from bs4 import BeautifulSoup

GAZETTE_BASE = "https://ratchakitchanubeksa.soc.go.th"

SAFETY_KEYWORDS = [
    "ความปลอดภัย", "อาชีวอนามัย", "สภาพแวดล้อมในการทำงาน",
    "เจ้าหน้าที่ความปลอดภัย", "จป.", "คปอ.",
    "อัคคีภัย", "สารเคมีอันตราย", "ที่อับอากาศ",
    "ปั้นจั่น", "หม้อน้ำ", "งานก่อสร้าง",
]

SEEN_FILE = Path(__file__).parent / "seen_documents.json"


def load_seen() -> set:
    if SEEN_FILE.exists():
        return set(json.loads(SEEN_FILE.read_text()))
    return set()


def save_seen(seen: set):
    SEEN_FILE.write_text(json.dumps(list(seen), ensure_ascii=False, indent=2))


def is_safety_related(title: str) -> bool:
    return any(kw in title for kw in SAFETY_KEYWORDS)


async def fetch_new_documents(client: httpx.AsyncClient) -> list[dict]:
    docs = []
    try:
        for keyword in ["ความปลอดภัย", "อาชีวอนามัย", "จป"]:
            resp = await client.get(
                f"{GAZETTE_BASE}/search",
                params={"q": keyword, "type": "law"},
                timeout=30,
            )
            soup = BeautifulSoup(resp.text, "html.parser")
            for item in soup.select(".search-result-item"):
                title_el = item.select_one(".title")
                link_el = item.select_one("a")
                date_el = item.select_one(".date")
                if title_el and link_el:
                    docs.append({
                        "title": title_el.get_text(strip=True),
                        "url": GAZETTE_BASE + link_el["href"],
                        "date": date_el.get_text(strip=True) if date_el else "",
                        "id": hashlib.md5(link_el["href"].encode()).hexdigest(),
                    })
    except Exception as e:
        print(f"[scraper] error: {e}")
    return docs


async def download_pdf(client: httpx.AsyncClient, url: str) -> bytes | None:
    try:
        page = await client.get(url, timeout=30)
        soup = BeautifulSoup(page.text, "html.parser")
        pdf_link = soup.select_one('a[href$=".pdf"]')
        if pdf_link:
            pdf_url = pdf_link["href"]
            if not pdf_url.startswith("http"):
                pdf_url = GAZETTE_BASE + pdf_url
            pdf_resp = await client.get(pdf_url, timeout=60)
            return pdf_resp.content
    except Exception as e:
        print(f"[scraper] PDF error: {e}")
    return None


async def run() -> list[dict]:
    seen = load_seen()
    new_docs = []

    async with httpx.AsyncClient(follow_redirects=True) as client:
        docs = await fetch_new_documents(client)
        for doc in docs:
            if doc["id"] in seen or not is_safety_related(doc["title"]):
                continue
            print(f"[NEW] {doc['title']}")
            pdf_bytes = await download_pdf(client, doc["url"])
            new_docs.append({**doc, "pdf_bytes": pdf_bytes, "found_at": datetime.now().isoformat()})
            seen.add(doc["id"])

    save_seen(seen)
    print(f"[scraper] พบกฎหมายใหม่ {len(new_docs)} ฉบับ")
    return new_docs


if __name__ == "__main__":
    asyncio.run(run())
