# sanalberto-web

Panel "Carrera de Carreras": Vue 3 + Vite + Chart.js + Tailwind CSS. El backend
(Express + socket.io, en la raíz del repositorio) sirve `web/dist` y envía los
datos por socket.io (`data` y `dataobject`) al conectar y cuando cambian los puntos.

## Desarrollo

```sh
npm install
npm run dev
```

El servidor de Vite reenvía `/socket.io` (incluido WebSocket) al backend.
Por defecto `http://localhost:57630`; se puede cambiar con `VITE_BACKEND_URL`
(variable de entorno o `web/.env.local`):

```sh
VITE_BACKEND_URL=http://localhost:57630 npm run dev
```

## Compilación

```sh
npm run build   # comprobación de tipos (vue-tsc) + vite build -> dist/
npm run lint    # ESLint (flat config) + Prettier
```
