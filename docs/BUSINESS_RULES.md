# Reglas de negocio

Este documento separa las reglas exigidas por la prueba técnica de las decisiones tomadas para completar una implementación consistente.

## 1. Ciclo de estados

```text
PENDING ──────> APPROVED ──────> DISBURSED
   └──────────> REJECTED
```

Transiciones permitidas:

- `PENDING → APPROVED`
- `PENDING → REJECTED`
- `APPROVED → DISBURSED`

Cualquier otra transición se rechaza en backend.

## 2. Requisitos obligatorios

### Autenticación

- El usuario se autentica con credenciales.
- La API emite un JWT firmado.

### Solicitud

Toda solicitud nueva inicia en `PENDING`.

Debe contener:

- nombre completo;
- Cédula / Identificación;
- correo;
- teléfono;
- fecha de nacimiento;
- tipo de empleo;
- empresa o lugar de trabajo;
- antigüedad laboral;
- ingreso mensual;
- monto solicitado;
- cantidad de cuotas;
- tasa anual;
- periodicidad.

Tipos de empleo:

```text
SALARIED
SELF_EMPLOYED
```

Periodicidades:

```text
BIWEEKLY
MONTHLY
ANNUAL
```

Una persona de 80 años exactos puede registrar una solicitud. Una persona mayor de 80 no puede.

### Cuota nivelada

```text
n = 1   anual
n = 12  mensual
n = 24  quincenal
```

```text
i = (tasa anual / 100) / n
```

```text
cuota =
monto × [i × (1 + i)^cuotas]
      / [((1 + i)^cuotas) - 1]
```

El frontend muestra el cálculo y el backend lo vuelve a calcular como autoridad.

### Comité de Riesgo

El Comité es de solo lectura respecto a los datos del crédito.

La vista muestra únicamente:

- Cédula / Identificación;
- nombre completo;
- edad;
- cantidad de cuotas;
- periodicidad;
- plazo;
- monto solicitado.

El contrato utilizado por la pantalla incluye además un `id` técnico para identificar el expediente. Ese identificador no se presenta como información del crédito.

Aprobar requiere observaciones.

Una solicitud ya procesada no puede aprobarse o rechazarse nuevamente.

### Aprobación

Aprobar:

1. cambia la solicitud a `APPROVED`;
2. crea un único crédito;
3. genera su número;
4. crea exactamente el número de cuotas solicitado.

La operación es transaccional.

### Rechazo

Rechazar cambia `PENDING` a `REJECTED`.

No crea:

- crédito;
- plan de pagos;
- desembolso.

### Desembolso

Solo un crédito aprobado puede aparecer disponible para desembolso.

La vista utiliza únicamente:

- identificación;
- nombre;
- monto;
- tasa;
- periodicidad;
- plazo.

Bancos permitidos:

- LAFISE;
- FICOHSA;
- BAC Credomatic;
- Banpro.

El número de cuenta es obligatorio.

Procesar el desembolso crea el registro correspondiente y cambia el estado a `DISBURSED` dentro de una transacción.

## 3. Extras de la prueba

Se implementaron ambos extras indicados:

- Refresh Token.
- Búsqueda por Cédula / Identificación y carga del plan de pagos.

## 4. Decisiones de implementación

Estas decisiones no se atribuyen a la especificación original.

### Plazo derivado

No se añadió un campo adicional de plazo porque la prueba ya captura cantidad de cuotas y periodicidad.

### Tasa cero

La fórmula estándar tiene una división por cero cuando `i = 0`. En ese caso:

```text
cuota = monto / cuotas
```

### Precisión monetaria

Los importes se guardan en centavos y las tasas en puntos base.

La última cuota absorbe la diferencia mínima de redondeo para cerrar el saldo en cero.

### Calendario

El primer vencimiento se ubica un período después de la aprobación. Las fechas y el desglose principal/interés son una mejora de implementación.

### Número de crédito

Se utiliza:

```text
CR-<ID AUTOINCREMENTAL CON PADDING>
```

La generación no depende de contar registros existentes.

### Identificación única

Se mantiene una sola solicitud por identificación en esta simulación para evitar expedientes ambiguos.

En un producto real sería preferible:

```text
Customer 1 ── N LoanApplication
```

### Refresh token

Se utiliza cookie HttpOnly, rotación, persistencia por hash y revocación.

### Internacionalización

ES/EN afecta únicamente textos de interfaz y mensajes. No modifica nombres, identificaciones ni nombres oficiales de bancos.

### UX y documentación técnica

Dashboard, Swagger, estados vacíos, confirmaciones, códigos de error estables y mejoras de accesibilidad son extensiones profesionales sobre el flujo obligatorio.

## 5. Validación bancaria adicional

La prueba exige cuenta bancaria, pero no define un formato nacional.

CreditFlow:

- mantiene cuentas locales válidas;
- reconoce candidatos IBAN;
- valida estructura y checksum;
- comprueba compatibilidad con el banco únicamente cuando existe una regla oficial registrada.

Semántica:

```text
MATCH
→ asociación conocida y correcta

MISMATCH
→ contradicción comprobable; rechazar

NOT_VERIFIABLE
→ no hay información suficiente; no bloquear
```

En cobertura parcial, un código detectado que ya pertenece a otro banco conocido sí constituye `MISMATCH`, aunque todavía no exista código registrado para el banco seleccionado.

La ausencia total de una regla no se interpreta como error.

Fuentes y detalles: [BANK_ACCOUNT_VALIDATION.md](BANK_ACCOUNT_VALIDATION.md).

## 6. Reglas deliberadamente no añadidas

No se inventaron políticas que la prueba no define, por ejemplo:

- scoring crediticio;
- relación cuota/ingreso obligatoria;
- KYC;
- AML;
- consulta a centrales de riesgo;
- límites de aprobación por salario;
- reglas de país para identificación;
- nuevos estados de crédito.

Estas capacidades podrían ser válidas en un producto real, pero introducirlas aquí cambiaría el negocio evaluado.
