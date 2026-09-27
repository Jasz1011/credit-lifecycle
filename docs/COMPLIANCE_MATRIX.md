# Matriz de cumplimiento

Esta matriz traduce la especificación de la prueba técnica a componentes concretos de CreditFlow.

Las mejoras de implementación se muestran por separado para evitar atribuir a la empresa requisitos que no aparecen en el documento original.

## Requisitos obligatorios

| Requisito | Implementación | Ubicación principal | Verificación |
| --- | --- | --- | --- |
| Login con usuario y contraseña | NestJS Auth + Argon2 | `apps/api/src/auth`, `apps/api/src/users` | pruebas de auth + flujo real |
| JWT firmado | Access token emitido al autenticar | `auth` | pruebas de autenticación |
| Información personal | Formulario y DTO con todos los campos requeridos | `loan-applications`, `NewApplicationPage.tsx` | DTO + Zod + flujo |
| Información laboral | Tipo, empresa, antigüedad e ingreso | `loan-applications`, `NewApplicationPage.tsx` | DTO + formulario |
| Condiciones del crédito | Monto, cuotas, tasa y periodicidad | `loan-applications`, `NewApplicationPage.tsx` | DTO + formulario |
| Asalariado / Independiente | Enum controlado | Prisma + DTO + frontend | rechazo de valores inválidos |
| Anual / Mensual / Quincenal | Enum + factores 1 / 12 / 24 | cálculo financiero | pruebas unitarias |
| Cuota nivelada visible en frontend | Vista previa reactiva | `apps/web/src/lib/finance.ts` | pruebas frontend |
| Rechazar mayores de 80 | Edad por fecha completa | backend + formulario | 79 / 80 / 81 años |
| Comité de solo lectura | Presenter específico para el caso y vista sin edición | `risk-committee` | inspección de presenter + UI |
| Comité muestra solo campos permitidos | La UI renderiza solo los siete campos exigidos; el contrato incluye además un `id` técnico para identificar el expediente | `RiskCommitteeService`, `RiskCommitteePage` | inspección de presenter + UI |
| Aprobar | Endpoint y transición protegida | `risk-committee` | pruebas de estado |
| Rechazar | Endpoint y transición protegida | `risk-committee` | pruebas de estado |
| Observaciones obligatorias al aprobar | DTO + regla de servicio | `ApproveApplicationDto` | rechazo sin observaciones |
| Crear crédito al aprobar | Relación única | `RiskCommitteeService`, Prisma | prueba de doble aprobación |
| Número de crédito | Secuencia basada en ID | `RiskCommitteeService` | unicidad |
| Relacionar crédito y solicitud | Relación 1 a 0..1 | Prisma | restricción `unique` validada contra SQLite real |
| Crear plan al aprobar | N cuotas dentro de la aprobación | `PaymentScheduleService` | cantidad exacta |
| Integridad ACID | Transacción única de aprobación | `RiskCommitteeService` | suite de integración con Prisma + SQLite real: rollback ante fallo del plan, persistencia de estados y restricciones de BD |
| Desembolso solo para aprobados | Filtro + validación backend | `disbursements` | pruebas unitarias + integración SQLite con APPROVED / PENDING / REJECTED |
| Mostrar solo campos permitidos en desembolso | `CreditsService.listApproved()` entrega un DTO de crédito más amplio; la vista de Desembolso renderiza únicamente identificación, nombre, monto, tasa, periodicidad y plazo | `CreditsService`, `presentCredit`, `DisbursementsPage` | inspección de DTO + UI |
| Cuatro bancos exigidos | Enum controlado | Prisma + DTO + `BankSelector` | validación |
| Número de cuenta obligatorio | DTO + validador | `disbursements` | pruebas de entrada |
| Cambio a desembolsado | Transición + `Disbursement` | `DisbursementsService` | prueba de doble desembolso + verificación E2E realizada durante QA |
| SQLite en archivo | Prisma `sqlite` | `apps/api/prisma/schema.prisma` | `prisma:validate` + runtime |
| Archivo persistido por volumen | Volumen Docker | `docker-compose.yml` | reinicio sin `-v` |
| Dockerfiles | Imagen API + imagen web | `apps/api/Dockerfile`, `apps/web/Dockerfile` | build |
| Compose en raíz | Orquestación completa | `docker-compose.yml` | `docker compose up --build` |
| README con ejecución local | Guía principal | `README.md` | revisión contra comandos |
| Resumen de arquitectura | Documento dedicado | `docs/ARCHITECTURE.md` | revisión |
| Bitácora de IA | Registro de apoyo, decisión y verificación | `docs/AI_USAGE.md` | revisión |

