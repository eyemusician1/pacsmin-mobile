import csv
from pathlib import Path

inp = Path("supabase/participants_from_pdf.csv")
out = Path("supabase/import_participants.sql")

rows: list[tuple[str, str, str]] = []
with inp.open(encoding="utf-8", newline="") as f:
    for r in csv.DictReader(f):
        uid = r["unique_id"].strip()
        name = r["full_name"].strip()
        society = r["society"].strip()
        if uid and name:
            rows.append((uid, name, society))


def esc(value: str) -> str:
    return value.replace("'", "''")


with out.open("w", encoding="utf-8", newline="") as f:
    f.write("-- Generated from All QR Codes.pdf\n")
    f.write("begin;\n")
    for uid, name, society in rows:
        f.write(
            "insert into public.participants (unique_id, full_name, society) "
            f"values ('{esc(uid)}', '{esc(name)}', '{esc(society)}') "
            "on conflict (unique_id) do update set "
            "full_name = excluded.full_name, society = excluded.society;\n"
        )
    f.write("commit;\n")

print(f"rows={len(rows)}")
print(f"wrote={out}")
