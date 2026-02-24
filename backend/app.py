from flask import Flask, jsonify, request, g
import psycopg2
import psycopg2.extras
from psycopg2 import pool
from flask_cors import CORS
import os
import sys
from datetime import date
from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
from profile_scraper import scrape_profile

app = Flask(__name__)
CORS(app)

load_dotenv()

db_pool = pool.SimpleConnectionPool(1, 20, os.getenv("DATABASE_URL"))


def get_db():
    if "db" not in g:
        g.db = db_pool.getconn()
    return g.db


@app.teardown_appcontext
def close_db(e=None):
    db = g.pop("db", None)
    if db is not None:
        db_pool.putconn(db)


@app.route("/")
def hello():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM films")
    count = cur.fetchone()[0]

    cur.close()

    return jsonify(
        {
            "message": f"Welcome to Cha's film database. Currently serving {count} films. Last updated on Febuary 12, 2026"
        }
    )


@app.route("/films")
def get_films():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM films LIMIT 20")
    columns = [desc[0] for desc in cur.description]
    films = [dict(zip(columns, row)) for row in cur.fetchall()]
    cur.close()
    return jsonify(films)


@app.route("/films/<int:film_id>")
def get_film(film_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM films WHERE id = %s", (film_id,))
    row = cur.fetchone()
    columns = [desc[0] for desc in cur.description]
    cur.close()
    if not row:
        return jsonify({"error": "Film not found"}), 404
    return jsonify(dict(zip(columns, row)))


@app.route("/films/random")
def random_film():
    conn = get_db()
    cur = conn.cursor()

    conditions = []
    params = []
    films_limit = request.args.get("limit", 50, type=int)
    films_limit = max(1, min(films_limit, 200))

    min_rating = request.args.get("min_rating", type=float)
    if min_rating is not None:
        conditions.append("rating >= %s")
        params.append(min_rating)

    max_rating = request.args.get("max_rating", type=float)
    if max_rating is not None:
        conditions.append("rating <= %s")
        params.append(max_rating)

    min_ratings = request.args.get("min_ratings", type=int)
    if min_ratings is not None:
        conditions.append("rating_count >= %s")
        params.append(min_ratings)

    year_min = request.args.get("year_min", type=int)
    if year_min is not None:
        conditions.append("CAST(year AS INT) >= %s")
        params.append(year_min)

    year_max = request.args.get("year_max", type=int)
    if year_max is not None:
        conditions.append("CAST(year AS INT) <= %s")
        params.append(year_max)

    genres = request.args.getlist("genre")
    if genres:
        genre_mode = request.args.get("genre_mode", "and")
        if genre_mode == "or":
            conditions.append("genres && %s")
        else:
            conditions.append("genres @> %s")
        params.append(genres)

    countries = request.args.getlist("country")
    if countries:
        conditions.append("countries @> %s")
        params.append(countries)

    actors = request.args.getlist("actor")
    if actors:
        conditions.append(
            """
            id IN (
                SELECT fa.film_id
                FROM film_actors fa
                INNER JOIN actors a ON fa.actor_id = a.id
                WHERE a.name = ANY(%s)
                GROUP BY fa.film_id
                HAVING COUNT(DISTINCT a.name) = %s
            )
        """
        )
        params.append(actors)
        params.append(len(actors))

    directors = request.args.getlist("director")
    if directors:
        conditions.append(
            """
            id IN (
                SELECT fd.film_id
                FROM film_directors fd
                INNER JOIN directors d ON fd.director_id = d.id
                WHERE d.name = ANY(%s)
                GROUP BY fd.film_id
                HAVING COUNT(DISTINCT d.name) = %s
            )
        """
        )
        params.append(directors)
        params.append(len(directors))

    query = "SELECT * FROM films"
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY RANDOM() LIMIT %s"
    params.append(films_limit)

    cur.execute(query, params)
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    cur.close()

    if not rows:
        return jsonify({"error": "No films match filters"}), 404

    return jsonify([dict(zip(columns, row)) for row in rows])


@app.route("/actors/search")
def fetch_actors():
    conn = get_db()
    cur = conn.cursor()

    query = request.args.get("q", "", type=str).strip()

    if len(query) < 2:
        return jsonify([])

    cur.execute(
        """
        SELECT id, name, film_count
        FROM actor_film_counts
        WHERE name ILIKE %s
        ORDER BY film_count DESC
        LIMIT 5
    """,
        (f"{query}%",),
    )

    rows = cur.fetchall()

    cur.close()

    return jsonify(
        [{"id": row[0], "name": row[1], "film_count": row[2]} for row in rows]
    )


@app.route("/directors/search")
def fetch_directors():
    conn = get_db()
    cur = conn.cursor()

    query = request.args.get("q", "", type=str).strip()

    if len(query) < 2:
        return jsonify([])

    try:
        cur.execute(
            """
            SELECT id, name, film_count, avg_rating
            FROM director_film_counts
            WHERE name ILIKE %s
            ORDER BY film_count DESC
            LIMIT 5
        """,
            (f"{query}%",),
        )

        rows = cur.fetchall()
        cur.close()

        return jsonify(
            [
                {
                    "id": row[0],
                    "name": row[1],
                    "film_count": row[2],
                    "avg_rating": row[3],
                }
                for row in rows
            ]
        )

    except Exception as e:
        cur.close()
        return jsonify({"error": str(e)}), 500


@app.route("/profile/<username>")
def get_profile(username):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT username, scraped_date FROM profiles WHERE username = %s ORDER BY scraped_date DESC LIMIT 1",
        (username,),
    )
    row = cur.fetchone()
    cur.close()
    if not row:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"username": row[0], "last_updated": row[1].isoformat()})


