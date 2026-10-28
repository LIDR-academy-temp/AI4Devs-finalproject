import { parseCrontab } from 'graphile-worker';
import { CRONTAB } from './crontab';

describe('CRONTAB', () => {
  it('parses into one daily trash_purge item that backfills a day', () => {
    const items = parseCrontab(CRONTAB);

    expect(items).toHaveLength(1);
    expect(items[0].task).toBe('trash_purge');
    expect(items[0].identifier).toBe('trash_purge');
    expect(items[0].options.backfillPeriod).toBe(86_400_000);
  });
});
