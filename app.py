import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template
from datetime import datetime, timezone
import re
import html

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
ATOM_NS = "http://www.w3.org/2005/Atom"


def strip_html_tags(text):
    """Remove HTML tags and decode HTML entities for plain text."""
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = html.unescape(clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


def parse_feed(xml_text):
    root = ET.fromstring(xml_text)

    feed_updated_el = root.find(f"{{{ATOM_NS}}}updated")
    feed_updated = feed_updated_el.text if feed_updated_el is not None else None

    entries = []
    for entry in root.findall(f"{{{ATOM_NS}}}entry"):
        title_el = entry.find(f"{{{ATOM_NS}}}title")
        id_el = entry.find(f"{{{ATOM_NS}}}id")
        updated_el = entry.find(f"{{{ATOM_NS}}}updated")
        link_el = entry.find(f"{{{ATOM_NS}}}link[@rel='alternate']")
        content_el = entry.find(f"{{{ATOM_NS}}}content")

        title = title_el.text if title_el is not None else "Untitled"
        entry_id = id_el.text if id_el is not None else ""
        updated = updated_el.text if updated_el is not None else ""
        link = link_el.get("href") if link_el is not None else "#"
        content_html = content_el.text if content_el is not None else ""

        # Build plain-text summary for tweet (first 200 chars)
        plain_text = strip_html_tags(content_html)
        tweet_preview = plain_text[:200] + ("..." if len(plain_text) > 200 else "")

        entries.append(
            {
                "title": title,
                "id": entry_id,
                "updated": updated,
                "link": link,
                "content_html": content_html,
                "tweet_preview": tweet_preview,
            }
        )

    return {
        "feed_updated": feed_updated,
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "entries": entries,
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/release-notes")
def release_notes():
    try:
        resp = requests.get(FEED_URL, timeout=15)
        resp.raise_for_status()
        data = parse_feed(resp.text)
        return jsonify({"success": True, "data": data})
    except requests.RequestException as e:
        return jsonify({"success": False, "error": str(e)}), 500
    except ET.ParseError as e:
        return jsonify({"success": False, "error": f"XML parse error: {e}"}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
