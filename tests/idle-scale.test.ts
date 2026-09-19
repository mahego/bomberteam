import test from 'node:test';
import assert from 'node:assert/strict';
import { Matchmaker } from '../server/src/Matchmaker.js';

test('Matchmaker cleans up empty rooms and terminates tick loop when no real players remain', () => {
  const mm = new Matchmaker();

  assert.equal(mm.getActiveRoomCount(), 0);
  assert.equal(mm.getTotalRealPlayers(), 0);

  // 1. Create a room by having a player join
  const room = mm.findOrCreateRoom();
  assert.equal(mm.getActiveRoomCount(), 1);

  // Fake websocket
  const fakeSocket = {
    readyState: 1,
    send: () => {},
  };

  // Add real player
  room.addPlayer('p_test123', fakeSocket, 'RealPlayer', 'robot', '#00ff00');
  assert.equal(mm.getTotalRealPlayers(), 1);

  // 2. Remove player
  room.removePlayer('p_test123');
  assert.equal(mm.getTotalRealPlayers(), 0);

  // 3. Trigger cleanup
  mm.cleanupEmptyRooms();

  // 4. Verify room was cleaned up and stopped to save CPU
  assert.equal(mm.getActiveRoomCount(), 0);
  assert.equal((room as any).tickInterval, null, 'Physics tick interval must be cleared to drop CPU to 0%');
});
