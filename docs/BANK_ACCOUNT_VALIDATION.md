# Validación de cuentas bancarias e IBAN

## Contexto

La especificación original exige seleccionar uno de cuatro bancos y proporcionar un número de cuenta bancaria. No define país, formato nacional, IBAN ni verificación de titularidad.

La implementación conserva ese requisito y añade una mejora limitada: cuando la entrada puede identificarse como IBAN, se valida su estructura y, cuando existe evidencia oficial suficiente, se comprueba su compatibilidad con el banco seleccionado.

La mejora no exige IBAN y no añade un selector de país.

## Objetivo

Evitar dos extremos:

1. aceptar como IBAN cualquier cadena que simplemente “parezca” uno;
2. rechazar cuentas o países porque CreditFlow no conoce todavía todas sus reglas bancarias.

La política aplicada es:

> **La ausencia de información no se trata como invalidez; una contradicción verificable sí se bloquea.**

## Flujo de validación

```text
Número de cuenta / IBAN
          │
          ▼
¿candidato IBAN?
   │             │
  no            sí
   │             │
   ▼             ▼
cuenta local   validación IBAN
   │           estructura / país
   │           longitud / BBAN
   │           MOD-97
   │             │
   │             ▼
   │       compatibilidad banco
   │             │
   │      ┌──────┼──────────────┐
   │      ▼      ▼              ▼
   │    MATCH  MISMATCH   NOT_VERIFIABLE
   │      │      │              │
   │      │      └──> rechazar / BANK_IBAN_MISMATCH
   │      │
   └──────┴──────────> aceptar
                         │
                         └── NOT_VERIFIABLE: aceptar sin afirmar
                             compatibilidad
```

## Capa 1: cuenta local o IBAN

`bank-account.validator.ts` clasifica la entrada.

### Cuenta local

Una cuenta local válida:

- conserva compatibilidad con el flujo original;
- no intenta inferir país;
- no intenta inferir banco;
- solo elimina espacios exteriores;
- utiliza una regla genérica conservadora.

Esto permite que una cuenta como:

```text
100200300400
```

continúe siendo válida sin imponer un formato nacional que la prueba no especifica.

### IBAN

Un valor con prefijo compatible con IBAN se normaliza:

- se eliminan espacios de presentación;
- las letras se convierten a mayúsculas.

Después `ibantools` valida:

- país registrado;
- longitud;
- estructura nacional / BBAN;
- dígitos de control;
- checksum MOD-97.

Un candidato IBAN inválido no vuelve a clasificarse como cuenta local.

## Capa 2: compatibilidad banco–IBAN

Solo se ejecuta después de que el IBAN ha pasado la validación estructural.

El motor devuelve uno de tres estados:

### `MATCH`

Existe una regla registrada y el código bancario del IBAN coincide con el banco seleccionado.

### `MISMATCH`

Existe una contradicción demostrable.

Puede ocurrir de dos maneras:

- el banco seleccionado tiene un código esperado y el IBAN contiene otro;
- el banco seleccionado aún no tiene código registrado, pero el código detectado ya está atribuido oficialmente a otro banco conocido del mismo país.

`MISMATCH` produce `BANK_IBAN_MISMATCH` y se rechaza antes de iniciar la transacción de desembolso.

### `NOT_VERIFIABLE`

No existe suficiente información registrada para demostrar coincidencia o contradicción.

Este estado **no bloquea** el desembolso.

## Reglas verificadas

Revisión documental: 26-09-2026.

| País | Banco | Código | Evidencia principal |
| --- | --- | --- | --- |
| NI | LAFISE | `BCCE` | Banco Central de Nicaragua |
| NI | FICOHSA | `BUNO` | Banco Central de Nicaragua |
| NI | BAC Credomatic | `BAMC` | Banco Central de Nicaragua |
| NI | Banpro | `BAPR` | Banco Central de Nicaragua |
| CR | BAC Credomatic | `0102` | SWIFT + documentación oficial de BAC Costa Rica |

Fuentes:

