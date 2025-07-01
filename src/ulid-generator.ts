import { ulid, monotonicFactory, decodeTime } from 'ulid';

export interface UlidGeneratorOptions {
  seedTime?: number;
}

export interface UlidGenerationResult {
  ulid: string;
  timestamp: number;
  randomness: string;
}

/**
 * ULID生成パターン1: 標準的なULID生成
 * タイムスタンプとクリプトセキュアな擬似乱数生成アルゴリズムによって生成されたランダムビットを組み合わせて生成
 */
export function generateStandardUlid(): UlidGenerationResult {
  const generated = ulid();
  const timestamp = Date.now();
  const randomness = generated.slice(10); // ULIDの後半10文字がランダム部分
  
  return {
    ulid: generated,
    timestamp,
    randomness
  };
}

/**
 * ULID生成パターン2: シードタイム指定ULID生成
 * シードタイムを指定して生成。同じシードタイムを使用すると、タイムスタンプコンポーネント（先頭8バイト）は同じになるが、
 * ランダムビット（残り8バイト）は異なるため、異なるULIDが生成される
 */
export function generateSeededUlid(options: UlidGeneratorOptions): UlidGenerationResult {
  const seedTime = options.seedTime || Date.now();
  const generated = ulid(seedTime);
  const randomness = generated.slice(10);
  
  return {
    ulid: generated,
    timestamp: seedTime,
    randomness
  };
}

/**
 * ULID生成パターン3: 単調増加ULID生成
 * 同じシードタイムを指定することで、最下位のランダムビットを1ずつ増分し、
 * 厳密な順序付けがされたULIDを生成
 */
export class MonotonicUlidGenerator {
  private generator: ReturnType<typeof monotonicFactory>;
  
  constructor(private seedTime?: number) {
    this.generator = monotonicFactory();
  }
  
  generateMonotonicUlid(): UlidGenerationResult {
    const timestamp = this.seedTime || Date.now();
    const generated = this.generator(timestamp);
    const randomness = generated.slice(10);
    
    return {
      ulid: generated,
      timestamp,
      randomness
    };
  }
  
  reset(seedTime?: number): void {
    this.seedTime = seedTime;
    this.generator = monotonicFactory();
  }
}

// モジュールレベルでの単調増加ジェネレーター
let globalMonotonicGenerator = new MonotonicUlidGenerator();

export function generateMonotonicUlid(options?: UlidGeneratorOptions): UlidGenerationResult {
  if (options?.seedTime && options.seedTime !== globalMonotonicGenerator['seedTime']) {
    globalMonotonicGenerator.reset(options.seedTime);
  }
  
  return globalMonotonicGenerator.generateMonotonicUlid();
}

/**
 * ULIDの詳細情報を取得
 */
export function parseUlid(ulidString: string) {
  if (ulidString.length !== 26) {
    throw new Error('Invalid ULID length');
  }
  
  const timestampPart = ulidString.slice(0, 10);
  const randomnessPart = ulidString.slice(10);
  
  // ULIDライブラリのdecodeTime関数を使用してタイムスタンプを取得
  const timestamp = decodeTime(ulidString);
  
  return {
    ulid: ulidString,
    timestampPart,
    randomnessPart,
    timestamp,
    date: new Date(timestamp)
  };
}

