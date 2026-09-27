# Diseño de interfaz en Figma

## Propósito

CreditFlow incluye un archivo Figma editable que documenta visualmente el flujo implementado en la aplicación. El objetivo no es sustituir el frontend ni presentar mockups conceptuales: las pantallas se reconstruyeron a partir de capturas del sistema funcionando y se organizaron como frames y componentes reutilizables.

**Archivo editable:** https://www.figma.com/design/qJdrQ7BRooH9DG8jqFZRe5

## Alcance documentado

El archivo contiene los siguientes estados de interfaz:

1. Login.
2. Dashboard.
3. Solicitudes de crédito.
4. Nueva solicitud.
5. Nueva solicitud con selector de fecha abierto.
6. Comité de Riesgo con expediente pendiente.
7. Expediente para dictamen.
8. Desembolsos sin selección.
9. Desembolsos con crédito seleccionado.
10. Plan de pagos en estado inicial.
11. Plan de pagos con crédito cargado, historial operativo y 24 cuotas.

Los estados adicionales —calendario abierto, desembolso seleccionado y plan cargado— se conservaron por separado para documentar interacciones relevantes sin reemplazar el estado base de cada pantalla.

## Organización del archivo

El archivo separa:

- **Reference Capture:** capturas del frontend real utilizadas como fuente visual.
- **Screens:** reconstrucciones editables de las pantallas.
- **Design System:** tokens, componentes y variantes reutilizables.

Las referencias siguen la convención:

```text
Reference / <Pantalla> — Production Capture
```

y las reconstrucciones:

```text
Screen / <Pantalla>
Screen / <Pantalla> — <Estado>
```

## Componentes consolidados

Entre los componentes reutilizables creados o refinados durante la reconstrucción están:

- navegación lateral y selector de idioma;
- identidad de aplicación y usuario;
- tarjetas de métricas;
- búsqueda compacta y búsqueda de plan de pagos;
- badges de estado;
- celdas y encabezados de tabla;
- campos de formulario, select y fecha;
- secciones del formulario;
- resumen estimado del crédito;
- selector de fecha;
- acción de evaluación;
- campo de observaciones;
- acciones de aprobar y rechazar;
- tarjeta de crédito aprobado;
- estado vacío de desembolso;
- selector de banco;
- resumen de transferencia;
- campo de cuenta / IBAN;
- acción de desembolso;
- estado vacío de plan de pagos;
- historial operativo del crédito.

Los componentes fueron derivados de la interfaz real para mantener consistencia entre diseño y frontend implementado.

## Criterio de reconstrucción

La reconstrucción siguió estas reglas:

- usar el frontend ejecutado como fuente de verdad visual;
- evitar rediseñar el producto durante la documentación;
- reutilizar componentes cuando una estructura se repite;
- mantener textos, estados y datos de prueba visibles en las capturas;
- conservar estados interactivos relevantes en frames separados;
- mantener las restricciones de información de Comité de Riesgo y Desembolso;
- no presentar el archivo Figma como especificación funcional superior al código o al documento original.

## Verificación final

Se realizó una auditoría estructural del archivo al cerrar el trabajo.

Resultado:

```text
Pantallas reconstruidas: 11
Componentes / component sets en Design System: 51
Solapamientos entre pantallas: 0
Nombres duplicados de componentes: 0
```

También se revisó visualmente el canvas completo y las pantallas finales contra sus capturas de referencia.

El canvas mantiene separación entre frames para evitar montajes accidentales y permite recorrer el flujo visual desde Login hasta el plan de pagos cargado.

## Relación con el alcance de la prueba

Figma es una **mejora de documentación y trazabilidad visual**, no un requisito obligatorio del documento original.

La implementación evaluable sigue siendo el código React/NestJS, la persistencia SQLite, las reglas de negocio y el entorno Docker. El archivo Figma sirve como apoyo para:

- revisión visual;
- explicación de UX;
- inspección de estados;
- consistencia del sistema de componentes;
- entrega profesional del frontend.

## Fuente de verdad

Ante cualquier diferencia:

1. la especificación original define el alcance funcional obligatorio;
2. el código y las pruebas definen el comportamiento implementado;
3. Figma documenta visualmente ese comportamiento.

No se deben derivar reglas de negocio nuevas únicamente desde el diseño.
