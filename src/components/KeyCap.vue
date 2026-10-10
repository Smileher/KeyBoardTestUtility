<script setup lang="ts">
import type { KeyDefinition, PlatformLayout } from '../core/layouts'
import windowsLogo from '../assets/windows.svg'
import appleLogo from '../assets/apple.svg'
defineProps<{ definition: KeyDefinition; platform: PlatformLayout; pressed: boolean; tested: boolean; hint: string }>()
</script>
<template>
  <div v-if="!definition.code" class="key-gap" :style="{ '--units': definition.width ?? 1 }" aria-hidden="true" />
  <div v-else class="keycap" :class="{ pressed, tested, 'key-unavailable': definition.detectable === false, 'key-wide-label': definition.label.length > 5 }"
    :style="{ '--units': definition.width ?? 1, gridColumn: definition.column ? `${definition.column} / span ${definition.width ?? 1}` : undefined, gridRow: definition.row ? `${definition.row} / span ${definition.height ?? 1}` : undefined }"
    :aria-label="definition.code.startsWith('Meta') ? (platform === 'mac' ? 'Command' : 'Windows') : definition.label || 'Space'" :title="definition.detectable === false ? hint : definition.code">
    <img v-if="definition.code.startsWith('Meta')" class="key-logo" :src="platform === 'mac' ? appleLogo : windowsLogo" alt="" />
    <span v-else>{{ definition.label }}</span>
  </div>
</template>
