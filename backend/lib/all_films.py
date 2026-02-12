import requests
import time
import random
from bs4 import BeautifulSoup

base_url = "https://letterboxd.com/hershwin/list/all-the-movies/"
headers = {"User-Agent": "letterboxd-roulette/1.0"}
all_links = []

for page in range(1, 414):
    url = base_url if page == 1 else f"{base_url}page/{page}/"
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        print(f"Page {page} failed with status {response.status_code}")
        break

    soup = BeautifulSoup(response.text, "html.parser")
    posters = soup.find_all("div", class_="react-component")
    links = [div.get("data-item-link") for div in posters if div.get("data-item-link")]
    all_links.extend(links)

    print(f"Page {page}/413 - {len(links)} films found ({len(all_links)} total)")
    time.sleep(2 + random.uniform(0, 2))

with open("film_links.txt", "w") as f:
    f.write("\n".join(all_links))

print(f"Done. {len(all_links)} links saved to film_links.txt")
