/**
 * Starts Metro behind a free Cloudflare quick tunnel.
 *
 * Expo's own `--tunnel` flag is unusable on free ngrok accounts: @expo/ngrok
 * still ships ngrok agent 2.3.x, and ngrok rejects any agent below 3.20.0
 * (ERR_NGROK_121). This does the same job with cloudflared instead.
 *
 * Usage: npm run start:tunnel -- --clear
 */

const { spawn } = require('node:child_process');

const PORT = process.env.RCT_METRO_PORT || '8081';
const URL_PATTERN = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
const URL_TIMEOUT_MS = 45_000;

/** Spawns cloudflared and resolves once it prints its public URL. */
function startCloudflared() {
  const child = spawn(
    'cloudflared',
    ['tunnel', '--url', `http://localhost:${PORT}`, '--no-autoupdate'],
    { shell: true }
  );

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`cloudflared did not report a URL within ${URL_TIMEOUT_MS / 1000}s`));
    }, URL_TIMEOUT_MS);

    // cloudflared logs to stderr, but watch both so we don't miss a change.
    const scan = (buf) => {
      const match = URL_PATTERN.exec(buf.toString());
      if (!match) return;
      clearTimeout(timer);
      child.stdout.off('data', scan);
      child.stderr.off('data', scan);
      resolve({ child, url: match[0] });
    };

    child.stdout.on('data', scan);
    child.stderr.on('data', scan);

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`could not run cloudflared: ${err.message}`));
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`cloudflared exited early with code ${code}`));
    });
  });
}

async function main() {
  console.log(`Opening Cloudflare tunnel to localhost:${PORT}...`);
  const { child: tunnel, url } = await startCloudflared();
  console.log(`Tunnel ready: ${url}\n`);

  const expo = spawn(
    'npx',
    ['expo', 'start', '--host', 'lan', ...process.argv.slice(2)],
    {
      shell: true,
      stdio: 'inherit',
      env: {
        ...process.env,
        EXPO_PACKAGER_PROXY_URL: url,
        EXPO_NO_DEPENDENCY_VALIDATION: '1',
      },
    }
  );

  const shutdown = () => {
    tunnel.kill();
    expo.kill();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  expo.on('exit', (code) => {
    tunnel.kill();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(`\nTunnel startup failed: ${err.message}`);
  process.exit(1);
});
