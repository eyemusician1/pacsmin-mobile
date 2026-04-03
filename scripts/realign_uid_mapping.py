import csv
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

IN_CSV = Path("supabase/merged_participants_choices.csv")
OUT_CSV = Path("supabase/merged_participants_choices_corrected.csv")
OUT_SQL = Path("supabase/fix_uid_name_mapping.sql")


def clean(value: str) -> str:
    text = unicodedata.normalize("NFKD", value)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return text


def initials_from_name(name: str) -> str:
    parts = [p for p in re.split(r"[^A-Za-z]+", clean(name)) if p]
    if len(parts) < 2:
        return ""
    return (parts[0][0] + parts[-1][0]).upper()


def esc(value: str) -> str:
    return value.replace("'", "''")


def load_rows() -> list[dict[str, str]]:
    with IN_CSV.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def realign_rows(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    by_society: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        by_society[row["society"]].append(row)

    corrected: list[dict[str, str]] = []

    for society, items in by_society.items():
        candidates_by_initials: dict[str, list[int]] = defaultdict(list)
        for idx, item in enumerate(items):
            candidates_by_initials[initials_from_name(item["full_name"])].append(idx)

        used_indices: set[int] = set()
        mapping: list[int | None] = [None] * len(items)

        # First pass: exact initials match, nearest index keeps local ordering.
        for i, item in enumerate(items):
            uid_prefix = (item.get("unique_id") or "")[:2].upper()
            options = [
                j
                for j in candidates_by_initials.get(uid_prefix, [])
                if j not in used_indices
            ]
            if options:
                chosen = min(options, key=lambda j: abs(j - i))
                mapping[i] = chosen
                used_indices.add(chosen)

        # Fill unmatched positions with remaining rows in order.
        remaining = [j for j in range(len(items)) if j not in used_indices]
        for i in range(len(items)):
            if mapping[i] is None:
                mapping[i] = remaining.pop(0)

        for i, item in enumerate(items):
            src = items[mapping[i]]
            row = dict(item)
            row["full_name"] = src["full_name"]
            row["food_choice"] = src["food_choice"]
            row["bundle_choice"] = src["bundle_choice"]
            row["match_method"] = "realigned-initials"
            corrected.append(row)

    return corrected


def mismatch_count(rows: list[dict[str, str]]) -> int:
    total = 0
    for row in rows:
        uid_prefix = (row.get("unique_id") or "")[:2].upper()
        initials = initials_from_name(row.get("full_name") or "")
        if uid_prefix and initials and uid_prefix != initials:
            total += 1
    return total


def write_outputs(rows: list[dict[str, str]]) -> None:
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)

    with OUT_CSV.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "unique_id",
                "full_name",
                "society",
                "food_choice",
                "bundle_choice",
                "match_method",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    lines = ["-- Fix UID-to-name alignment", "begin;"]

    for row in rows:
        lines.append(
            "update public.participants set "
            f"full_name = '{esc(row['full_name'])}', "
            f"society = '{esc(row['society'])}' "
            f"where unique_id = '{esc(row['unique_id'])}';"
        )

    for row in rows:
        if row["food_choice"]:
            lines.append(
                "insert into public.food_choices (participant_id, choice_date, choice) "
                "select id, current_date, "
                f"'{esc(row['food_choice'])}' from public.participants "
                f"where unique_id = '{esc(row['unique_id'])}' "
                "on conflict (participant_id, choice_date) do update set choice = excluded.choice;"
            )

    for row in rows:
        if row["bundle_choice"]:
            lines.append(
                "insert into public.bundle_choices (participant_id, choice_date, choice) "
                "select id, current_date, "
                f"'{esc(row['bundle_choice'])}' from public.participants "
                f"where unique_id = '{esc(row['unique_id'])}' "
                "on conflict (participant_id, choice_date) do update set choice = excluded.choice;"
            )

    lines.append("commit;")
    OUT_SQL.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    rows = load_rows()
    corrected = realign_rows(rows)

    before = mismatch_count(rows)
    after = mismatch_count(corrected)

    write_outputs(corrected)

    print("rows:", len(rows))
    print("mismatch_before:", before)
    print("mismatch_after:", after)
    print("wrote_csv:", OUT_CSV)
    print("wrote_sql:", OUT_SQL)


if __name__ == "__main__":
    main()
