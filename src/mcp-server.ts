import {
  McpRequest,
  McpResponse,
  McpError,
  MCP_ERROR_CODES,
  Tool,
  ToolCallRequest,
  ToolCallResult,
  InitializeRequest,
  InitializeResult,
  ServerInfo
} from './mcp-types';

import {
  generateStandardUlid,
  generateSeededUlid,
  generateMonotonicUlid,
  parseUlid,
  UlidGeneratorOptions
} from './ulid-generator';

export class McpServer {
  private readonly serverInfo: ServerInfo = {
    name: 'ulid-generator-mcp',
    version: '1.0.0',
    protocolVersion: '2024-11-05'
  };

  private readonly tools: Tool[] = [
    {
      name: 'generate_standard_ulid',
      description: 'タイムスタンプとクリプトセキュアな擬似乱数生成アルゴリズムによって生成されたランダムビットを組み合わせた標準的なULIDを生成します',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'generate_seeded_ulid',
      description: 'シードタイムを指定してULIDを生成します。同じシードタイムを使用すると、タイムスタンプコンポーネントは同じになりますが、ランダムビットは異なります',
      inputSchema: {
        type: 'object',
        properties: {
          seedTime: {
            type: 'number',
            description: 'シードとして使用するタイムスタンプ（ミリ秒）。省略時は現在時刻を使用'
          }
        },
        required: []
      }
    },
    {
      name: 'generate_monotonic_ulid',
      description: '単調増加するULIDを生成します。同じシードタイムを指定することで、最下位のランダムビットを1ずつ増分し厳密な順序付けがされたULIDを生成します',
      inputSchema: {
        type: 'object',
        properties: {
          seedTime: {
            type: 'number',
            description: 'シードとして使用するタイムスタンプ（ミリ秒）。省略時は現在時刻を使用'
          }
        },
        required: []
      }
    },
    {
      name: 'parse_ulid',
      description: 'ULIDをパースして詳細情報を取得します',
      inputSchema: {
        type: 'object',
        properties: {
          ulid: {
            type: 'string',
            description: 'パースするULID文字列'
          }
        },
        required: ['ulid']
      }
    }
  ];

  handleRequest(request: McpRequest): McpResponse {
    try {
      switch (request.method) {
        case 'initialize':
          return this.handleInitialize(request);
        case 'tools/list':
          return this.handleToolsList(request);
        case 'tools/call':
          return this.handleToolsCall(request);
        default:
          return this.createErrorResponse(
            request.id,
            MCP_ERROR_CODES.METHOD_NOT_FOUND,
            `Method not found: ${request.method}`
          );
      }
    } catch (error) {
      return this.createErrorResponse(
        request.id,
        MCP_ERROR_CODES.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Internal error'
      );
    }
  }

  private handleInitialize(request: McpRequest): McpResponse {
    const params = request.params as InitializeRequest;
    
    if (!params || !params.protocolVersion) {
      return this.createErrorResponse(
        request.id,
        MCP_ERROR_CODES.INVALID_PARAMS,
        'Missing required parameter: protocolVersion'
      );
    }

    const result: InitializeResult = {
      protocolVersion: this.serverInfo.protocolVersion,
      capabilities: {
        tools: {
          listChanged: false
        }
      },
      serverInfo: this.serverInfo
    };

    return {
      jsonrpc: '2.0',
      id: request.id,
      result
    };
  }

  private handleToolsList(request: McpRequest): McpResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        tools: this.tools
      }
    };
  }

  private handleToolsCall(request: McpRequest): McpResponse {
    const params = request.params as ToolCallRequest;
    
    if (!params || !params.name) {
      return this.createErrorResponse(
        request.id,
        MCP_ERROR_CODES.INVALID_PARAMS,
        'Missing required parameter: name'
      );
    }

    try {
      const result = this.executeToolCall(params);
      return {
        jsonrpc: '2.0',
        id: request.id,
        result
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Tool execution failed';
      const result: ToolCallResult = {
        content: [{
          type: 'text',
          text: `Error: ${errorMessage}`
        }],
        isError: true
      };
      
      return {
        jsonrpc: '2.0',
        id: request.id,
        result
      };
    }
  }

  private executeToolCall(params: ToolCallRequest): ToolCallResult {
    const args = params.arguments || {};

    switch (params.name) {
      case 'generate_standard_ulid': {
        const result = generateStandardUlid();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case 'generate_seeded_ulid': {
        const options: UlidGeneratorOptions = {
          seedTime: args.seedTime
        };
        const result = generateSeededUlid(options);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case 'generate_monotonic_ulid': {
        const options: UlidGeneratorOptions = {
          seedTime: args.seedTime
        };
        const result = generateMonotonicUlid(options);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case 'parse_ulid': {
        if (!args.ulid || typeof args.ulid !== 'string') {
          throw new Error('Missing or invalid required parameter: ulid');
        }
        const result = parseUlid(args.ulid);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${params.name}`);
    }
  }

  private createErrorResponse(id: string | number, code: number, message: string): McpResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message
      }
    };
  }
}