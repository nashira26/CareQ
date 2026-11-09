import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportedLine, reportedLineOnCard } from './simulated';

test('reportedLineOnCard shortens only when the reporter is the centre named on the card', () => {
  assert.equal(
    reportedLineOnCard('Jesse Ketchum Centre', 'Jesse Ketchum Centre', 'Nov 2'),
    'Reported by the centre · Simulated · Nov 2'
  );
  assert.equal(reportedLineOnCard(undefined, 'Jesse Ketchum Centre', 'Nov 2'), 'Reported by the centre · Simulated · Nov 2');
});

test('reportedLineOnCard keeps the full name when someone else reported it', () => {
  assert.equal(reportedLineOnCard('Another Operator', 'Jesse Ketchum Centre', 'Nov 2'), reportedLine('Another Operator', 'Nov 2'));
});

test('both lines always say Simulated', () => {
  assert.match(reportedLineOnCard('A', 'A', 'Oct 1'), /Simulated/);
  assert.match(reportedLineOnCard('B', 'A', 'Oct 1'), /Simulated/);
});
