export interface PiiPattern {
  type: string;
  label: string;
  description: string;
  regex: RegExp;
  placeholder: (index: number) => string;
  validate?: (match: string) => boolean;
}

// CUIL/CUIT check digit validation
function validateCuilCuit(value: string): boolean {
  const digits = value.replace(/[-\s]/g, '');
  if (digits.length !== 11) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * parseInt(digits[i]), 0);
  const remainder = sum % 11;
  const checkDigit = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder;
  return checkDigit === parseInt(digits[10]);
}

// DNI: 7-8 dígitos, con o sin puntos separadores
// Ejemplos: 12345678 · 12.345.678 · 1.234.567
const DNI: PiiPattern = {
  type: 'DNI_AR',
  label: 'DNI',
  description: 'Documento Nacional de Identidad argentino',
  regex: /\b(?<!\d)(?:\d{1,2}\.\d{3}\.\d{3}|\d{7,8})(?!\d)\b/g,
  placeholder: (i) => `[DNI_${i}]`,
};

// CUIL: personas físicas — prefijos 20, 23, 24, 27
// Ejemplo: 20-12345678-9
const CUIL: PiiPattern = {
  type: 'CUIL_AR',
  label: 'CUIL',
  description: 'Código Único de Identificación Laboral',
  regex: /\b(20|23|24|27)-?\d{8}-?\d\b/g,
  placeholder: (i) => `[CUIL_${i}]`,
  validate: validateCuilCuit,
};

// CUIT: empresas y autónomos — prefijos 30, 33, 34 (y también 20/23/24/27 para personas)
// Ejemplo: 30-71234567-8
const CUIT: PiiPattern = {
  type: 'CUIT_AR',
  label: 'CUIT',
  description: 'Código Único de Identificación Tributaria',
  regex: /\b(30|33|34|20|23|24|27)-?\d{8}-?\d\b/g,
  placeholder: (i) => `[CUIT_${i}]`,
  validate: validateCuilCuit,
};

// CBU: 22 dígitos — Clave Bancaria Uniforme
// 7 dígitos banco/sucursal + 1 verificador + 13 cuenta + 1 verificador
const CBU: PiiPattern = {
  type: 'CBU_AR',
  label: 'CBU',
  description: 'Clave Bancaria Uniforme',
  regex: /\b\d{22}\b/g,
  placeholder: (i) => `[CBU_${i}]`,
};

// CVU: 22 dígitos, empieza con 0000003 (Mercado Pago, billeteras virtuales)
const CVU: PiiPattern = {
  type: 'CVU_AR',
  label: 'CVU',
  description: 'Clave Virtual Uniforme (billeteras digitales)',
  regex: /\b0000003\d{15}\b/g,
  placeholder: (i) => `[CVU_${i}]`,
};

// Pasaporte argentino
// Formato viejo: A + 7 dígitos (A1234567)
// Formato nuevo: 3 letras + 6 dígitos (AAA123456)
const PASAPORTE: PiiPattern = {
  type: 'PASAPORTE_AR',
  label: 'Pasaporte',
  description: 'Pasaporte argentino',
  regex: /\b[A-Z]{1,3}\d{6,7}\b/g,
  placeholder: (i) => `[PASAPORTE_${i}]`,
};

// Teléfono argentino
// Formatos: +54 9 11 1234-5678 · 011-1234-5678 · (011) 4123-4567 · 15-1234-5678
const TELEFONO: PiiPattern = {
  type: 'TELEFONO_AR',
  label: 'Teléfono',
  description: 'Número de teléfono argentino',
  regex: /(?:\+54\s*)?(?:9\s*)?(?:\(?0?11\)?|\(?0?2\d{2,3}\)?|\(?0?3\d{2,3}\)?)[\s\-]?\d{4}[\s\-]?\d{4}\b/g,
  placeholder: (i) => `[TEL_${i}]`,
};

