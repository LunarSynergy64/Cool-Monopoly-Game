// ================================================================
// Property Trader — multiplayer server
//
// This file owns the ONE true copy of every room's game state.
// Browsers never run game logic themselves — they send an
// {type, args} action, this server runs the same functions from
// game-logic.js (the exact rules code, unchanged from the solo
// version), then broadcasts the new state to everyone in the room.
//
// To update the RULES: edit game-logic.js, restart this server.
// To update the LOOK/LAYOUT: edit public/index.html, just refresh
// the browser (no server restart needed for that half).
// ================================================================

const express = require('express');
const http = require('http');
const crypto = require('crypto');
const { Server } = require('socket.io');
const gameLogic = require('./game-logic');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + '/public'));

// How long a player can go without acting before they're auto-forfeited,
// and how often rooms are swept to check. Overridable via env vars so a
// live verification pass can use a short timeout without editing (and
// having to remember to revert) this file.
const AFK_TIMEOUT_MS = parseInt(process.env.AFK_TIMEOUT_MS) || 5 * 60 * 1000;
const AFK_SWEEP_INTERVAL_MS = parseInt(process.env.AFK_SWEEP_INTERVAL_MS) || 30 * 1000;

// rooms[code] = {
//   phase: 'lobby' | 'live',
//   lobby: { hostId, numPlayers, ruleset, players: [{id, name, piece, ready, disconnected}, ...] } | null,
//   state, // gameLogic state — null until the host starts the game
//   seats: [{socketId, reconnectToken}, ...], // index = playerId; socketId is null while disconnected
//   maxPlayers,
//   actionableSince, // ms timestamp — when trackedActingPlayerId became "on the hook"
//   trackedActingPlayerId, // whoever the game is currently waiting on (see whoIsOnTheHook)
// }
// A room starts in 'lobby' (no gameLogic state exists yet) so players can
// join independently, pick a piece, and ready up before the game actually
// begins — see the 'lobbyChoosePiece'/'lobbyToggleReady'/'lobbyStartGame'
// handlers below. Once the host starts it, the room switches to 'live'
// and locks against NEW lobby joins — but see 'rejoin'/'subIntoSeat'/
// 'joinAsNewPlayer' below for how a live room still accepts returning or
// new players (a plain "That game has already started" rejection was the
// old behavior, before reconnect support existed).
const rooms = {};

function makeRoomCode(){
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O, avoids confusion
  let code;
  do {
    code = Array.from({length:4}, () => letters[Math.floor(Math.random()*letters.length)]).join('');
  } while (rooms[code]);
  return code;
}

// A random per-seat secret, handed to the client alongside 'joined' and
// echoed back on 'rejoin' — this (plus the room code, plus knowing your
// own playerId) is what lets a reloaded tab silently reclaim its own
// seat instead of some ordinary code+id guess, casual as that bar is for
// a game played among friends off a shared room code anyway.
function makeReconnectToken(){
  return crypto.randomBytes(16).toString('hex');
}

// Called instead of a flat rejection when someone enters a room code for
// a room that's already live — lists every seat nobody's currently
// connected to (so a new joiner can offer to sub in) plus whether the
// roster still has room to grow past its original size (see addPlayer /
// joinAsNewPlayer).
function sendLiveRoomJoinOptions(socket, code, room){
  const disconnectedSeats = room.seats
    .map((seat, id) => ({ id, name: room.state.players[id].name, piece: room.state.players[id].piece, connected: !!seat.socketId }))
    .filter(s => !s.connected);
  socket.emit('liveRoomJoinOptions', {
    roomCode: code,
    disconnectedSeats,
    canAddNew: room.state.players.length < 8,
    takenPieces: room.state.players.map(p => p.piece).filter(Boolean),
  });
}

// Whoever the game is actually waiting on right now — the current
// player, unless a trade is pending a response, in which case it's the
// trade's recipient (the proposer already acted; they're not the one
// holding things up).
function whoIsOnTheHook(state){
  return state.pendingTrade ? state.pendingTrade.toId : state.current;
}

function broadcastState(code){
  const room = rooms[code];
  if(!room) return;
  if(room.actionableSince != null){
    room.state.afkPlayerId = room.trackedActingPlayerId;
    room.state.afkDeadline = room.actionableSince + AFK_TIMEOUT_MS;
  }
  io.to(code).emit('state', room.state);
}

