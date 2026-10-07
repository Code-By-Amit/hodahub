const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\Amit Saini\\.gemini\\antigravity-ide\\brain\\c6b66965-d0a2-49a5-8a5d-de5dd98a8134\\.system_generated\\steps\\212\\content.md', 'utf8');

console.log("Length of file:", content.length);

// Search for sendOtp, initSendOTP, retryOtp, verifyOtp, exposeMethods
const regexes = [
  /initSendOTP/g,
  /sendOtp/gi,
  /retryOtp/gi,
  /verifyOtp/gi,
  /exposeMethods/gi,
  /hCaptcha/gi
];

regexes.forEach((reg) => {
  const matches = [...content.matchAll(reg)];
  console.log(`Pattern ${reg}: found ${matches.length} matches`);
  matches.slice(0, 5).forEach(m => {
    const start = Math.max(0, m.index - 100);
    const end = Math.min(content.length, m.index + 200);
    console.log(`--- Match at ${m.index} ---`);
    console.log(content.slice(start, end));
  });
});
