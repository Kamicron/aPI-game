<template>
  <div 
    class="player-pawn" 
    :style="pawnStyle"
    :title="player.name"
  >
    <!-- Photo de profil si disponible -->
    <img 
      v-if="player.avatar" 
      :src="player.avatar" 
      :alt="player.name"
      class="player-avatar-image"
    />
    <!-- Sinon initiales sur fond uni -->
    <div v-else class="player-avatar-initials">
      {{ playerInitials }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface Player {
  id: string
  name: string
  color: string // Couleur du contour
  avatar?: string // URL de la photo de profil (optionnel)
}

const props = defineProps<{
  player: Player
  size?: number
}>()

const pawnStyle = computed(() => {
  const style: Record<string, string> = {
    width: `${props.size || 32}px`,
    height: `${props.size || 32}px`,
    borderColor: props.player.color, // Contour avec la couleur du joueur
  }
  
  // Si pas d'avatar, fond uni avec la couleur
  if (!props.player.avatar) {
    style.backgroundColor = props.player.color
  }
  
  return style
})

const playerInitials = computed(() => {
  const names = props.player.name.split(' ')
  if (names.length >= 2 && names[0] && names[1]) {
    return names[0][0].toUpperCase() + names[1][0].toUpperCase()
  }
  return props.player.name.substring(0, 2).toUpperCase()
})
</script>

<style scoped lang="scss">
.player-pawn {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid; // Bordure colorée (couleur définie dans le style inline)
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: transform 0.2s;
  z-index: 1;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: scale(1.1);
    z-index: 100;
  }
}

.player-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  user-select: none;
  pointer-events: none;
}

.player-avatar-initials {
  color: #fff;
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  user-select: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  z-index: 1;
}
</style>
