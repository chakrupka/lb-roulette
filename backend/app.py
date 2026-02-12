from flask import Flask, jsonify, request, g
import psycopg2
from psycopg2 import pool
from flask_cors import CORS
import os
from dotenv import load_dotenv

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


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
