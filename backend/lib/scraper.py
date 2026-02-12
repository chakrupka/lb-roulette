import requests
import time
import random
import sys
from bs4 import BeautifulSoup
import json
import psycopg2
from psycopg2.extras import execute_batch
import os
from dotenv import load_dotenv

load_dotenv()

BATCH_SIZE = 50
PROGRESS_SAVE_INTERVAL = 10

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

FILMS_FILE = "film_links.txt"

with open(FILMS_FILE, "r") as f:
    links = [line.strip() for line in f if line.strip()]

total = len(links)
start = int(sys.argv[1]) if len(sys.argv) > 1 else 1
errors = []
batch = []


def save_progress(index, error_list):
    with open("progress.txt", "w") as p:
        p.write(f"{index}\n")
        if error_list:
            p.write("\n--- ERRORS ---\n")
            p.write("\n".join(error_list))


def flush_batch(batch_data):
    if not batch_data:
        return

    execute_batch(
        cur,
        """
        INSERT INTO films (title, year, directors, actors, studios, genres, countries, rating, rating_count, review_count, description, url, image)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        batch_data,
    )
    conn.commit()
    batch_data.clear()


try:
    for i, link in enumerate(links, 1):
        if i < start:
            continue

        try:
            response = requests.get(
                f"https://letterboxd.com{link}",
                headers={"User-Agent": "letterboxd-roulette/1.0"},
                timeout=10,
            )

            if response.status_code != 200:
                print(f"[{i}/{total}] FAILED ({response.status_code}): {link}")
                errors.append(f"[{i}] FAILED ({response.status_code}): {link}")
                continue

            soup = BeautifulSoup(response.text, "html.parser")

            data_script = soup.find("script", type="application/ld+json")
            if not data_script:
                print(f"[{i}/{total}] NO DATA: {link}")
                errors.append(f"[{i}] NO DATA: {link}")
                continue

            data = json.loads(
                data_script.string.strip()
                .removeprefix("/* <![CDATA[ */")
                .removesuffix("/* ]]> */")
                .strip()
            )

            title = data.get("name")
            year = data.get("releasedEvent", [{}])[0].get("startDate")
            directors = [
                {"name": d["name"], "id": d["sameAs"].split("/")[-2]}
                for d in data.get("director", [])
            ]
            studios = [
                {"name": s["name"], "id": s["sameAs"].split("/")[-2]}
                for s in data.get("productionCompany", [])
            ]
            actors = [
                {"name": a["name"], "id": a["sameAs"].split("/")[-2]}
                for a in data.get("actors", [])
            ]
            genres = data.get("genre", [])
            rating_data = data.get("aggregateRating", {})
            rating = rating_data.get("ratingValue")
            rating_count = rating_data.get("ratingCount")
            review_count = rating_data.get("reviewCount")
            countries = [c["name"] for c in data.get("countryOfOrigin", [])]
            url = data.get("url")
            image = data.get("image")

            synopsis_el = soup.find("div", class_="truncate")
            description = (
                synopsis_el.find("p").text.strip()
                if synopsis_el and synopsis_el.find("p")
                else None
            )

            batch.append(
                (
                    title,
                    year,
                    json.dumps(directors),
                    json.dumps(actors),
                    json.dumps(studios),
                    genres,
                    countries,
                    rating,
                    rating_count,
                    review_count,
                    description,
                    url,
                    image,
                )
            )

            print(f"[{i}/{total}] {title}")

            if len(batch) >= BATCH_SIZE:
                flush_batch(batch)

        except Exception as e:
            print(f"[{i}/{total}] ERROR: {link} - {e}")
            errors.append(f"[{i}] ERROR: {link} - {e}")

        if i % PROGRESS_SAVE_INTERVAL == 0:
            flush_batch(batch)
            save_progress(i, errors)

        time.sleep(2 + random.uniform(0, 2))

    flush_batch(batch)
    save_progress(i, errors)

finally:
    cur.close()
    conn.close()

print(f"Done. Processed {total} films. {len(errors)} errors.")
