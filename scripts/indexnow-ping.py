#!/usr/bin/env python3
"""Пинг IndexNow (Bing + Yandex) изменёнными URL после деплоя.
Usage: indexnow-ping.py <before_sha> <after_sha>
Маппит изменённые *.html в репо → URL kazna-gov.ru и шлёт один пакет.
Ошибки сети/HTTP логируются, но НЕ валят деплой (job всегда зелёный)."""
import sys, subprocess, json, urllib.request, urllib.error

KEY = "dec95ded80e6f0e92886f41b2daa0931"
SITE = "https://kazna-gov.ru"

def commit_exists(c):
    return bool(c) and subprocess.run(
        ["git", "cat-file", "-e", f"{c}^{{commit}}"], capture_output=True
    ).returncode == 0

def changed_html(before, after):
    # на первый push в ветку before = 000..0 → берём только последний коммит
    rng = [before, after] if commit_exists(before) else [f"{after}~1", after]
    try:
        out = subprocess.check_output(["git", "diff", "--name-only", *rng], text=True)
    except subprocess.CalledProcessError:
        out = subprocess.check_output(
            ["git", "show", "--name-only", "--pretty=format:", after], text=True
        )
    return [l.strip() for l in out.splitlines() if l.strip().endswith(".html")]

def to_url(f):
    if f == "index.html":
        return f"{SITE}/"
    if f == "404.html":
        return None
    if f.endswith("/index.html"):
        return f"{SITE}/{f[:-len('/index.html')]}"
    return f"{SITE}/{f[:-5]}"  # прочие *.html

def main():
    before = sys.argv[1] if len(sys.argv) > 1 else ""
    after = sys.argv[2] if len(sys.argv) > 2 else "HEAD"
    urls = sorted({u for f in changed_html(before, after) if (u := to_url(f))})
    if not urls:
        print("IndexNow: изменённых страниц нет — пропуск.")
        return
    print(f"IndexNow: пингую {len(urls)} URL:")
    for u in urls:
        print("  ", u)
    payload = json.dumps({
        "host": "kazna-gov.ru", "key": KEY,
        "keyLocation": f"{SITE}/{KEY}.txt", "urlList": urls,
    }).encode()
    for ep in ("https://www.bing.com/indexnow", "https://yandex.com/indexnow"):
        req = urllib.request.Request(
            ep, data=payload,
            headers={"Content-Type": "application/json; charset=utf-8"},
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                print(f"  {ep} → {r.status}")
        except urllib.error.HTTPError as e:
            print(f"  {ep} → HTTP {e.code}")
        except Exception as e:
            print(f"  {ep} → error {e}")

if __name__ == "__main__":
    main()
