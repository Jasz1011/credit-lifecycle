# Uso de Inteligencia Artificial

## Propósito

La especificación permite y valora el uso eficiente de herramientas de Inteligencia Artificial, siempre que el candidato comprenda, justifique y mantenga la calidad de las modificaciones.

Utilicé IA como herramienta de apoyo para acelerar análisis, implementación, investigación y QA. No la traté como fuente de verdad del dominio: las decisiones se contrastaron con la especificación, el comportamiento real del sistema, documentación oficial cuando correspondía y pruebas automatizadas o manuales.

La responsabilidad final sobre arquitectura, alcance y aceptación de cambios fue humana.

## Principios de trabajo

- La especificación original tiene prioridad sobre cualquier sugerencia de IA.
- Requisito y mejora se documentan por separado.
- Una sugerencia no se acepta si introduce una regla de negocio no solicitada.
- Las operaciones financieras críticas se verifican en backend y mediante pruebas.
- Para estándares externos se priorizan fuentes oficiales.
- Cuando una conclusión no puede demostrarse, se prefiere `NOT_VERIFIABLE` a inventar una prohibición.
- Los prompts pueden acelerar trabajo; no sustituyen la capacidad de explicar el código resultante.

## Bitácora resumida

| Área | Herramienta | Enfoque del prompt | Decisión / revisión humana | Verificación |
| --- | --- | --- | --- | --- |
| Lectura de requisitos | Codex | Extraer requisitos, extras, ambigüedades y entregables | Separé obligaciones de decisiones propias y mantuve el DOCX como fuente de verdad | Matriz de cumplimiento |
| Arquitectura y datos | Codex | Diseñar entidades, relaciones y transacciones evitando duplicados | Elegí monolito modular; revisé invariantes y restricciones únicas | pruebas de servicios + Prisma |
| Fórmula financiera | Codex | Implementar factores 1/12/24, tasa cero, centavos y edad | Mantener fórmula literal; tratar 0 % como caso matemático; ajustar última cuota | pruebas de fórmula, 79/80/81 y saldo final |
| Frontend | Codex | Construir flujo React profesional, responsive y bilingüe | Evité datos inventados; mantuve la proyección específica del Comité y la restricción visual de campos en Desembolso | QA manual + pruebas frontend |
| Docker | Codex | Levantar API, web, migraciones, seed y volumen con un comando | Mantener SQLite persistente y secretos fuera de Git | build, healthchecks y persistencia |
| Auditoría final | Codex | Buscar fallos de estado, redondeo, validación, i18n y contenedores | Revisé los defectos encontrados y limité cambios al alcance real | typecheck, lint, tests, build, E2E |
| Validación IBAN | Codex + investigación | Añadir validación estructural sin exigir IBAN | Acepté `ibantools` para evitar mantener manualmente formatos nacionales; backend quedó como autoridad | unitarias + HTTP + E2E |
| Banco ↔ IBAN | Codex + fuentes oficiales | Comprobar compatibilidad solo con mappings demostrables | Definí `MATCH / MISMATCH / NOT_VERIFIABLE`; descarté mappings con evidencia insuficiente | pruebas por país + E2E |
| Cobertura parcial | Codex | Corregir el caso en que un código conocido pertenece a otro banco | Detecté el contraejemplo `CR 0102 + LAFISE`; corregí la semántica sin añadir mappings nuevos | unitarias + prueba HTTP antes de transacción |

## Ejemplos de revisión humana

### 1. Plazo

La especificación muestra “Plazo” pero no define un campo independiente de captura.

En lugar de inventar otro dato obligatorio, decidí derivarlo de:

```text
cantidad de cuotas + periodicidad
```

Esto mantiene consistencia con la información realmente solicitada.

### 2. Edad máxima

“Mayores de 80” se interpretó literalmente:

```text
80 exactos → permitido
> 80       → rechazado
```

La implementación se validó con cumpleaños completos, no solo con diferencia de años.

