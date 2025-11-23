<template>
  <div v-if="isMyTurn && currentPlayer && currentPlayer.bonuses.length > 0" class="bonus-panel">
    <h4 class="bonus-title">🎁 Bonus disponibles</h4>
    <div class="bonus-list">
      <button 
        v-for="bonus in currentPlayer.bonuses" 
        :key="bonus.id"
        @click="$emit('use-bonus', bonus.id)"
        class="bonus-item"
        :class="`bonus-item--${bonus.rarity}`"
      >
        <span class="bonus-icon">{{ bonus.icon }}</span>
        <div class="bonus-info">
          <span class="bonus-name">{{ bonus.name }}</span>
          <span class="bonus-effect">{{ bonus.effect }}</span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Player } from '../../../composables/useGameState'

defineProps<{
  currentPlayer: Player | null
  isMyTurn: boolean
}>()

defineEmits<{
  'use-bonus': [bonusId: string]
}>()
</script>

<style scoped lang="scss">
.bonus-panel {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.bonus-title {
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.bonus-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bonus-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &--common {
    border-color: #9ca3af;
    &:hover {
      border-color: #6b7280;
      background: #f9fafb;
    }
  }

  &--rare {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    &:hover {
      border-color: #2563eb;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
  }

  &--legendary {
    border-color: #f59e0b;
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    &:hover {
      border-color: #d97706;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
    }
  }
}

.bonus-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.bonus-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
}

.bonus-name {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.bonus-effect {
  font-size: 11px;
  color: #6b7280;
  margin-top: 2px;
}
</style>
