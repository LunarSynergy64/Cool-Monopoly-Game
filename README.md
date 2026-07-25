# Property Trader — Online

This is the multiplayer version. One person runs the server; everyone
else connects to it from their own browser using a room code.

## One-time setup

You'll need [Node.js](https://nodejs.org) installed (the LTS version is fine).
Only the person hosting needs this — joining players just need a browser.

1. Open a terminal in this folder (the one with `server.js` in it).
2. Run:
   ```
   npm install
   ```
   This downloads the two small libraries the server uses (Express and
   Socket.io). You only need to do this once, or again if you delete
   the `node_modules` folder.
3. Drop your card images into `public/cards/`, named to match each
   card's code name (same convention as before):
   - `theprojects.png`, `blues.png`, `pinks.png`, `oranges.png`,
     `greens.png`, `yellows.png`, `darkblues.png`, `railroads.png`,
     `taxation.png`, `speedflips.png`, `gamblerscurse.png`,
     `smallmoves.png`

## Running a game

1. Start the server:
   ```
   npm start
   ```
   You'll see `Property Trader server running at http://localhost:3000`.
2. Open `http://localhost:3000` in your own browser and create a
   room (leave the room code blank, pick how many players).
3. **For friends on your own network** (same WiFi/house): find your
   computer's local IP address (on Mac: System Settings → Wi-Fi →
   Details; on Windows: `ipconfig` in Command Prompt, look for
   "IPv4 Address" — something like `192.168.1.42`). Friends open
   `http://<that address>:3000` in their browser and enter your
   room code.
4. **For friends elsewhere on the internet**: your computer isn't
   reachable from outside your network by default. The simplest fix
   is a tunneling tool like [ngrok](https://ngrok.com) — run
   `ngrok http 3000` in a second terminal and it gives you a public
   URL that forwards to your server. There are other ways to do this
   (port forwarding on your router, actual cloud hosting) but ngrok
   is the least setup for testing with friends.
5. Everyone enters their name + the room code, hits Join, and once
   your player slot count is full the game is playable.

## Updating the game going forward

This is the part that matters for how you actually work — you said
you'll be changing things often, so here's exactly where each kind
of change goes:

- **Game rules, new cards, how something is calculated** → edit
  `game-logic.js`. This is the *exact same logic* from the solo
  version, just running on the server instead of in the browser.
  After editing, **stop the server (Ctrl+C) and run `npm start`
  again** — Node doesn't pick up file changes automatically.
  Everyone in the room needs to refresh their browser after you
  restart.
- **Look, layout, colors, new UI elements** → edit
  `public/index.html`. No server restart needed for this — just
  save the file and refresh the browser.
- **New card added** → add it to the `CARD_DEFS` array near the top
  of `game-logic.js`, same as before. If it needs a brand-new kind
  of interaction (like Speed Flips' coin-flip UI), that also needs
  a matching bit of UI added to `public/index.html`'s
  `renderTurnBox()` function — this is the one part that now spans
  both files, since the server decides *what* can happen and the
  browser decides *how it's shown*.

## How this actually works (worth understanding once)

- `game-logic.js` holds every game rule and owns the "truth" — whose
  turn it is, everyone's money, what's on the board. It has no idea
  what a browser or a button is.
- `public/index.html` never changes the game state directly anymore.
  Every button just sends a small message like `{type:'rollDice'}`
  to the server and waits to be told what happened.
- `server.js` is the bridge: it keeps one `game-logic.js` "room" per
  game in progress, checks that whoever sent an action is actually
  allowed to (e.g. it's their turn), runs it, and sends the updated
  state back to everyone in that room.

## Known limitations (fine for testing, worth knowing)

- If someone's browser disconnects (closes the tab, loses wifi),
  their seat just sits idle — there's no reconnect/rejoin-your-seat
  flow yet.
- Anyone hosting a game over the open internet (via ngrok or similar)
  should know there's no password/security on a room beyond its
  4-letter code — fine among friends, not meant for the public internet.
