# Arquitectura de CreditFlow

## 1. Objetivo arquitectónico

CreditFlow se diseñó para resolver un flujo financiero pequeño pero sensible a integridad: una solicitud puede aprobarse o rechazarse una sola vez, una aprobación debe producir exactamente un crédito y su plan de pagos, y un crédito solo puede desembolsarse si se encuentra aprobado.

La arquitectura prioriza cuatro propiedades:

1. reglas de negocio autoritativas en backend;
2. atomicidad en operaciones críticas;
3. separación clara entre interfaz, dominio y persistencia;
4. complejidad proporcional al alcance de la prueba.

Por esa razón se eligió un **monolito modular** en NestJS en lugar de microservicios.

## 2. Vista general

```text
┌─────────────────────────────┐
│ React SPA                   │
│ Router · Query · Forms      │
│ i18n · validation feedback  │
└──────────────┬──────────────┘
               │ HTTP / JWT
               ▼
┌─────────────────────────────┐
│ NestJS API                  │
│ auth                        │
│ loan-applications           │
│ risk-committee              │
│ credits                     │
│ payment-schedule            │
│ disbursements               │
│ dashboard                   │
│ health                      │
└──────────────┬──────────────┘
               │ Prisma
               ▼
┌─────────────────────────────┐
│ SQLite                      │
│ persistent Docker volume    │
└─────────────────────────────┘
```

El contrato HTTP desacopla frontend y backend, mientras los módulos del backend mantienen separados los casos de uso del dominio.

## 3. Backend

Los controllers reciben DTOs, aplican validación de entrada y delegan en servicios. Las reglas de negocio y las transacciones no dependen del componente React que originó la operación.

Módulos principales:

| Módulo | Responsabilidad |
| --- | --- |
| `auth` | Login, access token, refresh, logout y sesión |
| `users` | Usuario autenticado y datos asociados |
| `loan-applications` | Registro y consulta de solicitudes |
| `risk-committee` | Proyección restringida, aprobación y rechazo |
| `credits` | Consulta del crédito y búsquedas |
| `payment-schedule` | Cálculo y exposición del plan |
| `disbursements` | Validación y ejecución del desembolso |
| `dashboard` | Métricas operativas |
| `health` | Estado de la API |
| `prisma` | Acceso a persistencia |

Las funciones financieras, de edad y de validación bancaria se mantienen testeables y fuera de controllers.

## 4. Modelo de datos

Relaciones principales:

```text
User 1 ── N RefreshToken
User 1 ── N LoanApplication
LoanApplication 1 ── 0..1 Credit
Credit 1 ── N PaymentInstallment
Credit 1 ── 0..1 Disbursement
```

### Decisiones de persistencia

- Los importes se guardan en **centavos enteros**.
- Las tasas se guardan en **puntos base**.
- `Credit.loanApplicationId` es único.
- `Disbursement.creditId` es único.
- La identificación del cliente es única dentro de esta simulación.

La identificación única es una simplificación consciente. En un producto real, `Customer` y `LoanApplication` deberían ser entidades separadas para permitir múltiples solicitudes históricas por cliente.

## 5. Estados e invariantes

```text
PENDING ──────> APPROVED ──────> DISBURSED
   └──────────> REJECTED
```

Invariantes relevantes:

- una solicitud procesada no vuelve a `PENDING`;
- una solicitud no puede producir más de un crédito;
- un crédito no puede tener más de un desembolso;
- un rechazo no crea crédito;
- un desembolso exige estado aprobado;
- la cantidad de cuotas creadas debe coincidir con `installmentCount`.

El frontend puede ocultar o deshabilitar acciones, pero la API vuelve a comprobar cada regla.

## 6. Transacciones y concurrencia

### Aprobación

La aprobación ejecuta como una única operación lógica:

```text
validar PENDING
    ↓
transición condicional
    ↓
crear Credit
    ↓
asignar número de crédito
    ↓
crear PaymentInstallment × N
    ↓
commit
```

Si una parte falla, la transacción revierte.

La transición condicional y las restricciones únicas complementan la transacción para evitar que solicitudes repetidas o concurrentes creen recursos duplicados.

El número de crédito se deriva del ID autoincremental asignado al registro y no de `count + 1`, evitando colisiones por concurrencia.

### Desembolso

El desembolso comprueba primero:

- estado aprobado;
- banco permitido;
- cuenta válida;
- validación IBAN cuando aplica;
- compatibilidad banco–IBAN cuando existe una regla verificable.

Después ejecuta la transición y crea `Disbursement` dentro de una transacción. Un `unique` sobre `creditId` proporciona una barrera adicional contra duplicados.

## 7. Cálculo financiero

`FinancialCalculatorService` implementa la fórmula de cuota nivelada definida en la prueba.

```text
i = (tasa anual / 100) / n
```

con:

```text
ANNUAL     n = 1
MONTHLY    n = 12
BIWEEKLY   n = 24
```

Para tasa cero:

```text
payment = amount / installments
```

`PaymentScheduleService` distribuye cada pago en principal e interés. Los componentes se redondean a centavos y la última cuota absorbe la diferencia mínima necesaria para finalizar con saldo cero.

El desglose de principal/interés y las fechas son mejoras de implementación; no sustituyen la fórmula obligatoria.

## 8. Validación bancaria

La prueba requiere banco destino y número de cuenta, pero no define formatos bancarios.

La implementación mantiene dos rutas:

```text
account input
   │
   ├── local account
   │      └── conservative generic validation
   │
   └── IBAN candidate
          ├── country / length / BBAN / MOD-97
          └── verified bank compatibility rules
```

`bank-account.validator.ts` decide si la entrada es local o candidata a IBAN.

