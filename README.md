# AccountWise

Aplicacion Expo/React Native para gestionar finanzas personales, ahorro, gastos y simulaciones relacionadas con vivienda.

## Arranque

```bash
npm install
npm run start
```

Para web:

```bash
npm run web
```

## Estructura

- `app/`: rutas y pantallas principales de Expo Router.
- `app/(tabs)/`: pantallas con navegacion inferior.
- `app/HomePurchase.tsx`: simulador de compra de vivienda e hipoteca.
- `src/components/`: componentes reutilizables de UI.
- `src/context/`: autenticacion, espacios y tema.
- `src/lib/supabase.ts`: cliente de Supabase.
- `src/theme/`: colores, tipografia, espaciado y estilos comunes.
- `src/utils/`: utilidades de dinero, fechas, permisos, confirmaciones y consultas.
- `docs/`: documentacion tecnica de funcionalidades concretas.

## Simulador de hipoteca

La documentacion del simulador esta en `docs/simulador-hipoteca.md`.

Resumen funcional:

- Precio del piso.
- Ahorro aportado.
- Gastos inmobiliarios.
- Ahorro necesario total.
- Hipoteca.
- Ejemplos de cuota fija y cuota variable.

## Calidad

Antes de entregar cambios relevantes:

```bash
npm run lint
npx tsc --noEmit
```
