import { 
  generateCloudflareUlid, 
  CloudflareMonotonicUlidGenerator, 
  parseCloudflareUlid 
} from './ulid-cloudflare';

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
  return generateCloudflareUlid();
}

/**
 * ULID生成パターン2: シードタイム指定ULID生成
 * シードタイムを指定して生成。同じシードタイムを使用すると、タイムスタンプコンポーネント（先頭8バイト）は同じになるが、
 * ランダムビット（残り8バイト）は異なるため、異なるULIDが生成される
 */
export function generateSeededUlid(options: UlidGeneratorOptions): UlidGenerationResult {
  return generateCloudflareUlid(options.seedTime);
}

/**
 * ULID生成パターン3: 単調増加ULID生成
 * 同じシードタイムを指定することで、最下位のランダムビットを1ずつ増分し、
 * 厳密な順序付けがされたULIDを生成
 */
export class MonotonicUlidGenerator {
  private generator: CloudflareMonotonicUlidGenerator;
  
  constructor(private seedTime?: number) {
    this.generator = new CloudflareMonotonicUlidGenerator(seedTime);
  }
  
  generateMonotonicUlid(): UlidGenerationResult {
    return this.generator.generateMonotonicUlid();
  }
  
  reset(seedTime?: number): void {
    this.seedTime = seedTime;
    this.generator.reset(seedTime);
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
  return parseCloudflareUlid(ulidString);
}

