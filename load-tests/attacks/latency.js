import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { getConfig, baseHeaders, chaosHeaders, checkResponse, runBookingFlow } from '../lib/helpers.js';
import { attackPhaseActive, PHASE, paymentLatency, buildSummaryHandler } from '../lib/prometheus.js';

// ─── Latency Attack: Payment Service ────────────────────────────────────
//
// Target:   Payment Service (via gateway /payments)
// Goal:     Force P95 latency > 1.5s to trigger Wasm Edge detection in <15s
// Method:   Dual-mode — ChaosMiddleware header (10s sleep) + volumetric pressure
//
// How it works:
//   The ChaosMiddleware in payment-service reads x-chaos-trigger: latency
//   and injects asyncio.sleep(10.0), simulating database contention.
//   Combined with 80 concurrent VUs, this saturates the uvicorn worker pool
//   and creates cascading latency upstream (order-service blocks waiting).
//
// Run:      k6 run attacks/latency.js
// Targeted: K6_BASE_URL=http://payment-svc:8000 k6 run attacks/latency.js
// ────────────────────────────────────────────────────────────────────────

const config = getConfig();

export const options = {
  scenarios: {
    // Phase 1: Baseline — establish normal metrics first
    baseline: {
      executor: 'constant-vus',
      vus: 10,
      duration: '15s',
      exec: 'baseline',
      tags: { phase: 'baseline' },
    },
    // Phase 2: Attack — spike with chaos latency header
    latency_attack: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '5s',  target: 80 },   // Rapid spike — must be detected in <15s
        { duration: '40s', target: 80 },   // Sustained attack
      ],
      exec: 'attack',
      startTime: '15s',  // Start after baseline
      tags: { phase: 'attack' },
    },
    // Phase 3: Observe — reduce load, watch if remediation kicks in
    observe: {
      executor: 'constant-vus',
      vus: 15,
      duration: '30s',
      exec: 'observe',
      startTime: '60s',  // Start after attack
      tags: { phase: 'observe' },
    },
  },
  thresholds: {
    // These are EXPECTED TO FAIL during the attack — that's the point.
    // The Wasm detector should see this breach and trigger remediation.
    'http_req_duration{phase:attack}': [{
      threshold: `p(95)<${config.thresholds.p95_latency_ms}`,
      abortOnFail: false,  // Don't stop the test, let the attack play out
    }],
    // Baseline should still pass
    'http_req_duration{phase:baseline}': [`p(95)<${config.thresholds.p95_latency_ms}`],
  },
};

// ─── Phase 1: Baseline ─────────────────────────────────────────────────
export function baseline() {
  attackPhaseActive.add(PHASE.BASELINE);
  const headers = baseHeaders('latency_baseline');

  // Normal payment request — should respond quickly
  group('Baseline Payment', function () {
    const payload = JSON.stringify({
      order_id: 'baseline-order-' + __VU,
      amount: config.seed_data.ticket_price,
    });
    const res = http.post(
      `${config.base_url}${config.endpoints.payments}`,
      payload,
      { headers }
    );
    checkResponse(res, 'baseline-payment');
    paymentLatency.add(res.timings.duration, { phase: 'baseline' });
  });

  sleep(1);
}

// ─── Phase 2: Attack ────────────────────────────────────────────────────
export function attack() {
  attackPhaseActive.add(PHASE.LATENCY);

  // Chaos header triggers 10s sleep in ChaosMiddleware
  const headers = chaosHeaders('latency_attack', 'latency');

  group('Latency Attack — Payment', function () {
    const payload = JSON.stringify({
      order_id: 'attack-order-' + __VU + '-' + __ITER,
      amount: config.seed_data.ticket_price,
    });
    const res = http.post(
      `${config.base_url}${config.endpoints.payments}`,
      payload,
      { headers, timeout: '30s' }  // Extended timeout — we expect 10s+ responses
    );

    check(res, {
      'payment responded (any status)': (r) => r.status > 0,
      'latency exceeds 1.5s (attack working)': (r) => r.timings.duration > 1500,
    });

    paymentLatency.add(res.timings.duration, { phase: 'attack' });
    checkResponse(res, 'attack-payment');
  });

  // Minimal sleep — keep pressure high
  sleep(0.5);
}

// ─── Phase 3: Observe ───────────────────────────────────────────────────
export function observe() {
  attackPhaseActive.add(PHASE.BASELINE);
  const headers = baseHeaders('latency_observe');

  // Normal requests — check if latency returns to normal (remediation worked)
  group('Post-Attack Observation', function () {
    const payload = JSON.stringify({
      order_id: 'observe-order-' + __VU,
      amount: config.seed_data.ticket_price,
    });
    const res = http.post(
      `${config.base_url}${config.endpoints.payments}`,
      payload,
      { headers }
    );

    check(res, {
      'post-attack: status 200': (r) => r.status === 200,
      'post-attack: latency recovered (<2s)': (r) => r.timings.duration < 2000,
    });

    paymentLatency.add(res.timings.duration, { phase: 'observe' });
    checkResponse(res, 'observe-payment');
  });

  sleep(1);
}

// ─── Summary Export ─────────────────────────────────────────────────────
export const handleSummary = buildSummaryHandler('latency_attack');
