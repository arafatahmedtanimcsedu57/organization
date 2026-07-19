import net from 'node:net';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('[wait-for-db] DATABASE_URL is not set');
  process.exit(1);
}

const { hostname, port } = new URL(databaseUrl);
const maxAttempts = 30;
const delayMs = 1000;

function tryConnect(attempt) {
  const socket = net.createConnection({ host: hostname, port: Number(port) || 5432 });

  socket.once('connect', () => {
    socket.end();
    console.log('[wait-for-db] database is reachable');
    process.exit(0);
  });

  socket.once('error', () => {
    socket.destroy();
    if (attempt >= maxAttempts) {
      console.error(`[wait-for-db] database not reachable after ${maxAttempts} attempts`);
      process.exit(1);
    }
    console.log(`[wait-for-db] waiting for database (attempt ${attempt}/${maxAttempts})...`);
    setTimeout(() => tryConnect(attempt + 1), delayMs);
  });
}

tryConnect(1);
