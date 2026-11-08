# sanalberto-bot

Bot de Telegram (`@sanalberto_bot`) para llevar los puntos de la Guerra de Carreras de San Alberto, y web en directo con el podio y las gráficas ([defc.wupp.dev](https://defc.wupp.dev)).

## Comandos

| Comando | Quién | Qué hace |
| --- | --- | --- |
| `/ranking` | Todos | Ranking en texto. |
| `/chart` | Todos | Gráfica del ranking (PNG generado en el servidor). |
| `/ediciones`, `/edicion <año>` | Todos | Ganador de cada año y clasificación final de uno. |
| `/add [puntos] [carrera]`, `/remove …` | Admins | Suma o resta puntos, multiplicados por el peso de la carrera. `/add 37 fis` lo hace directamente (la carrera se reconoce sin tildes, por el principio o por alias como «mates»); lo que falte se elige con botones. |
| `/deshacer` | Admins | Deshace tu último cambio de puntos. |
| `/historial [n]` | Admins | Últimos cambios de puntos, con quién los hizo. |
| `/congelar`, `/revelar` | Admins | Congela el marcador público (la web, `/ranking` y `/chart`) mientras los admins siguen sumando; `/revelar` lo muestra con una animación en la web. |
| `/exportar [año]` | Admins | Clasificación y movimientos de una edición en CSV. |
| `/pesos`, `/peso <carrera> <peso>` | Admins | Consulta o cambia el multiplicador de cada carrera. |
| `/crear_grado <nombre> [peso]` | Admins | Añade una carrera. |
| `/add_admin`, `/remove_admin`, `/admins` | Admins | Gestiona administradores. |
| `/eliminar_grado <nombre>` | Superadmins | Borra una carrera y su historial. |
| `/nueva_edicion <año>` | Superadmins | Cierra y guarda la edición en curso y empieza otra con todas las carreras a 0 (pide confirmación). |

Los administradores se añaden por nombre de usuario y quedan ligados a su id de Telegram la primera vez que escriben al bot. Mientras no hay ninguno, el primero se registra enviando `ADMIN_TOKEN` al bot.

**Ediciones:** cada año es una edición. `/nueva_edicion 2027` guarda la clasificación y el historial de la anterior y pone los puntos a 0; los pesos se mantienen (`/peso` para cambiarlos). Las ediciones de antes de 2026 se importan desde su base de datos con `node ops/import-edition.js <año> <archivo.db>`.

**Web:** `/` es el panel en directo y `/proyector` la versión para pantalla grande, con un QR al bot.

## Desarrollo

Requisitos: Node.js 22.12 o superior.

```bash
npm install                 # también genera el cliente de Prisma
cp .env.example .env        # BOT_TOKEN de un bot de pruebas, no el de producción
npx prisma migrate deploy   # crea data.db
npm run dev                 # bot + web en http://localhost:3000
cd web && npm install && npm run dev   # web con recarga en caliente
```

- `src/`: bot (Telegraf), base de datos (Prisma 7 + SQLite) y servidor de la web y el socket (`src/live.ts`).
- `web/`: la web en directo (Vue + Chart.js). El servidor sirve `web/dist`.
- `prisma/migrations/`: cambios del esquema; se aplican solos al arrancar el contenedor (`ops/start.js`).

## Despliegue

Con Docker: se compila la imagen en tu ordenador, se publica en un registro y el servidor la descarga.

1. **En el servidor**, una carpeta con `docker-compose.yml`, su `.env` (a partir de `.env.example`, con `SANALBERTO_PORT` si no es el 3000) y `data/` propiedad del uid `1001` (`sudo chown 1001:1001 data`). Un proxy (nginx) delante, sin búfer para `/socket.io/`.
2. **En tu ordenador**, copia `.env.deploy.example` a `.env.deploy`, inicia sesión en el registro (`docker login ghcr.io`) y ejecuta:

   ```bash
   bash scripts/deploy.sh             # compila, publica y despliega
   bash scripts/deploy.sh --rollback  # vuelve a la imagen anterior
   ```

El script espera a que `/health` responda antes de dar el despliegue por bueno y guarda la etiqueta exacta como `SANALBERTO_IMAGE` en el `.env` del servidor.
