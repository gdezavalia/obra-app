# PRD — App de seguimiento económico de obra

**Versión:** 1.0 · **Fecha:** 08/09/2026 · **Autor:** Gero de Zavalía
**Estado:** borrador para revisión
**Nombre del producto:** provisional
**Documento relacionado:** `Dominio_Gestion_Obra_v1.md` (modelo destilado de la obra San Lorenzo)

---

## 1. Problema

Una arquitecta que dirige una obra lleva el control económico en una planilla de Excel que arma a mano, y cada vez que el cliente pregunta "¿cuánto llevamos gastado?" tiene que reconstruir la respuesta. El resultado es que **el cliente vive a ciegas entre reunión y reunión**, y la arquitecta pierde horas armando un reporte que queda desactualizado en tres días.

Peor: la planilla no valida nada. En 14 semanas de operación real sobre una obra chica aparecieron 11 clases distintas de error de carga — un gasto de $380.000 cargado como $380, honorarios liquidados sobre una semana incompleta, categorías cruzadas, presupuestos de adicionales con partidas que no correspondían. Ninguno se detectó solo; todos salieron de revisión manual.

El costo de no resolverlo: la arquitecta absorbe el trabajo administrativo, el cliente desconfía cuando aparece un desvío que nadie anticipó, y los desvíos se descubren tarde — cuando ya no se pueden corregir.

**Evidencia:** obra "Remodelación casa San Lorenzo" (jun–sep 2026), ~120 gastos, 10 adicionales, 9 rubros, 14 semanas. Más una entrevista con un estudio de arquitectura grande que llegó de forma independiente a la misma mecánica de control (EDT + imputación de gastos por paquete).

---

## 2. Usuarios

| Persona | Quién es | Qué hace en el sistema |
|---|---|---|
| **Arquitecta directora** | Corina y 3 arquitectos conocidos. Perfil no técnico. 1–5 obras simultáneas. | Da de alta la obra y su estructura, carga gastos, aprueba adicionales y redeterminaciones, genera el reporte semanal. |
| **Cliente / comitente** | Dueño de la obra. No entra al sistema. | Recibe el reporte semanal. Es la audiencia del entregable, no un usuario del producto. |
| **Estudio grande** *(referencia, no target del MVP)* | Estudio entrevistado. Trabaja con EDT de 3 niveles y ~200 paquetes. | Sirve para validar que el modelo generaliza. No se diseña para sus necesidades organizacionales. |

**Contexto del proyecto:** no es un producto comercial. El objetivo es doble — práctica de construcción end-to-end y una herramienta real para cuatro personas conocidas. No hay pricing, billing, onboarding self-service ni marketing en ninguna fase.

---

## 3. Objetivos

1. **Que la arquitecta genere el reporte semanal sin intervención de un tercero.** Hoy el reporte lo arma Gero a mano; el objetivo es que ella lo produzca sola en menos de 15 minutos desde que termina de cargar la semana.
2. **Que los errores de carga se detecten al momento de cargar, no en la revisión.** Las 11 validaciones conocidas corren automáticamente y se muestran antes de emitir el reporte.
3. **Que el desvío por paquete de trabajo sea visible en cualquier momento**, no solo los viernes.
4. **Que el presupuesto se compare contra sí mismo de forma honesta** — reajustado por índice de la construcción, no en pesos nominales de fechas distintas.
5. **Que el modelo soporte tanto 9 rubros planos como una EDT de 200 paquetes** sin cambios de esquema.

---

## 4. No-objetivos

| No-objetivo | Por qué |
|---|---|
| Facturación, cobro o pagos dentro del sistema | Es un sistema de seguimiento, no de tesorería. Agrega complejidad regulatoria sin resolver el problema central. |
| App móvil nativa | La carga por foto se resuelve con web responsive. Una app nativa es meses de trabajo para el mismo resultado. |
| Onboarding self-service y multi-organización comercial | Son 4 usuarios conocidos. El alta la hace Gero a mano. |
| Consolidado entre obras y reportes de cartera | Necesidad del estudio grande, no de las arquitectas target. |
| Roles y permisos finos, aprobaciones multinivel | Una arquitecta por obra. Sin flujo de aprobación interno. |
| Cómputo métrico y generación del presupuesto | El presupuesto entra armado. El producto controla la ejecución, no la licitación. |
| Modo offline | La carga se hace desde la oficina o con datos móviles. Fuera de alcance, igual que en Decora. |

