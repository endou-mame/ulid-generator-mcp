// MCP (Model Context Protocol) HTTP Streamable用の型定義

export interface McpRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface McpResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: McpError;
}

export interface McpError {
  code: number;
  message: string;
  data?: any;
}

export interface McpNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

// MCP標準のエラーコード
export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

// ツール関連の型定義
export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolCallRequest {
  name: string;
  arguments?: Record<string, any>;
}

export interface ToolCallResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

// サーバー情報の型定義
export interface ServerInfo {
  name: string;
  version: string;
  protocolVersion: string;
}

// 初期化関連の型定義
export interface InitializeRequest {
  protocolVersion: string;
  capabilities: {
    tools?: {};
  };
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: {
    tools?: {
      listChanged?: boolean;
    };
  };
  serverInfo: ServerInfo;
}