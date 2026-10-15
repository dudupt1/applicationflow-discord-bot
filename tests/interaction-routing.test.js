import assert from 'node:assert/strict';
import test from 'node:test';
import { isApplicationButton, isApplicationModal } from '../src/features/applications.js';

test('ApplicationFlow recognises only its own button custom IDs', () => {
  assert.equal(isApplicationButton({ customId: 'appflow:start:12345678' }), true);
  assert.equal(isApplicationButton({ customId: 'guildguide:ticket-open' }), false);
});

test('ApplicationFlow recognises application modal custom IDs', () => {
  assert.equal(isApplicationModal({ customId: 'appflow:modal:12345678' }), true);
  assert.equal(isApplicationModal({ customId: 'appflow:start:12345678' }), false);
});
