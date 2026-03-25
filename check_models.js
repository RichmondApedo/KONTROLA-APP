const https = require('https');

const apiKey = 'AIzaSyAdWeT7gZgB6jLs3M5sH1q5zB01iSr3Hsw'; // from .env

https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.models) {
        console.log("Available models:");
        parsed.models.forEach(m => console.log(m.name, m.supportedGenerationMethods));
      } else {
        console.log("Response:", parsed);
      }
    } catch (e) {
      console.error("Error parsing response", e);
    }
  });
}).on('error', (e) => {
  console.error("HTTP error:", e);
});
