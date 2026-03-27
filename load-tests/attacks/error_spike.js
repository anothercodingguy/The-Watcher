import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { getConfig, baseHeaders, chaosHeaders, checkResponse } from '../lib/helpers.js';
import { attackPhaseActive, PHASE, notifyErrorCount, notifyErrorRate, buildSummaryHandler } from '../lib/prometheus.js';

// ─── Error Spike Attack: Notification Service ───────────────────────────
//
// Target:   Notification Service (via gateway /notify)
// Goal:     Generate > 5% 5xx error rate to trigger Wasm Edge detection
// Method:   x-chaos-trigger: error header (returns HTTP 500) on ~70% of requests,
//           mixed with 30% clean requests for realistic error ratio.
//
// How it works:
//   The ChaosMiddleware intercepts requests with x-chaos-trigger: error
//   and immediately returns a 500 with "Chaos engineering injected random
//   HTTP 500 failure". This simulates service crashes, OOM kills, or
//   unhandled exceptions.
//
//   The 70/30 split ensures:
//   1. Error rate clearly crosses the 5% SLA threshold
//   2. Some successful traces exist for RCA comparison
//   3. The service stays "alive" in the mesh (no circuit-breaking bypass)
//
// Run:      k6 run attacks/error_spike.js
// ────────────────────────────────────────────────────────────────────────

const config = getConfig();

export const options = {
  scenarios: {
    // Phase 1: Normal traffic — all clean requests
    normal: {
      executor: 'constant-vus',
      vus: 10,
      duration: '10s',
      exec: 'normalTraffic',
      tags: { phase: 'normal' },
    },
    // Phase 2: Error storm — 70% error-injected requests
    error_storm: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '5s',  target: 60 },   // Rapid spike
        { duration: '25s', target: 60 },   // Sustained error bombardment
      ],
      exec: 'errorAttack',
      startTime: '10s',
      tags: { phase: 'attack' },
    },
    // Phase 3: Tail — reduced load, observe error rate decay
    tail: {
      executor: 'ramping-vus',
      startVUs: 15,
      stages: [
        { duration: '15s', target: 15 },   // Hold
        { duration: '5s',  target: 0 },    // Ramp down
      ],
      exec: 'tailObserve',
      startTime: '40s',
      tags: { phase: 'tail' },
    },
  },
  thresholds: {
    // Baseline: error rate should be near zero
    'chaos_error_rate{phase:normal}': ['rate<0.01'],
    // Attack: error rate WILL breach — that's the purpose
    'chaos_error_rate{phase:attack}': [{
      threshold: 'rate<0.05',    // 5% SLA threshold
      abortOnFail: false,        // Expected to fail
    }],
  },
};

// ─── Notification Payload Generator ─────────────────────────────────────
function notifyPayload() {
  return JSON.stringify({
    user_id: config.default_user_id,
    message: `Notification test from VU ${__VU} iter ${__ITER}`,
  });
}

// ─── Phase 1: Normal Traffic ────────────────────────────────────────────
export function normalTraffic() {
  attackPhaseActive.add(PHASE.BASELINE);
  const headers = baseHeaders('error_baseline');

  group('Normal — Notify', function () {
    const res = http.post(
      `${config.base_url}${config.endpoints.notify}`,
      notifyPayload(),
      { headers }
    );
    checkResponse(res, 'normal-notify');
    notifyErrorRate.add(res.status >= 500 ? 1 : 0);
  });

  sleep(0.5);
}

// ─── Phase 2: Error Storm ───────────────────────────────────────────────
export function errorAttack() {
  attackPhaseActive.add(PHASE.ERROR_SPIKE);

  // 70% of requests carry the error chaos trigger
  const shouldInjectError = Math.random() < 0.7;
  const headers = shouldInjectError
    ? chaosHeaders('error_spike', 'error')
    : baseHeaders('error_spike_clean');

  group('Error Storm — Notify', function () {
    const res = http.post(
      `${config.base_url}${config.endpoints.notify}`,
      notifyPayload(),
      { headers }
    );

    if (shouldInjectError) {
      // For error-injected requests, we EXPECT 500
      check(res, {
        'chaos 500 injected': (r) => r.status === 500,
      });
      notifyErrorCount.add(1);
    } else {
      // Clean requests should still work
      check(res, {
        'clean request: status 200': (r) => r.status === 200,
      });
    }

    notifyErrorRate.add(res.status >= 500 ? 1 : 0);
    checkResponse(res, 'attack-notify');
  });

  // Short sleep — keep the flood going but don't completely DoS
  sleep(0.2);
}

// ─── Phase 3: Tail Observation ──────────────────────────────────────────
export function tailObserve() {
  attackPhaseActive.add(PHASE.BASELINE);
  const headers = baseHeaders('error_tail');

  group('Tail — Notify', function () {
    const res = http.post(
      `${config.base_url}${config.endpoints.notify}`,
      notifyPayload(),
      { headers }
    );

    check(res, {
      'post-attack: status 200': (r) => r.status === 200,
      'post-attack: no 5xx': (r) => r.status < 500,
    });

    notifyErrorRate.add(res.status >= 500 ? 1 : 0);
    checkResponse(res, 'tail-notify');
  });

  sleep(0.5);
}

// ─── Summary Export ─────────────────────────────────────────────────────
export const handleSummary = buildSummaryHandler('error_spike');
