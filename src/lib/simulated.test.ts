import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportedLine, reportedLineOnCard } from './simulated';

test('reportedLineOnCard shortens only when the reporter is the centre named on the card', () => {
  assert.equal(
    reportedLineOnCard('Jesse Ketchum Centre', 'Jesse Ketchum Centre', 'Nov 2'),
    'Reported by the centre · Nov 2'
  );
  assert.equal(reportedLineOnCard(undefined, 'Jesse Ketchum Centre', 'Nov 2'), 'Reported by the centre · Nov 2');
});

test('reportedLineOnCard keeps the full name when someone else reported it', () => {
  assert.equal(reportedLineOnCard('Another Operator', 'Jesse Ketchum Centre', 'Nov 2'), reportedLine('Another Operator', 'Nov 2'));
});

test('the lines never repeat "Simulated" (the demo banner says it once)', () => {
  assert.doesNotMatch(reportedLineOnCard('A', 'A', 'Oct 1'), /Simulated/);
  assert.doesNotMatch(reportedLineOnCard('B', 'A', 'Oct 1'), /Simulated/);
});
