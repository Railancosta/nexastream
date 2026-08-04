// NexaStream API Handler - Vercel Serverless Function
// This file handles API requests to the backend

const API_URL = process.env.NEXASTREAM_API_URL || 'http://localhost:3001';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const path = req.query.path || '';
  const url = `${API_URL}/api/${path}`;

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(503).json({ 
      error: 'Backend unavailable',
      message: 'Please set NEXASTREAM_API_URL environment variable'
    });
  }
}