---

## 5. Modelo de dominio

### 5.1 Entidades

```
obra
  nombre · cliente · dirección · fecha_inicio · fecha_fin_estimada
  arquitecta · pct_honorarios · moneda_base · indice_reajuste
  profundidad_edt (config) · cotizacion_inicial_usd

paquete                            ← árbol de profundidad arbitraria
  obra · parent_id · codigo (01.04.02) · nombre · orden
  tipo: trabajo | materiales | mixto
  etiquetas[]                      ← generaliza el código de colores del estudio
  presupuesto_base · fecha_base · moneda
  documentos[]                     ← pliego, planos, especificaciones

revision_presupuesto               ← unifica adicionales y redeterminaciones
  paquete · fecha · motivo: adicional | redeterminacion | ajuste
  monto_anterior · monto_nuevo · indice_aplicado
  estado: pendiente | aprobado | rechazado | ejecutado
  fecha_aprobacion · notas · documento

gasto
  obra · paquete · fecha · categoria: mano_de_obra | materiales | honorarios
  descripcion · proveedor · pagado_por: cliente | arquitecta
  forma_pago · monto · moneda · cotizacion_usd_dia
  link_factura · link_comprobante_pago

entrega_parcial                    ← retiros contra una compra
  gasto · fecha · cantidad · unidad · nota

indice                             ← serie del índice de la construcción
  tipo (CAC, ICC-INDEC, …) · periodo · valor
```

### 5.2 Decisiones de modelado

🔑 **El árbol es de profundidad arbitraria (`parent_id`), no de columnas fijas.** La restricción "esta obra usa 2 niveles" es una validación por obra, no una limitación del esquema. Si mañana aparece un `01.04.03.02`, no se toca la base.

🔑 **El código jerárquico (`01.04.02`) es la clave natural de imputación** y permite roll-up por prefijo sin recorrer el árbol.

🔑 **`tipo` en el paquete resuelve los materiales.** Un paquete de materiales puede vivir en el primer nivel (como los pondría Gero) o dentro de cada etapa (como los pone el estudio). El reporte agrupa por tipo o por etapa indistintamente, sin imponer una estructura.

🔑 **`revision_presupuesto` unifica dos conceptos que parecían distintos:** el adicional (cambio de alcance) y la redeterminación (reajuste por índice). Ambos son "el presupuesto de este paquete cambió, por este motivo, en esta fecha, con este documento detrás". El ciclo de estados del modelo actual se conserva.

🔑 **El modelo de Corina es el caso degenerado**: EDT de un nivel, 9 paquetes, materiales sin presupuesto (`presupuesto_base = null`).

---

## 6. Reglas de negocio

1. **Presupuesto vigente de un paquete** = `presupuesto_base` + revisiones en estado `aprobado` o `ejecutado`. Las `pendiente` se muestran como alerta separada; las `rechazado` quedan en el historial, atenuadas.
2. **Los materiales pueden o no tener presupuesto.** Si `presupuesto_base` es null, el paquete solo informa total comprado (caso Corina). Si tiene monto, se compara ejecutado vs presupuestado (caso estudio).
3. **Honorarios: solo "cobrado a la fecha".** Nunca devengado ni saldo a cobrar. Decisión de diseño explícita, no una simplificación.
4. **El reajuste por índice es explícito.** El sistema propone el monto según el índice del período; la arquitecta lo aprueba. Queda un acta con fecha, índice aplicado y monto anterior/nuevo. Nunca se reexpresa un presupuesto en silencio.
5. **La comparación ejecutado vs presupuesto usa el presupuesto vigente a la fecha del gasto**, no el original.
6. **Cada gasto congela la cotización USD del día.** El histórico en USD nunca se recalcula.
7. **Un gasto se imputa a un paquete hoja y solo a uno.** Relación uno-a-muchos, sin prorrateo. Una compra que sirve a varios paquetes se carga como varios gastos. *(Decisión explícita: el prorrateo complica roll-up, validaciones y reporte, y no hay evidencia todavía de que haga falta.)*
8. **Las tres categorías de gasto son fijas** y no las extiende el usuario.
9. **`pagado_por` no se muestra en el reporte al cliente.** Es información de liquidación de la arquitecta.

---

## 7. User stories

