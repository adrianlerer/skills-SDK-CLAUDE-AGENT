import { scan, anonymize, deanonymize } from '../engine/anonymizer.js';

const VERDE = '\x1b[32m✓\x1b[0m';
const ROJO = '\x1b[31m✗\x1b[0m';

let passed = 0;
let failed = 0;

function expect(label: string, condition: boolean) {
  if (condition) {
    console.log(`${VERDE} ${label}`);
    passed++;
  } else {
    console.error(`${ROJO} ${label}`);
    failed++;
  }
}

function hasType(text: string, type: string): boolean {
  return scan(text).some((e) => e.type === type);
}

// ─── DNI ───────────────────────────────────────────────────────────────────
expect('DNI con puntos: 12.345.678', hasType('Mi DNI es 12.345.678.', 'DNI_AR'));
expect('DNI sin puntos: 12345678', hasType('DNI: 12345678', 'DNI_AR'));
expect('DNI 7 dígitos: 1234567', hasType('DNI 1234567', 'DNI_AR'));

// ─── CUIL ──────────────────────────────────────────────────────────────────
expect('CUIL con guiones: 20-28456789-8', hasType('CUIL: 20-28456789-8', 'CUIL_AR'));
expect('CUIL prefijo 27 (mujer): 27-30456789-4', hasType('27-30456789-4', 'CUIL_AR'));

// ─── CUIT ──────────────────────────────────────────────────────────────────
expect('CUIT empresa: 30-71234567-1', hasType('CUIT: 30-71234567-1', 'CUIT_AR'));
// prefijo 23 lo captura CUIL_AR (correcto — persona física); CUIT_AR exclusivo es 30/33/34
expect('CUIT empresa prefijo 33: 33-69345023-9', hasType('CUIT: 33-69345023-9', 'CUIT_AR'));

// ─── CBU ───────────────────────────────────────────────────────────────────
expect('CBU 22 dígitos', hasType('CBU: 0170099340000012345678', 'CBU_AR'));

// ─── CVU ───────────────────────────────────────────────────────────────────
expect('CVU Mercado Pago', hasType('CVU: 0000003100025152519738', 'CVU_AR'));

// ─── Teléfono ──────────────────────────────────────────────────────────────
expect('Teléfono: +54 9 11 1234-5678', hasType('+54 9 11 1234-5678', 'TELEFONO_AR'));
expect('Teléfono: 011-4123-4567', hasType('Tel: 011-4123-4567', 'TELEFONO_AR'));

// ─── Expediente ────────────────────────────────────────────────────────────
expect('Expediente: Expte. 45.678/23', hasType('Expte. 45.678/23', 'EXPEDIENTE_AR'));
expect('Expediente: Causa Nº 1234/2024', hasType('Causa Nº 1234/2024', 'EXPEDIENTE_AR'));

// ─── Matrícula abogado ─────────────────────────────────────────────────────
expect('Matrícula: T° 123 F° 456', hasType('T° 123 F° 456', 'MATRICULA_ABOGADO_AR'));
expect('Matrícula: Tomo 12 Folio 345', hasType('Tomo 12 Folio 345', 'MATRICULA_ABOGADO_AR'));

// ─── Email ─────────────────────────────────────────────────────────────────
expect('Email genérico', hasType('Escribir a adrian@lerer.com.ar', 'EMAIL'));

// ─── Ciclo completo anonymize → deanonymize ────────────────────────────────
const texto = `El Sr. Juan Pérez, DNI 28.456.789, CUIL 20-28456789-8,
titularidad CBU 0170099340000012345678, teléfono +54 9 11 5555-1234,
correo juan@ejemplo.com.ar, expte. 12345/2024.`;

const { anonymized, sessionId } = anonymize(texto);
expect('Texto anonimizado no contiene DNI original', !anonymized.includes('28.456.789'));
expect('Texto anonimizado no contiene email original', !anonymized.includes('juan@ejemplo.com.ar'));
expect('Texto anonimizado no contiene CBU original', !anonymized.includes('0170099340000012345678'));

const restored = deanonymize(anonymized, sessionId);
expect('Texto restaurado contiene DNI original', restored.includes('28.456.789'));
expect('Texto restaurado contiene email original', restored.includes('juan@ejemplo.com.ar'));
expect('Texto restaurado contiene CBU original', restored.includes('0170099340000012345678'));

console.log(`\n${passed + failed} tests — ${VERDE} ${passed} pasaron — ${failed > 0 ? ROJO : ''} ${failed} fallaron`);
if (failed > 0) process.exit(1);
