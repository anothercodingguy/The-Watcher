import { sleep } from 'k6';
import { getConfig, baseHeaders, runBookingFlow } from '../lib/helpers.js';
import { attackPhaseActive, PHASE, buildSummaryHandler } from '../lib/prometheus.js';

// ─── Booking Flow: Base Traffic Scenario ────────────────────────────────
//
// Purpose:  Simulate real user traffic through the complete booking workflow.
//           This establishes the BASELINE metrics that the Wasm Edge Module
//           and Central Brain use to detect anomalies.
//
// Flow:     GET /stations → GET /tickets → POST /orders → POST /payments → GET /orders/{id}
//
// Run:      k6 run scenarios/booking_flow.js
// With ENV: K6_BASE_URL=http://gateway:8000 k6 run scenarios/booking_flow.js
// ────────────────────────────────────────────────────────────────────────

const config = getConfig();

export const options = {
  scenarios: {
    booking_baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },   // Ramp up — warm up the services
        { duration: '2m',  target: 20 },   // Sustained — establish baseline metrics
        { duration: '15s', target: 0 },    // Ramp down — graceful cooldown
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // These SHOULD pass under normal conditions.
    // If they fail, something is wrong with the services themselves.
    'http_req_duration{scenario:booking_baseline}': [`p(95)<${config.thresholds.p95_latency_ms}`],
    'chaos_error_rate{scenario:booking_baseline}':  ['rate<0.01'],  // < 1% errors
  },
};

export default function () {
  // Mark this as baseline phase for Grafana
  attackPhaseActive.add(PHASE.BASELINE);

  const headers = baseHeaders('baseline');
  runBookingFlow(headers);

  // Simulate realistic user think-time between bookings
  sleep(Math.random() * 2 + 1);  // 1-3 seconds
}

// ─── Summary Export ─────────────────────────────────────────────────────
export const handleSummary = buildSummaryHandler('booking_flow');