`bank-iban.validator.ts` devuelve:

- `MATCH`;
- `MISMATCH`;
- `NOT_VERIFIABLE`.

Solo `MISMATCH` bloquea el desembolso. La ausencia de información no se convierte en una prohibición inventada.

Las asociaciones verificadas viven separadas del motor en `verified-bank-iban-rules.ts`, por lo que añadir una regla futura no obliga a reescribir el servicio o el formulario.

Detalles y fuentes: [BANK_ACCOUNT_VALIDATION.md](BANK_ACCOUNT_VALIDATION.md).

## 9. Autenticación

- Contraseñas verificadas con Argon2.
- Access token de vida corta.
- Access token conservado en memoria en el cliente.
- Refresh token en cookie HttpOnly.
- Rotación del refresh token.
- Persistencia de su hash.
- Revocación en logout.

El cliente intenta recuperar la sesión mediante refresh cuando corresponde. Esto permite evitar persistir el access token en `localStorage`.

## 10. Frontend

La SPA utiliza:

- React Router para navegación;
- TanStack Query para estado remoto y revalidación;
- React Hook Form + Zod para experiencia de captura;
- Axios para comunicación y sesión;
- react-i18next para ES/EN.

La validación del frontend existe para feedback inmediato. Las reglas críticas se repiten en backend.

### Datos visibles en Comité y Desembolso

Las dos pantallas deben respetar una restricción explícita de información, pero no utilizan exactamente la misma estrategia.

**Comité de Riesgo:** usa un presenter específico. El contrato contiene los siete datos exigidos por la prueba más un `id` técnico necesario para identificar el expediente; la UI no presenta ese identificador como información del crédito.

**Desembolso:** la lista de aprobados proviene de `CreditsService.listApproved()` y `presentCredit`, cuyo DTO contiene metadatos adicionales del crédito. `DisbursementsPage` renderiza únicamente identificación, nombre, monto, tasa, periodicidad y plazo, que son los campos exigidos por la prueba.

La distinción es intencionalmente documentada: el requisito habla de lo que cada pantalla debe mostrar, y no se afirma que ambos endpoints tengan una proyección idéntica.

### Historial operativo del crédito

La consulta del plan de pagos añade una proyección de solo lectura llamada `history`, construida a partir de relaciones y fechas que ya estaban persistidas. No se creó una tabla `AuditLog` ni se requirió una migración.

La proyección utiliza únicamente:

- fecha y usuario de registro de la solicitud;
- fecha y usuario de revisión cuando existe `reviewedAt` persistido;
- fecha y número de creación del crédito;
- fecha, usuario y banco del desembolso cuando existe;
- número de cuenta de desembolso enmascarado.

Los endpoints de consulta del plan (`/credits/search` y `/credits/:id/payment-schedule`) usan una proyección específica que no serializa el número de cuenta completo. Tampoco incorpora email, teléfono, fecha de nacimiento, ingreso mensual, hashes, tokens ni observaciones libres del Comité.

El historial no modifica estados ni reglas de negocio y no añade datos a las vistas restringidas de Comité o Desembolso. Si un evento no tiene evidencia persistida, no se inventa; por ejemplo, una revisión sin `reviewedAt` no se representa como realizada.

## 11. UX y accesibilidad

El frontend utiliza un shell responsive, sidebar/drawer, tablas contenidas, estados vacíos, confirmaciones y feedback por campo.

Los formularios utilizan asociaciones `label`, `aria-invalid` y `aria-describedby` en las validaciones relevantes. Los diálogos devuelven el foco al activador y las mutaciones bloquean envíos repetidos mientras están en curso.

El timeline solo aparece cuando existe un crédito real; no se generan eventos ficticios para decorar la interfaz.

## 12. Internacionalización

Los catálogos ES/EN separan los textos de interfaz de los datos del dominio.

No se traducen:

- nombres de clientes;
- identificaciones;
- números de crédito;
- nombres oficiales de bancos.

Los errores del backend utilizan códigos estables para que el frontend pueda presentar mensajes localizados sin depender del texto inglés de la respuesta HTTP.

## 13. Docker y persistencia

Docker Compose construye frontend y API desde la raíz.

La API:

1. prepara Prisma;
2. aplica migraciones;
3. ejecuta el seed idempotente;
4. inicia NestJS.

SQLite se almacena en un volumen persistente. `docker compose down` conserva los datos; `docker compose down -v` los elimina explícitamente.

Nginx sirve la SPA. El navegador utiliza la URL pública del API, mientras los healthchecks de los contenedores utilizan sus propias rutas internas.

## 14. Trade-offs

### SQLite

Adecuado para la prueba por simplicidad y portabilidad. No se presenta como sustituto de una base diseñada para alta concurrencia.

### Monolito modular

Reduce complejidad operativa y mantiene límites de dominio claros. Si el sistema creciera, los módulos actuales son puntos naturales para separar capacidades.

### Identificación única

Simplifica la simulación. Un producto real debería modelar cliente y solicitudes por separado.

### Calendario

Las fechas son deterministas y no consideran feriados, calendarios bancarios ni convenciones avanzadas de day-count.

### Validación bancaria

Es estructural y basada en evidencia verificable. No confirma existencia, titularidad ni disponibilidad de la cuenta.

## 15. Criterio de extensión

Una nueva capacidad debe añadirse solo si cumple al menos una de estas condiciones:

- protege una regla ya presente en la especificación;
- mejora integridad o trazabilidad sin cambiar el negocio;
- mejora UX sin mover reglas críticas al cliente;
- puede justificarse y probarse de forma aislada.

Ese criterio evita convertir una prueba acotada en un producto con reglas inventadas.
