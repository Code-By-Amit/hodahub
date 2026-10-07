const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\Amit Saini\\.gemini\\antigravity-ide\\brain\\c6b66965-d0a2-49a5-8a5d-de5dd98a8134\\.system_generated\\steps\\212\\content.md', 'utf8');

// Search for retryOtpExposed, sendOtpExposed, channel, whatsapp
const reg = /retryOtpExposed|sendOtpExposed|retryChannel|processRetryOtp/g;
let m;
while ((m = reg.exec(content)) !== null) {
  console.log("Match at", m.index);
  console.log(content.slice(m.index - 100, m.index + 800));
}
