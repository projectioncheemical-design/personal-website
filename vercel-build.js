const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Helper function to log messages
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  switch (type) {
    case 'success':
      console.log(`${colors.green}✓${colors.reset} [${timestamp}] ${message}`);
      break;
    case 'error':
      console.error(`${colors.red}✗${colors.reset} [${timestamp}] ${colors.red}${message}${colors.reset}`);
      break;
    case 'warning':
      console.warn(`${colors.yellow}⚠${colors.reset} [${timestamp}] ${colors.yellow}${message}${colors.reset}`);
      break;
    case 'info':
    default:
      console.log(`${colors.blue}i${colors.reset} [${timestamp}] ${message}`);
  }
}

// Helper function to run commands
function runCommand(command, errorMessage) {
  try {
    log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    log(errorMessage || `Command failed: ${command}`, 'error');
    log(`Error details: ${error.message}`, 'error');
    return false;
  }
}

// Main build function
async function build() {
  log('🚀 Starting Vercel build process...', 'info');
  
  // Check Node.js version
  const nodeVersion = process.version;
  log(`Node.js version: ${nodeVersion}`, 'info');
  
  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    log('⚠️  Warning: .env.local file not found. Some features may not work correctly.', 'warning');
  }
  
  // Install dependencies
  log('📦 Installing dependencies...', 'info');
  if (!runCommand('npm install', '❌ Failed to install dependencies')) {
    process.exit(1);
  }
  
  // Install Prisma CLI if not already installed
  log('🔧 Installing Prisma CLI...', 'info');
  if (!runCommand('npm install -g prisma', '❌ Failed to install Prisma CLI')) {
    process.exit(1);
  }

  // Install Prisma client
  log('📦 Installing Prisma client...', 'info');
  if (!runCommand('npm install @prisma/client', '❌ Failed to install Prisma client')) {
    process.exit(1);
  }

  // Generate Prisma client
  log('🔧 Generating Prisma client...', 'info');
  if (!runCommand('npx prisma generate', '❌ Failed to generate Prisma client')) {
    // Try with force flag if the first attempt fails
    log('⚠️  First attempt failed, trying with --force flag...', 'warning');
    if (!runCommand('npx prisma generate --force', '❌ Failed to generate Prisma client with --force')) {
      process.exit(1);
    }
  }
  
  // Run database migrations
  log('🔄 Running database migrations...', 'info');
  if (!runCommand('npx prisma migrate deploy', '❌ Failed to apply database migrations')) {
    log('⚠️  Warning: Database migrations failed. The application might not work correctly.', 'warning');
  }
  
  // Build the Next.js application
  log('🏗️  Building Next.js application...', 'info');
  if (!runCommand('npm run build', '❌ Build failed')) {
    process.exit(1);
  }
  
  log('✨ Vercel build process completed successfully!', 'success');
}

// Run the build process
build().catch(error => {
  log(`❌ Build process failed: ${error.message}`, 'error');
  process.exit(1);
});
