import express from 'express';
import qs from 'querystring';

const app = express();

const { PORT, CLIENT_ID, CLIENT_SECRET } = process.env;
const REDIRECT_URI = `http://localhost:${PORT}/api/auth/callback`;
const SCOPES = 'data:read data:write data:create data:search bucket:create bucket:read';
const NEEDS_3LO = false;

import uploadToAcc from './tasks/acc-upload.js';
import getSsaToken from './tasks/ssa-token.js';

if (NEEDS_3LO === false) {
  // Place code here if you don't need 3-legged access token
  const accessToken = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImI4YjJkMzNhLTFlOTYtNDYwNS1iMWE4LTgwYjRhNWE4YjNlNyIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJodHRwczovL2F1dG9kZXNrLmNvbSIsImNsaWVudF9pZCI6IkJSYklQQWduamtFcG5qcWhHZE00RENFaDdnUUxQVGhzS2poemVPa0g3MnNKbUFqUiIsInVzZXJpZCI6IkFVTTJVQlBCTkFKRVVLNkUiLCJzY29wZSI6WyJkYXRhOnJlYWQiLCJkYXRhOmNyZWF0ZSIsImRhdGE6d3JpdGUiXSwiaXNzIjoiaHR0cHM6Ly9kZXZlbG9wZXIuYXBpLmF1dG9kZXNrLmNvbSIsImV4cCI6MTc0NTMzNzA0OCwianRpIjoiU0EtODkwNGJjYzEtNThlZS00NWEwLThlNTQtYmM4NmUxOGRmMzc5In0.ObM080br5aZ3hIzp6ghFbIpjo3Kd3L2badppdZEcBmA1eyNErheOGQfvJuuMrYf8IRsm59Oc5FAJm3EyHjWm-SX0XSgaqGYNce74I8MQeW92i3oWDAcwA0FBcZ5pEV9BCKscjnTX2cbLrvij4bmIT8kK5XvAEf0hTX_jhite39-5cw2Q2WPtdkDcti4MT4nIO5KfE4j59mWoNZ4o-P2bjKj0LhLWvdYOaB4nFJW0YGyYRMTCrCzJLuJsHXOfvtx1wIMzDjqIWzXGSzAk0o-2sn9Pn0KSZTlqsSipimn9vl2NKgq0yeg9yNdrzS3p_4Rvlv7OWLsjSTGuJpbvoYVdOw";
  await uploadToAcc(accessToken);
} else {
  console.log(`3-legged OAuth is required please open http://localhost:${PORT} in the browser and log in with your Autodesk account`);

  async function useAccessToken(accessToken) {
    // Place code here if you need 3-legged access token
    await uploadToAcc(accessToken);
  }

  app.get('/', (req, res) => {
    const authUrl = `https://developer.api.autodesk.com/authentication/v2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${SCOPES}`;
    res.redirect(authUrl);
  });

  app.get('/api/auth/callback', async (req, res) => {
    const code = req.query.code;

    if (!code) {
      return res.status(400).send('Authorization code not found');
    }

    try {
      const response = await fetch(
        'https://developer.api.autodesk.com/authentication/v2/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          body: qs.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI,
          })
        }
      );

      const { access_token, refresh_token } = await response.json();

      useAccessToken(access_token);

      res.send({ access_token, refresh_token });
    } catch (error) {
      res.status(500).send('Error exchanging authorization code for tokens');
    }
  });

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
} 