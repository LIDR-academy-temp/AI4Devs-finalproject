// Starts the API and web dev servers and the background worker together (`npm run dev`
// from finalproject-GR), prefixing each line of output with its app. Ctrl+C, or any of
// them exiting, stops the rest. Plain Node instead of a `concurrently` dependency, same posture as the other
// scripts here. Postgres (docker compose up -d) is not started by this.
const { spawn, execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const apps = [
  { name: 'api', workspace: 'apps/api', color: '\x1b[36m' },
  { name: 'web', workspace: 'apps/web', color: '\x1b[35m' },
  { name: 'worker', workspace: 'apps/worker', color: '\x1b[33m' },
];
const reset = '\x1b[0m';

let stopping = false;
const children = apps.map((app) => {
  const child = spawn('npm', ['run', 'dev', '-w', app.workspace], { cwd: root, shell: true });
  const prefix = `${app.color}[${app.name}]${reset} `;
  for (const stream of [child.stdout, child.stderr]) {
    let pending = '';
    stream.on('data', (chunk) => {
      const lines = (pending + chunk.toString()).split(/\r?\n/);
      pending = lines.pop();
      for (const line of lines) process.stdout.write(prefix + line + '\n');
    });
  }
  child.on('exit', (code) => {
    if (!stopping) {
      console.log(`${prefix}exited with code ${code}; stopping the others.`);
      stopAll(code ?? 1);
    }
  });
  return child;
});

function stopAll(exitCode) {
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      // npm runs under a shell on Windows; kill the whole process tree, not just the shell.
      try {
        execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
      } catch {
        // Already gone.
      }
    } else {
      child.kill('SIGINT');
    }
  }
  process.exit(exitCode);
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
