import { ref, onMounted } from 'vue'

export type TileKind =
  | 'start'
  | 'coins'
  | 'minigame'
  | 'key_shop'
  | 'malus'
  | 'bonus'

export interface Tile {
  id: number
  kind: TileKind
  x: number
  y: number
  next: number[]
  coinsChange?: number
  minigameCategory?: string
  keyPrice?: number
}

export interface Board {
  id: string
  tiles: Tile[]
}

export function useBoard() {
  const board = ref<Board | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchBoard() {
    loading.value = true
    error.value = null

    try {
      board.value = await $fetch<Board>('http://localhost:5001/board')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      error.value = message
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchBoard)

  return {
    board,
    loading,
    error,
    fetchBoard,
  }
}