## Extras originales

| Extra | Implementación | Ubicación | Verificación |
| --- | --- | --- | --- |
| Refresh Token | Cookie HttpOnly, rotación, hash y revocación | `auth`, `RefreshToken` | pruebas de sesión |
| Buscar por identificación y cargar plan | Búsqueda exacta + pantalla | `credits`, `PaymentSchedulePage` | existente / inexistente / sin crédito |

## Mejoras de implementación

Estas capacidades no se presentan como requisitos originales.

| Mejora | Propósito | Evidencia |
| --- | --- | --- |
| Dashboard | Visibilidad operativa | API + UI |
| ES/EN | Usabilidad | catálogos i18n |
| Swagger/OpenAPI | Inspección del API | `/api/docs` |
| Healthcheck | Comprobar disponibilidad de la API y soportar la orquestación Docker | `/api/health` + Compose |
| Códigos de error estables | Contrato frontend/backend | filtros + traducciones |
| Desglose de amortización | Plan auditable | pruebas de principal/interés/saldo |
| Manejo de tasa 0 % | Resolver correctamente el caso límite de la fórmula sin alterar tasas positivas | cálculo financiero + pruebas |
| Precisión monetaria | Evitar errores acumulativos de punto flotante | importes en centavos + tasas en puntos base |
| Confirmaciones y estados de UI | Reducir errores de operación | pruebas frontend |
| Mejoras de accesibilidad | Labels, atributos ARIA, foco y controles semánticos | componentes y formularios frontend |
| Validación IBAN | Validación estructural real | `bank-account.validator.ts` |
| Compatibilidad banco–IBAN | Bloquear contradicciones verificables | `bank-iban.validator.ts` |
| Historial operativo seguro | Trazabilidad de créditos existentes sin ampliar las vistas restringidas; actores y fechas provienen de relaciones persistidas y la cuenta se expone enmascarada | `CreditsService`, `presentOperationalHistory`, `CreditTimeline` + pruebas API/web |
| Documentación de fuentes bancarias | Trazabilidad de la mejora | `BANK_ACCOUNT_VALIDATION.md` |

## Modelo de datos

```text
User 1 ── N RefreshToken
User 1 ── N LoanApplication
LoanApplication 1 ── 0..1 Credit
Credit 1 ── N PaymentInstallment
Credit 1 ── 0..1 Disbursement
```

Los importes se almacenan en centavos y las tasas en puntos base.

## Estados

```text
PENDING ──────> APPROVED ──────> DISBURSED
   └──────────> REJECTED
```

Solo esas transiciones son válidas.

## Endpoints principales

| Método | Ruta | Uso |
| --- | --- | --- |
| POST | `/api/auth/login` | autenticar |
| POST | `/api/auth/refresh` | rotar sesión |
| POST | `/api/auth/logout` | cerrar sesión |
| GET | `/api/auth/me` | usuario actual |
| POST | `/api/loan-applications` | crear solicitud |
| GET | `/api/loan-applications` | listar solicitudes |
| GET | `/api/loan-applications/:id` | consultar solicitud |
| GET | `/api/risk-committee/pending` | pendientes del Comité |
| GET | `/api/risk-committee/:id` | caso del Comité |
| POST | `/api/risk-committee/:id/approve` | aprobar |
| POST | `/api/risk-committee/:id/reject` | rechazar |
| GET | `/api/credits/approved` | créditos disponibles para desembolso |
| GET | `/api/credits/search?identification=` | buscar por identificación |
| GET | `/api/credits/:id` | consultar crédito |
| GET | `/api/credits/:id/payment-schedule` | obtener plan |
| POST | `/api/credits/:id/disburse` | desembolsar |
| GET | `/api/dashboard/summary` | métricas |
| GET | `/api/health` | healthcheck |

## Ambigüedades resueltas

| Punto | Interpretación | Razón |
| --- | --- | --- |
| Numeración repetida en el documento | Se sigue el orden semántico Login → Solicitud → Comité → Desembolso | Es un detalle editorial |
| El plazo se muestra pero no se captura | Se deriva de cuotas y periodicidad | Evita inventar un campo |
| “Mayores de 80” | 80 exactos permitido | Lectura literal |
| Número de cuotas vs. plazo | `installmentCount` determina los registros del plan | Es el dato explícitamente capturado |
| Redondeo no definido | Centavos + ajuste final | Resultado determinista |
| Fechas de vencimiento no definidas | Intervalos deterministas | Mejora que no altera la fórmula |