function broadcastLobby(code){
  const room = rooms[code];
  if(!room) return;
  io.to(code).emit('lobbyState', room.lobby);
}

// Shared by the real 'disconnect' event and the deliberate 'leaveRoom'
// action (leaving a lobby you meant to join instead of create, say) —
// same bookkeeping either way: free up the seat, mark that player
// disconnected. A lobby-phase room with nobody left connected to any
// seat gets deleted outright rather than sitting there forever — there's
// no game state at stake yet, so there's nothing worth preserving.
function handleSeatLeave(socket){
  const code = socket.data.roomCode;
  const room = code && rooms[code];
  if(!room) return;
  const playerId = socket.data.playerId;
  const seat = room.seats && room.seats[playerId];
  // Guard against a stale disconnect firing after a faster reconnect
  // (e.g. a quick double-refresh) already claimed this seat with a
  // new socket — only clear it if THIS socket still owns it.
  if(!seat || seat.socketId !== socket.id) return;
  seat.socketId = null;

  if(room.phase === 'lobby' && room.lobby){
    const p = room.lobby.players.find(p=>p.id===playerId);
    if(p) p.disconnected = true;
    if(room.seats.every(s => !s.socketId)){
      delete rooms[code];
      return;
    }
    broadcastLobby(code);
  } else if(room.phase === 'live' && room.state){
    const p = room.state.players[playerId];
    if(p){ p.disconnected = true; broadcastState(code); }
  }
}

// Actions that require it to be the acting player's own turn
const TURN_GATED = new Set([
  'rollDice','rollAgain','confirmSmallMove','skipRoll','playCard',
  'chooseTeleportDestination','chooseCardTarget','chooseTaxationDestination',
  'chooseSwitchAnyFirst','chooseSwitchAnySecond',
  'flipCoinsForSteal','resolveCoinStealOutcome',
  'takeGoBonusMoney','chooseGoTeleportOption','chooseGoTeleportDestination',
  'chooseTheftTarget','chooseTheftGiveback','flipCoinsForCustom','chooseCustomDiceValues','resolveCustomNoEffect',
  'flipCoinsForSlow','resolveSlowFlipsOutcome',
  'flipCoinsForBonus','chooseSpeedFlipBonus','flipCoinsForCurse','resolveCurseOutcome','distributeCurseLoss',
  'acknowledgeRevealCard',
  'flipCoinsForFlipDraw','resolveFlipDrawOutcome',
  'flipCoinsForDemolisher','demolishHouse','skipDemolisherDestroy',
  'flipCoinsForLottery','resolveLotteryOutcome','chooseLotteryDestination',
  'chooseUpForGrabsProperty','skipUpForGrabs',
  'flipCoinsForBuilder','buildHouseFromBuilder','skipBuilderBuild',
  'chooseDiceCount','chooseGoAnywhereDestination',
  'choosePassByProperty','chooseCardSwitchTheirs','chooseCardSwitchMine',
  'distributeUnoReverseRent','flipCoinsForDriveByCoin','resolveDriveByCoinOutcome',
  'chooseTeleportOtherDestination','assignGiveawayCard',
  'chooseHalfChoosingValue','flipCoinsForGamblingNight','resolveGamblingNightOutcome',
  'performReroll', 'chooseGoAbility',
  'acknowledgeFreeloProperty',
  'buyProperty','skipBuy','stealMortgagedProperty','skipSteal',
  'buyHouse','sellHouse','placeVampireHouse','mortgageProperty','unmortgageProperty',
  'endTurn','serveJailTurn','rollForJailBreak','useGetOutOfJailFree','proposeTrade',
]);

// Actions that require being the recipient of the pending trade
const TRADE_GATED = new Set(['acceptTrade','declineTrade']);

// Debug actions are never turn-gated, but always forced to target yourself
const DEBUG_ACTIONS = new Set(['debugAddMoney','debugGiveProperty','debugGiveCard','debugGiveAbility']);

// Managing your own hand (discarding) is always available, on anyone's
// turn — never turn-gated, but always forced to target yourself so you
// can't discard someone else's cards.
const SELF_ONLY_ACTIONS = new Set(['discardCard', 'redrawRentThiefCard']);

