<template>
  <div class="dice" :style="faceStyle">
    <div v-for="n in 7" :key="n" class="dice__pip" :class="`dice__pip--${n}`" v-show="visiblePips.includes(n)" />
  </div>
</template>

<script setup lang='ts'>
// ----- Import -----
import { computed, ref, watch } from 'vue'

// ------------------

// ------ Type ------

// ------------------

// ----- Define -----
const props = withDefaults(defineProps<{
  value: 1 | 2 | 3 | 4 | 5 | 6
  rollId?: number
  backgroundColor?: string
}>(), {
  backgroundColor: '#ffffff'
})

// ------------------

// ------ Const -----
const isDarkBackground = computed(() => {
  const hex = (props.backgroundColor || '#ffffff').trim()
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex

  let r = 0
  let g = 0
  let b = 0

  if (normalized.length === 3) {
    const rHex = (normalized[0] ?? '0') + (normalized[0] ?? '0')
    const gHex = (normalized[1] ?? '0') + (normalized[1] ?? '0')
    const bHex = (normalized[2] ?? '0') + (normalized[2] ?? '0')

    r = parseInt(rHex, 16)
    g = parseInt(gHex, 16)
    b = parseInt(bHex, 16)
  } else if (normalized.length === 6) {
    r = parseInt(normalized.slice(0, 2), 16)
    g = parseInt(normalized.slice(2, 4), 16)
    b = parseInt(normalized.slice(4, 6), 16)
  } else {
    // format non géré -> considérer clair par défaut
    return false
  }

  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance < 0.5
})

const faceStyle = computed(() => ({
  backgroundColor: props.backgroundColor,
  '--dice-pip-color-main': isDarkBackground.value ? '#ffffff' : '#000000',
  '--dice-pip-shadow-color': '#7e7d88'
}))

// ------------------

// ------- Ref ------
const displayValue = ref<1 | 2 | 3 | 4 | 5 | 6>(props.value)

let rolling = false
let rollInterval: number | null = null

// ------------------

// ---- Computed ----
const visiblePips = computed<number[]>(() => {
  const value = displayValue.value

  switch (value) {
    case 1:
      return [4]
    case 2:
      return [1, 7]
    case 3:
      return [1, 4, 7]
    case 4:
      return [1, 3, 5, 7]
    case 5:
      return [1, 3, 4, 5, 7]
    case 6:
      return [1, 2, 3, 5, 6, 7]
    default:
      return [4]
  }
})

// ------------------

// ---- Lifecycle----
watch(
  () => [props.value, props.rollId],
  ([newValue]) => {

    if (newValue == null) return
    if (rolling) return

    const targetValue = (newValue as 1 | 2 | 3 | 4 | 5 | 6)

    rolling = true

    if (rollInterval !== null) {
      clearInterval(rollInterval)
    }

    const start = performance.now()

    rollInterval = window.setInterval(() => {
      const now = performance.now()
      if (now - start > 400) {

        if (rollInterval !== null) {
          clearInterval(rollInterval)
          rollInterval = null
        }
        displayValue.value = targetValue

        rolling = false
        return
      }

      const randomFace = (Math.floor(Math.random() * 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6
      displayValue.value = randomFace
    }, 120)
  }
)

// ------------------

// --- Async Func ---

// ------------------

// ---- Function ----

// ------------------

// ------ Watch -----

// ------------------

</script>

<style lang='scss' scoped>
.dice {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  border: 3px solid #000;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 10px;
  background-color: #ffffff;
}

.dice__pip {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  align-self: center;
  justify-self: center;
  position: relative;
  box-shadow: none;

  &::before,
  &::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
  }

  // disque gris centré (fond du trou)
  &::before {
    background: var(--dice-pip-shadow-color, #7e7d88);
    inset: 0;
    z-index: 0;
  }

  // disque principal plus petit, excentré en bas-droite
  &::after {
    background: var(--dice-pip-color-main, #000000);
    inset: 1px; // plus petit que le gris
    transform: translate(0.5px, 0.5px); // décalage vers bas-droite
    z-index: 1;
  }
}

.dice__pip--1 {
  grid-area: 1 / 1;
}

.dice__pip--2 {
  grid-area: 2 / 1;
}

.dice__pip--3 {
  grid-area: 3 / 1;
}

.dice__pip--4 {
  grid-area: 2 / 2;
}

.dice__pip--5 {
  grid-area: 1 / 3;
}

.dice__pip--6 {
  grid-area: 2 / 3;
}

.dice__pip--7 {
  grid-area: 3 / 3;
}
</style>