- BCN — Información sobre IBAN: <https://bcn.gob.ni/informacion-sobre-el-iban>
- SWIFT — IBAN Registry: <https://www.swift.com/swift-resource/9606/download>
- BAC Costa Rica — Cuentas IBAN: <https://www.baccredomatic.com/sites/default/files/2023-06/CR-Que-son-las%20cuentas-iban.pdf>

En Nicaragua, el BCN publica la relación banco/código y la estructura del IBAN. En Costa Rica, SWIFT define la posición y longitud del identificador y BAC publica un ejemplo oficial con `0102`.

## Cobertura parcial

Una tabla parcial requiere una semántica cuidadosa.

Ejemplos:

| Caso | Resultado |
| --- | --- |
| NI `BAPR` + Banpro | `MATCH` |
| NI `BAPR` + LAFISE | `MISMATCH` |
| CR `0102` + BAC Credomatic | `MATCH` |
| CR `0102` + LAFISE | `MISMATCH` |
| CR `0102` + FICOHSA | `MISMATCH` |
| CR `0102` + Banpro | `MISMATCH` |
| CR código no registrado + LAFISE | `NOT_VERIFIABLE` |
| IBAN válido de país sin reglas registradas | `NOT_VERIFIABLE` |

El caso `CR 0102 + LAFISE` es importante: aunque CreditFlow no conozca todavía el código propio de LAFISE Costa Rica, sí conoce que `0102` pertenece a BAC. Por tanto existe una contradicción suficiente para rechazar.

## Investigación no convertida en regla

### Costa Rica / LAFISE

Se encontró información histórica del BCCR y un convertidor oficial de LAFISE, pero no se incorporó una regla de rechazo sin una fuente actual suficientemente explícita sobre el identificador de cuatro posiciones utilizado en el IBAN.

- BCCR: <https://www.bccr.fi.cr/sistema-de-pagos/DocEncuestas/Evaluacion_servicios_Sinpe.pdf>
- LAFISE: <https://www.lafise.com/blcr/ConvertidorSINPE-IBAN/index.html>

### Honduras

Se verificó la estructura IBAN nacional, pero no se incorporaron asociaciones para BAC, FICOHSA o LAFISE porque las fuentes revisadas no proporcionaron una tabla vigente suficientemente clara para usarla como regla de rechazo.

- BCH — Resolución IBAN: <https://www.bch.hn/administrativas/JUR/Marco%20Legal%20OM%202/RESOLUCI%C3%93N%20No.204-5-2024%20-%20C%C3%B3digo%20IBAN.pdf>
- SWIFT — IBAN Registry: <https://www.swift.com/swift-resource/9606/download>

Conocer un BIC aislado o saber que un banco opera en un país no se consideró evidencia suficiente para inventar un mapping.

## Separación de responsabilidades

```text
bank-account.validator.ts
    └── clasificación + validación estructural

verified-bank-iban-rules.ts
    └── datos verificados por país

bank-iban.validator.ts
    └── motor MATCH / MISMATCH / NOT_VERIFIABLE

DisbursementsService
    └── autoridad de negocio y rechazo antes de transacción
```

El frontend no mantiene una segunda tabla de códigos nacionales. Solo ofrece feedback estructural inmediato y traduce los códigos de error devueltos por la API.

## Cómo añadir una nueva regla

Antes de incorporar otro país o banco:

1. confirmar en una autoridad nacional o en SWIFT la estructura y posición del identificador;
2. obtener de una fuente oficial la asociación exacta entre institución y código;
3. documentar la fuente;
4. añadir únicamente la asociación comprobada;
5. cubrir `MATCH`, `MISMATCH` y `NOT_VERIFIABLE` con pruebas.

No se debe deducir una regla de rechazo a partir de presencia comercial, un BIC aislado o una fuente secundaria.

## Límites explícitos

CreditFlow no verifica:

- existencia de la cuenta;
- titularidad;
- saldo;
- estado operativo;
- capacidad de recibir fondos;
- conectividad con el banco;
- ejecución de una transferencia.

La validación implementada es estructural y de compatibilidad demostrable, no una integración bancaria real.
