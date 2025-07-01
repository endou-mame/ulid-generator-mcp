import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { McpServer } from './mcp-server';
import { McpRequest } from './mcp-types';

const app = new Hono();
const mcpServer = new McpServer();

// CORS設定
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ヘルスチェック
app.get('/', (c) => {
  return c.json({
    name: 'ULID Generator MCP Server',
    version: '1.0.0',
    status: 'healthy',
    endpoints: {
      mcp: '/mcp',
      health: '/'
    }
  });
});

// MCP HTTP Streamableエンドポイント
app.post('/mcp', async (c) => {
  try {
    const body = await c.req.json();
    
    // リクエストのバリデーション
    if (!body || typeof body !== 'object') {
      return c.json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error'
        }
      }, 400);
    }

    // 単一リクエストの処理
    if (body.jsonrpc && body.method) {
      const request: McpRequest = body;
      const response = mcpServer.handleRequest(request);
      return c.json(response);
    }

    // バッチリクエストの処理
    if (Array.isArray(body)) {
      const responses = body.map((request: McpRequest) => {
        try {
          return mcpServer.handleRequest(request);
        } catch (error) {
          return {
            jsonrpc: '2.0',
            id: request.id || null,
            error: {
              code: -32603,
              message: error instanceof Error ? error.message : 'Internal error'
            }
          };
        }
      });
      return c.json(responses);
    }

    return c.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32600,
        message: 'Invalid Request'
      }
    }, 400);

  } catch (error) {
    console.error('MCP request processing error:', error);
    return c.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error'
      }
    }, 400);
  }
});

// OPTIONS リクエストの処理
app.options('/mcp', (c) => {
  return new Response('', { status: 204 });
});

// 404エラーハンドリング
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested endpoint was not found',
    availableEndpoints: [
      'GET /',
      'POST /mcp'
    ]
  }, 404);
});

// エラーハンドリング
app.onError((err, c) => {
  console.error('Application error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  }, 500);
});

export default app;