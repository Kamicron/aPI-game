import { ref } from 'vue'

export function useRollDice() {
  const diceValues = ref<number[]>([])
  const rollId = ref(0)

  function roll(nbDice: number, diceFaces: number) {
    const rolls: number[] = []

    for (let i = 0; i < nbDice; i++) {
      const roll = Math.floor(Math.random() * diceFaces) + 1
      rolls.push(roll)
    }

    diceValues.value = rolls
    rollId.value++
  }

  return {
    diceValues,
    rollId,
    roll,
  }
}
