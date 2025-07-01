import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateStandardUlid,
  generateSeededUlid,
  generateMonotonicUlid,
  MonotonicUlidGenerator,
  parseUlid
} from '../src/ulid-generator';

describe('ULID Generator', () => {
  describe('generateStandardUlid', () => {
    it('標準的なULIDを生成できること', () => {
      const result = generateStandardUlid();
      
      expect(result.ulid).toHaveLength(26);
      expect(result.timestamp).toBeTypeOf('number');
      expect(result.randomness).toHaveLength(16);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('複数回生成したときに異なるULIDが生成されること', () => {
      const result1 = generateStandardUlid();
      const result2 = generateStandardUlid();
      
      expect(result1.ulid).not.toBe(result2.ulid);
      expect(result1.randomness).not.toBe(result2.randomness);
    });
  });

  describe('generateSeededUlid', () => {
    it('シードタイムを指定してULIDを生成できること', () => {
      const seedTime = 1640995200000; // 2022-01-01 00:00:00 UTC
      const result = generateSeededUlid({ seedTime });
      
      expect(result.ulid).toHaveLength(26);
      expect(result.timestamp).toBe(seedTime);
      expect(result.randomness).toHaveLength(16);
    });

    it('同じシードタイムでもランダム部分が異なること', () => {
      const seedTime = 1640995200000;
      const result1 = generateSeededUlid({ seedTime });
      const result2 = generateSeededUlid({ seedTime });
      
      expect(result1.timestamp).toBe(result2.timestamp);
      expect(result1.randomness).not.toBe(result2.randomness);
      expect(result1.ulid).not.toBe(result2.ulid);
    });

    it('シードタイムを省略した場合は現在時刻を使用すること', () => {
      const before = Date.now();
      const result = generateSeededUlid({});
      const after = Date.now();
      
      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('generateMonotonicUlid', () => {
    it('単調増加するULIDを生成できること', () => {
      const seedTime = 1640995200000;
      const result1 = generateMonotonicUlid({ seedTime });
      const result2 = generateMonotonicUlid({ seedTime });
      
      expect(result1.ulid).toHaveLength(26);
      expect(result2.ulid).toHaveLength(26);
      expect(result1.timestamp).toBe(seedTime);
      expect(result2.timestamp).toBe(seedTime);
      
      // 単調増加の確認（文字列比較で順序確認）
      expect(result2.ulid > result1.ulid).toBe(true);
    });

    it('異なるシードタイムでリセットされること', () => {
      const seedTime1 = 1640995200000;
      const seedTime2 = 1641081600000; // 1日後
      
      generateMonotonicUlid({ seedTime: seedTime1 });
      const result = generateMonotonicUlid({ seedTime: seedTime2 });
      
      expect(result.timestamp).toBe(seedTime2);
    });
  });

  describe('MonotonicUlidGenerator', () => {
    let generator: MonotonicUlidGenerator;

    beforeEach(() => {
      generator = new MonotonicUlidGenerator(1640995200000);
    });

    it('単調増加するULIDを生成できること', () => {
      const result1 = generator.generateMonotonicUlid();
      const result2 = generator.generateMonotonicUlid();
      const result3 = generator.generateMonotonicUlid();
      
      expect(result1.ulid).toHaveLength(26);
      expect(result2.ulid).toHaveLength(26);
      expect(result3.ulid).toHaveLength(26);
      
      // 順序の確認
      expect(result2.ulid > result1.ulid).toBe(true);
      expect(result3.ulid > result2.ulid).toBe(true);
    });

    it('リセット機能が正常に動作すること', () => {
      const result1 = generator.generateMonotonicUlid();
      generator.reset(1641081600000);
      const result2 = generator.generateMonotonicUlid();
      
      expect(result1.timestamp).toBe(1640995200000);
      expect(result2.timestamp).toBe(1641081600000);
    });
  });

  describe('parseUlid', () => {
    it('有効なULIDをパースできること', () => {
      const originalUlid = generateStandardUlid();
      const parsed = parseUlid(originalUlid.ulid);
      
      expect(parsed.ulid).toBe(originalUlid.ulid);
      expect(parsed.timestampPart).toHaveLength(10);
      expect(parsed.randomnessPart).toHaveLength(16);
      expect(parsed.timestamp).toBeTypeOf('number');
      expect(parsed.date).toBeInstanceOf(Date);
    });

    it('既知のULIDが正しくパースされること', () => {
      // 既知のテストULID: 2022-01-01 00:00:00 UTC
      const testUlid = '01FR9EZ700RPB9GR0NVWG3MYFY';
      const parsed = parseUlid(testUlid);
      
      expect(parsed.ulid).toBe(testUlid);
      expect(parsed.timestampPart).toBe('01FR9EZ700');
      expect(parsed.randomnessPart).toBe('RPB9GR0NVWG3MYFY');
      expect(parsed.timestamp).toBe(1640995200000);
      expect(parsed.date.getTime()).toBe(1640995200000);
    });

    it('無効な長さのULIDでエラーになること', () => {
      expect(() => parseUlid('invalid')).toThrow('Invalid ULID length');
      expect(() => parseUlid('01FN2GZJZK000000000000000000000')).toThrow('Invalid ULID length');
    });

  });
});