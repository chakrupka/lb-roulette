# to run: python scraper.py $(head -1 progress.txt)

import requests
from bs4 import BeautifulSoup
import json

response = requests.get(
    f"https://letterboxd.com/countries/",
    headers={"User-Agent": "letterboxd-roulette/1.0"},
)

soup = BeautifulSoup(response.text, "html.parser")

svg = soup.find("svg", id="film-world-map")
countries_data = json.loads(svg["data-all-countries-watched"])
countries = [c["label"] for c in countries_data.values()]
print(json.dumps(countries, indent=2, ensure_ascii=False))
