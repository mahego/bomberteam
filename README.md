# BomberTeam

Juego de arena 3D con React, Three.js y un servidor WebSocket autoritativo.

```sh
npm install
npm run dev
```

Abrir http://localhost:5173. `npm test` ejecuta las pruebas y `npm run build` comprueba TypeScript y genera el cliente.

## Controles

| Acción | Control |
| --- | --- |
| Mover | WASD / flechas; joystick analógico en móvil |
| Apuntar | Ratón; dirección del movimiento si no se usa ratón |
| Saltar | Espacio, una vez por pulsación |
| Combo de boxeo | J / clic izquierdo |
| Patada | R |
| Correr / embestir | Shift / correr y golpear |
| Levantar o lanzar rival | F |
| Sacar, recoger o lanzar bomba | E / clic derecho; segunda pulsación para lanzar |
| Soltar | Q |

## IA adaptativa

- La experiencia se guarda en este navegador como segundos de juego activo. Las estadísticas antiguas sin este dato empiezan como principiante.
- El servidor combina experiencia previa, tiempo vivo y resultados recientes. Las derrotas reducen la presión; las victorias solo la incrementan ligeramente. El ascenso está limitado a 0,002 por segundo.
- La curva base es `0.08 + 0.72 * (1 - exp(-segundos / 2400))`. Los rótulos Aprendiz, En progreso, Experimentado y Veterano son bandas visuales de una curva continua.
- Las salas mixtas usan al humano con menor dificultad objetivo. Los bots no suman experiencia al sistema.
- Los principiantes reciben un máximo de un perseguidor directo, sin carrera, bombas, patadas ni agarres. Esas acciones se habilitan gradualmente; el movimiento y el tiempo de reacción también cambian.
- Los bots anuncian su golpe con una pose y un aro amarillo, descansan después y buscan suelo seguro antes de avanzar. Es evasión local, no búsqueda global de rutas.
- Reaparecer concede cuatro segundos de protección contra combate. Atacar la cancela; no protege de caídas ni lava.
- El perfil local facilita la progresión casual; no constituye un sistema de clasificación competitivo autenticado.

## Organización

- `shared/types.ts`: protocolo y estado compartidos; `shared/gameplay.ts`: reglas de ataques, zona muerta y etiquetas de dificultad.
- `server/src/GameRoom.ts`: ciclo de partida, entidades y envío de estados.
- `server/src/ai/ExperienceDirector.ts`: progresión y ajuste de dificultad.
- `server/src/ai/BotController.ts`: decisiones temporizadas y movimiento seguro; recibe acciones de sala por callbacks.
- `server/src/PhysicsWorld.ts`: movimiento, colisiones e impactos.
- `client/src/engine/InputManager.ts`: teclado, ratón y acciones táctiles unificadas.
- `client/src/engine/CharacterModel.ts`: cuerpo y animaciones; `CharacterAccessories.ts`: identidad visual de los seis personajes.
- `client/src/state/PlayerProfile.ts`: lectura, migración y guardado del perfil local.

El cliente envía movimiento a 30 Hz y las acciones inmediatamente. El servidor conserva los saltos breves hasta el siguiente paso de física. La animación local de ataque es predictiva y separada del estado recibido del servidor.

## Gráficos

Los cuatro mapas usan materiales procedurales, iluminación ambiental PBR, luz principal con sombras y luz de contorno. El modo Cine añade bloom y procesamiento de color; el botón de calidad permite cambiar a Rendimiento, que omite el postprocesado y limita la resolución.

Los personajes tienen materiales de traje, accesorios propios, escudos translúcidos y efectos de estado. Las explosiones usan colores por tipo y una luz breve. Las partículas están limitadas a 400 y liberan sus materiales al terminar.

`client/src/engine/rendering/RenderPipeline.ts` concentra iluminación y postprocesado; `SurfaceMaterials.ts` genera materiales y libera recursos. Los escenarios mantienen las alturas y huecos de la física, comprobados mediante pruebas de rayos sobre su geometría.
