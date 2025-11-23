<template>
  <div class="player-stack" :class="{ 'player-stack--expanded': isExpanded }" :style="stackPosition"
    @mouseenter="isExpanded = true" @mouseleave="isExpanded = false">
    <!-- Afficher tous les pions quand expanded, sinon max 3 -->
    <PlayerPawn v-for="(player, index) in displayedPlayers" :key="player.id" :player="player" :size="24"
      :style="getPawnStyle(index)" />

    <!-- Badge pour les joueurs restants (seulement si non expanded) -->
    <div v-if="remainingCount > 0 && !isExpanded" class="player-badge" :style="{
      position: 'absolute',
      left: `${visiblePlayers.length * 6}px`,
      zIndex: visiblePlayers.length + 1
    }">
      +{{ remainingCount }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PlayerPawn, { type Player } from './PlayerPawn.vue';

const props = defineProps<{
  players: Player[]
  tileX: number
  tileY: number
  tileSize: number
  offset: number
}>()

const MAX_VISIBLE = 3

// État d'expansion
const isExpanded = ref(false)

const visiblePlayers = computed(() => {
  return props.players.slice(0, MAX_VISIBLE)
})

const displayedPlayers = computed(() => {
  return isExpanded.value ? props.players : visiblePlayers.value
})

const remainingCount = computed(() => {
  return Math.max(0, props.players.length - MAX_VISIBLE)
})

// Style pour chaque pion selon l'état
const getPawnStyle = (index: number) => {
  if (isExpanded.value) {
    // Mode expanded : espacement plus large
    return {
      position: 'absolute',
      left: `${index * 28}px`, // Plus d'espace entre les pions
      zIndex: index + 1,
      transition: 'all 0.3s ease-out'
    }
  } else {
    // Mode normal : superposés
    return {
      position: 'absolute',
      left: `${index * 6}px`,
      zIndex: index + 1,
      transition: 'all 0.3s ease-out'
    }
  }
}

const stackPosition = computed(() => {
  // Centrer le stack horizontalement sur la tuile
  const totalPlayers = Math.min(props.players.length, MAX_VISIBLE + 1)
  const stackWidth = (totalPlayers - 1) * 6 + 24 // Superposition de 6px + taille du dernier pion

  const x = props.offset + props.tileX * props.tileSize + (props.tileSize - stackWidth) / 2
  const y = props.offset + props.tileY * props.tileSize + 6 // 6px de marge en haut

  return {
    left: `${x}px`,
    top: `${y}px`,
  }
})
</script>

<style scoped lang="scss">
.player-stack {
  position: absolute;
  pointer-events: auto;
  height: 24px;
  z-index: 100;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
              top 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              all 0.3s ease-out;

  &--expanded {
    z-index: 200; // Passer au premier plan
    height: auto;
  }
}

.player-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6B6B 0%, #EE5A6F 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: transform 0.2s;
  pointer-events: auto;

  &:hover {
    transform: scale(1.15);
    z-index: 200 !important;
  }
}
</style>
