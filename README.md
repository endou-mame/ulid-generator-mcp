# ULID Generator MCP Server

CloudFlare Workers上で動作するULID生成用のMCP（Model Context Protocol）サーバーです。

## 概要

このプロジェクトは、LLMでテストコードを実装する際にULIDのモックデータ生成をスムーズに行うためのMCPサーバーを提供します。

## 機能

### 3つのULID生成パターン

1. **標準ULID生成** (`generate_standard_ulid`)
   - タイムスタンプとクリプトセキュアな擬似乱数生成アルゴリズムによって生成されたランダムビットを組み合わせて生成

2. **シードタイム指定ULID生成** (`generate_seeded_ulid`)
   - シードタイムを指定して生成
   - 同じシードタイムを使用すると、タイムスタンプコンポーネント（先頭8バイト）は同じになる
   - ランダムビット（残り8バイト）は異なるため、異なるULIDが生成される

3. **単調増加ULID生成** (`generate_monotonic_ulid`)
   - 同じシードタイムを指定することで、最下位のランダムビットを1ずつ増分
   - 厳密な順序付けがされたULIDを生成

### 追加機能

4. **ULIDパース** (`parse_ulid`)
   - 既存のULIDをパースして詳細情報を取得

## 技術仕様

- **プロトコル**: MCP HTTP Streamable
- **フレームワーク**: Hono.js
- **ランタイム**: CloudFlare Workers
- **言語**: TypeScript
- **ULIDライブラリ**: `ulid` (Node.js最も有名なULIDライブラリ)

## インストールと実行

### 依存関係のインストール

```bash
npm install
```

### 開発環境での実行

```bash
npm run dev
```

### ビルド

```bash
npm run build
```

### CloudFlare Workersへのデプロイ

```bash
npm run deploy
```

### テストの実行

```bash
npm test
```

### 型チェック

```bash
npm run type-check
```

## API仕様

### エンドポイント

- `GET /`: ヘルスチェックとサーバー情報
- `POST /mcp`: MCP HTTP Streamableエンドポイント

### MCPツール

#### 1. generate_standard_ulid

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "generate_standard_ulid",
    "arguments": {}
  }
}
```

#### 2. generate_seeded_ulid

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "generate_seeded_ulid",
    "arguments": {
      "seedTime": 1640995200000
    }
  }
}
```

#### 3. generate_monotonic_ulid

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "generate_monotonic_ulid",
    "arguments": {
      "seedTime": 1640995200000
    }
  }
}
```

#### 4. parse_ulid

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "parse_ulid",
    "arguments": {
      "ulid": "01FN2GZJZK0000000000000000"
    }
  }
}
```

## レスポンス例

### 生成系ツールのレスポンス

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\n  \"ulid\": \"01FN2GZJZK0123456789ABCDEF\",\n  \"timestamp\": 1640995200000,\n  \"randomness\": \"0123456789ABCDEF\"\n}"
    }]
  }
}
```

### パースツールのレスポンス

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\n  \"ulid\": \"01FN2GZJZK0000000000000000\",\n  \"timestampPart\": \"01FN2GZJZK\",\n  \"randomnessPart\": \"0000000000000000\",\n  \"timestamp\": 1640995200000,\n  \"date\": \"2022-01-01T00:00:00.000Z\"\n}"
    }]
  }
}
```

## 開発

### プロジェクト構造

```
ulid-generator-mcp/
├── src/
│   ├── index.ts              # メインエントリーポイント（Honoアプリ）
│   ├── mcp-server.ts         # MCPサーバー実装
│   ├── mcp-types.ts          # MCP型定義
│   └── ulid-generator.ts     # ULID生成ロジック
├── test/
│   ├── ulid-generator.test.ts
│   └── mcp-server.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── wrangler.toml
└── README.md
```

### テストカバレッジ

```bash
npm test -- --coverage
```

## ライセンス

MIT License