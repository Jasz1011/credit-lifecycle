# CreditFlow

CreditFlow es una aplicación full stack que implementa el ciclo de vida de una solicitud de crédito: autenticación, registro de la solicitud, evaluación en Comité de Riesgo, creación del crédito y su plan de pagos, desembolso y consulta posterior por identificación.

El proyecto fue construido para una prueba técnica de desarrollo Full Stack. La prioridad fue cumplir el flujo solicitado con reglas de negocio protegidas en backend, persistencia real, transacciones ACID y una ejecución reproducible con Docker. Sobre esa base se añadieron mejoras puntuales de UX, internacionalización y validación bancaria sin alterar el alcance funcional exigido.

## Qué resuelve

- Autenticación con usuario o correo, contraseña, JWT y refresh token.
- Registro de solicitudes con información personal, laboral y financiera.
- Cálculo inmediato de cuota nivelada en frontend y recálculo autoritativo en backend.
- Regla de edad máxima basada en la fecha completa de nacimiento.
- Comité de Riesgo de solo lectura; la vista muestra únicamente los campos permitidos.
- Aprobación transaccional con creación de crédito y plan de pagos.
- Rechazo sin creación de crédito.
- Desembolso únicamente para créditos aprobados.
- Consulta de crédito y plan de pagos por Cédula / Identificación.
- Dashboard operativo.
- Interfaz en español e inglés.
- Swagger/OpenAPI, códigos de error estables y healthcheck.
- Persistencia SQLite mediante volumen Docker.

## Flujo principal

```text
PENDING ──────> APPROVED ──────> DISBURSED
   └──────────> REJECTED
```

1. El usuario inicia sesión.
2. Registra una nueva solicitud.
3. CreditFlow calcula y muestra la cuota estimada.
4. El Comité de Riesgo revisa únicamente la información autorizada.
5. La solicitud se aprueba con observaciones o se rechaza.
6. Al aprobar, se genera el crédito y el plan de pagos dentro de una transacción.
7. Un crédito aprobado puede desembolsarse seleccionando banco y cuenta destino.
8. El plan de pagos puede consultarse posteriormente por identificación.

## Stack

### Frontend

- React + Vite
- TypeScript en modo estricto
- React Router
- TanStack Query
- React Hook Form + Zod
- Axios
- react-i18next
- Tailwind CSS / estilos de aplicación

### Backend

- NestJS
- TypeScript
- Prisma ORM
- SQLite
- JWT
- Argon2
- class-validator / class-transformer
- Swagger / OpenAPI

### Infraestructura

- Docker
- Docker Compose
- Nginx
- volumen persistente para SQLite
- workspace pnpm

## Arquitectura

CreditFlow utiliza un monolito modular. Para el tamaño de la prueba, separar el dominio en microservicios añadiría complejidad operativa sin aportar una ventaja proporcional.

```text
React SPA
   │
   │ HTTP / JWT
   ▼
NestJS modular API
   │
   │ Prisma
   ▼
SQLite
```

Las reglas críticas viven en backend. El frontend mejora la experiencia de captura, pero no constituye la única barrera para edad, estados, aprobación, desembolso ni validación financiera.

La aprobación y el desembolso utilizan transacciones de base de datos y restricciones de unicidad para proteger la integridad incluso ante solicitudes repetidas o concurrentes.

Más detalle: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Inicio rápido con Docker

### Requisito

- Docker Engine con Docker Compose.

### Ejecutar

Después de clonar o descargar el repositorio:

```bash
cd credit-lifecycle
docker compose up --build
```

El frontend quedará disponible en:

```text
http://localhost:3000
```

Servicios:

```text
Frontend   http://localhost:3000
API        http://localhost:3001/api
Swagger    http://localhost:3001/api/docs
Health     http://localhost:3001/api/health
```

La API aplica las migraciones y ejecuta el seed al iniciar. SQLite se mantiene en un volumen nombrado, por lo que `docker compose down` no elimina la información.

### Detener conservando datos

```bash
docker compose down
```

### Reiniciar también la base persistida

```bash
docker compose down -v
```

Use `-v` únicamente cuando realmente quiera eliminar los datos del entorno.

## Credenciales de evaluación

