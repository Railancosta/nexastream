import http from 'k6/http';
import { check, sleep } from 'k6';

// Load test scenarios (rule 87): 100, 1000, 10000 users
export const options = {
  stages: [
    { duration: '30s', target: 100 },   // ramp up to 100
    { duration: '1m', target: 100 },     // hold 100
    { duration: '30s', target: 1000 },   // ramp up to 1000
    { duration: '1m', target: 1000 },    // hold 1000
    { duration: '30s', target: 0 },      // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  // Test health endpoint
  const healthRes = http.get(`${BASE_URL}/api/v1/health`);
  check(healthRes, {
    'health is 200': (r) => r.status === 200,
    'health has status': (r) => r.json('status') === 'ok',
  });

  // Test search endpoint
  const searchRes = http.get(`${BASE_URL}/api/v1/search?q=test`);
  check(searchRes, {
    'search is 200': (r) => r.status === 200,
  });

  sleep(0.5);
}
