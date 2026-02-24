from curl_cffi import requests as cf_requests
from bs4 import BeautifulSoup
import math
import time

RATING_MAP = {
    "rated-1": 0.5,
    "rated-2": 1.0,
    "rated-3": 1.5,
    "rated-4": 2.0,
    "rated-5": 2.5,
    "rated-6": 3.0,
    "rated-7": 3.5,
    "rated-8": 4.0,
    "rated-9": 4.5,
    "rated-10": 5.0,
}

FILMS_PER_PAGE = 72


def scrape_profile(username):
    scraper = cf_requests.Session(impersonate="chrome120")

    profile_url = f"https://letterboxd.com/{username}/"
    response = scraper.get(profile_url)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    total_films = None
    films_link = soup.select_one("a[href$='/films/'] span.value")
    if films_link:
        total_films = int(films_link.text.strip().replace(",", ""))

    total_pages = math.ceil(total_films / FILMS_PER_PAGE) if total_films else None

    time.sleep(0.5)
    movies = []
    page = 1

    while True:
        page_url = (
            f"https://letterboxd.com/{username}/films/"
            if page == 1
            else f"https://letterboxd.com/{username}/films/page/{page}/"
        )

        response = scraper.get(page_url)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        grid_items = soup.select("li.griditem")

        if not grid_items:
            break

        for item in grid_items:
            try:
                rating_span = item.select_one("span.rating")
                rating = None
                if rating_span:
                    for cls in rating_span.get("class", []):
                        if cls in RATING_MAP:
                            rating = RATING_MAP[cls]
                            break

                component = item.select_one("[data-item-slug]")
                slug = component["data-item-slug"] if component else None

                if slug:
                    movies.append({"film": slug, "rating": rating})
            except Exception:
                pass

        if total_pages and page >= total_pages:
            break

        time.sleep(0.5)
        page += 1

    return total_films, movies
