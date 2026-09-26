# Procedencia y uso de activos de marca

Este documento registra la procedencia de los activos públicos utilizados para contextualizar la interfaz de la prueba técnica.

Los archivos se almacenan localmente para que la aplicación no dependa de recursos remotos durante su ejecución.

## Activos

| Marca | Fuente pública | Uso en CreditFlow | Ruta local |
| --- | --- | --- | --- |
| MCSystems | <https://mcsystems.la/wp-content/uploads/2023/11/cropped-logo.png> | Contexto institucional en login | `apps/web/src/assets/brands/mcsystems.png` |
| Grupo LAFISE | <https://www.lafise.com/main/web-resources/templates/cdn/esmeralda/imagenes/logo-grupo-lafise.svg> | Selector de banco destino | `apps/web/src/assets/brands/lafise.svg` |
| Grupo Ficohsa | <https://www.grupoficohsa.com/content/dam/grupo-ficohsa-site/iconos/header/logo-ficohsa.svg> | Selector de banco destino | `apps/web/src/assets/brands/ficohsa.svg` |
| BAC | <https://www.baccredomatic.com/themes/custom/bac_theme/images/bac_logo.svg> | Selector de banco destino | `apps/web/src/assets/brands/bac.svg` |
| Banpro Grupo Promerica | <https://www.banprogrupopromerica.com.ni/media/368332/banpro-grupo-promerica.png?format=webp> | Selector de banco destino | `apps/web/src/assets/brands/banpro.webp` |

## Criterios de uso

- El nombre textual del banco siempre acompaña al logo.
- Los logos no sustituyen controles accesibles.
- No se redibujan ni se modifican sus proporciones.
- Se utiliza `object-fit: contain` para preservar relación de aspecto.
- Los activos bancarios se limitan al selector de banco destino.
- El logo de MCSystems aparece en un contexto que identifica explícitamente la aplicación como prueba técnica.
- CreditFlow conserva un nombre funcional propio y no se presenta como producto oficial de MCSystems.

## Alcance

Las marcas y logotipos pertenecen a sus respectivos titulares. Su uso en este repositorio es contextual y demostrativo dentro de una prueba técnica.

No se afirma patrocinio, certificación, aprobación comercial ni relación distinta a la evaluación para la que se construyó el proyecto.
