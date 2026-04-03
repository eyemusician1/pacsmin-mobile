import csv
import re
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import cv2
import fitz
import numpy as np

PDF_PATH = Path("All QR Codes.pdf")
OUT_CSV = Path("supabase/participants_from_pdf.csv")


def clean_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def normalize_society(lines: list[str]) -> str:
    joined = clean_spaces(" ".join(lines))
    joined = joined.replace("MSU- IIT", "MSU-IIT")
    joined = joined.replace("MSU - MAIN", "MSU - MAIN")
    return joined


def is_page_marker(line: str) -> bool:
    return bool(re.search(r"^--\s*\d+\s+of\s+\d+\s*--$", line))


def parse_participants_from_text(raw_text: str) -> list[tuple[str, str]]:
    lines = [clean_spaces(line) for line in raw_text.splitlines() if clean_spaces(line)]
    lines = [
        line
        for line in lines
        if line != "All Participants QR Codes" and not is_page_marker(line)
    ]

    participants: list[tuple[str, str]] = []
    pending_name: list[str] = []
    i = 0

    single_line_societies = {
        "XU Chemistry Society",
        "USM Chemistry Society",
        "CMU Chemical Society",
    }

    def looks_like_society_prefix(value: str) -> bool:
        lower = value.lower()
        return (
            "chemistry" in lower
            or "chemical" in lower
            or "kapnayan" in lower
            or value.startswith("CSU MAIN")
        )

    while i < len(lines):
        line = lines[i]

        if line in single_line_societies:
            if pending_name:
                participants.append((clean_spaces(" ".join(pending_name)), line))
                pending_name = []
            i += 1
            continue

        if line == "Society":
            if pending_name:
                if looks_like_society_prefix(pending_name[-1]):
                    society_prefix = pending_name.pop()
                    society = f"{society_prefix} Society"
                    if pending_name:
                        participants.append(
                            (clean_spaces(" ".join(pending_name)), society)
                        )
                        pending_name = []
                elif len(pending_name) >= 2 and looks_like_society_prefix(
                    clean_spaces(" ".join(pending_name[-2:]))
                ):
                    society_prefix = clean_spaces(" ".join(pending_name[-2:]))
                    pending_name = pending_name[:-2]
                    society = f"{society_prefix} Society"
                    if pending_name:
                        participants.append(
                            (clean_spaces(" ".join(pending_name)), society)
                        )
                        pending_name = []
            i += 1
            continue

        if line in {"MSU- IIT Chemistry", "MSU - MAIN Chemical"}:
            next_line = lines[i + 1] if i + 1 < len(lines) else ""
            if next_line == "Society":
                society = f"{line} Society"
                if pending_name:
                    participants.append((clean_spaces(" ".join(pending_name)), society))
                    pending_name = []
                i += 2
                continue

        if line.startswith("CSU MAIN -"):
            society_parts = [line]
            if i + 1 < len(lines) and lines[i + 1] == "Society":
                society_parts.append(lines[i + 1])
                i += 1
            elif (
                i + 1 < len(lines)
                and "Society" not in lines[i + 1]
                and len(lines[i + 1]) <= 8
            ):
                society_parts.append(lines[i + 1])
                i += 1
            society = clean_spaces(" ".join(society_parts))
            if pending_name:
                participants.append((clean_spaces(" ".join(pending_name)), society))
                pending_name = []
            i += 1
            continue

        pending_name.append(line)
        i += 1

    return participants


def extract_uid(raw: str) -> str:
    value = raw.strip()
    if not value:
        return value
    try:
        parsed = urlparse(value)
        uid = parse_qs(parsed.query).get("uid", [""])[0].strip()
        return uid if uid else value
    except Exception:
        return value


def decode_qrs(page: fitz.Page) -> list[tuple[float, float, str]]:
    pix = page.get_pixmap(matrix=fitz.Matrix(3, 3), alpha=False)
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
        pix.height, pix.width, pix.n
    )
    bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

    detector = cv2.QRCodeDetector()
    entries: list[tuple[float, float, str]] = []

    ok, decoded_info, points, _ = detector.detectAndDecodeMulti(bgr)
    if ok and decoded_info is not None and points is not None:
        for data, pts in zip(decoded_info, points):
            if not data:
                continue
            center = pts.mean(axis=0)
            entries.append((float(center[0]), float(center[1]), data.strip()))

    if not entries:
        data, pts, _ = detector.detectAndDecode(bgr)
        if data and pts is not None:
            center = pts.mean(axis=0)
            entries.append((float(center[0]), float(center[1]), data.strip()))

    entries.sort(key=lambda item: (round(item[1] / 120), item[0]))
    return entries


def main() -> None:
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"Missing PDF: {PDF_PATH}")

    doc = fitz.open(PDF_PATH)
    qr_rows: list[dict[str, str]] = []
    full_text_parts: list[str] = []

    for page_index in range(doc.page_count):
        page = doc.load_page(page_index)
        qrs = decode_qrs(page)

        for _, _, qr_raw in qrs:
            qr_rows.append(
                {
                    "unique_id": extract_uid(qr_raw),
                    "qr_raw": qr_raw,
                    "page": str(page_index + 1),
                }
            )

        full_text_parts.append(page.get_text("text"))
        print(f"Page {page_index + 1}: qrs={len(qrs)}")

    doc.close()

    participants = parse_participants_from_text("\n".join(full_text_parts))
    print(f"Parsed participants from text: {len(participants)}")

    pair_count = min(len(qr_rows), len(participants))
    rows: list[dict[str, str]] = []
    for i in range(pair_count):
        rows.append(
            {
                "unique_id": qr_rows[i]["unique_id"],
                "full_name": participants[i][0],
                "society": participants[i][1],
                "qr_raw": qr_rows[i]["qr_raw"],
                "page": qr_rows[i]["page"],
            }
        )

    deduped: dict[str, dict[str, str]] = {}
    for row in rows:
        uid = row["unique_id"]
        if uid and uid not in deduped:
            deduped[uid] = row

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["unique_id", "full_name", "society", "qr_raw", "page"]
        )
        writer.writeheader()
        writer.writerows(deduped.values())

    print(f"Total decoded QR rows: {len(qr_rows)}")
    print(f"Total paired rows: {len(rows)}")
    print(f"Unique rows by unique_id: {len(deduped)}")
    print(f"Wrote: {OUT_CSV}")


if __name__ == "__main__":
    main()
