const { execSync } = require('child_process');

// Get git hash with fallback
const getGitHash = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'no-git-info';
  }
};

let commitJson = {
  hash: JSON.stringify(getGitHash()),
  version: JSON.stringify(process.env.npm_package_version),
};

console.log(`
╔════════════════════════════════════════╗
║      ⚡ WELCOME TO ZIMBOLT ⚡          ║
║    🦝 AI-Powered DeFi Developer        ║
╠════════════════════════════════════════╣
║  🚀 Version: v${commitJson.version}                  ║
║  🔗 Commit: ${commitJson.hash}                  ║
║                                        ║
║  🌐 Deploying the future of DeFi...    ║
║  🔄 Please wait for the URL...         ║
╠════════════════════════════════════════╣
║  💰 Powered by ZimbeeCoin & Zimbot 🤖  ║
║  ⚡ Building the Web3 Revolution       ║
╚════════════════════════════════════════╝
`);
