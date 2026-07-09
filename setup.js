const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('📦 Starting MetroMind AI project setup...');

const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');

// 1. Setup Frontend
console.log('\n--- Frontend Setup ---');
try {
  console.log('Installing frontend npm dependencies...');
  execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });
  console.log('✓ Frontend dependencies installed successfully.');
} catch (err) {
  console.error('✗ Failed to install frontend dependencies:', err.message);
}

// 2. Setup Backend
console.log('\n--- Backend Setup ---');
try {
  const venvDir = path.join(backendDir, 'venv');
  if (!fs.existsSync(venvDir)) {
    console.log('Creating python virtual environment (venv)...');
    execSync('python -m venv venv', { cwd: backendDir, stdio: 'inherit' });
    console.log('✓ Virtual environment created.');
  } else {
    console.log('✓ Virtual environment already exists.');
  }

  // Find pip executable inside virtual environment
  let pipPath = 'pip';
  const windowsPip = path.join(venvDir, 'Scripts', 'pip.exe');
  const unixPip = path.join(venvDir, 'bin', 'pip');

  if (fs.existsSync(windowsPip)) {
    pipPath = windowsPip;
  } else if (fs.existsSync(unixPip)) {
    pipPath = unixPip;
  }

  console.log(`Using pip at: ${pipPath}`);
  console.log('Installing backend python dependencies...');
  execSync(`"${pipPath}" install -r requirements.txt`, { cwd: backendDir, stdio: 'inherit' });
  console.log('✓ Backend dependencies installed successfully.');
} catch (err) {
  console.error('✗ Failed to set up backend virtual environment / dependencies:', err.message);
}

console.log('\n✨ Setup completed! You can now run both servers with:');
console.log('👉 npm run dev\n');
