# Simulador de hipoteca

El simulador vive en `app/HomePurchase.tsx`. Es una pantalla/modal de Expo Router que permite crear, abrir, editar, guardar y eliminar simulaciones de compra de vivienda.

## Modelo de calculo

Los datos principales se guardan en la tabla `home_purchase_simulations`.

- `property_price`: precio del piso anunciado.
- `down_payment`: ahorro aportado por el comprador.
- `agency_percent`, `tax_percent`, `notary_percent`: porcentajes aplicados sobre el precio del piso.
- `financial_fee`: comision financiera opcional, en euros. Debe dejarse a `0` si no aplica.
- `bank_financing_percent`: porcentaje maximo que acepta financiar el banco. Valores esperados: `100`, `95`, `90`, `85` u `80`.
- `years`, `tin`, `bonus`, `salary_bonus`, `life_insurance`, `home_insurance`: datos usados para estimar la cuota.

La pantalla separa tres importes para evitar dudas:

- `Gastos inmobiliarios`: inmobiliaria/agencia + ITP/IVA + comision financiera si aplica + notaria/registro.
- `Ahorro necesario total`: mayor valor entre el ahorro aportado y el minimo exigido por el banco, mas gastos inmobiliarios.
- `Hipoteca`: precio del piso menos el ahorro efectivo, sin superar el maximo financiable por el banco.

La financiacion del banco se calcula asi:

- `Maximo banco`: precio del piso * `bank_financing_percent`.
- `Ahorro minimo banco`: precio del piso - maximo banco.
- `Ahorro efectivo`: mayor valor entre ahorro aportado y ahorro minimo banco.

El ejemplo de cuota fija usa el TIN final: `tin - bonificaciones`.
El ejemplo de cuota variable usa una TAE orientativa calculada como `TIN final + 0.9`. Si quieres conectar este dato a Euribor o a un campo real, cambia `variableTae` en `HomePurchase.tsx`.

## Flujo de UI

La pantalla tiene dos niveles:

- Biblioteca de simulaciones: lista las simulaciones guardadas, permite crear una nueva o abrir el ejemplo.
- Modal de simulador: muestra resumen, gastos, ahorro/hipoteca y banco.

Las tarjetas y filas visibles son editables. Al pulsar un dato se abre el modal correspondiente:

- Nombre: `openEdit("main")`.
- Precio y gastos: `openEdit("property")`.
- Ahorro aportado: `openEdit("mortgage")`.
- Porcentaje maximo de hipoteca, plazo, TIN y bonificaciones: `openEdit("bank")`.

## Donde tocar

- Calculos principales: bloque de constantes derivadas dentro de `HomePurchaseScreen`.
- Lista de simulaciones guardadas: bloque `simulations.map(...)`.
- Persistencia en Supabase: `getPayload`, `saveSimulation`, `confirmSaveNewSimulation`, `deleteSimulation`.
- Componentes locales: `SectionHeader`, `OverviewTile`.
- Estilos de esta pantalla: `createStyles` al final de `HomePurchase.tsx`.
- Migracion de Supabase: `supabase_home_purchase.sql`.

## Validacion recomendada

Despues de cambiar el simulador:

1. Ejecuta `npm run lint`.
2. Ejecuta `npx tsc --noEmit`.
3. Prueba en web/escritorio y movil:
   - Crear simulacion nueva.
   - Abrir ejemplo.
   - Pulsar cada tarjeta/fila y aplicar cambios.
   - Guardar, reabrir y eliminar una simulacion guardada.