```text
Usuario:    analista
Correo:     analista@mcsystems.local
Contraseña: Credito2026!
```

El seed es idempotente.

## Desarrollo local

Para trabajar sin contenedores se requiere Node.js, Corepack y las dependencias del workspace.

Primero copie `.env.example` como `apps/api/.env` y sustituya los secretos de ejemplo por valores locales adecuados. La plantilla usa:

```text
DATABASE_URL="file:../data/credit.db"
```

Esa ruta es relativa al esquema Prisma ejecutado desde `apps/api`. En Docker no se reutiliza: Compose configura `DATABASE_URL=file:/app/data/credit.db` sobre el volumen persistente.

Después puede preparar y ejecutar el workspace:

```bash
corepack pnpm install
corepack pnpm --filter @credit/api prisma:generate
corepack pnpm --filter @credit/api prisma:migrate
corepack pnpm --filter @credit/api prisma:seed
corepack pnpm dev
```

El frontend lee `VITE_API_URL` mediante `import.meta.env`, pero incluye el fallback:

```text
http://localhost:3001/api
```

Por eso no necesita un archivo `apps/web/.env` para el desarrollo local estándar. Docker inyecta `VITE_API_URL` como argumento de build.

No se deben versionar secretos reales.

## Reglas de negocio principales

- Toda solicitud inicia en `PENDING`.
- Solo una solicitud `PENDING` puede aprobarse o rechazarse.
- Aprobar exige observaciones.
- Una persona de 80 años exactos es válida; una persona mayor de 80 es rechazada.
- La vista del Comité muestra únicamente identificación, nombre, edad, cantidad de cuotas, periodicidad, plazo y monto solicitado. La API incluye además un `id` técnico para identificar el expediente; ese valor no se presenta como dato del crédito.
- La aprobación crea un único crédito y exactamente el número de cuotas solicitado.
- Solo un crédito `APPROVED` puede desembolsarse.
- Los bancos disponibles son LAFISE, FICOHSA, BAC Credomatic y Banpro.
- El desembolso y el cambio a `DISBURSED` se ejecutan de forma atómica.

La separación entre requisitos originales y decisiones de implementación está documentada en [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md).

## Cálculo financiero

La periodicidad usa los factores definidos por la prueba:

```text
ANUAL      n = 1
MENSUAL    n = 12
QUINCENAL  n = 24
```

```text
i = (tasa anual / 100) / n

cuota =
monto × [i × (1 + i)^cantidad]
      / [((1 + i)^cantidad) - 1]
```

Para tasa `0 %`:

```text
cuota = monto / cantidad
```

Los importes se almacenan en centavos enteros y las tasas en puntos base. El plan de pagos redondea a centavos y ajusta la última cuota para cerrar el saldo exactamente en cero.

## Validación de cuenta e IBAN

La especificación únicamente exige banco destino y número de cuenta. CreditFlow conserva ese comportamiento y añade una validación estructural opcional cuando la entrada tiene formato de IBAN.

La validación distingue:

```text
Cuenta local
    └─> regla genérica compatible con la prueba

IBAN
    ├─> estructura, país, longitud y MOD-97
    └─> compatibilidad banco–IBAN cuando existe evidencia oficial registrada
```

La regla de compatibilidad bancaria utiliza tres resultados:

- `MATCH`: la asociación conocida coincide.
- `MISMATCH`: existe una contradicción comprobable y se bloquea antes de la transacción.
- `NOT_VERIFIABLE`: no existe información suficiente para afirmar una incompatibilidad; el flujo no se bloquea.

No se verifica existencia, titularidad, saldo ni capacidad de recepción de la cuenta y no se realizan transferencias reales.

Diseño, fuentes y límites: [docs/BANK_ACCOUNT_VALIDATION.md](docs/BANK_ACCOUNT_VALIDATION.md).

## Autenticación y sesión

- Contraseñas verificadas con Argon2.
- Access token mantenido en memoria.
- Refresh token en cookie HttpOnly.
- Rotación del refresh token.
- Persistencia del hash del refresh, no del token utilizable.
- Revocación al cerrar sesión.
- Recuperación de sesión después de recargar mediante refresh.