### 3. Tasa 0 %

La fórmula estándar deja de ser válida algebraicamente cuando la tasa periódica es cero.

Se añadió explícitamente:

```text
cuota = monto / cuotas
```

sin cambiar el comportamiento para tasas positivas.

### 4. IBAN no obligatorio

La prueba exige una cuenta bancaria, no IBAN.

Por eso una cuenta local como:

```text
100200300400
```

sigue siendo válida.

La mejora IBAN solo se aplica cuando la entrada puede identificarse como tal.

### 5. No confundir “desconocido” con “inválido”

Durante la validación banco–IBAN apareció una decisión importante:

```text
sin mapping conocido
≠
cuenta inválida
```

Se definió `NOT_VERIFIABLE` para no bloquear por falta de información.

### 6. Corrección de una conclusión insuficiente

Una primera versión de la lógica parcial trataba:

```text
CR 0102 + LAFISE
```

como `NOT_VERIFIABLE` porque no estaba registrado el código propio de LAFISE Costa Rica.

Revisé el caso y detecté que esa conclusión era incorrecta: `0102` ya estaba verificado como BAC Credomatic. Aunque falte el código de LAFISE, existe una contradicción conocida.

La semántica final quedó:

```text
CR 0102 + BAC      → MATCH
CR 0102 + LAFISE   → MISMATCH
CR código desconocido + LAFISE → NOT_VERIFIABLE
```

Este cambio se hizo en el motor genérico y se cubrió con pruebas, sin hardcodear una condición especial de Costa Rica.

## Investigación externa asistida

Para la mejora bancaria se consultaron fuentes oficiales o de primera parte, entre ellas:

- SWIFT — IBAN Registry;
- Banco Central de Nicaragua;
- Banco Central de Honduras;
- documentación oficial de BAC Costa Rica;
- documentación pública de instituciones bancarias cuando fue necesaria.

Los mappings solo se incorporaron cuando la evidencia era suficiente para utilizarla como regla de rechazo.

Los detalles se mantienen en [BANK_ACCOUNT_VALIDATION.md](BANK_ACCOUNT_VALIDATION.md).

## Qué no se delegó a la IA

La IA no tuvo autoridad para decidir por sí sola:

- qué requisitos eran obligatorios;
- qué reglas de negocio añadir;
- si una mejora debía entrar al proyecto;
- qué afirmaciones bancarias podían convertirse en reglas;
- cuándo una implementación estaba lista para aceptarse.

Las sugerencias fueron revisadas contra:

- especificación original;
- código existente;
- comportamiento manual;
- pruebas;
- fuentes oficiales cuando aplicaba.

## Verificación

A lo largo del desarrollo se ejecutaron repetidamente:

```bash
corepack pnpm -r typecheck
corepack pnpm -r lint
corepack pnpm -r test
corepack pnpm -r build
corepack pnpm --filter @credit/api prisma:validate
docker compose up --build -d
```

También se verificaron:

- login y recuperación de sesión;
- aprobación y rechazo;
- doble aprobación;
- doble desembolso;
- plan de pagos;
- saldo final;
- edad límite;
- persistencia del volumen;
- IBAN válido e inválido;
- incompatibilidad banco–IBAN;
- compatibilidad con cuenta local.

## Alcance de las verificaciones E2E

Durante el desarrollo se utilizaron scripts auxiliares bajo `.qa/` para recorrer flujos completos y comprobar persistencia de Docker. Esa carpeta está excluida mediante `.gitignore`, por lo que dichas ejecuciones se registran aquí como evidencia del proceso de QA y no como pruebas E2E versionadas dentro del repositorio de entrega.

## Conclusión

La IA permitió iterar más rápido, especialmente en búsqueda de casos límite, generación de pruebas y revisión repetitiva. El criterio aplicado fue mantener una frontera clara: **la IA propone y acelera; la especificación, el código, las pruebas y la revisión humana deciden**.
