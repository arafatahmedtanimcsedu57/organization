/** Polls a URL until it responds (any status) or gives up. Usage: `node wait-for-http.mjs <url>`. */
const url = process.argv[2];
if (!url) {
  console.error('[wait-for-http] usage: node wait-for-http.mjs <url>');
  process.exit(1);
}

const maxAttempts = 60;
const delayMs = 1000;

async function tryFetch(attempt) {
  try {
    await fetch(url);
    console.log(`[wait-for-http] ${url} is reachable`);
    return;
  } catch {
    if (attempt >= maxAttempts) {
      console.error(`[wait-for-http] ${url} not reachable after ${maxAttempts} attempts`);
      process.exit(1);
    }
    console.log(`[wait-for-http] waiting for ${url} (attempt ${attempt}/${maxAttempts})...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await tryFetch(attempt + 1);
  }
}

await tryFetch(1);
