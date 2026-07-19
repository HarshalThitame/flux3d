// k6 load test: checkout flow
// Run with: k6 run k6/checkout.js
// Requires: BASE_URL env var or http://localhost:3000

import http from 'k6/http'
import { check, sleep } from 'k6'
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js'

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export default function () {
  // Browse homepage
  const home = http.get(`${BASE_URL}/3d-shop`)
  check(home, { 'homepage loaded': (r) => r.status === 200 })

  // Browse product
  const product = http.get(`${BASE_URL}/api/3d-shop/products`)
  check(product, { 'products fetched': (r) => r.status === 200 })

  sleep(1)
}