@app.route("/profile/<username>/update", methods=["POST"])
def update_profile(username):
    try:
        total_films, movies = scrape_profile(username)
    except Exception as e:
        return jsonify({"error": f"Scrape failed: {e}"}), 502

    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        "SELECT id FROM profiles WHERE username = %s AND scraped_date = %s",
        (username, date.today()),
    )
    existing = cur.fetchone()

    if existing:
        profile_id = existing[0]
        cur.execute("UPDATE profiles SET total_films = %s WHERE id = %s", (total_films, profile_id))
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

    return jsonify({"username": username, "total_films": total_films, "films_scraped": len(movies)})


@app.route("/profile/<username>/compare")
def compare_profile(username):
    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        "SELECT id, total_films, scraped_date FROM profiles WHERE username = %s ORDER BY scraped_date DESC LIMIT 1",
        (username,),
    )
    row = cur.fetchone()
    if not row:
        cur.close()
        return jsonify({"error": "User not found"}), 404

    profile_id, total_films, scraped_date = row

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
    film_rows = cur.fetchall()

    cur.execute(
        """
        SELECT d.name, elem->>'id' AS slug, pf.film_slug
        FROM profile_films pf
        JOIN films f ON f.url = 'https://letterboxd.com/film/' || pf.film_slug || '/'
        JOIN film_directors fd ON fd.film_id = f.id
        JOIN directors d ON d.id = fd.director_id
        JOIN LATERAL jsonb_array_elements(f.directors::jsonb) AS elem
          ON (elem->>'name') = d.name
        WHERE pf.profile_id = %s
          AND pf.rating IS NOT NULL
          AND f.rating IS NOT NULL
        """,
        (profile_id,),
    )
    director_rows = cur.fetchall()
    cur.close()

    films = []
    for slug, user_rating, title, db_rating in film_rows:
        db_rating_rounded = round(db_rating, 1)
        diff = round(user_rating - db_rating_rounded, 2)
        films.append({
            "slug": slug,
            "title": title,
            "user_rating": user_rating,
            "db_rating": db_rating_rounded,
            "diff": diff,
            "direction": "higher" if diff > 0 else ("lower" if diff < 0 else "same"),
        })

    films.sort(key=lambda r: abs(r["diff"]), reverse=True)

    film_diff_map = {f["slug"]: f["diff"] for f in films}
    director_map = {}
    for dir_name, dir_slug, film_slug in director_rows:
        if dir_name not in director_map:
            director_map[dir_name] = {"slug": dir_slug, "film_slugs": set()}
        director_map[dir_name]["film_slugs"].add(film_slug)

    directors = []
    for dir_name, info in director_map.items():
        diffs = [film_diff_map[s] for s in info["film_slugs"] if s in film_diff_map]
        if not diffs:
            continue
        directors.append({
            "name": dir_name,
            "slug": info["slug"],
            "film_count": len(diffs),
            "avg_diff": round(sum(diffs) / len(diffs), 2),
        })

    return jsonify({
        "username": username,
        "scraped_date": scraped_date.isoformat(),
        "total_films": total_films,
        "matched": len(films),
        "films": films,
        "directors": directors,
    })


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
