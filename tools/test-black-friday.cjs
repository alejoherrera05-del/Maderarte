const test = require('node:test');
const assert = require('node:assert/strict');
const { STARTS_AT, ENDS_AT, getCountdownState } = require('../assets/black-friday.js');

test('Campaign starts at midnight in Colombia and includes all of Monday 30', () => {
  assert.equal(STARTS_AT, Date.parse('2026-11-27T05:00:00Z'));
  assert.equal(ENDS_AT, Date.parse('2026-12-01T05:00:00Z'));
  assert.deepEqual(getCountdownState(STARTS_AT), {
    phase: 'active', totalSeconds: 345600, days: 4, hours: 0, minutes: 0, seconds: 0
  });
  assert.equal(getCountdownState(STARTS_AT - 1).phase, 'upcoming');
  assert.equal(getCountdownState(STARTS_AT - 1).totalSeconds, 1);
});

test('The last millisecond stays active; expiration never produces negative time', () => {
  assert.deepEqual(getCountdownState(ENDS_AT - 1), {
    phase: 'active', totalSeconds: 1, days: 0, hours: 0, minutes: 0, seconds: 1
  });
  for (const now of [ENDS_AT, ENDS_AT + 1, ENDS_AT + 86400000]) {
    assert.deepEqual(getCountdownState(now), {
      phase: 'ended', totalSeconds: 0, days: 0, hours: 0, minutes: 0, seconds: 0
    });
  }
});

test('Resuming after a time jump uses the deadline rather than previously rendered seconds', () => {
  const beforeSuspension = getCountdownState(Date.parse('2026-11-28T10:00:00-05:00'));
  const afterSuspension = getCountdownState(Date.parse('2026-11-30T23:59:58-05:00'));
  assert.equal(beforeSuspension.totalSeconds, 223200);
  assert.deepEqual(afterSuspension, {
    phase: 'active', totalSeconds: 2, days: 0, hours: 0, minutes: 0, seconds: 2
  });
  assert.equal(getCountdownState(ENDS_AT + 1000).phase, 'ended');
  delete require.cache[require.resolve('../assets/black-friday.js')];
  const reloadedCampaign = require('../assets/black-friday.js');
  assert.equal(reloadedCampaign.getCountdownState(ENDS_AT + 1000).totalSeconds, 0);
});
