import { describe, it, expect } from 'vitest';
import { McpServer } from '../src/mcp-server';
import { McpRequest, MCP_ERROR_CODES } from '../src/mcp-types';

describe('McpServer', () => {
  const server = new McpServer();

  describe('initialize', () => {
    it('正常に初期化できること', () => {
      const request: McpRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      };

      const response = server.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result).toBeDefined();
      expect(response.result.protocolVersion).toBe('2024-11-05');
      expect(response.result.serverInfo.name).toBe('ulid-generator-mcp');
    });

    it('プロトコルバージョンが欠けている場合はエラーになること', () => {
      const request: McpRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {}
      };

      const response = server.handleRequest(request);

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(MCP_ERROR_CODES.INVALID_PARAMS);
    });
  });

  describe('tools/list', () => {
    it('利用可能なツール一覧を取得できること', () => {
      const request: McpRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list'
      };

      const response = server.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(2);
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeInstanceOf(Array);
      expect(response.result.tools).toHaveLength(4);
      
      const toolNames = response.result.tools.map((tool: any) => tool.name);
      expect(toolNames).toContain('generate_standard_ulid');
      expect(toolNames).toContain('generate_seeded_ulid');
      expect(toolNames).toContain('generate_monotonic_ulid');
      expect(toolNames).toContain('parse_ulid');
    });
  });

  describe('tools/call', () => {
    it('generate_standard_ulidツールを実行できること', () => {
      const request: McpRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'generate_standard_ulid',
          arguments: {}
        }
      };

      const response = server.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(3);
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeInstanceOf(Array);
      expect(response.result.content[0].type).toBe('text');
      
      const resultData = JSON.parse(response.result.content[0].text);
      expect(resultData.ulid).toHaveLength(26);
      expect(resultData.timestamp).toBeTypeOf('number');
      expect(resultData.randomness).toHaveLength(16);
    });

    it('generate_standard_ulidツールで複数のULIDを生成できること', () => {
      const request: McpRequest = {
        jsonrpc: '2.0',
        id: 3.1,
        method: 'tools/call',
        params: {
          name: 'generate_standard_ulid',
          arguments: { count: 5 }
        }
      };

      const response = server.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(3.1);
      expect(response.result).toBeDefined();
      
      const resultData = JSON.parse(response.result.content[0].text);
      expect(resultData).toBeInstanceOf(Array);
      expect(resultData).toHaveLength(5);
      
      // 各ULIDが正しい形式であることを確認
      resultData.forEach((item: any) => {
        expect(item.ulid).toHaveLength(26);
        expect(item.timestamp).toBeTypeOf('number');
        expect(item.randomness).toHaveLength(16);
      });
      
      // ULIDが全て異なることを確認
      const ulids = resultData.map((item: any) => item.ulid);
      const uniqueUlids = new Set(ulids);
      expect(uniqueUlids.size).toBe(5);
    });

    it('generate_standard_ulidツールで最大100個を超えても100個に制限されること', () => {
      const request: McpRequest = {
        jsonrpc: '2.0',
        id: 3.2,
        method: 'tools/call',
        params: {
          name: 'generate_standard_ulid',
          arguments: { count: 150 }
        }
      };

      const response = server.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(3.2);
      expect(response.result).toBeDefined();
      
      const resultData = JSON.parse(response.result.content[0].text);
      expect(resultData).toBeInstanceOf(Array);
      expect(resultData).toHaveLength(100);
    });

    it('generate_seeded_ulidツールをシードタイム付きで実行できること', () => {
      const seedTime = 1640995200000;
      const request: McpRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'generate_seeded_ulid',
          arguments: { seedTime }
        }
      };

      const response = server.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(4);
      expect(response.result).toBeDefined();
      
      const resultData = JSON.parse(response.result.content[0].text);
      expect(resultData.ulid).toHaveLength(26);
      expect(resultData.timestamp).toBe(seedTime);
      expect(resultData.randomness).toHaveLength(16);
    });

    it('generate_seeded_ulidツールで複数のULIDを生成できること', () => {
      const seedTime = 1640995200000;
      const request: McpRequest = {
        jsonrpc: '2.0',
        id: 4.1,
        method: 'tools/call',
        params: {
          name: 'generate_seeded_ulid',
          arguments: { seedTime, count: 3 }
        }
      };

      const response = server.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(4.1);
      expect(response.result).toBeDefined();
      
      const resultData = JSON.parse(response.result.content[0].text);
      expect(resultData).toBeInstanceOf(Array);
      expect(resultData).toHaveLength(3);
      
      // 各ULIDが同じタイムスタンプを持つことを確認
      resultData.forEach((item: any) => {
        expect(item.ulid).toHaveLength(26);
        expect(item.timestamp).toBe(seedTime);
        expect(item.randomness).toHaveLength(16);
      });
      
      // ランダム部分が全て異なることを確認
      const randomParts = resultData.map((item: any) => item.randomness);
      const uniqueRandomParts = new Set(randomParts);
      expect(uniqueRandomParts.size).toBe(3);
    });

    it('generate_monotonic_ulidツールを実行できること', () => {
      const seedTime = 1640995200000;
      const request: McpRequest = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'generate_monotonic_ulid',
          arguments: { seedTime }
        }
      };

      const response = server.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(5);
      expect(response.result).toBeDefined();
      
      const resultData = JSON.parse(response.result.content[0].text);
      expect(resultData.ulid).toHaveLength(26);
      expect(resultData.timestamp).toBe(seedTime);
      expect(resultData.randomness).toHaveLength(16);
    });

    it('generate_monotonic_ulidツールで複数のULIDを単調増加で生成できること', () => {
      const seedTime = 1640995200000;
      const request: McpRequest = {
        jsonrpc: '2.0',
        id: 5.1,
        method: 'tools/call',
        params: {
          name: 'generate_monotonic_ulid',
          arguments: { seedTime, count: 5 }
        }
      };

      const response = server.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(5.1);
      expect(response.result).toBeDefined();
      
      const resultData = JSON.parse(response.result.content[0].text);
      expect(resultData).toBeInstanceOf(Array);
      expect(resultData).toHaveLength(5);
      
      // 各ULIDが同じタイムスタンプを持つことを確認
      resultData.forEach((item: any) => {
        expect(item.ulid).toHaveLength(26);
        expect(item.timestamp).toBe(seedTime);
        expect(item.randomness).toHaveLength(16);
      });
      
      // ULIDが単調増加していることを確認
      for (let i = 1; i < resultData.length; i++) {
        expect(resultData[i].ulid > resultData[i - 1].ulid).toBe(true);
      }
    });

    it('parse_ulidツールを実行できること', () => {
      const testUlid = '01FR9EZ700RPB9GR0NVWG3MYFY';
      const request: McpRequest = {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'parse_ulid',
          arguments: { ulid: testUlid }
        }
      };

      const response = server.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(6);
      expect(response.result).toBeDefined();
      
      const resultData = JSON.parse(response.result.content[0].text);
      expect(resultData.ulid).toBe(testUlid);
      expect(resultData.timestampPart).toBe('01FR9EZ700');
      expect(resultData.randomnessPart).toBe('RPB9GR0NVWG3MYFY');
      expect(resultData.timestamp).toBe(1640995200000);
    });

    it('存在しないツールでエラーになること', () => {
      const request: McpRequest = {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'nonexistent_tool',
          arguments: {}
        }
      };

      const response = server.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(7);
      expect(response.result).toBeDefined();
      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain('Unknown tool');
    });

    it('ツール名が欠けている場合はエラーになること', () => {
      const request: McpRequest = {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          arguments: {}
        }
      };

      const response = server.handleRequest(request);

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(MCP_ERROR_CODES.INVALID_PARAMS);
    });

    it('parse_ulidツールで無効なULIDを渡した場合はエラーになること', () => {
      const request: McpRequest = {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'parse_ulid',
          arguments: { ulid: 'invalid' }
        }
      };

      const response = server.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(9);
      expect(response.result).toBeDefined();
      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain('Error:');
    });
  });

  describe('method not found', () => {
    it('存在しないメソッドでエラーになること', () => {
      const request: McpRequest = {
        jsonrpc: '2.0',
        id: 10,
        method: 'nonexistent_method',
        params: {}
      };

      const response = server.handleRequest(request);

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(MCP_ERROR_CODES.METHOD_NOT_FOUND);
    });
  });
});