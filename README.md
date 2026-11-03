# WhatToEat!!! 🍱

> **Live Deployment:** [https://sunway-whattoeat.vercel.app](https://sunway-whattoeat.vercel.app)  
> **Alternate Domain:** [https://whattoeat-ten-gamma.vercel.app](https://whattoeat-ten-gamma.vercel.app)

A lunch decision engine and campus eateries directory designed for students, researchers, and faculty members at **Sunway University** (Faculty of Engineering & Technology - FET).

---

## 🌟 Key Features

1. **Spin Wheel Decision Maker**
   - True uniform random selection using `window.crypto.getRandomValues`.
   - Smooth easing animation with confetti celebration.
   - Quick checkbox toggling to filter out eateries you visited yesterday.

2. **Sunway University & FET Theme**
   - Styled with Sunway University's official brand palette: Sunway Navy (`#002B49`), Gold (`#F5A623`), and Faculty of Engineering & Technology cyan/teal (`#005F73` / `#0A9396`).
   - High-contrast official Sunway University crest and header logo.

3. **Community Submission & Protected Administration**
   - **Open Registration**: Any user can submit and register new lunch spots with exact addresses, estimated walking minutes, dietary status, and recommended dishes.
   - **Admin-Only Deletions**: Deleting entries requires staff authentication with username and password to prevent accidental data loss.

4. **Exact Location & Pricing Details**
   - Precise street addresses, shoplot lot numbers, and walking times.
   - One-click Google Maps navigation directly to each restaurant's coordinates/pin.
   - Realistic Malaysian Ringgit (MYR) lunch price estimates (`RM 6 - RM 12`, `RM 15 - RM 25`, etc.).

5. **Codebase Syncing (.ts File Export)**
   - New user-submitted restaurants are immediately saved in browser storage.
   - Includes a one-click **"Export as .ts File"** feature that generates updated `INITIAL_FET_RESTAURANTS` TypeScript code ready to commit into `restaurant.model.ts`.

---

## 🚀 Running Locally

```bash
# Clone repository
git clone https://github.com/DT0072/what-to-eat.git
cd what-to-eat

# Install dependencies
npm install

# Start development server
ionic serve
```

---

## 📦 Tech Stack

- **Framework**: Ionic Framework v9 & Angular
- **Styling**: SCSS, Ionic Theming
- **Canvas Effects**: HTML5 2D Canvas & Canvas Confetti
- **Deployment**: Vercel
