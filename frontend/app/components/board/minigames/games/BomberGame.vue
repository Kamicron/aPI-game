<template>
  <div class="bomber-game">
    <h2 class="title">Bomberman (prototype)</h2>

    <div class="controls">
      <div v-if="!map" class="status">En attente de la map...</div>
      <div v-else-if="countdown > 0" class="status">
        La partie commence dans {{ countdown }}...
      </div>
      <div v-else class="status">Partie en cours</div>

      <button type="button" class="btn btn-secondary" @click="finishGame" :disabled="!map || loading">
        Terminer le mini-jeu
      </button>
    </div>

    <div v-if="infoMessage" class="info-message">{{ infoMessage }}</div>

    <div v-if="currentPlayerState" class="stats">
      <span>Bombes max : <strong>{{ currentPlayerState.bombCapacity }}</strong></span>
      <span>Portée : <strong>{{ currentPlayerState.bombRange }}</strong></span>
    </div>

    <p class="hint">Pour l'instant, ce mini-jeu affiche seulement la grille Bomberman avec un décompte de départ.
      Les bombes et explosions viendront ensuite.</p>

    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="map" class="grid" :style="gridStyle">
      <div v-for="tile in map.tiles" :key="`${tile.x}-${tile.y}`" class="cell"
        :class="[`cell--${tile.kind}`, isCurrentPlayerOn(tile.x, tile.y) ? 'cell--player' : '']"
        :style="tileStyle(tile)">
        <span v-if="isSpawn(tile.x, tile.y)" class="cell-spawn">S</span>

        <!-- Explosion overlay -->
        <span v-if="hasExplosion(tile.x, tile.y)" class="explosion"></span>

        <!-- Bomb overlay -->
        <span v-if="hasBomb(tile.x, tile.y)" class="bomb"></span>

        <!-- Players (uniquement vivants) -->
        <span v-for="p in playersOnTile(tile.x, tile.y)" :key="p.id" class="player-token"
          :class="{ 'player-token--dead': !p.alive }"
          :style="{ background: p.color || '#facc15', borderColor: '#000000' }"></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import type { Socket } from 'socket.io-client'

interface BomberTile {
  x: number
  y: number
  kind: 'empty' | 'indestructible' | 'destructible' | 'powerup' | 'spawn'
  hiddenPowerUp?: 'extra_bomb' | 'bomb_power' | 'speed'
}

interface BomberSpawn {
  playerIndex: number
  x: number
  y: number
}

interface BomberMap {
  width: number
  height: number
  tiles: BomberTile[]
  spawns: BomberSpawn[]
}

const emit = defineEmits<{
  finish: [score: number]
}>()

// Map partagée envoyée par le backend via WebSocket (bombermanInit)
const injectedMap = inject('bombermanMap', null) as unknown as { value: BomberMap | null } | null
// Données de jeu génériques fournies par BoardCanvas
interface InjectedPlayer {
  id: string
  name?: string
  color?: string
}

const injectedPlayers = inject('players', null) as Ref<InjectedPlayer[]> | null
const injectedCurrentPlayerId = inject('currentPlayerId', null) as Ref<string> | null
const injectedRoomId = inject('roomId', null) as Ref<string> | null
const injectedSocket = inject('socket', null) as Ref<Socket | null> | null

const map = ref<BomberMap | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const countdown = ref<number>(0)
const infoMessage = ref<string | null>(null)

interface PlayerState {
  id: string
  x: number
  y: number
  color?: string
  alive: boolean
  bombCapacity: number
  bombRange: number
  kills: number
  selfKills: number
  tilesDestroyed: number
}

const playerStates = ref<PlayerState[]>([])

interface BombState {
  id: string
  ownerId: string
  x: number
  y: number
}

interface ExplosionState {
  id: string
  x: number
  y: number
}

const bombs = ref<BombState[]>([])
const explosions = ref<ExplosionState[]>([])
const hasSubmittedScore = ref(false)
const deathOrder = ref<string[]>([])

const playSound = (src: string) => {
  try {
    const audio = new Audio(src)
    audio.volume = 0.7
    audio.play()
  } catch (e) {
    console.warn('Unable to play sound', src, e)
  }
}

