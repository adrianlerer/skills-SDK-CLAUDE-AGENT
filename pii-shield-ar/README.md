# PII Shield AR

Fork argentino de [PII Shield](https://github.com/gregmos/PII-Shield) — servidor MCP para anonimización de datos personales bajo legislación argentina (Ley 25.326, Ley 27.401).

## Tipos de PII detectados

| Tipo | Ejemplo | Validación |
|---|---|---|
| DNI | `28.456.789` / `28456789` | Formato (7-8 dígitos) |
| CUIL | `20-28456789-8` | Check digit mod-11 |
| CUIT empresa | `30-71234567-1` | Check digit mod-11 |
| CBU | `0170099340000012345678` (22 dígitos) | Formato |
| CVU | `0000003100025152519738` | Prefijo + formato |
| Pasaporte AR | `AA123456` / `AAA123456` | Formato |
| Teléfono AR | `+54 9 11 5555-1234` / `011-4123-4567` | Formato |
| Expediente judicial | `Expte. 45.678/23` / `Causa Nº 1234/2024` | Formato |
| Matrícula abogado (CPACF) | `T° 123 F° 456` | Formato |
| Legajo | `Legajo Nº 12345` | Formato |
| LE/LC | `L.E. 1234567` | Formato |
| Email | `usuario@dominio.com` | Formato RFC |
| IP | `192.168.1.1` | Formato |

## Herramientas MCP

- **`anonymize_text`** — reemplaza PII por placeholders, devuelve `session_id`
- **`deanonymize_text`** — restaura el original usando el `session_id`
- **`scan_text`** — detecta PII sin modificar el texto (auditoría)
- **`get_session_mapping`** — muestra la tabla placeholder → valor real
- **`new_session`** — crea sesión vacía
- **`clear_session`** — elimina sesión de memoria
- **`list_entities`** — lista todos los tipos de PII soportados

## Instalación en Claude Desktop

```json
{
  "mcpServers": {
    "pii-shield-ar": {
      "command": "node",
      "args": ["/ruta/a/pii-shield-ar/dist/index.js"]
    }
  }
}
```

## Desarrollo

```bash
npm install
npm run dev          # modo desarrollo (tsx)
npm test             # 22 tests de patrones
npm run build        # compila a dist/
```

## Uso típico con Justitia / IntegridAI

```
1. Antes de enviar un contrato a Claude:
   → anonymize_text(texto_del_contrato)
   → guardar session_id

2. Claude analiza el texto anonimizado (sin ver DNI/CUIT reales)

3. Después del análisis:
   → deanonymize_text(respuesta_claude, session_id)
   → el informe final tiene los datos reales restaurados
```

## Créditos

Basado en [PII Shield](https://github.com/gregmos/PII-Shield) de Grigorii Moskalev (MIT).
Patrones argentinos y adaptación: adrianlerer.
