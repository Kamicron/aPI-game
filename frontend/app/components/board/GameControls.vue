<template>
  <div class="game-controls">
    <button class="btn btn--primary" @click="$emit('roll-dice')" :disabled="!isMyTurn"
      :class="{ 'btn--disabled': !isMyTurn }">
      <span class="btn-icon">🎲</span>
      <span>{{ isMyTurn ? 'Lancer les dés' : 'Pas votre tour' }}</span>
    </button>
    
    <button v-if="isOnKeyShop" class="btn btn--secondary" @click="$emit('buy-key')" :disabled="!canBuyKey"
      :class="{ 'btn--disabled': !canBuyKey }">
      <span class="btn-icon">🔑</span>
      <span>{{ canBuyKey ? `Acheter une clé (${keyShopPrice} 💰)` : `Pas assez de pièces (${keyShopPrice} 💰)` }}</span>
    </button>

    <DiceD6 v-if="lastDiceRoll" :value="lastDiceRoll" :roll-id="rollId" background-color="#6366f1" />
    
    <div v-if="!isMyTurn" class="turn-info">
      <span class="turn-waiting">⏳ En attente...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import DiceD6 from '../dices/dice-d6.vue'

defineProps<{
  isMyTurn: boolean
  isOnKeyShop: boolean
  canBuyKey: boolean
  keyShopPrice: number
  lastDiceRoll: 1 | 2 | 3 | 4 | 5 | 6 | null
  rollId: number
}>()

defineEmits<{
  'roll-dice': []
  'buy-key': []
}>()
</script>

<style scoped lang="scss">
.game-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
}

.btn {
  padding: 14px 24px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &:hover:not(.btn--disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &--primary {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: white;

    &:hover:not(.btn--disabled) {
      background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
    }
  }

  &--secondary {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    
    &:hover:not(.btn--disabled) {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
    }
  }

  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #9ca3af !important;

    &:hover {
      transform: none !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
    }
  }
}

.btn-icon {
  font-size: 20px;
}

.turn-info {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.turn-waiting {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}
</style>
