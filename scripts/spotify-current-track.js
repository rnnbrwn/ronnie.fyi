#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const querystring = require('querystring');

// Configuration - you'll need to set these up
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ data: jsonData, status: res.statusCode });
        } catch (e) {
          reject(new Error('Failed to parse JSON response'));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function getAccessToken() {
  const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const postData = querystring.stringify({
    grant_type: 'refresh_token',
    refresh_token: SPOTIFY_REFRESH_TOKEN
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

  const response = await makeRequest(options, postData);
  console.log('Access token response:', response);
  if (response.status !== 200) {
    throw new Error(`Token refresh failed: ${response.status} - ${JSON.stringify(response.data)}`);
  }
  return response.data.access_token;
}

async function getCurrentTrack() {
  try {
    const accessToken = await getAccessToken();
    
    const options = {
      hostname: 'api.spotify.com',
      port: 443,
      path: '/v1/me/player/recently-played?limit=1',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    };

    const response = await makeRequest(options);
    
    if (response.status !== 200) {
      throw new Error(`Spotify API error: ${response.status}`);
    }
    
    if (response.data.items && response.data.items.length > 0) {
      const track = response.data.items[0].track;
      return {
        song: track.name,
        artist: track.artists.map(artist => artist.name).join(', '),
        url: track.external_urls.spotify,
        timestamp: new Date().toISOString()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching current track:', error);
    return null;
  }
}

async function updateCurrentTrack() {
  const currentTrack = await getCurrentTrack();
  
  const dataPath = path.join(__dirname, '..', '_data', 'currentTrack.json');
  
  if (currentTrack) {
    fs.writeFileSync(dataPath, JSON.stringify(currentTrack, null, 2));
    console.log(`Updated current track: ${currentTrack.song} by ${currentTrack.artist}`);
  } else {
    // Fallback data if API fails
    const fallbackData = {
      song: "Unknown",
      artist: "Unknown Artist",
      url: "https://open.spotify.com",
      timestamp: new Date().toISOString(),
      error: true
    };
    fs.writeFileSync(dataPath, JSON.stringify(fallbackData, null, 2));
    console.log('Failed to fetch current track, using fallback');
  }
}

// Run the script
updateCurrentTrack().catch(console.error);