// The only two actions allowed while a room is paused — always available
// to any active player, always forced to target themselves. Every other
// action type is rejected outright while state.paused is true (see the
// 'action' handler below).
const PAUSE_ACTIONS = new Set(['requestPause', 'voteUnpause']);

io.on('connection', (socket) => {

  socket.on('joinRoom', ({ name, roomCode, numPlayers, ruleset }) => {
    let code = roomCode;

    if(code){
      const room = rooms[code];
      if(!room){
        socket.emit('errorMsg', 'No game found with that room code.');
        return;
      }
      if(room.phase !== 'lobby'){
        sendLiveRoomJoinOptions(socket, code, room);
        return;
      }
      if(room.seats.length >= room.maxPlayers){
        socket.emit('errorMsg', 'That room is already full.');
        return;
      }
      const playerId = room.seats.length;
      const reconnectToken = makeReconnectToken();
      room.seats.push({ socketId: socket.id, reconnectToken });
      room.lobby.players.push({ id: playerId, name: (name || 'Player '+(playerId+1)).slice(0, 20), piece: null, ready: false, disconnected: false });
      socket.data.roomCode = code;
      socket.data.playerId = playerId;
      socket.join(code);
      socket.emit('joined', { playerId, roomCode: code, reconnectToken });
      broadcastLobby(code);
      return;
    }

    // Creating a new room — starts in the lobby, not a live game.
    // normalizeRuleset clamps/defaults everything, so a malformed or
    // missing ruleset from the client just falls back to today's behavior
    // (all cards/abilities on, random mode, one ability per player).
    const n = Math.min(8, Math.max(2, parseInt(numPlayers) || 4));
    code = makeRoomCode();
    const normalizedRuleset = gameLogic.normalizeRuleset(ruleset);
    const reconnectToken = makeReconnectToken();

    rooms[code] = {
      phase: 'lobby',
      lobby: {
        hostId: 0,
        numPlayers: n,
        ruleset: normalizedRuleset,
        players: [{ id: 0, name: (name || 'Player 1').slice(0, 20), piece: null, ready: false, disconnected: false }],
      },
      state: null,
      seats: [{ socketId: socket.id, reconnectToken }],
      maxPlayers: n,
    };
    socket.data.roomCode = code;
    socket.data.playerId = 0;
    socket.join(code);
    socket.emit('joined', { playerId: 0, roomCode: code, reconnectToken });
    broadcastLobby(code);
  });

  // A reloaded (or reopened, if sessionStorage somehow survived) tab
  // calling back with what it remembers — the room code, its old
  // playerId, and the secret token 'joined' gave it at the time. Works
  // identically whether that seat is currently in the lobby or a live
  // game; either way the normal lobbyState/state broadcast that follows
  // is what actually puts the right screen back in front of them, so
  // there's no separate rendering path to maintain for this.
  socket.on('rejoin', ({ roomCode, playerId, reconnectToken }) => {
    const room = roomCode && rooms[roomCode];
    const seat = room && room.seats && room.seats[playerId];
    if(!seat || !reconnectToken || seat.reconnectToken !== reconnectToken){
      socket.emit('rejoinFailed', 'Could not reconnect to that game — join again below.');
      return;
    }
    seat.socketId = socket.id;
    socket.data.roomCode = roomCode;
    socket.data.playerId = playerId;
    socket.join(roomCode);

    if(room.phase === 'lobby'){
      const p = room.lobby.players.find(p=>p.id===playerId);
      if(p) p.disconnected = false;
      socket.emit('joined', { playerId, roomCode, reconnectToken });
      broadcastLobby(roomCode);
    } else {
      const p = room.state.players[playerId];
      if(p) p.disconnected = false;
      socket.emit('joined', { playerId, roomCode, reconnectToken });
      broadcastState(roomCode);
    }
  });

  // Take over a seat nobody's currently connected to, exactly as it
  // stands — same cards, money, properties, position. No rename, no
  // piece change: you're continuing that identity, not starting a new
  // one (see joinAsNewPlayer for that instead).
  socket.on('subIntoSeat', ({ roomCode, playerId }) => {
    const room = roomCode && rooms[roomCode];
    if(!room || room.phase !== 'live') return;
    const seat = room.seats && room.seats[playerId];
    if(!seat){
      socket.emit('errorMsg', 'That seat no longer exists.');
      return;
    }
    if(seat.socketId){
      socket.emit('errorMsg', 'That seat is no longer available — someone already reconnected to it.');
      return;
    }
    const reconnectToken = makeReconnectToken();
    seat.socketId = socket.id;
    seat.reconnectToken = reconnectToken;
    socket.data.roomCode = roomCode;
    socket.data.playerId = playerId;
    socket.join(roomCode);
    const p = room.state.players[playerId];
    if(p) p.disconnected = false;
    socket.emit('joined', { playerId, roomCode, reconnectToken });
    broadcastState(roomCode);
  });

  // Join a live game as a brand-new player — only reachable when nobody
  // wants (or is available) to sub into an existing seat. Starts fresh
  // (see addPlayer in game-logic.js): $1500, position 0, no properties —
  // a real disadvantage against players already mid-game, accepted as
  // the tradeoff for being able to join at all.
  socket.on('joinAsNewPlayer', ({ roomCode, name, pieceId }) => {
    const room = roomCode && rooms[roomCode];
    if(!room || room.phase !== 'live') return;
    gameLogic.setState(room.state);
    const takenByOther = gameLogic.getState().players.some(p => p.piece === pieceId);
    const playerId = gameLogic.addPlayer(name, takenByOther ? null : pieceId);
    room.state = gameLogic.getState();
    if(playerId == null){
      socket.emit('errorMsg', 'This game is already at the maximum of 8 players.');
      return;
    }
    const reconnectToken = makeReconnectToken();
    room.seats[playerId] = { socketId: socket.id, reconnectToken };
    socket.data.roomCode = roomCode;
    socket.data.playerId = playerId;
    socket.join(roomCode);
    socket.emit('joined', { playerId, roomCode, reconnectToken });
    broadcastState(roomCode);
  });

  socket.on('lobbyChoosePiece', ({ pieceId }) => {
    const code = socket.data.roomCode;
    const room = code && rooms[code];
    if(!room || room.phase !== 'lobby') return;
    const me = room.lobby.players.find(p=>p.id === socket.data.playerId);
    if(!me) return;
    const takenByOther = room.lobby.players.some(p => p.id !== me.id && p.piece === pieceId);
    if(takenByOther) return;
    me.piece = pieceId || null;
    broadcastLobby(code);
  });

  socket.on('lobbyToggleReady', ({ ready }) => {
    const code = socket.data.roomCode;
    const room = code && rooms[code];
    if(!room || room.phase !== 'lobby') return;
    const me = room.lobby.players.find(p=>p.id === socket.data.playerId);
    if(!me) return;
    if(ready && !me.piece){
      socket.emit('errorMsg', 'Choose a piece before readying up.');
      return;
    }
    me.ready = !!ready;
    broadcastLobby(code);
  });

  socket.on('lobbyStartGame', () => {
    const code = socket.data.roomCode;
    const room = code && rooms[code];
    if(!room || room.phase !== 'lobby') return;
    if(socket.data.playerId !== room.lobby.hostId){
      socket.emit('errorMsg', "Only the host can start the game.");
      return;
    }
    if(room.lobby.players.length !== room.lobby.numPlayers){
      socket.emit('errorMsg', 'Waiting for more players to join.');
      return;
    }
    if(!room.lobby.players.every(p=>p.ready)){
      socket.emit('errorMsg', 'Not everyone is ready yet.');
      return;
    }

    const pieceIds = room.lobby.players.map(p=>p.piece);
    gameLogic.setState(null);
    gameLogic.newGame(room.lobby.numPlayers, pieceIds, room.lobby.ruleset);
    const state = gameLogic.getState();
    room.lobby.players.forEach(p=>{ state.players[p.id].name = p.name; });

    room.phase = 'live';
    room.state = state;
    room.lobby = null;
    room.trackedActingPlayerId = whoIsOnTheHook(state);
    room.actionableSince = Date.now();
    broadcastState(code);
  });

  socket.on('action', ({ type, args }) => {
    const code = socket.data.roomCode;
    const room = code && rooms[code];
    if(!room || room.phase !== 'live') return;
    const playerId = socket.data.playerId;
    args = args || [];

    const fn = gameLogic[type];
    if(typeof fn !== 'function') return;

    gameLogic.setState(room.state);
    const state = gameLogic.getState();

    if(PAUSE_ACTIONS.has(type)){
      args[0] = playerId; // always target yourself, regardless of what the client sent
    } else if(state.paused){
      socket.emit('errorMsg', 'The game is paused — waiting for everyone to agree to unpause.');
      return;
    } else {
      if(TURN_GATED.has(type) && playerId !== state.current){
        socket.emit('errorMsg', "It's not your turn.");
        return;
      }
      if(TRADE_GATED.has(type)){
        if(!state.pendingTrade || playerId !== state.pendingTrade.toId){
          socket.emit('errorMsg', 'No pending trade for you to respond to.');
          return;
        }
      }
      if(DEBUG_ACTIONS.has(type)){
        // Enforced here, not just hidden client-side — the ruleset's
        // enableDebugTools is off by default specifically so a public
        // game can't have someone reach for these via devtools even if
        // the UI never shows the button.
        if(!state.ruleset.enableDebugTools){
          socket.emit('errorMsg', 'Debug tools are disabled for this game.');
          return;
        }
        args[0] = playerId;
      } else if(SELF_ONLY_ACTIONS.has(type)){
        args[0] = playerId; // always target yourself, regardless of what the client sent
      }
    }

    try {
      fn(...args);
    } catch (err) {
      console.error('Action error:', type, err);
      return;
    }

    room.state = gameLogic.getState();

    // A pause action that leaves the room unpaused — either the final
    // unanimous vote just landed, or a stray requestPause no-op'd because
    // it was already paused — always gets a fresh AFK grace period.
    // Pausing exists specifically to protect against that timer, so
    // resuming should never inherit a stale countdown. Ordinary actions
    // keep the existing reset-on-change-of-who's-on-the-hook logic; both
    // are skipped entirely while still paused, since the sweep already
    // ignores paused rooms.
    if(PAUSE_ACTIONS.has(type) && !room.state.paused){
      room.trackedActingPlayerId = whoIsOnTheHook(room.state);
      room.actionableSince = Date.now();
    } else if(!room.state.paused){
      const onTheHook = whoIsOnTheHook(room.state);
      if(onTheHook !== room.trackedActingPlayerId){
        room.trackedActingPlayerId = onTheHook;
        room.actionableSince = Date.now();
      } else if(playerId === onTheHook){
        room.actionableSince = Date.now();
      }
    }

    broadcastState(code);
  });

  socket.on('disconnect', () => {
    handleSeatLeave(socket);
  });

  // Deliberately leaving a room (wrong room, accidentally created
  // instead of joined, etc.) — same bookkeeping as a disconnect
  // (handleSeatLeave doesn't care why the seat's going empty), plus
  // actually leaving the socket.io room channel so this socket stops
  // getting broadcasts for whatever it's leaving, and clearing its own
  // roomCode/playerId so it's a clean slate to join or create the next
  // one. Only the lobby screen's "← Leave" button emits this today, but
  // nothing here is lobby-specific — handleSeatLeave already handles a
  // live-game seat the same way a disconnect would.
  socket.on('leaveRoom', () => {
    const code = socket.data.roomCode;
    handleSeatLeave(socket);
    if(code) socket.leave(code);
    socket.data.roomCode = null;
    socket.data.playerId = null;
  });
});

// Sweeps every live room and forfeits whoever's been on the hook past
// AFK_TIMEOUT_MS. Paused rooms are skipped entirely — see Stage E's
// `state.paused` — since pausing exists specifically to protect against
// this timer while someone steps away deliberately.
setInterval(() => {
  const now = Date.now();
  for(const code of Object.keys(rooms)){
    const room = rooms[code];
    if(room.phase !== 'live' || !room.state) continue;
    if(room.state.paused) continue;
    if(room.actionableSince == null || room.trackedActingPlayerId == null) continue;
    if(now - room.actionableSince < AFK_TIMEOUT_MS) continue;

    gameLogic.setState(room.state);
    gameLogic.forfeitPlayer(room.trackedActingPlayerId);
    room.state = gameLogic.getState();

    room.trackedActingPlayerId = whoIsOnTheHook(room.state);
    room.actionableSince = now;
    broadcastState(code);
  }
}, AFK_SWEEP_INTERVAL_MS);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Property Trader server running at http://localhost:' + PORT);
});
