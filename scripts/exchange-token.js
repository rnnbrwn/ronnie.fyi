#!/usr/bin/env node

const https = require('https');
const querystring = require('querystring');

const clientId = '9d15a2f3024e4d25b251f366d30d2027';
const clientSecret = '73748569c70549f593f715a6ad4ed4db';

console.log('=== Spotify Token Exchange ===');
console.log('1. First, open this URL in your browser:');
console.log(`https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=https://example.com/callback&scope=user-read-recently-played`);
console.log('\n2. Authorize the app and copy the "code" parameter from the redirect URL');
console.log('3. Then run this script with the code:');
console.log('node scripts/exchange-token.js YOUR_CODE_HERE');

const code = process.argv[2];

if (!code) {
  console.log('\nNo code provided. Please run with a code parameter.');
  process.exit(1);
}

const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

const postData = querystring.stringify({
  grant_type: 'authorization_code',
  code: code,
  redirect_uri: 'https://example.com/callback'
});

const options = {
  hostname: 'accounts.spotify.com',
  port: 443,
  path: '/api/token',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': `Basic ${auth}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('\n=== Response ===');
      console.log(JSON.stringify(response, null, 2));
      
      if (response.refresh_token) {
        console.log('\n=== Your .env file should contain: ===');
        console.log(`SPOTIFY_CLIENT_ID=${clientId}`);
        console.log(`SPOTIFY_CLIENT_SECRET=${clientSecret}`);
        console.log(`SPOTIFY_REFRESH_TOKEN=${response.refresh_token}`);
      }
    } catch (e) {
      console.log('Error parsing response:', e);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.write(postData);
req.end();
