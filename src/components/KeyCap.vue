<script setup lang="ts">
import type { KeyDefinition } from '../core/layouts'
defineProps<{ definition: KeyDefinition; pressed: boolean; tested: boolean; hint: string }>()
</script>
<template>
  <div v-if="!definition.code" class="key-gap" :style="{ '--units': definition.width ?? 1 }" aria-hidden="true" />
  <div v-else class="keycap" :class="{ pressed, tested, 'key-unavailable': definition.detectable === false, 'key-wide-label': definition.label.length > 5 }"
    :style="{ '--units': definition.width ?? 1, gridColumn: definition.column ? `${definition.column} / span ${definition.width ?? 1}` : undefined, gridRow: definition.row ? `${definition.row} / span ${definition.height ?? 1}` : undefined }"
    :aria-label="definition.label || 'Space'" :title="definition.detectable === false ? hint : definition.code">
    <span>{{ definition.label }}</span>
  </div>
</template>
