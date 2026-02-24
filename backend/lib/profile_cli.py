import sys
import os
import psycopg2
import psycopg2.extras
from datetime import date
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

sys.path.insert(0, os.path.dirname(__file__))
from profile_scraper import scrape_profile

username = sys.argv[1] if len(sys.argv) > 1 else "ck238"

print(f"Scraping {username}...", file=sys.stderr)
try:
    total_films, movies = scrape_profile(username)
except Exception as e:
    print(f"Scrape failed: {e}", file=sys.stderr)
    sys.exit(1)
print(f"Scraped {len(movies)} films (total: {total_films})", file=sys.stderr)

try:
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    cur.execute(
        "SELECT id FROM profiles WHERE username = %s AND scraped_date = %s",
        (username, date.today()),
    )
    existing = cur.fetchone()

    if existing:
        profile_id = existing[0]
        cur.execute(
            "UPDATE profiles SET total_films = %s WHERE id = %s",
            (total_films, profile_id),
        )
        cur.execute("DELETE FROM profile_films WHERE profile_id = %s", (profile_id,))
    else:
        cur.execute(
            "INSERT INTO profiles (username, scraped_date, total_films) VALUES (%s, %s, %s) RETURNING id",
            (username, date.today(), total_films),
        )
        profile_id = cur.fetchone()[0]

    psycopg2.extras.execute_values(
        cur,
        "INSERT INTO profile_films (profile_id, film_slug, rating) VALUES %s",
        [(profile_id, m["film"], m["rating"]) for m in movies],
    )

    conn.commit()
    cur.close()
    conn.close()
    print(
        f"Saved profile {username} (id={profile_id}) with {len(movies)} films",
        file=sys.stderr,
    )
except Exception as e:
    print(f"Database error: {e}", file=sys.stderr)
    sys.exit(1)
