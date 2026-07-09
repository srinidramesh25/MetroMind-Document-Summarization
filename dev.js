const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const frontendDir = path.join(__dirname, 'frontend');
const backendDir = path.join(__dirname, 'backend');

console.log('🚀 Starting MetroMind AI (Frontend & Backend)...');

// 1. Determine Backend Python Command
let pythonPath = 'python';
const venvPython = path.join(backendDir, 'venv', 'Scripts', 'python.exe');
const unixVenvPython = path.join(backendDir, 'venv', 'bin', 'python');

if (fs.existsSync(venvPython)) {
  pythonPath = venvPython;
  console.log(`✓ Using backend virtual environment python: ${pythonPath}`);
} else if (fs.existsSync(unixVenvPython)) {
  pythonPath = unixVenvPython;
  console.log(`✓ Using backend virtual environment python: ${pythonPath}`);
} else {
  console.log('⚠️ Backend venv not found. Running with global python.');
}

// 2. Start Frontend Process
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: frontendDir,
  shell: true,
  stdio: 'inherit'
});

// 3. Start Backend Process
const backend = spawn(pythonPath, ['-m', 'uvicorn', 'app.main:app', '--reload', '--port', '8000'], {
  cwd: backendDir,
  shell: false,
  stdio: 'inherit'
});

// Helper to kill both processes safely on exit
function cleanup() {
  console.log('\nStopping development servers...');
  
  if (process.platform === 'win32') {
    // On Windows, spawned processes can sometimes leave orphaned children if killed directly
    spawn('taskkill', ['/pid', frontend.pid, '/f', '/t']);
    spawn('taskkill', ['/pid', backend.pid, '/f', '/t']);
  } else {
    frontend.kill('SIGINT');
    backend.kill('SIGINT');
  }
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
