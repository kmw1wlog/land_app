import json
import sqlite3
import sys
import time
from pathlib import Path

DB_PATH = Path("prisma/dev.db")
SOURCE = Path(sys.argv[1] if len(sys.argv) > 1 else "data/legal-dong/legal-dong-code-full.txt")


def decode_text(path: Path) -> str:
    data = path.read_bytes()
    for encoding in ("utf-8", "cp949", "euc-kr"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def cuid_like(index: int) -> str:
    return f"legal_dong_{int(time.time())}_{index:05d}"


def parse_rows(text: str):
    rows = []
    lines = [line for line in text.splitlines() if line.strip()]
    if lines and ("법정동코드" in lines[0] or "code" in lines[0].lower()):
        lines = lines[1:]
    for index, line in enumerate(lines):
        parts = [part.strip() for part in line.split("\t")]
        if len(parts) < 2 or not parts[0].isdigit() or len(parts[0]) != 10:
            continue
        code10 = parts[0]
        full_name = parts[1]
        status = parts[2] if len(parts) > 2 else "존재"
        names = full_name.split()
        row = {
            "id": cuid_like(index),
            "code10": code10,
            "lawdCode5": code10[:5],
            "sido": names[0] if len(names) > 0 else None,
            "sigungu": names[1] if len(names) > 1 else None,
            "eupmyeon": names[2] if len(names) > 2 else None,
            "ri": " ".join(names[3:]) or None,
            "fullName": full_name,
            "isActive": 0 if "폐지" in status else 1,
            "raw": json.dumps({"source": str(SOURCE), "line": line}, ensure_ascii=False),
        }
        rows.append(row)
    return rows


def main():
    rows = parse_rows(decode_text(SOURCE))
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.executemany(
        """
        INSERT INTO LegalDongCode (
          id, code10, lawdCode5, sido, sigungu, eupmyeon, ri, fullName, isActive, raw, createdAt, updatedAt
        )
        VALUES (
          :id, :code10, :lawdCode5, :sido, :sigungu, :eupmyeon, :ri, :fullName, :isActive, :raw,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT(code10) DO UPDATE SET
          lawdCode5=excluded.lawdCode5,
          sido=excluded.sido,
          sigungu=excluded.sigungu,
          eupmyeon=excluded.eupmyeon,
          ri=excluded.ri,
          fullName=excluded.fullName,
          isActive=excluded.isActive,
          raw=excluded.raw,
          updatedAt=CURRENT_TIMESTAMP
        """,
        rows,
    )
    conn.commit()
    cur.execute("SELECT COUNT(*) FROM LegalDongCode")
    count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM LegalDongCode WHERE isActive = 1")
    active = cur.fetchone()[0]
    conn.close()
    print(json.dumps({"sourceRows": len(rows), "dbCount": count, "activeCount": active}, ensure_ascii=False))


if __name__ == "__main__":
    main()
