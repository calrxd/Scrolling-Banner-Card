# Scrolling Banner Card

A modern, responsive scrolling status banner (marquee-style) for **Home Assistant** dashboards.

The Scrolling Banner Card displays key entity states in a single horizontal row, automatically scrolling when content exceeds the available width. It supports desktop, tablet, and mobile layouts, with a visual editor for easy configuration.

---

## ✨ Features

- Horizontal scrolling (marquee-style) entity banner
- Automatically scrolls only when content overflows
- Responsive for desktop, tablet, and mobile
- Visual editor (no YAML required)
- Entity picker & icon picker
- Per-entity labels and icons
- Customisable colors (background, text, pills, icons)
- Adjustable scroll speed
- Optional pause-on-hover (desktop)
- Optional dividers between items
- Demo placeholders when no entities are configured

--

## Screenshot

![Scrolling Banner Card](images/screenshot.png)

---

## 📦 Installation

### Option 1: Install via HACS (Recommended)

1. Open **HACS**
2. Go to **Frontend**
3. Click **⋮ → Custom repositories**
4. Add this repository URL  
   - Category: **Lovelace**
5. Install **Scrolling Banner Card**
6. Restart Home Assistant (recommended)
7. Go to **Settings → Dashboards → Resources**
   - If not added automatically, add:
     ```
     /hacsfiles/scrolling-banner-card/scrolling-banner-card.js
     ```
     Type: `module`

---

### Option 2: Manual Installation

1. Download `scrolling-banner-card.js` from the `dist/` folder
2. Copy it to: /config/www/scrolling-banner-card/scrolling-banner-card.js
3.  Go to : "Settings → Dashboards → Resources"
4.   Add:

```yaml
url: /local/scrolling-banner-card/scrolling-banner-card.js?v=1
type: module