// Número de expediente judicial — SCBA, PJN, fueros varios
// Formatos comunes:
//   Nro. 12345/2023  ·  Expte. 45.678/22  ·  Causa Nº 1234/2024  ·  EXP-ARG-1234/2023
const EXPEDIENTE: PiiPattern = {
  type: 'EXPEDIENTE_AR',
  label: 'Expediente',
  description: 'Número de expediente judicial argentino',
  regex: /(?:expte?\.?|exp(?:ediente)?\.?|causa|nro?\.?)\s*(?:n[°º]\.?\s*)?\d{1,2}\.?\d{3,6}[\/-]\d{2,4}/gi,
  placeholder: (i) => `[EXPTE_${i}]`,
};

// Matrícula CPACF (Consejo Profesional de Abogados de la CFRBA)
// Formato: T° 123 F° 456  ·  Tomo 12 Folio 345
const MATRICULA_ABOGADO: PiiPattern = {
  type: 'MATRICULA_ABOGADO_AR',
  label: 'Matrícula abogado',
  description: 'Matrícula de abogado CPACF (Tomo y Folio)',
  regex: /(?:T(?:omo)?[°º\s\.]*\d{1,4}[\s,]*F(?:olio)?[°º\s\.]*\d{1,4})/gi,
  placeholder: (i) => `[MAT_ABOG_${i}]`,
};

// Número de Legajo (empleados públicos, causas penales, etc.)
// Formato: Legajo Nº 12345  ·  Leg. 45678
const LEGAJO: PiiPattern = {
  type: 'LEGAJO_AR',
  label: 'Legajo',
  description: 'Número de legajo (empleado público / causa penal)',
  regex: /\bleg(?:ajo)?\.?\s*(?:n[°º]\.?\s*)?\d{4,8}\b/gi,
  placeholder: (i) => `[LEGAJO_${i}]`,
};

// Libreta de Enrolamiento / Libreta Cívica (docs históricos)
const LE_LC: PiiPattern = {
  type: 'LE_LC_AR',
  label: 'LE/LC',
  description: 'Libreta de Enrolamiento / Libreta Cívica',
  regex: /\b(?:L\.?E\.?|L\.?C\.?)\s*(?:n[°º]\.?\s*)?\d{6,8}\b/gi,
  placeholder: (i) => `[LE_LC_${i}]`,
};

// Número de CUIT/CUIL sin separadores (formatos en texto corrido)
// 11 dígitos empezando con 20/23/24/27/30/33/34
const CUIT_RAW: PiiPattern = {
  type: 'CUIT_RAW_AR',
  label: 'CUIT sin formato',
  description: 'CUIT/CUIL sin guiones (11 dígitos)',
  regex: /\b(?:20|23|24|27|30|33|34)\d{9}\b/g,
  placeholder: (i) => `[CUIT_${i}]`,
  validate: (v) => validateCuilCuit(v),
};

// Email genérico (mantenido por relevancia)
const EMAIL: PiiPattern = {
  type: 'EMAIL',
  label: 'Email',
  description: 'Dirección de correo electrónico',
  regex: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
  placeholder: (i) => `[EMAIL_${i}]`,
};

// IP address (datos de auditoría)
const IP: PiiPattern = {
  type: 'IP_ADDRESS',
  label: 'IP',
  description: 'Dirección IP',
  regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  placeholder: (i) => `[IP_${i}]`,
};

// Ordenado por especificidad: más específicos primero para evitar solapamiento
export const PATTERNS: PiiPattern[] = [
  CVU,         // antes que CBU (CVU es subconjunto de 22 dígitos)
  CUIL,        // antes que CUIT (prefijos más restrictivos)
  CUIT,
  CUIT_RAW,
  CBU,
  PASAPORTE,
  EXPEDIENTE,
  MATRICULA_ABOGADO,
  LEGAJO,
  LE_LC,
  TELEFONO,
  EMAIL,
  IP,
  DNI,         // al final: patrón más amplio, puede generar falsos positivos
];

export { validateCuilCuit };
