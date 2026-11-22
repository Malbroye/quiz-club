import json
import os
import re
import sys
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.parse import urljoin, urlsplit

try:
    from scrapling.fetchers import Fetcher
except ImportError:
    sys.exit('Installe Scrapling avec python -m pip install "scrapling[fetchers]==0.4.2".')

DESTINATION = Path(__file__).resolve().parent.parent / "public" / "media"
USER_AGENT = "QuizClub/1.2 (educational trivia; image assets)"
IMAGE_HOSTS = {"upload.wikimedia.org", "thumb.wikimedia.org", "dnm.nflximg.net", "i.ytimg.com"}


def fetch(url, hosts):
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.netloc not in hosts:
        raise ValueError("Source d’image inattendue.")
    response = Fetcher.get(
        url, follow_redirects=False, impersonate=None, stealthy_headers=False,
        headers={"User-Agent": USER_AGENT, "Accept": "image/jpeg,image/png" if hosts == IMAGE_HOSTS else "text/html"},
        timeout=12, retries=1,
    )
    if response.status != 200:
        raise ValueError(f"HTTP {response.status}")
    return response


def download(item):
    source = item.get("source") or ""
    name = item["file"]
    if not re.fullmatch(r"(?:[a-z0-9_-]+/)*[a-z0-9_.-]+\.(?:jpg|png)", name, re.IGNORECASE):
        raise ValueError("Nom de fichier inattendu.")
    destination = DESTINATION / name
    if destination.exists() or destination.is_symlink():
        return False
    url = item["url"]
    if urlsplit(source).netloc == "commons.wikimedia.org":
        page = fetch(source, {"commons.wikimedia.org"})
        href = page.css(".fullImageLink a::attr(href)").get()
        if href:
            url = urljoin(source, href)
    response = fetch(url, IMAGE_HOSTS)
    signature = b"\x89PNG\r\n\x1a\n" if name.lower().endswith(".png") else b"\xff\xd8\xff"
    if not response.body.startswith(signature):
        raise ValueError("Le format du fichier reçu ne correspond pas à son extension.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(dir=destination.parent, suffix=".download", delete=False) as temporary:
        temporary.write(response.body)
        staged = Path(temporary.name)
    try:
        os.link(staged, destination)
        return True
    except FileExistsError:
        return False
    finally:
        staged.unlink(missing_ok=True)


def main():
    media = json.load(sys.stdin)
    DESTINATION.mkdir(parents=True, exist_ok=True)
    status = 0
    for item in media:
        try:
            saved = download(item)
            print(f"{item['file']} : {'téléchargé' if saved else 'conservé'}.")
        except Exception as error:
            print(f"{item['file']} : {error}", file=sys.stderr)
            status = 1
    return status


if __name__ == "__main__":
    sys.exit(main())
