import os
import sys

import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

username = sys.argv[1] if len(sys.argv) > 1 else "ck238"

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

cur.execute(
    """
    SELECT id, total_films, scraped_date
    FROM profiles
    WHERE username = %s
    ORDER BY scraped_date DESC
    LIMIT 1
    """,
    (username,),
)
row = cur.fetchone()
if not row:
    print(f"No profile found for '{username}'. Run profile_cli.py first.")
    sys.exit(1)

profile_id, total_films, scraped_date = row
print(f"Profile: {username}  |  Films: {total_films}  |  Scraped: {scraped_date}\n")

cur.execute(
    """
    SELECT pf.film_slug, pf.rating, f.title, f.rating AS db_rating
    FROM profile_films pf
    JOIN films f ON f.url = 'https://letterboxd.com/film/' || pf.film_slug || '/'
    WHERE pf.profile_id = %s
      AND pf.rating IS NOT NULL
      AND f.rating IS NOT NULL
    """,
    (profile_id,),
)
rows = cur.fetchall()
cur.close()
conn.close()

print(f"Matched {len(rows)} rated films in the database\n")

results = []
for slug, user_rating, title, db_rating in rows:
    db_rating_rounded = round(db_rating, 1)
    diff = round(user_rating - db_rating_rounded, 4)
    direction = "higher" if diff > 0 else ("lower" if diff < 0 else "same")
    results.append(
        {
            "slug": slug,
            "title": title,
            "user_rating": user_rating,
            "db_rating": db_rating_rounded,
            "diff": diff,
            "direction": direction,
        }
    )

results.sort(key=lambda r: abs(r["diff"]), reverse=True)

print(f"{'Title':<45} {'Yours':>6} {'DB':>5} {'Diff':>7}  Direction")
print("-" * 75)
for r in results:
    print(
        f"{r['title'][:44]:<45} {r['user_rating']:>6.1f} {r['db_rating']:>5.1f} {r['diff']:>+7.2f}  {r['direction']}"
    )

higher = sum(1 for r in results if r["direction"] == "higher")
lower = sum(1 for r in results if r["direction"] == "lower")
same = sum(1 for r in results if r["direction"] == "same")
print(
    f"\nTotal compared: {len(results)}  |  Higher: {higher}  Lower: {lower}  Same: {same}"
)
