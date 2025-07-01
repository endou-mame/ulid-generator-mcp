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
  allowHeaders: ['Content-Type', 'Accept', 'Mcp-Session-Id'],
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
    },
    protocol: {
      version: '2024-11-05',
      capabilities: ['tools']
    },
    usage: {
      connect: 'Add "https://ulid-generator-mcp.1125katanohimeji0521.workers.dev/mcp" to Claude Desktop integrations',
      test: 'Use MCP Inspector: npx @modelcontextprotocol/inspector https://ulid-generator-mcp.1125katanohimeji0521.workers.dev/mcp'
    }
  });
});

// MCP HTTP Streamableエンドポイント
app.post('/mcp', async (c) => {
  try {
    const acceptHeader = c.req.header('Accept') || 'application/json';
    const sessionId = c.req.header('Mcp-Session-Id');
    
    const body = await c.req.json();
    
    // リクエストのバリデーション
    if (!body || typeof body !== 'object') {
      const errorResponse = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error'
        }
      };
      
      if (acceptHeader.includes('text/event-stream')) {
        return streamResponse(c, errorResponse, sessionId);
      }
      return c.json(errorResponse, 400);
    }

    // 単一リクエストの処理
    if (body.jsonrpc && body.method) {
      const request: McpRequest = body;
      const response = mcpServer.handleRequest(request);
      
      if (acceptHeader.includes('text/event-stream')) {
        return streamResponse(c, response, sessionId);
      }
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
      
      if (acceptHeader.includes('text/event-stream')) {
        return streamResponse(c, responses, sessionId);
      }
      return c.json(responses);
    }

    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32600,
        message: 'Invalid Request'
      }
    };
    
    if (acceptHeader.includes('text/event-stream')) {
      return streamResponse(c, errorResponse, sessionId);
    }
    return c.json(errorResponse, 400);

  } catch (error) {
    console.error('MCP request processing error:', error);
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error'
      }
    };
    
    const acceptHeader = c.req.header('Accept') || 'application/json';
    const sessionId = c.req.header('Mcp-Session-Id');
    
    if (acceptHeader.includes('text/event-stream')) {
      return streamResponse(c, errorResponse, sessionId);
    }
    return c.json(errorResponse, 400);
  }
});

// Server-Sent Events (SSE) ストリーミングレスポンス
function streamResponse(c: any, data: any, sessionId?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };
  
  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }
  
  const eventData = `data: ${JSON.stringify(data)}\n\n`;
  
  return new Response(eventData, {
    status: 200,
    headers
  });
}

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