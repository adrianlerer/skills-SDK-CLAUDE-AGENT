import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  anonymize,
  deanonymize,
  scan,
  newSession,
  clearSession,
  listSessions,
  getMapping,
} from './engine/anonymizer.js';
import { PATTERNS } from './patterns/argentina.js';

const server = new Server(
  { name: 'pii-shield-ar', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'anonymize_text',
      description:
        'Detecta y reemplaza PII argentino (DNI, CUIL/CUIT, CBU, CVU, pasaporte, teléfono, expedientes, matrículas) con placeholders. Devuelve el texto anonimizado y un sessionId para restaurar los datos luego.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto con posible PII argentino' },
          session_id: {
            type: 'string',
            description: 'ID de sesión existente (opcional). Si no se pasa, se crea uno nuevo.',
          },
        },
        required: ['text'],
      },
    },
    {
      name: 'deanonymize_text',
      description:
        'Restaura el PII original reemplazando los placeholders usando la sesión activa. Requiere el sessionId devuelto por anonymize_text.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto con placeholders a restaurar' },
          session_id: { type: 'string', description: 'ID de sesión devuelto por anonymize_text' },
        },
        required: ['text', 'session_id'],
      },
    },
    {
      name: 'scan_text',
      description:
        'Escanea el texto y lista las entidades PII detectadas sin anonimizar. Útil para revisión previa o auditoría.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto a escanear' },
        },
        required: ['text'],
      },
    },
    {
      name: 'get_session_mapping',
      description:
        'Devuelve el mapa completo placeholder→valor original de una sesión. Útil para auditoría o revisión manual.',
      inputSchema: {
        type: 'object',
        properties: {
          session_id: { type: 'string', description: 'ID de sesión' },
        },
        required: ['session_id'],
      },
    },
    {
      name: 'new_session',
      description: 'Crea una nueva sesión de anonimización vacía y devuelve su ID.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'clear_session',
      description: 'Elimina una sesión y sus datos de memoria. Usar cuando ya no se necesite deanonimizar.',
      inputSchema: {
        type: 'object',
        properties: {
          session_id: { type: 'string', description: 'ID de sesión a eliminar' },
        },
        required: ['session_id'],
      },
    },
    {
      name: 'list_entities',
      description: 'Lista todos los tipos de PII argentino que el servidor puede detectar.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case 'anonymize_text': {
        const result = anonymize((args as Record<string, string>).text, (args as Record<string, string>).session_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  anonymized_text: result.anonymized,
                  session_id: result.sessionId,
                  entities_found: result.entities.length,
                  entities: result.entities.map((e) => ({
                    type: e.type,
                    label: e.label,
                    placeholder: e.placeholder,
                    position: { start: e.start, end: e.end },
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'deanonymize_text': {
        const a = args as Record<string, string>;
        const restored = deanonymize(a.text, a.session_id);
        return {
          content: [{ type: 'text', text: JSON.stringify({ restored_text: restored }, null, 2) }],
        };
      }

      case 'scan_text': {
        const entities = scan((args as Record<string, string>).text);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  entities_found: entities.length,
                  entities: entities.map((e) => ({
                    type: e.type,
                    label: e.label,
                    original: e.original,
                    position: { start: e.start, end: e.end },
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_session_mapping': {
        const sid0 = (args as Record<string, string>).session_id;
        const mapping = getMapping(sid0);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ session_id: sid0, mapping }, null, 2),
            },
          ],
        };
      }

      case 'new_session': {
        const sid = newSession();
        return {
          content: [{ type: 'text', text: JSON.stringify({ session_id: sid }, null, 2) }],
        };
      }

      case 'clear_session': {
        const ok = clearSession((args as Record<string, string>).session_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: ok, message: ok ? 'Sesión eliminada.' : 'Sesión no encontrada.' },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'list_entities': {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  total: PATTERNS.length,
                  entities: PATTERNS.map((p) => ({
                    type: p.type,
                    label: p.label,
                    description: p.description,
                    example_placeholder: p.placeholder(1),
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Herramienta desconocida: ${name}`);
    }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${(err as Error).message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('PII Shield AR — servidor MCP iniciado');
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