const gridStyle = computed(() => {
  if (!map.value) return {}
  return {
    gridTemplateColumns: `repeat(${map.value.width}, 1fr)` as string,
  }
})

const currentPlayerState = computed<PlayerState | null>(() => {
  if (!injectedCurrentPlayerId) return null
  const id = injectedCurrentPlayerId.value
  return playerStates.value.find((p) => p.id === id) || null
})

const isSpawn = (x: number, y: number): boolean => {
  if (!map.value) return false
  return map.value.spawns.some((s) => s.x === x && s.y === y)
}

const playersOnTile = (x: number, y: number): PlayerState[] => {
  return playerStates.value.filter((p) => p.x === x && p.y === y && p.alive)
}

const isCurrentPlayerOn = (x: number, y: number): boolean => {
  if (!injectedCurrentPlayerId) return false
  const currentId = injectedCurrentPlayerId.value
  return playerStates.value.some((p) => p.id === currentId && p.x === x && p.y === y)
}

const tileStyle = (tile: BomberTile) => {
  let backgroundImage = ''

  if (tile.kind === 'indestructible') {
    backgroundImage = "url('/assets/bomberman/indestrucible-wall.png')"
  } else if (tile.kind === 'destructible') {
    backgroundImage = "url('/assets/bomberman/destructive-wall.png')"
  } else if (tile.kind === 'powerup') {
    if (tile.hiddenPowerUp === 'extra_bomb') {
      backgroundImage = "url('/assets/bomberman/powerup-bomb.png')"
    } else if (tile.hiddenPowerUp === 'bomb_power') {
      backgroundImage = "url('/assets/bomberman/powerup-power.png')"
    } else {
      backgroundImage = "url('/assets/bomberman/floor.png')"
    }
  } else {
    // empty, powerup, spawn -> sol par défaut
    backgroundImage = "url('/assets/bomberman/floor.png')"
  }

  return {
    backgroundImage,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
}

const hasBomb = (x: number, y: number): boolean => {
  return bombs.value.some((b) => b.x === x && b.y === y)
}

const hasExplosion = (x: number, y: number): boolean => {
  return explosions.value.some((e) => e.x === x && e.y === y)
}

const startCountdown = () => {
  if (!map.value) return
  countdown.value = 3

  const tick = () => {
    if (countdown.value > 0) {
      countdown.value -= 1
      if (countdown.value > 0) {
        setTimeout(tick, 1000)
      }
    }
  }

  setTimeout(tick, 1000)
}

// Surveiller la map injectée depuis le backend et démarrer automatiquement le jeu
watch(
  () => (injectedMap ? injectedMap.value : null),
  (newMap) => {
    if (newMap) {
      map.value = newMap
      error.value = null
      loading.value = false

      // Initialiser la position de tous les joueurs sur leurs spawns respectifs
      const states: PlayerState[] = []

      if (map.value.spawns && map.value.spawns.length > 0 && injectedPlayers) {
        const players = injectedPlayers.value || []

        players.forEach((player, index) => {
          let spawn: BomberSpawn | null =
            map.value!.spawns.find((s) => s.playerIndex === index) || null

          if (!spawn) {
            // Fallback si aucun spawn dédié pour cet index
            spawn = map.value!.spawns[index] || map.value!.spawns[0]
          }

          states.push({
            id: player.id,
            x: spawn.x,
            y: spawn.y,
            color: player.color,
            alive: true,
            bombCapacity: 1,
            bombRange: 1,
            kills: 0,
            selfKills: 0,
            tilesDestroyed: 0,
          })
        })
      }

      playerStates.value = states
      if (countdown.value === 0) {
        startCountdown()
      }
    }
  },
  { immediate: true },
)

const tryMovePlayer = (dx: number, dy: number) => {
  if (!map.value || !injectedCurrentPlayerId) return

  const currentId = injectedCurrentPlayerId.value
  const current = playerStates.value.find((p) => p.id === currentId)
  if (!current || !current.alive) return

  const targetX = current.x + dx
  const targetY = current.y + dy

  if (targetX < 0 || targetY < 0 || targetX >= map.value.width || targetY >= map.value.height) {
    return
  }

  const targetTile = map.value.tiles.find((t) => t.x === targetX && t.y === targetY)
  if (!targetTile) return

  if (targetTile.kind === 'indestructible' || targetTile.kind === 'destructible') {
    return
  }

  current.x = targetX
  current.y = targetY

  // Gérer un éventuel power-up sur la tuile atteinte
  handleTilePowerUp(current, targetTile)

  // Informer les autres joueurs via WebSocket
  if (injectedSocket && injectedSocket.value && injectedRoomId) {
    injectedSocket.value.emit('bombermanMove', {
      roomId: injectedRoomId.value,
      playerId: currentId,
      x: current.x,
      y: current.y,
    })
  }
}

const handleRemoteMove = (data: { roomId: string; playerId: string; x: number; y: number }) => {
  if (!map.value || !injectedRoomId) return
  if (data.roomId !== injectedRoomId.value) return

  const player = playerStates.value.find((p) => p.id === data.playerId)
  if (!player) return

  player.x = data.x
  player.y = data.y

  // Gérer un éventuel power-up sur la tuile atteinte (synchro WS)
  if (map.value) {
    const tile = map.value.tiles.find((t) => t.x === data.x && t.y === data.y)
    if (tile) {
      handleTilePowerUp(player, tile)
    }
  }
}

const handleTilePowerUp = (player: PlayerState, tile: BomberTile) => {
  if (!map.value) return
  if (tile.kind !== 'powerup' || !tile.hiddenPowerUp) return

  if (tile.hiddenPowerUp === 'extra_bomb') {
    player.bombCapacity += 1
  } else if (tile.hiddenPowerUp === 'bomb_power') {
    player.bombRange += 1
  }

  // Son de prise de power-up
  playSound('/sound/up.mp3')

  // La tuile devient vide après ramassage
  tile.kind = 'empty'
  delete tile.hiddenPowerUp
}

const placeBomb = () => {
  if (!map.value || !injectedCurrentPlayerId || !injectedSocket || !injectedRoomId) return

  const currentId = injectedCurrentPlayerId.value
  const current = playerStates.value.find((p) => p.id === currentId)
  if (!current || !current.alive) return

  // Pas plusieurs bombes sur la même case
  if (bombs.value.some((b) => b.x === current.x && b.y === current.y)) return

  // Respecter la capacité de bombes du joueur
  const activeBombsForPlayer = bombs.value.filter((b) => b.ownerId === currentId).length
  if (activeBombsForPlayer >= current.bombCapacity) return

  const bombId = `${currentId}-${Date.now()}`

  // Notifier le serveur, qui diffusera la bombe à tous les joueurs
  if (injectedSocket.value) {
    injectedSocket.value.emit('bombermanBomb', {
      roomId: injectedRoomId.value,
      playerId: currentId,
      bombId,
      x: current.x,
      y: current.y,
    })
  }

  // Son de pose de bombe côté client
  playSound('/sound/ui-pop-sound.wav')
}

const triggerExplosion = (bombId: string) => {
  const bombIndex = bombs.value.findIndex((b) => b.id === bombId)
  if (bombIndex === -1 || !map.value) return

  const bomb = bombs.value[bombIndex]
  bombs.value.splice(bombIndex, 1)

  const affected: ExplosionState[] = []

  const addExplosion = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= map.value!.width || y >= map.value!.height) return
    if (!affected.some((e) => e.x === x && e.y === y)) {
      affected.push({ id: `${bomb.id}-${x}-${y}`, x, y })
    }
  }

  // Centre
  addExplosion(bomb.x, bomb.y)

  // Portée dépendant du propriétaire de la bombe
  const owner = playerStates.value.find((p) => p.id === bomb.ownerId)
  const maxRange = owner?.bombRange ?? 1

  // Ligne vers le haut
  for (let dy = 1; dy <= maxRange; dy++) {
    const y = bomb.y - dy
    const tile = map.value.tiles.find((t) => t.x === bomb.x && t.y === y)
    if (!tile) break
    if (tile.kind === 'destructible') {
      // Révéler un éventuel power-up, sinon devenir sol vide
      if (tile.hiddenPowerUp) {
        tile.kind = 'powerup'
      } else {
        tile.kind = 'empty'
      }
      if (owner) owner.tilesDestroyed += 1
    }
    addExplosion(bomb.x, y)
    if (tile.kind === 'indestructible') break
  }

  // Ligne vers le bas
  for (let dy = 1; dy <= maxRange; dy++) {
    const y = bomb.y + dy
    const tile = map.value.tiles.find((t) => t.x === bomb.x && t.y === y)
    if (!tile) break
    if (tile.kind === 'destructible') {
      if (tile.hiddenPowerUp) {
        tile.kind = 'powerup'
      } else {
        tile.kind = 'empty'
      }
      if (owner) owner.tilesDestroyed += 1
    }
    addExplosion(bomb.x, y)
    if (tile.kind === 'indestructible') break
  }

  // Ligne vers la gauche
  for (let dx = 1; dx <= maxRange; dx++) {
    const x = bomb.x - dx
    const tile = map.value.tiles.find((t) => t.x === x && t.y === bomb.y)
    if (!tile) break
    if (tile.kind === 'destructible') {
      if (tile.hiddenPowerUp) {
        tile.kind = 'powerup'
      } else {
        tile.kind = 'empty'
      }
      if (owner) owner.tilesDestroyed += 1
    }
    addExplosion(x, bomb.y)
    if (tile.kind === 'indestructible') break
  }

  // Ligne vers la droite
  for (let dx = 1; dx <= maxRange; dx++) {
    const x = bomb.x + dx
    const tile = map.value.tiles.find((t) => t.x === x && t.y === bomb.y)
    if (!tile) break
    if (tile.kind === 'destructible') {
      if (tile.hiddenPowerUp) {
        tile.kind = 'powerup'
      } else {
        tile.kind = 'empty'
      }
      if (owner) owner.tilesDestroyed += 1
    }
    addExplosion(x, bomb.y)
    if (tile.kind === 'indestructible') break
  }

  explosions.value.push(...affected)

  // Son d'explosion
  playSound('/sound/explosion.mp3')

  // Marquer les joueurs touchés comme morts
  for (const p of playerStates.value) {
    if (!p.alive) continue
    if (affected.some((e) => e.x === p.x && e.y === p.y)) {
      p.alive = false

      // Enregistrer l'ordre de mort
      if (!deathOrder.value.includes(p.id)) {
        deathOrder.value.push(p.id)
      }

      // Kills / suicides
      if (owner) {
        if (owner.id === p.id) {
          owner.selfKills += 1
        } else {
          owner.kills += 1
        }
      }

      // Si c'est le joueur local, message + score (une seule fois)
      if (injectedCurrentPlayerId && p.id === injectedCurrentPlayerId.value && !hasSubmittedScore.value) {
        infoMessage.value = 'Vous êtes mort !'
        const score = computeFinalScore(p.id)
        emit('finish', score)
        hasSubmittedScore.value = true
      }
    }
  }

  // Vérifier condition de victoire : un seul joueur vivant
  const alivePlayers = playerStates.value.filter((p) => p.alive)
  if (alivePlayers.length <= 1 && !hasSubmittedScore.value && injectedCurrentPlayerId) {
    const currentId = injectedCurrentPlayerId.value
    const me = playerStates.value.find((p) => p.id === currentId)
    const isWinner = !!me && me.alive

    if (isWinner) {
      infoMessage.value = 'Vous avez gagné !'
      const score = computeFinalScore(currentId)
      emit('finish', score)
      hasSubmittedScore.value = true
    } else {
      // Cas théorique où tous sont morts en même temps
      infoMessage.value = 'Fin de partie.'
      const score = computeFinalScore(currentId)
      emit('finish', score)
      hasSubmittedScore.value = true
    }
  }

  // Nettoyer les explosions après un court délai visuel
  setTimeout(() => {
    explosions.value = explosions.value.filter((e) => !affected.some((a) => a.id === e.id))
  }, 400)
}

