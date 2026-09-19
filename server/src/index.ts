import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import { matchmaker } from './Matchmaker.js';
import { ClientMessage, ServerMessage } from '../../shared/types.js';
import { GameRoom } from './GameRoom.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Idle timeout in milliseconds before suspending/stopping (default: 2 minutes; 0 in test mode)
const IDLE_TIMEOUT_MS = process.env.IDLE_TIMEOUT_MS !== undefined
  ? parseInt(process.env.IDLE_TIMEOUT_MS, 10)
  : (process.env.NODE_ENV === 'test' ? 0 : 120_000);

let idleTimer: NodeJS.Timeout | null = null;

function checkIdleStatus() {
  const realPlayers = matchmaker.getTotalRealPlayers();
  const activeSessions = sessions.size;

  if (realPlayers === 0 && activeSessions === 0) {
    if (!idleTimer && IDLE_TIMEOUT_MS > 0) {
      console.log(`[Server] No real players active. Starting idle countdown (${IDLE_TIMEOUT_MS / 1000}s) before suspending...`);
      idleTimer = setTimeout(() => {
        console.log('[Server] 🛑 Idle timeout reached with 0 real players. Shutting down cleanly to suspend Fly.io machine (cost $0).');
        shutdownServer();
      }, IDLE_TIMEOUT_MS);
      if (idleTimer.unref) idleTimer.unref();
    }
  } else {
    if (idleTimer) {
      console.log('[Server] Real player activity detected, cancelling idle suspension countdown.');
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }
}

function shutdownServer() {
  matchmaker.cleanupEmptyRooms();
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
  // Fallback exit if any socket hang
  setTimeout(() => process.exit(0), 1000).unref();
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      time: Date.now(),
      realPlayers: matchmaker.getTotalRealPlayers(),
      activeRooms: matchmaker.getActiveRoomCount(),
    }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server, path: '/ws' });

interface ExtWebSocket extends WebSocket {
  isAlive?: boolean;
}

interface ClientSession {
  playerId: string;
  room: GameRoom | null;
  ws: WebSocket;
}

const sessions = new Map<WebSocket, ClientSession>();

// Heartbeat ping-pong to detect and immediately purge dead/zombie sockets
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const extWs = ws as ExtWebSocket;
    if (extWs.isAlive === false) {
      console.log('[Server] Terminating unresponsive/zombie WebSocket connection');
      return extWs.terminate();
    }
    extWs.isAlive = false;
    extWs.ping();
  });
}, 30000);
if (heartbeatInterval.unref) heartbeatInterval.unref();

wss.on('connection', (ws: WebSocket) => {
  const extWs = ws as ExtWebSocket;
  extWs.isAlive = true;
  extWs.on('pong', () => {
    extWs.isAlive = true;
  });

  const playerId = `p_${crypto.randomUUID().slice(0, 8)}`;
  const session: ClientSession = {
    playerId,
    room: null,
    ws,
  };
  sessions.set(ws, session);
  checkIdleStatus();

  ws.on('message', (rawData: string) => {
    try {
      const msg: ClientMessage = JSON.parse(rawData.toString());

      if (msg.type === 'join') {
        // Automatic matchmaking: assign to best available room
        const room = matchmaker.findOrCreateRoom();
        session.room = room;

        const player = room.addPlayer(
          playerId,
          ws,
          msg.name,
          msg.character,
          msg.color,
          msg.experienceSeconds
        );

        // Send init message
        const initMsg: ServerMessage = {
          type: 'init',
          playerId,
          roomId: room.id,
          mapType: room.mapType,
        };
        ws.send(JSON.stringify(initMsg));
        console.log(`[Server] Player "${player.name}" (${playerId}) joined room ${room.id}`);
        checkIdleStatus();
      } else if (msg.type === 'input') {
        if (session.room) {
          session.room.handleInput(playerId, {
            moveX: msg.moveX,
            moveZ: msg.moveZ,
            jump: msg.jump,
            punch: msg.punch,
            kick: msg.kick,
            throwBomb: msg.throwBomb,
            dropBomb: msg.dropBomb,
            grab: msg.grab,
            sprint: msg.sprint,
            lookAngle: msg.lookAngle,
            seq: msg.seq,
          });
        }
      } else if (msg.type === 'respawn') {
        if (session.room) {
          const player = session.room.players.get(playerId);
          if (player && !player.isAlive) {
            session.room.respawnPlayer(player);
          }
        }
      } else if (msg.type === 'ping') {
        const pongMsg: ServerMessage = {
          type: 'pong',
          clientTime: msg.clientTime,
          serverTime: Date.now(),
        };
        ws.send(JSON.stringify(pongMsg));
      }
    } catch (err) {
      console.error('[Server] Failed to handle message:', err);
    }
  });

  ws.on('close', () => {
    if (session.room) {
      session.room.removePlayer(playerId);
      console.log(`[Server] Player ${playerId} left room ${session.room.id}`);
      matchmaker.cleanupEmptyRooms();
    }
    sessions.delete(ws);
    checkIdleStatus();
  });

  ws.on('error', (err) => {
    console.error(`[Server] WebSocket error on ${playerId}:`, err);
  });
});

process.on('SIGTERM', () => {
  console.log('[Server] Received SIGTERM signal, exiting cleanly...');
  shutdownServer();
});
process.on('SIGINT', () => {
  console.log('[Server] Received SIGINT signal, exiting cleanly...');
  shutdownServer();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [Server] BomberTeam WebSocket Server running on port ${PORT} (/ws)`);
  checkIdleStatus();
});
