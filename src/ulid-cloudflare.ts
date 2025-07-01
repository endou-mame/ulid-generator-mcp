// CloudFlare Workers compatible ULID implementation

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ENCODING_LEN = ENCODING.length;
const TIME_MAX = Math.pow(2, 48) - 1;
const RANDOM_LEN = 16;

export interface UlidGenerationResult {
  ulid: string;
  timestamp: number;
  randomness: string;
}

/**
 * CloudFlare Workers compatible ULID generation
 */
export function generateCloudflareUlid(seedTime?: number): UlidGenerationResult {
  const timestamp = seedTime || Date.now();
  
  if (timestamp < 0 || timestamp > TIME_MAX) {
    throw new Error('Time must be a positive number');
  }
  
  const timeStr = encodeTime(timestamp, 10);
  const randomStr = encodeRandom(RANDOM_LEN);
  const ulid = timeStr + randomStr;
  
  return {
    ulid,
    timestamp,
    randomness: randomStr
  };
}

/**
 * CloudFlare Workers compatible monotonic ULID generation
 */
export class CloudflareMonotonicUlidGenerator {
  private lastTime: number = 0;
  private lastRandom: string = '';
  
  constructor(private seedTime?: number) {}
  
  generateMonotonicUlid(): UlidGenerationResult {
    const timestamp = this.seedTime || Date.now();
    
    if (timestamp < 0 || timestamp > TIME_MAX) {
      throw new Error('Time must be a positive number');
    }
    
    const timeStr = encodeTime(timestamp, 10);
    let randomStr: string;
    
    // 同じタイムスタンプの場合は単調増加
    if (timestamp === this.lastTime) {
      randomStr = incrementBase32(this.lastRandom);
    } else {
      randomStr = encodeRandom(RANDOM_LEN);
      this.lastTime = timestamp;
    }
    
    this.lastRandom = randomStr;
    const ulid = timeStr + randomStr;
    
    return {
      ulid,
      timestamp,
      randomness: randomStr
    };
  }
  
  reset(seedTime?: number): void {
    this.seedTime = seedTime;
    this.lastTime = 0;
    this.lastRandom = '';
  }
}

/**
 * ULID parsing function
 */
export function parseCloudflareUlid(ulidString: string) {
  if (ulidString.length !== 26) {
    throw new Error('Invalid ULID length');
  }
  
  const timestampPart = ulidString.slice(0, 10);
  const randomnessPart = ulidString.slice(10);
  
  const timestamp = decodeTime(timestampPart);
  
  return {
    ulid: ulidString,
    timestampPart,
    randomnessPart,
    timestamp,
    date: new Date(timestamp)
  };
}

// Helper functions

function encodeTime(time: number, len: number): string {
  let mod: number;
  let str = '';
  
  for (let i = len; i > 0; i--) {
    mod = time % ENCODING_LEN;
    str = ENCODING.charAt(mod) + str;
    time = (time - mod) / ENCODING_LEN;
  }
  
  return str;
}

function encodeRandom(len: number): string {
  let str = '';
  
  for (let i = 0; i < len; i++) {
    // CloudFlare Workersでcrypto.getRandomValuesを使用
    const array = new Uint8Array(1);
    crypto.getRandomValues(array);
    const random = array[0] % ENCODING_LEN;
    str += ENCODING.charAt(random);
  }
  
  return str;
}

function decodeTime(encodedTime: string): number {
  let time = 0;
  
  for (let i = 0; i < encodedTime.length; i++) {
    const char = encodedTime[i];
    const index = ENCODING.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid character in ULID: ${char}`);
    }
    time = time * ENCODING_LEN + index;
  }
  
  return time;
}

function incrementBase32(str: string): string {
  const chars = str.split('');
  let i = chars.length - 1;
  
  while (i >= 0) {
    const currentIndex = ENCODING.indexOf(chars[i]);
    if (currentIndex === -1) {
      throw new Error(`Invalid character: ${chars[i]}`);
    }
    
    if (currentIndex < ENCODING_LEN - 1) {
      chars[i] = ENCODING[currentIndex + 1];
      break;
    }
    
    chars[i] = ENCODING[0];
    i--;
  }
  
  // すべて最大値の場合は新しいランダム文字列を生成
  if (i < 0) {
    return encodeRandom(str.length);
  }
  
  return chars.join('');
}