const handleBombPlaced = (data: { roomId: string; playerId: string; bombId: string; x: number; y: number }) => {
  if (!map.value || !injectedRoomId) return
  if (data.roomId !== injectedRoomId.value) return

  // Éviter les doublons
  if (bombs.value.some((b) => b.id === data.bombId)) return

  bombs.value.push({
    id: data.bombId,
    ownerId: data.playerId,
    x: data.x,
    y: data.y,
  })

  // Déclencher l'explosion après un court délai identique pour tous
  setTimeout(() => {
    triggerExplosion(data.bombId)
  }, 2000)
}

const handleKeyDown = (event: KeyboardEvent) => {
  // Pas de déplacements tant que la partie n'a pas commencé
  if (!map.value || countdown.value > 0) return

  const key = event.key.toLowerCase()
  let dx = 0
  let dy = 0

  switch (key) {
    case 'arrowup':
    case 'z':
    case 'w':
      dy = -1
      break
    case 'arrowdown':
    case 's':
      dy = 1
      break
    case 'arrowleft':
    case 'q':
    case 'a':
      dx = -1
      break
    case 'arrowright':
    case 'd':
      dx = 1
      break
    case ' ':
      // Pose de bombe
      event.preventDefault()
      placeBomb()
      return
    default:
      return
  }

  event.preventDefault()
  tryMovePlayer(dx, dy)
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)

  if (injectedSocket && injectedSocket.value) {
    injectedSocket.value.on('bombermanPlayerMoved', handleRemoteMove)
    injectedSocket.value.on('bombermanBombPlaced', handleBombPlaced)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)

  if (injectedSocket && injectedSocket.value) {
    injectedSocket.value.off('bombermanPlayerMoved', handleRemoteMove)
    injectedSocket.value.off('bombermanBombPlaced', handleBombPlaced)
  }
})

