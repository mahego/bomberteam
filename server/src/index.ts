import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import { matchmaker } from './Matchmaker.js';
import { ClientMessage, ServerMessage } from '../../shared/types.js';
import { GameRoom } from './GameRoom.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: Date.now() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server, path: '/ws' });

interface ClientSession {
  playerId: string;
  room: GameRoom | null;
  ws: WebSocket;
}

const sessions = new Map<WebSocket, ClientSession>();

wss.on('connection', (ws: WebSocket) => {
  const playerId = `p_${crypto.randomUUID().slice(0, 8)}`;
  const session: ClientSession = {
    playerId,
    room: null,
    ws,
  };
  sessions.set(ws, session);

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
  });

  ws.on('error', (err) => {
    console.error(`[Server] WebSocket error on ${playerId}:`, err);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [Server] BomberTeam WebSocket Server running on port ${PORT} (/ws)`);
});