### Alta y estructura
- Como arquitecta, quiero **importar la estructura de la obra desde un Excel** para no tipear 200 paquetes a mano.
- Como arquitecta, quiero **agregar, renombrar y reordenar paquetes** después del alta, porque el alcance cambia.
- Como arquitecta, quiero **marcar un paquete como de materiales o de trabajo** para que el reporte lo agrupe correctamente.
- Como arquitecta, quiero **adjuntar el pliego y los planos a un paquete** para tener la especificación a mano cuando discuto un desvío.

### Carga de gastos
- Como arquitecta, quiero **sacarle una foto a una factura y que el sistema me proponga la fila cargada** para no tipear el comprobante.
- Como arquitecta, quiero **revisar y corregir lo que el sistema propuso antes de guardar**, porque el OCR se equivoca y yo soy la responsable del dato.
- Como arquitecta, quiero **buscar el paquete por código o por nombre** al imputar, porque son 200 y no me los sé de memoria.
- Como arquitecta, quiero **que el sistema me sugiera el paquete** según el proveedor y la descripción, porque el 80% de mis gastos van a los mismos 15 paquetes.
- Como arquitecta, quiero **registrar retiros parciales contra una compra** (compré 50 bolsas de cemento y retiro de a 10) para saber cuánto queda disponible.
- Como arquitecta, quiero **adjuntar factura y comprobante de pago a cada gasto** para poder respaldar cualquier número ante el cliente.

### Presupuesto y cambios
- Como arquitecta, quiero **cargar un adicional con su presupuesto en PDF y dejarlo en estado pendiente** hasta que el cliente lo apruebe.
- Como arquitecta, quiero **ver cuánto hace que un adicional está pendiente**, para no perder plata esperando una respuesta.
- Como arquitecta, quiero **disparar una redeterminación por índice y que el sistema me proponga los montos nuevos**, para no recalcular 200 paquetes a mano.
- Como arquitecta, quiero **ver el historial completo del presupuesto de un paquete** para explicarle al cliente por qué el número de hoy no es el de marzo.

### Reportes
- Como arquitecta, quiero **generar el reporte semanal con un click** y que abra con los movimientos de la semana.
- Como arquitecta, quiero **ver las alertas de validación antes de emitir el reporte**, para no mandarle al cliente un número mal cargado.
- Como arquitecta, quiero **exportar el reporte a PDF** para mandarlo por mail o WhatsApp.
- Como cliente, quiero **ver en qué se gastó mi plata esta semana y cómo va el avance de cada rubro**, sin tener que pedirlo.

### Casos borde
- Como arquitecta, quiero **corregir un gasto de una semana ya reportada** y que el sistema me avise qué reportes quedan desactualizados.
- Como arquitecta, quiero **que el sistema me frene si imputo un gasto a un paquete que no existe o está cerrado**.
- Como arquitecta, quiero **cargar un gasto que no corresponde a ningún paquete** y que quede en una bandeja de sin imputar en vez de perderse.

---

## 8. Requisitos

### P0 — Must have

**RF-01 · Alta de obra y estructura**
- Import de la EDT desde Excel/CSV con columnas código, nombre, tipo, presupuesto base, moneda.
- Validación del import: códigos duplicados, jerarquía rota (un `01.04.02` sin `01.04`), montos no numéricos.
- ABM de paquetes post-import.
- Criterios: dado un Excel de 200 filas con jerarquía de 3 niveles, cuando se importa, entonces el árbol queda armado con roll-up correcto en cada nivel y el reporte de import lista fila por fila lo aceptado y lo rechazado.

**RF-02 · Carga de gastos por formulario**
- Formulario con las tres categorías, buscador de paquete por código o nombre, adjuntos de factura y comprobante.
- Valores frecuentes precargados por proveedor.
- Criterios: cargar un gasto completo con dos adjuntos toma menos de 60 segundos para una usuaria no técnica.

**RF-03 · Carga por foto con OCR**
- Subir foto o PDF de un comprobante → el sistema extrae fecha, proveedor, descripción, monto y forma de pago → **precarga el formulario de RF-02** para revisión y confirmación.
- Nunca guarda sin confirmación explícita.
- Criterios: dado un comprobante legible, cuando se sube, entonces al menos monto y fecha vienen correctos, y todos los campos son editables antes de guardar.

**RF-04 · Adicionales y redeterminaciones**
- Alta de revisión de presupuesto con motivo, monto, documento y estado.
- Transiciones de estado con fecha.
- Redeterminación por índice: seleccionar índice y período, el sistema propone montos nuevos por paquete, la arquitecta aprueba en bloque o por paquete.
- Criterios: el presupuesto vigente de cualquier paquete es siempre reconstruible desde su base más el historial de revisiones aprobadas.