Los controles implementados son adecuados para la prueba, no una afirmación de seguridad bancaria de producción.

## Calidad y pruebas

La suite automatizada versionada cubre:

- fórmula financiera y tasa cero;
- edades límite;
- transiciones de estado;
- propagación de fallos dentro de la operación transaccional de aprobación;
- cantidad de cuotas;
- doble aprobación y doble desembolso;
- validaciones de formularios;
- comportamiento visible de Comité y Desembolso;
- cuentas locales e IBAN;
- compatibilidad banco–IBAN;
- endpoints HTTP.

Además se realizaron verificaciones de QA de extremo a extremo y persistencia Docker durante el desarrollo. Entre ellas se comprobó explícitamente que el presenter del Comité no expusiera campos adicionales en la vista evaluada. Esos scripts viven en `.qa/`, carpeta deliberadamente excluida del repositorio de entrega, por lo que se documentan como evidencia de QA realizada y no como parte de la suite reproducible publicada.

Quality gates:

```bash
corepack pnpm -r typecheck
corepack pnpm -r lint
corepack pnpm -r test
corepack pnpm -r build
corepack pnpm --filter @credit/api prisma:validate
```

## Decisiones técnicas relevantes

- Monolito modular en lugar de microservicios.
- Backend como autoridad de reglas de negocio.
- Dinero en centavos y tasas en puntos base.
- Presenters para separar persistencia y contrato HTTP.
- Transiciones condicionales y restricciones `unique` para integridad.
- Número de crédito derivado de un ID autoincremental, no de `count + 1`.
- Refresh token rotado y almacenado como hash.
- Códigos de error estables para permitir traducción en frontend.
- Mejoras adicionales aisladas de los requisitos obligatorios.

## Trade-offs

- SQLite es apropiado para el alcance de la evaluación, pero no está planteado como base de alta concurrencia.
- La identificación es única en esta simulación. En un producto real convendría separar `Customer` de `LoanApplication`.
- El calendario usa intervalos deterministas; no modela feriados, calendarios bancarios ni convenciones complejas de días.
- La validación bancaria es estructural y parcial; no sustituye una integración real con una institución financiera.
- No se añadieron reglas de scoring, KYC, AML ni políticas crediticias que la especificación no define.

## Documentación

```text
docs/
├── ARCHITECTURE.md
├── BANK_ACCOUNT_VALIDATION.md
├── BUSINESS_RULES.md
├── COMPLIANCE_MATRIX.md
├── AI_USAGE.md
├── FRONTEND_VISUAL_DIRECTION.md
└── BRAND_ASSETS.md
```

- [Arquitectura](docs/ARCHITECTURE.md): estructura, límites, transacciones y decisiones.
- [Reglas de negocio](docs/BUSINESS_RULES.md): requisitos originales frente a decisiones de implementación.
- [Matriz de cumplimiento](docs/COMPLIANCE_MATRIX.md): trazabilidad requisito → implementación → validación.
- [Uso de IA](docs/AI_USAGE.md): cómo se utilizó IA, qué decisiones fueron revisadas y cómo se verificaron.
- [Validación bancaria](docs/BANK_ACCOUNT_VALIDATION.md): diseño y fuentes de la mejora IBAN.
- [Dirección visual](docs/FRONTEND_VISUAL_DIRECTION.md): criterio de diseño del frontend.
- [Activos de marca](docs/BRAND_ASSETS.md): procedencia y límites de uso de logos públicos.

## Uso de IA

La prueba permite y valora el uso eficiente de herramientas de IA. En este proyecto se utilizaron como apoyo para análisis, implementación, revisión y pruebas; las decisiones de arquitectura, los límites de alcance y la aceptación de cambios se validaron contra la especificación y mediante pruebas.

La bitácora está en [docs/AI_USAGE.md](docs/AI_USAGE.md).

## Consideraciones para producción

CreditFlow es una simulación técnica, no un core bancario de producción. Un despliegue real requeriría, entre otros controles, gestión externa de secretos, HTTPS obligatorio, cookies `Secure`, rate limiting, MFA según riesgo, permisos por rol, auditoría inmutable, observabilidad, backups, cifrado y políticas de retención, además de una base de datos preparada para concurrencia y alta disponibilidad.
