<template>
  <div>
    <h1>Accueil</h1>
    <button @click="rollDice(2, 6)">lancer 2d6</button>

    <div class="dice-list">
      <DiceD6 v-for="(value, index) in diceValues" backgroundColor="#ffff00" :key="index"
        :value="(value as 1 | 2 | 3 | 4 | 5 | 6)" :roll-id="rollId" />
      <DiceD6 v-for="(value, index) in diceValues" backgroundColor="#00254f" :key="index"
        :value="(value as 1 | 2 | 3 | 4 | 5 | 6)" :roll-id="rollId" />
    </div>

  </div>
</template>

<script setup lang="ts">
const { diceValues, rollId, roll: rollDice } = useRollDice()
</script>


<style scoped lang="scss">
h1 {
  color: red;
}

.dice-list {
  margin-top: 16px;
  display: flex;
  gap: 16px;
}
</style>