**RF-05 · Motor de validaciones**
Corre al guardar y antes de emitir el reporte. Las 11 conocidas:

| # | Validación |
|---|---|
| 1 | Monto fuera de orden de magnitud vs. la mediana del proveedor/paquete |
| 2 | Honorarios liquidados sobre un período con gastos cargados posteriormente |
| 3 | Categoría incoherente con el tipo del paquete |
| 4 | Paquete que supera el 90% / 100% del presupuesto vigente |
| 5 | Revisión en estado pendiente hace más de 7 días |
| 6 | Gasto de mano de obra sin proveedor |
| 7 | Gasto sin respaldo cuando ese proveedor históricamente lo tenía |
| 8 | Revisión de tipo adicional que incluye partida de materiales |
| 9 | Gasto imputado a un paquete inexistente o cerrado |
| 10 | Gastos imputados a una revisión que superan su monto aprobado |
| 11 | Cambio de imputación de un gasto ya incluido en un reporte emitido |

- El sistema **flagea, nunca corrige ni infiere montos**.
- Criterios: cada validación es independientemente testeable con un caso de la obra San Lorenzo como fixture.

**RF-06 · Reporte semanal**
Estructura ya validada con un cliente real:
1. Movimientos de la semana (KPIs + tabla con respaldos)
2. Estado general (avance económico, inversión acumulada, desglose por categoría)
3. Puntos de atención (desvíos, en tono neutro)
4. Tabla maestra por paquete con roll-up por nivel
5. Gráficos: barras por paquete y evolución acumulada semanal
6. Detalle por paquete con los movimientos de la semana resaltados
7. Honorarios cobrados

Requisitos no obvios del render, aprendidos a los golpes:
- Autocontenido, sin dependencias de CDN (gráficos como SVG inline).
- Print CSS real: A4, cortes controlados, la semana completa en la página 1.
- Caracteres en español literales, nunca escapados.
- Los links de respaldo son URLs reales, no el texto visible de la celda.

**RF-07 · Multi-tenant simple**
- Una arquitecta ve solo sus obras. Alta de usuarios manual.

### P1 — Should have
- **RF-08** Entregas parciales contra una compra, con saldo disponible.
- **RF-09** Bandeja de gastos sin imputar.
- **RF-10** Sugerencia automática de paquete según proveedor y descripción histórica.
- **RF-11** Vista de análisis en pesos ajustados por índice, en paralelo a la nominal.
- **RF-12** Versionado de reportes emitidos, con aviso de cuáles quedaron desactualizados por una corrección.

### P2 — Diseñar para, no construir
- **RF-13 Avance físico por paquete** (% ejecutado) y cruce con el avance económico (earned value). *El modelo lleva el campo y su historial desde el día 1 para no migrar después.*
- **RF-14** Consolidado entre obras.
- **RF-15** Certificación a contratistas y fondo de reparo.
- **RF-16** Portal de solo lectura para el cliente, en lugar del PDF.
- **RF-17 Prorrateo de un gasto entre varios paquetes.** Descartado para v1 (regla 6.7). *Si alguna vez hace falta, la salida es una tabla intermedia `gasto_imputacion`; por eso los cálculos de roll-up deben leer la imputación a través de una capa propia y no del `paquete_id` del gasto directamente. Es la única concesión arquitectónica que pide este P2.*

---

## 9. Métricas de éxito

Con cuatro usuarios conocidos, los porcentajes de adopción no significan nada. Las métricas son de uso real:

**Leading (primeras 4 semanas)**
- Una arquitecta carga una semana completa **sin preguntarle nada a Gero**. Umbral de éxito: 3 semanas consecutivas.
- Tiempo de carga de un gasto < 60 segundos.
- ≥ 70% de los gastos cargados por foto en vez de a mano.
- ≥ 1 error real detectado por el motor de validaciones que hubiera llegado al cliente.

**Lagging (3 meses)**
- ≥ 2 de las 4 arquitectas siguen usándolo sin recordatorios.
- El reporte se emite el viernes sin que Gero intervenga, 8 semanas seguidas.
- Ninguna arquitecta mantiene la planilla de Excel en paralelo. *(Esta es la única métrica que importa de verdad: si mantienen las dos, el producto no ganó.)*

---

