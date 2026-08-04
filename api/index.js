/**
 * NexaStream API Proxy - Cloudflare Worker
 * Proxies requests to Railway backend
 */

const BACKEND_URL = "https://nexastream.railway.internal";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Forward all /api/* requests to backend
    const backendPath = url.pathname;
    const backendUrl = `${BACKEND_URL}${backendPath}${url.search}`;
    
    try {
      // Clone request with proper headers
      const headers = new Headers();
      request.headers.forEach((value, key) => {
        if (key !== 'host' && key !== 'cf-') {
          headers.set(key, value);
        }
      });
      
      const fetchOptions = {
        method: request.method,
        headers: headers,
      };
      
      // Add body for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        fetchOptions.body = await request.text();
      }
      
      const response = await fetch(backendUrl, fetchOptions);
      
      // Return response with CORS headers
      const responseHeaders = new Headers();
      response.headers.forEach((value, key) => {
        responseHeaders.set(key, value);
      });
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Backend unavailable',
        message: 'Please configure Railway backend URL'
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }
};
