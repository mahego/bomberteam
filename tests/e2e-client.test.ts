import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';

test('WebSocket integration: player joins, receives Torneo del Poder snapshot with crates and powerups', async () => {
  const ws = new WebSocket('ws://127.0.0.1:3001/ws');

  await new Promise<void>((resolve, reject) => {
    ws.on('open', () => resolve());
    ws.on('error', (err) => reject(err));
  });

  // Send join message
  ws.send(JSON.stringify({
    type: 'join',
    name: 'Goku_ToP',
    character: 'robot',
    color: '#ff6600',
  }));

  // Wait for init and snapshot
  const receivedSnapshots: any[] = [];
  await new Promise<void>((resolve) => {
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'snapshot') {
        receivedSnapshots.push(msg);
        if (receivedSnapshots.length >= 3) {
          resolve();
        }
      }
    });
  });

  const latest = receivedSnapshots[receivedSnapshots.length - 1];
  assert.ok(latest.state, 'Snapshot must contain state');
  assert.ok(['power_tournament', 'floating_arena', 'urban_rooftop', 'danger_island'].includes(latest.state.mapType), 'Must have valid map');
  assert.ok(Object.keys(latest.state.crates).length > 0, 'Must have crates in the arena');
  assert.ok(Object.keys(latest.state.powerUps).length > 0, 'Must have powerups in the arena');

  // Verify player exists in state
  const myPlayer = Object.values(latest.state.players).find((p: any) => p.name === 'Goku_ToP') as any;
  assert.ok(myPlayer, 'Goku_ToP must be in room state');
  assert.equal(myPlayer.isAlive, true);

  ws.close();
});
