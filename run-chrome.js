const { exec } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = 'http://localhost:8080/test-suite.html?autoplay=true';
const cmd = `"${chromePath}" --headless --disable-gpu --no-sandbox "${url}"`;

console.log("Executing Chrome in headless mode...");
exec(cmd, (err, stdout, stderr) => {
  if (err) {
    console.error("Chrome execution error:", err);
    process.exit(1);
  }
  console.log("Chrome execution completed.");
  process.exit(0);
});
