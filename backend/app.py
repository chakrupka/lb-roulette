from flask import Flask, jsonify, request
import psycopg2
from flask_cors import CORS
import os
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)

load_dotenv()


def get_db():
    return psycopg2.connect(os.getenv("DATABASE_URL"))


@app.route("/")
def hello():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM films")
    count = cur.fetchone()[0]
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
    conn.close()
    return jsonify(films)


@app.route("/films/<int:film_id>")
def get_film(film_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM films WHERE id = %s", (film_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return jsonify({"error": "Film not found"}), 404
    columns = [desc[0] for desc in cur.description]
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

    query = "SELECT * FROM films"
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY RANDOM() LIMIT %s"
    params.append(films_limit)

    cur.execute(query, params)
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    cur.close()
    conn.close()

    if not rows:
        return jsonify({"error": "No films match filters"}), 404

    return jsonify([dict(zip(columns, row)) for row in rows])


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
