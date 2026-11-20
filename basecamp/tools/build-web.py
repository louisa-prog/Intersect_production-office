"""Build the web version of INTERSECT from the shared template library.

The Basecamp view and the web app share one source of formats, modules and
tables: src/qml/templates.js. This script injects it into the web app's
script, inlines the INTERSECT logo, and fills in the portfolio video links.

    python3 tools/build-web.py <out.html>

Inputs (all in web/):
  head.part.html          markup and styles
  app.part.js             the app script, with /*@@TEMPLATES@@*/ and /*@@SHOWCASE_URLS@@*/ markers
  intersect-logo.png      the logo, inlined as a data URI (@@LOGO@@)
  showcase-assets.json    optional: {"<file>": {"video": url, "poster": url}} for the Home carousel
"""
import base64
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
WEB = os.path.join(ROOT, "web")
LIB = os.path.join(ROOT, "src", "qml", "templates.js")


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def main(out):
    lib = read(LIB).replace(".pragma library", "", 1)
    js = read(os.path.join(WEB, "app.part.js"))
    head = read(os.path.join(WEB, "head.part.html"))
    for marker in ("/*@@TEMPLATES@@*/", "/*@@SHOWCASE_URLS@@*/{}"):
        assert marker in js, f"app script is missing {marker}"
    assets_path = os.path.join(WEB, "showcase-assets.json")
    urls = json.loads(read(assets_path)) if os.path.exists(assets_path) else {}
    with open(os.path.join(WEB, "intersect-logo.png"), "rb") as f:
        logo = "data:image/png;base64," + base64.b64encode(f.read()).decode("ascii")

    js = js.replace("/*@@TEMPLATES@@*/", lib).replace("/*@@SHOWCASE_URLS@@*/{}", json.dumps(urls))
    js = js.replace("@@LOGO@@", logo)
    head = head.replace("@@LOGO@@", logo)
    if "</script" in js:
        raise SystemExit("script text contains </script; refusing to inline")
    html = head + "<script>\n" + js + "\n</script>\n"
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"wrote {out} ({len(html):,} bytes; {len(urls)} showcase videos linked)")


if __name__ == "__main__":
    main(sys.argv[1])
