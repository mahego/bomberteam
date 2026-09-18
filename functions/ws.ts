import { matchmaker } from '../server/src/Matchmaker';
import { ClientMessage, ServerMessage } from '../shared/types';
import { GameRoom } from '../server/src/GameRoom';

interface PagesContext {
  request: Request;
  env: Record<string, any>;
}

// Cloudflare Pages Function handling /ws
export const onRequest = async (context: PagesContext): Promise<Response> => {
  const req = context.request;
  const upgradeHeader = req.headers.get('Upgrade');

  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket Upgrade header', { status: 426 });
  }

  // @ts-ignore Cloudflare Workers WebSocketPair
  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair) as [any, any];

  server.accept();

  const playerId = `p_${crypto.randomUUID().slice(0, 8)}`;
  let currentRoom: GameRoom | null = null;

  server.addEventListener('message', (event: any) => {
    try {
      const rawData = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
      const msg: ClientMessage = JSON.parse(rawData);

      if (msg.type === 'join') {
        const room = matchmaker.findOrCreateRoom();
        currentRoom = room;

        const player = room.addPlayer(
          playerId,
          server,
          msg.name,
          msg.character,
          msg.color,
          msg.experienceSeconds
        );

        const initMsg: ServerMessage = {
          type: 'init',
          playerId,
          roomId: room.id,
          mapType: room.mapType,
        };
        server.send(JSON.stringify(initMsg));
        console.log(`[CF Worker] Player "${player.name}" (${playerId}) joined room ${room.id}`);
      } else if (msg.type === 'input') {
        if (currentRoom) {
          currentRoom.handleInput(playerId, {
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
        if (currentRoom) {
          const player = currentRoom.players.get(playerId);
          if (player && !player.isAlive) {
            currentRoom.respawnPlayer(player);
          }
        }
      } else if (msg.type === 'ping') {
        const pongMsg: ServerMessage = {
          type: 'pong',
          clientTime: msg.clientTime,
          serverTime: Date.now(),
        };
        server.send(JSON.stringify(pongMsg));
      }
    } catch (err) {
      console.error('[CF Worker] Failed to handle message:', err);
    }
  });

  server.addEventListener('close', () => {
    if (currentRoom) {
      currentRoom.removePlayer(playerId);
      console.log(`[CF Worker] Player ${playerId} left room ${currentRoom.id}`);
      matchmaker.cleanupEmptyRooms();
    }
  });

  server.addEventListener('error', (err: any) => {
    console.error(`[CF Worker] WebSocket error on ${playerId}:`, err);
  });

  return new Response(null, {
    status: 101,
    // @ts-ignore
    webSocket: client,
  });
};
