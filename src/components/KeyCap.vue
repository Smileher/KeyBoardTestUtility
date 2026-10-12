<script setup lang="ts">
import type { KeyDefinition, PlatformLayout } from '../core/layouts'
import windowsLogo from '../assets/windows.svg'
defineProps<{ definition: KeyDefinition; platform: PlatformLayout; pressed: boolean; tested: boolean; hint: string; gridUnits?: number }>()
</script>
<template>
  <div v-if="!definition.code" class="key-gap" :style="{ '--units': definition.width ?? 1, gridColumn: definition.column ? `${definition.column} / span ${(definition.width ?? 1) * (gridUnits ?? 1)}` : undefined, gridRow: definition.row }" aria-hidden="true" />
  <div v-else class="keycap" :class="{ pressed, tested, 'key-unavailable': definition.detectable === false, 'key-wide-label': definition.label.length > 5, 'key-iso': definition.shape === 'iso', 'key-modifier': platform === 'mac' && /^(Control|Alt|Meta)/.test(definition.code) }"
    :style="{ '--units': definition.width ?? 1, '--enter-notch': `${.25 / (definition.width ?? 1) * 100}%`, gridColumn: definition.column ? `${definition.column} / span ${(definition.width ?? 1) * (gridUnits ?? 1)}` : undefined, gridRow: definition.row ? `${definition.row} / span ${definition.height ?? 1}` : undefined }"
    :aria-label="definition.code.startsWith('Meta') ? (platform === 'mac' ? 'Command' : 'Windows') : definition.label || 'Space'" :title="definition.detectable === false ? hint : definition.code">
    <img v-if="definition.code.startsWith('Meta') && platform === 'win'" class="key-logo" :src="windowsLogo" alt="" />
    <span v-else-if="platform === 'mac' && /^(Control|Alt|Meta|CapsLock$)/.test(definition.code)" class="modifier-legend"><b>{{ definition.label.split(' ')[0] }}</b><span>{{ definition.label.split(' ').slice(1).join(' ') }}</span></span>
    <span v-else>{{ definition.label }}</span>
  </div>
</template>
