import { BlockHistoryStore } from './block-history-store';

describe('BlockHistoryStore', () => {
  describe('push and getLatest()', () => {
    it('returns the pushed entry after pushing 1 entry', () => {
      const store = new BlockHistoryStore(10, 0);
      store.push(100, 1000000);
      const latest = store.getLatest();
      expect(latest).toEqual({ blockNumber: 100, timestamp: 1000000 });
    });

    it('returns null when no entries have been pushed', () => {
      const store = new BlockHistoryStore(10, 0);
      expect(store.getLatest()).toBeNull();
    });

    it('enforces cap: pushing 11 entries keeps only 10, oldest dropped', () => {
      const store = new BlockHistoryStore(10, 0);
      for (let i = 0; i < 11; i++) {
        store.push(i, i * 1000);
      }
      expect(store.length).toBe(10);
      // Oldest (blockNumber=0) should be dropped, latest should be blockNumber=10
      expect(store.getLatest()).toEqual({ blockNumber: 10, timestamp: 10000 });
    });
  });

  describe('getAvgBlockTime()', () => {
    it('returns 0 (defaultAvgBlockTime) when no entries pushed (EVM default)', () => {
      const store = new BlockHistoryStore(10, 0);
      expect(store.getAvgBlockTime()).toBe(0);
    });

    it('returns 0.4 (defaultAvgBlockTime) when no entries pushed (Solana default)', () => {
      const store = new BlockHistoryStore(10, 0.4);
      expect(store.getAvgBlockTime()).toBe(0.4);
    });

    it('returns defaultAvgBlockTime (0) when only 1 entry pushed (need >= 2 for calculation)', () => {
      const store = new BlockHistoryStore(10, 0);
      store.push(100, 1000000);
      expect(store.getAvgBlockTime()).toBe(0);
    });

    it('returns correct average delta in seconds for 3 entries with known timestamps', () => {
      const store = new BlockHistoryStore(10, 0);
      const now = 1000000000;
      store.push(100, now - 24000); // -24s
      store.push(101, now - 12000); // -12s
      store.push(102, now);         // now
      // Deltas: 12s, 12s -> avg = 12s
      expect(store.getAvgBlockTime()).toBeCloseTo(12, 1);
    });
  });

  describe('clear()', () => {
    it('empties the store and getLatest() returns null after clear', () => {
      const store = new BlockHistoryStore(10, 0);
      store.push(100, 1000000);
      store.push(101, 2000000);
      store.clear();
      expect(store.getLatest()).toBeNull();
      expect(store.length).toBe(0);
    });
  });

  describe('rounding', () => {
    it('rounds to 1 decimal place when defaultAvgBlockTime is 0 (EVM)', () => {
      const store = new BlockHistoryStore(10, 0);
      // 3 entries: 13.5s apart -> avg = 13.5s, rounded to 1 decimal
      const now = 1000000000;
      store.push(100, now - 27000); // -27s
      store.push(101, now - 13500); // -13.5s
      store.push(102, now);         // now
      // Deltas: 13.5s, 13.5s -> avg = 13.5 -> rounded to 13.5 (1 decimal)
      expect(store.getAvgBlockTime()).toBe(13.5);
    });

    it('rounds to 3 decimal places when defaultAvgBlockTime is 0.4 (Solana)', () => {
      const store = new BlockHistoryStore(10, 0.4);
      const now = 1000000000;
      // 2 entries: 400ms apart -> avg = 0.4s, Solana rounds to 3 decimals
      store.push(100, now - 400); // -400ms
      store.push(101, now);       // now
      // Delta: 0.4s -> rounded to 3 decimals = 0.4
      expect(store.getAvgBlockTime()).toBe(0.4);
    });

    it('rounds to 1 decimal place when explicit decimalPlaces=1 is passed', () => {
      const store = new BlockHistoryStore(10, 0, 1);
      const now = 1000000000;
      store.push(100, now - 27000); // -27s
      store.push(101, now - 13500); // -13.5s
      store.push(102, now);         // now
      // Deltas: 13.5s, 13.5s -> avg = 13.5 -> rounded to 1 decimal = 13.5
      expect(store.getAvgBlockTime()).toBe(13.5);
    });

    it('rounds to 3 decimal places when explicit decimalPlaces=3 is passed', () => {
      const store = new BlockHistoryStore(10, 0.4, 3);
      const now = 1000000000;
      store.push(100, now - 400); // -400ms
      store.push(101, now);       // now
      // Delta: 0.4s -> rounded to 3 decimals = 0.4
      expect(store.getAvgBlockTime()).toBe(0.4);
    });
  });
});
