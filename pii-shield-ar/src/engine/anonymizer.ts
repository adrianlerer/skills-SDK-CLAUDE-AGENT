import { PATTERNS, PiiPattern } from '../patterns/argentina.js';

export interface DetectedEntity {
  type: string;
  label: string;
  original: string;
  placeholder: string;
  start: number;
  end: number;
}

export interface AnonymizeResult {
  anonymized: string;
  entities: DetectedEntity[];
  sessionId: string;
}

export interface SessionMapping {
  id: string;
  createdAt: string;
  map: Map<string, string>; // placeholder → original
}

// In-memory session store (one process = one user on Claude Desktop)
const sessions = new Map<string, SessionMapping>();

function createSessionId(): string {
  return `ar_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function newSession(): string {
  const id = createSessionId();
  sessions.set(id, {
    id,
    createdAt: new Date().toISOString(),
    map: new Map(),
  });
  return id;
}

export function getSession(sessionId: string): SessionMapping | undefined {
  return sessions.get(sessionId);
}

export function clearSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

export function listSessions(): Array<{ id: string; createdAt: string; entityCount: number }> {
  return Array.from(sessions.values()).map((s) => ({
    id: s.id,
    createdAt: s.createdAt,
    entityCount: s.map.size,
  }));
}

export function scan(text: string): DetectedEntity[] {
  const entities: DetectedEntity[] = [];
  const usedRanges: Array<[number, number]> = [];

  let globalIndex = 0;

  for (const pattern of PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags.includes('g') ? pattern.regex.flags : pattern.regex.flags + 'g');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const original = match[0];

      // Skip if this range overlaps an already-detected entity (longer/earlier wins)
      const overlaps = usedRanges.some(([s, e]) => start < e && end > s);
      if (overlaps) continue;

      // Optional custom validator
      if (pattern.validate && !pattern.validate(original)) continue;

      globalIndex++;
      const placeholder = pattern.placeholder(globalIndex);

      entities.push({ type: pattern.type, label: pattern.label, original, placeholder, start, end });
      usedRanges.push([start, end]);
    }
  }

  // Sort by position for clean replacement
  entities.sort((a, b) => a.start - b.start);
  return entities;
}

export function anonymize(text: string, sessionId?: string): AnonymizeResult {
  const sid = sessionId ?? newSession();
  const session = sessions.get(sid) ?? { id: sid, createdAt: new Date().toISOString(), map: new Map<string, string>() };
  if (!sessions.has(sid)) sessions.set(sid, session);

  const entities = scan(text);
  let result = '';
  let cursor = 0;

  for (const entity of entities) {
    result += text.slice(cursor, entity.start);
    result += entity.placeholder;
    cursor = entity.end;
    session.map.set(entity.placeholder, entity.original);
  }
  result += text.slice(cursor);

  return { anonymized: result, entities, sessionId: sid };
}

export function deanonymize(text: string, sessionId: string): string {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Sesión "${sessionId}" no encontrada. Verificá el sessionId.`);

  let result = text;
  for (const [placeholder, original] of session.map.entries()) {
    result = result.replaceAll(placeholder, original);
  }
  return result;
}

export function getMapping(sessionId: string): Array<{ placeholder: string; original: string; type: string }> {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Sesión "${sessionId}" no encontrada.`);
  return Array.from(session.map.entries()).map(([placeholder, original]) => {
    const patternType = PATTERNS.find((p) => placeholder.startsWith('[' + p.label.toUpperCase().replace(/\s/g, '_')))?.type ?? 'UNKNOWN';
    return { placeholder, original, type: patternType };
  });
}
