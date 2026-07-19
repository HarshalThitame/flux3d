// k6 load test: admin operations
// Run with: k6 run k6/admin.js

import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.05'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export default function () {
  const payments = http.get(`${BASE_URL}/api/admin/payments`, {
    headers: { 'Authorization': `Bearer ${__ENV.ADMIN_TOKEN}` },
  })
  check(payments, { 'payments listed': (r) => r.status === 200 })

  const refunds = http.get(`${BASE_URL}/api/admin/refunds`, {
    headers: { 'Authorization': `Bearer ${__ENV.ADMIN_TOKEN}` },
  })
  check(refunds, { 'refunds listed': (r) => r.status === 200 })

  sleep(2)
}