const finishGame = () => {
  // Bouton de secours : si le score n'a pas encore été envoyé, envoyer 0
  if (!hasSubmittedScore.value) {
    if (injectedCurrentPlayerId) {
      const score = computeFinalScore(injectedCurrentPlayerId.value)
      emit('finish', score)
    } else {
      emit('finish', 0)
    }
    hasSubmittedScore.value = true
  }
}

const computeFinalScore = (playerId: string): number => {
  const player = playerStates.value.find((p) => p.id === playerId)
  if (!player) return 0

  const totalPlayers = playerStates.value.length || 1

  // Rang basé sur l'ordre de mort
  const indexInDeath = deathOrder.value.indexOf(playerId)
  let rank: number
  if (player.alive) {
    rank = 1
  } else if (indexInDeath === -1) {
    rank = totalPlayers
  } else {
    rank = totalPlayers - indexInDeath
  }

  // Gros bonus de classement pour les survivants / meilleurs rangs
  const rankBase = [0, 100, 60, 30, 15]
  const rankScore = rankBase[rank] ?? 10

  // Bonus par kill et par destruction de mur
  const killScore = player.kills * 25
  const destructionScore = player.tilesDestroyed * 2

  // Malus pour les suicides
  const suicidePenalty = player.selfKills * 40

  return rankScore + killScore + destructionScore - suicidePenalty
}
</script>

