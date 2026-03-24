const net = require('net');
const { spawn } = require('child_process');

// Function to check if a port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.close(() => {
        resolve(true);
      });
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

// Function to find an available port
async function findAvailablePort(startPort) {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    console.log(`⚠️  Port ${port} is busy, trying port ${port + 1}...`);
    port++;
  }
  return port;
}

// Main function
async function startServer() {
  const preferredPort = process.env.PORT || 3000;
  const availablePort = await findAvailablePort(parseInt(preferredPort));
  
  if (availablePort !== parseInt(preferredPort)) {
    console.log(`🔄 Port ${preferredPort} was busy, using port ${availablePort} instead`);
  }
  
  // Set the port environment variable
  process.env.PORT = availablePort.toString();
  
  console.log(`🚀 Starting server on port ${availablePort}...`);
  
  // Start the actual server
  const serverProcess = spawn('npm', ['run', 'dev:direct'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: availablePort.toString() }
  });
  
  serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
  
  serverProcess.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
  });
}

startServer().catch(console.error);
