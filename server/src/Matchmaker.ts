import { GameRoom } from './GameRoom.js';

export class Matchmaker {
  private rooms = new Map<string, GameRoom>();
  private roomCounter = 0;
  private readonly MAX_PLAYERS_PER_ROOM = 48;

  findOrCreateRoom(): GameRoom {
    // Find room with available slots
    for (const room of this.rooms.values()) {
      const realPlayerCount = Array.from(room.players.values()).filter(
        (p) => !p.id.startsWith('bot_')
      ).length;

      if (realPlayerCount < this.MAX_PLAYERS_PER_ROOM) {
        return room;
      }
    }

    // Otherwise create new room
    const roomId = `arena_${++this.roomCounter}`;
    const newRoom = new GameRoom(roomId);
    this.rooms.set(roomId, newRoom);
    console.log(`[Matchmaker] Created new arena room: ${roomId}`);
    return newRoom;
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  cleanupEmptyRooms() {
    for (const [id, room] of this.rooms.entries()) {
      const realPlayerCount = Array.from(room.players.values()).filter(
        (p) => !p.id.startsWith('bot_')
      ).length;

      // When no real players remain, stop its physics/bot loop and free resources
      if (realPlayerCount === 0) {
        room.stop();
        this.rooms.delete(id);
        console.log(`[Matchmaker] Cleaned up empty room without real players: ${id}`);
      }
    }
  }

  getTotalRealPlayers(): number {
    let total = 0;
    for (const room of this.rooms.values()) {
      total += Array.from(room.players.values()).filter(
        (p) => !p.id.startsWith('bot_')
      ).length;
    }
    return total;
  }

  getActiveRoomCount(): number {
    return this.rooms.size;
  }
}

export const matchmaker = new Matchmaker();