<style scoped lang="scss">
.bomber-game {
  background: #020617;
  border-radius: 16px;
  padding: 20px 24px;
  color: #e5e7eb;
  min-width: 640px;
}

.title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 12px;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #e5e7eb;
  margin-bottom: 8px;
}

.btn {
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
}

.btn-secondary {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: #ffffff;
}

.hint {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 8px;
}

.error {
  color: #f97373;
  margin-bottom: 8px;
}

.grid {
  display: grid;
  gap: 2px;
  background: #020617;
  border-radius: 8px;
  overflow: hidden;
}

.cell {
  position: relative;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.cell--player {
  box-shadow: 0 0 0 2px #facc15 inset;
}

.cell--empty {
  background: #020617;
}

.cell--indestructible {
  background: #1f2937;
}

.cell--destructible {
  background: #475569;
}

.cell--powerup {
  background: #22c55e;
}

.cell--spawn {
  background: #0ea5e9;
}

.cell-spawn {
  font-weight: 700;
  color: #ffffff;
}

.player-token {
  width: 60%;
  height: 60%;
  border-radius: 50%;
  background: #facc15;
  border: 2px solid #000000;
  box-shadow: 0 0 8px rgba(250, 204, 21, 0.9);
  z-index: 2;
}

.player-token.player-token--dead {
  opacity: 0.35;
  filter: grayscale(0.6);
}

.bomb {
  position: absolute;
  width: 70%;
  height: 70%;
  background-image: url('/assets/bomberman/bomb.png');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 1;
}

.explosion {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: url('/assets/bomberman/explosion.png');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  pointer-events: none;
  z-index: 0;
}
</style>