## 10. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| 🔴 **Vuelven al Excel porque cargar es más lento** | El producto muere igual que el intento de 2021 | RF-03 y RF-10 son P0 por esto. Medir tiempo de carga desde la semana 1. |
| 🔴 **Feedback blando** — son mujer y amigos, van a decir que está bien | Se corrigen los problemas equivocados | Medir uso, no opinión. La métrica lagging del Excel en paralelo es el detector. |
| 🟡 **Imputar contra 200 paquetes es demasiado trabajo** | La EDT granular queda sin usar | Sugerencia automática (RF-10) y permitir que cada obra defina su profundidad. Corina arranca con 9 paquetes. |
| 🟡 **OCR poco confiable en comprobantes argentinos** | RF-03 no cumple su promesa | Confirmación obligatoria siempre. Si el OCR falla, el formulario sigue funcionando. |
| 🟡 **Arrastre de alcance hacia el estudio grande** | Se construye otro producto | Los no-objetivos son explícitos. El estudio valida el modelo, no define el backlog. |
| 🟡 **Segundo proyecto con el primero sin producción** | Ninguno llega a producción | Decisión ya tomada: Decora primero. Este PRD queda en carpeta hasta ese gate. |

---

## 11. Preguntas abiertas

**Bloqueantes**
- ¿Qué índice usan exactamente para el reajuste — CAC, ICC-INDEC, otro? ¿De dónde se obtiene la serie: carga manual, scraping, API? *(arquitecta / estudio)*
- ¿La redeterminación se aplica a toda la obra o paquete por paquete? *(arquitecta)*
- ~~¿Un gasto puede imputarse a más de un paquete (prorrateo)?~~ **Resuelto 08/09/2026: no. Un gasto, un paquete.** Ver regla 6.7 y RF-17.

**No bloqueantes**
- ¿Qué pasa con un paquete que se cierra sin consumir todo su presupuesto — el saldo se libera, se reasigna, queda como ahorro? *(arquitecta)*
- ¿El cliente debería poder comentar sobre el reporte? *(producto)*
- ¿Los adjuntos viven en Drive como hoy, o en el storage de la app? *(técnico)*
- Servicio de OCR: modelo propio, API de terceros, o el mismo pipeline que Decora usa para PDFs de proveedores. *(técnico)*

---

## 12. Fases

**Gate previo:** no arranca hasta que Decora esté en producción y su Fase 1 haya pasado el criterio de uso sin soporte.

| Fase | Contenido | Terminado cuando |
|---|---|---|
| **0 · Setup** | Repo, stack (Next.js + Supabase + Vercel, igual que Decora), CLAUDE.md desde este PRD y el doc de dominio | El esqueleto despliega y hay login |
| **1 · Estructura y carga** | RF-01, RF-02, RF-04, RF-07 | La obra San Lorenzo entera está cargada en el sistema y los números coinciden con la planilla |
| **2 · Validaciones y reporte** | RF-05, RF-06 | El reporte generado por el sistema es indistinguible del que se armó a mano |
| **3 · Ingesta inteligente** | RF-03, RF-09, RF-10 | ≥ 70% de los gastos entran por foto |
| **4 · Uso real** | Corina carga sola durante 3 semanas | Se cumple la métrica leading principal |
| **5 · Segunda usuaria** | Alta de un arquitecto amigo con su propia obra | El modelo aguantó una estructura de EDT distinta |

**Migración de datos:** la obra San Lorenzo es el fixture de la Fase 1. Ya está en Excel, con 120 gastos, 10 adicionales y todos los links de respaldo. Sirve como caso de prueba end-to-end y como validación de que el import funciona.

---

## Anexo · Mapeo del modelo actual contra la EDT del estudio

| Rubro de Corina | Equivalente en la EDT |
|---|---|
| Albañilería | 01.04 Obra gruesa |
| Plomería | 01.05.01 / 01.05.02 / 01.05.03 |
| Electricidad | 01.05.05 Instalación eléctrica |
| Yesería | 01.06.03 Cielorrasos |
| Techista | 01.04.05 Cubiertas |
| Carpintería de muebles | 01.06.07 Carpinterías interiores |
| Aire acondicionado | 01.07.02 / 01.05 |
| Pintura | 01.06 Terminaciones |
| Herrería | 01.09.06 Herrería |

El modelo de Corina es esta misma EDT achatada a un nivel. Confirma que la jerarquía configurable es la generalización correcta y no una concesión al caso del estudio.
