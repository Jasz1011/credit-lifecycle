# Criterio de diseño del frontend

Este documento describe las decisiones visuales aplicadas a CreditFlow y su relación con el contexto de la prueba técnica.

No constituye una guía oficial de marca de MCSystems.

## 1. Objetivo

La interfaz debía sentirse como una herramienta operativa de crédito, no como una landing page ni como una demo genérica.

Se priorizaron:

- densidad de información controlada;
- jerarquía clara;
- lectura rápida de estados;
- formularios previsibles;
- acciones críticas confirmadas;
- buena adaptación a escritorio y móvil;
- uso moderado de la identidad visual observada de MCSystems.

## 2. Referencias públicas

La investigación visual tomó como referencia fuentes públicas de primera parte:

- MCSystems: <https://mcsystems.la/>
- MCSystem Web: <https://mcsystemsweb.com/Hypervinculos/pgLOGIN.aspx>
- LAFISE: <https://www.lafise.com/>
- Grupo Ficohsa: <https://www.grupoficohsa.com/>
- BAC: <https://www.baccredomatic.com/es-ni>
- Banpro Grupo Promerica: <https://www.banprogrupopromerica.com.ni/>

También se revisaron estilos públicos del sitio institucional.

La observación de esos activos se utilizó como contexto, no como un supuesto manual de identidad.

## 3. Identidad visual aplicada

Elementos observados en MCSystems:

- combinación azul / verde;
- fondos claros;
- azules oscuros y grises azulados;
- estilo institucional sobrio.

CreditFlow adapta esa dirección a una aplicación operativa.

Paleta base:

| Rol | Color | Uso |
| --- | --- | --- |
| Azul institucional observado | `#0270B8` | acentos |
| Verde institucional observado | `#75B62B` | acentos |
| Azul marino | `#17324D` | navegación y contraste |
| Fondo | `#F5F7F9` | superficie general |
| Blanco | `#FFFFFF` | paneles |
| Texto principal | `#172B3A` | contenido |

El verde institucional claro se utiliza como acento. Para texto o acciones que exigen mayor contraste se utilizan variantes más oscuras.

## 4. Tipografía

- **Manrope**: interfaz, títulos y formularios.
- **IBM Plex Mono**: valores financieros, identificaciones y números de crédito.

La tipografía monoespaciada se reserva para información donde la comparación visual de dígitos aporta valor.

## 5. Branding

El logo público de MCSystems se utiliza principalmente en login, acompañado por la indicación de “Prueba técnica”.

Dentro de la aplicación se utiliza `CreditFlow` como nombre funcional.

No se creó un isotipo ficticio para presentar el sistema como un producto oficial.

Los logos bancarios aparecen únicamente en el selector del banco destino y siempre acompañados por el nombre textual.

Procedencia: [BRAND_ASSETS.md](BRAND_ASSETS.md).

## 6. Layout

### Escritorio

- sidebar persistente;
- topbar compacta;
- área de contenido con ancho controlado;
- tablas y formularios orientados a lectura operativa.

### Tablet y móvil

- navegación convertida a drawer;
- formularios apilados;
- tablas con overflow horizontal contenido;
- acciones accesibles sin comprimir la navegación principal.

La interfaz evita convertir cada bloque en una tarjeta independiente. Se utilizan divisores, superficies y jerarquía tipográfica para reducir ruido visual.

## 7. Páginas

### Login

- contexto institucional;
- formulario dominante;
- acceso a cambio de idioma;
- indicación explícita de prueba técnica.

### Dashboard

- métricas reales;
- solicitudes pendientes;
- sin gráficos inventados ni actividad ficticia.

### Solicitudes

- tabla orientada a expedientes;
- identificación y estado legibles;
- acceso claro a nueva solicitud.

### Nueva solicitud

El formulario se divide conceptualmente en:

1. información personal;
2. información laboral;
3. condiciones del crédito.

El resumen financiero se mantiene visible cuando el ancho lo permite y no muestra una cuota estimada con parámetros inválidos.

### Comité de Riesgo

La interfaz respeta la restricción de datos del requisito: no muestra información adicional por conveniencia visual.

### Desembolso

El banco se elige mediante un grupo de radios semántico con nombre y logo.

La cuenta / IBAN se valida con feedback asociado al campo.

La confirmación enmascara el número de cuenta antes de ejecutar la acción final.

### Plan de pagos

Incluye:

- resumen del crédito;
- estado;
- timeline asociado al crédito real;
- tabla del plan.

El timeline no aparece como decoración sin un crédito existente.

## 8. Estados y feedback

La interfaz contempla:

- carga;
- datos vacíos;
- error;
- éxito;
- acciones en progreso;
- confirmaciones para operaciones sensibles.

Las mutaciones deshabilitan temporalmente la acción correspondiente para reducir doble envío desde UI.

La seguridad de la transición sigue perteneciendo al backend.

## 9. Accesibilidad

Las decisiones implementadas incluyen:

- controles nativos cuando aportan semántica;
- labels asociados;
- `aria-invalid`;
- `aria-describedby`;
- feedback cercano al campo;
- diálogos accesibles;
- retorno de foco;
- navegación responsive sin ocultar acciones esenciales.

## 10. Internacionalización

La aplicación permite ES/EN.

Los textos propios de la interfaz se obtienen de catálogos de traducción. Datos del usuario, identificaciones, números de crédito y nombres oficiales de bancos no se traducen.

El campo de fecha presenta una entrada localizada y transforma el valor validado al formato ISO utilizado por la API.

Los elementos internos del selector de fecha nativo dependen del idioma configurado por el navegador y no del catálogo de la aplicación.

## 11. Principios que guiaron el rediseño

- No copiar componentes del sistema público de MCSystems.
- No inventar información para llenar pantallas.
- No ampliar los campos que la prueba restringe.
- No utilizar branding para simular un producto oficial.
- No sacrificar legibilidad por decoración.
- No mover reglas de negocio al frontend.
- No introducir visualizaciones sin datos reales.

El resultado busca parecer una aplicación interna utilizable y mantenible, no una maqueta promocional.
