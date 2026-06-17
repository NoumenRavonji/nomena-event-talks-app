# BigQuery Release Notes Dashboard

A modern, glassmorphic dark-mode web application built with Python Flask and vanilla HTML, JavaScript, and CSS that fetches the official Google Cloud BigQuery release notes and provides an interactive interface to search, filter, and draft tweets about them.

---

## ✨ Features

- **Automated RSS Ingestion:** Automatically fetches the latest BigQuery release notes XML feed directly from Google Cloud.
- **Glassmorphism Dark Aesthetics:** Designed with premium gradients, translucent glass layouts, and a CPU-friendly 2D particle physics background on an HTML5 canvas.
- **Micro-Categorization:** Automatically parses headers in update entries to categorize them as `Feature`, `Announcement`, `Deprecation`, `Issue`, `Fix`, or `Changed`.
- **Search & Filter:** Offers instant client-side keyword search and tag-based filters.
- **Interactive Share on X (Twitter):** Features a customized tweet compose modal with safety warnings for character limits (280 characters), automatically redirecting users to the official X Web Intent window for posting.

---

## 📂 Project Structure

```text
/bq-releases-notes
  ├── app.py                # Flask Server (fetches, parses RSS feed & serves JSON API)
  ├── requirements.txt      # Python package dependencies
  ├── .gitignore            # Git exclusion patterns
  ├── templates/
  │   └── index.html        # Single-page UI template
  └── static/
      ├── app.js            # Particle simulation, dynamic rendering, search/filters, modal control
      └── style.css         # Clean dark mode layout styling, card animations, and badges
```

---

## 🚀 Getting Started

### Prerequisites

You need **Python 3.8+** installed on your system.

### 1. Install Dependencies

Clone or download the repository, open your terminal in the directory, and run:

```bash
pip install -r requirements.txt
```

### 2. Run the Web Server

Start the Flask application:

```bash
python app.py
```

By default, the application runs in debug mode on port `5000`.

### 3. Open in Browser

Open your browser and navigate to:

```text
http://127.0.0.1:5000
```

---

## 🧪 Technical Notes

- **XML Parsing:** Uses Python's built-in `xml.etree.ElementTree` parser for lightweight and efficient XML processing without dependencies like `feedparser`.
- **Vanilla Setup:** Uses no frontend frameworks (like React or Vue) or layout utilities (like TailwindCSS), keeping loading times near-instant.
- **X Integration:** Communicates with X using the official Web Intent URI scheme, avoiding complex API tokens, OAuth setups, or pricing tiers.
