# FuNumber Games

FuNumber Games is a static website built with HTML, CSS, and JavaScript. It runs in a browser and does not need a server-side Java runtime.

## Run locally

Open `docs/index.html` in a browser and use the navigation to visit the game and guide. The Java launcher also opens the home page.

The static pages are organized as:

- `docs/index.html` — Home page
- `docs/program/index.html` — the number game (`/program/`)
- `docs/equation/index.html` — Maths Spin, the two-wheel math game (`/equation/`)
- `docs/how-to-play/index.html` — game guide (`/how-to-play/`)
- `docs/site.css` — shared navigation and page styling
- `docs/style.css`, `docs/game.js`, and `docs/game-logic.js` — game styling and behavior
- `docs/equation/equation.css` and `docs/equation/equation-game.js` — Maths Spin layout and behavior

## Publish with GitHub Pages

1. Push this project to a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and the `/docs` folder, then save.

GitHub Pages will publish the website files in `docs/`. Netlify can use `docs` as its publish directory. Keep the complete folder structure, including `program`, `equation`, `how-to-play`, and `numbers`, when publishing. The site does not require a build step.

## Tests

The game rules for Number Match and Maths Spin have JavaScript unit tests.

1. Install Node.js 22.12 or newer and run `npm install` once.
2. Run the game logic checks with `npm run test:unit`.
