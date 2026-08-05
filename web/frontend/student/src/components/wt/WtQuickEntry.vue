<script setup>
// 快捷入口磁贴：图标(slot) + 标题 + 描述；variant 1-6 控制图标底色
defineProps({
  title:   String,
  desc:    String,
  variant: { type: Number, default: 1 }, // 1..6
})
const emit = defineEmits(['click'])
</script>

<template>
  <button class="wt-quick" :class="`v${Math.min(Math.max(variant, 1), 6)}`" @click="emit('click')">
    <span class="wt-quick__ico"><slot name="icon" /></span>
    <b>{{ title }}</b>
    <span class="wt-quick__desc">{{ desc }}</span>
  </button>
</template>

<style scoped>
.wt-quick {
  display: flex; flex-direction: column; gap: 8px; text-align: left;
  padding: var(--s-4); border-radius: var(--r-md);
  background: var(--surface); border: 1px solid var(--line); cursor: pointer;
  font-family: var(--font-sans);
  transition: transform .2s var(--ease-out), box-shadow .2s, border-color .2s;
}
.wt-quick:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); border-color: var(--brand-line); }
.wt-quick:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.wt-quick__ico { width: 44px; height: 44px; border-radius: var(--r-sm); display: grid; place-items: center; background: var(--brand-soft); color: var(--brand-strong); }
.wt-quick__ico :deep(svg) { width: 22px; height: 22px; }
.wt-quick b { font-size: var(--fs-sm); font-weight: 600; color: var(--ink); }
.wt-quick__desc { font-size: var(--fs-cap); color: var(--ink-3); }

.v2 .wt-quick__ico { background: var(--accent-soft);   color: var(--accent-strong); }
.v3 .wt-quick__ico { background: var(--warning-soft);  color: var(--warning); }
.v4 .wt-quick__ico { background: var(--success-soft);  color: var(--success); }
.v5 .wt-quick__ico { background: linear-gradient(140deg, var(--brand-soft), var(--accent-soft)); color: var(--brand-strong); }
.v6 .wt-quick__ico { background: var(--surface-3);     color: var(--ink-2); }
</style>
