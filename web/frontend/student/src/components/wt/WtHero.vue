<script setup>
// 门户 Hero：问候 + 标题 + 副文案 + AI 提问框 + 数据条 + 可选 spark 角标
// 绑定内部 query，回车或点击 emit('ai-submit', query)
import { ref } from 'vue'
import WtButton from './WtButton.vue'

const props = defineProps({
  greet:         String,
  title:         String,
  subtitle:      String,
  aiPlaceholder: String,
  stats:         { type: Array, default: () => [] }, // [{ value, label }]
  spark:         { type: String, default: '' },
})
const emit = defineEmits(['ai-submit'])
const q = ref('')
function submit() {
  const v = q.value.trim()
  if (v) emit('ai-submit', v)
}
</script>

<template>
  <section class="wt-hero">
    <div class="wt-hero__bg" aria-hidden="true"></div>
    <div class="wt-hero__inner">
      <p v-if="greet" class="wt-hero__greet">{{ greet }}</p>
      <h1 v-if="title">{{ title }}</h1>
      <p v-if="subtitle" class="wt-hero__sub">{{ subtitle }}</p>

      <div class="wt-hero__ai">
        <input
          v-model="q"
          :placeholder="aiPlaceholder || '想用 AI 做什么？试试：整理高数错题 / 总结这份 PDF'"
          aria-label="AI 提问"
          @keyup.enter="submit"
        />
        <WtButton type="accent" @click="submit">问问 AI</WtButton>
      </div>

      <div v-if="stats.length" class="wt-hero__stats">
        <div v-for="s in stats" :key="s.label" class="wt-hero__stat">
          <b>{{ s.value }}</b><span>{{ s.label }}</span>
        </div>
      </div>

      <div v-if="spark" class="wt-hero__spark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true">
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3"/>
        </svg>
        {{ spark }}
      </div>
      <slot />
    </div>
  </section>
</template>

<style scoped>
.wt-hero {
  position: relative; overflow: hidden;
  border-radius: var(--r-xl); padding: var(--s-7);
  background: linear-gradient(135deg, var(--brand-strong), var(--brand) 55%, oklch(60% 0.12 150));
  color: var(--brand-ink); box-shadow: var(--shadow-lg);
}
.wt-hero__bg {
  position: absolute; right: -60px; top: -60px; width: 280px; height: 280px; border-radius: 50%;
  background: radial-gradient(circle, oklch(85% 0.1 95 / .35), transparent 70%);
}
.wt-hero__inner { position: relative; z-index: 1; }
.wt-hero__greet { margin: 0; font-size: var(--fs-sm); font-weight: 600; opacity: .85; letter-spacing: .04em; }
.wt-hero h1 { margin: 8px 0; font-family: var(--font-display); font-weight: 600; color: var(--brand-ink); line-height: 1.1; font-size: clamp(1.8rem, 1.2rem + 2vw, 2.6rem); }
.wt-hero__sub { margin: 0; max-width: 46ch; font-size: var(--fs-body); opacity: .9; }
.wt-hero__ai {
  display: flex; gap: 12px; max-width: 560px; margin-top: var(--s-5);
  background: oklch(100% 0 0 / .16); border: 1px solid oklch(100% 0 0 / .3);
  border-radius: var(--r-pill); padding: 8px 8px 8px 20px;
}
.wt-hero__ai input { flex: 1; background: transparent; border: none; color: var(--brand-ink); font-size: var(--fs-sm); font-family: var(--font-sans); }
.wt-hero__ai input::placeholder { color: oklch(100% 0 0 / .75); }
.wt-hero__ai input:focus { outline: none; }
.wt-hero__stats { display: flex; gap: var(--s-6); margin-top: var(--s-5); flex-wrap: wrap; }
.wt-hero__stat b { display: block; font-family: var(--font-display); font-size: 1.5rem; font-weight: 600; line-height: 1; }
.wt-hero__stat span { font-size: var(--fs-xs); opacity: .85; }
.wt-hero__spark {
  position: absolute; right: var(--s-7); bottom: var(--s-6); z-index: 1;
  display: inline-flex; align-items: center; gap: 8px;
  background: oklch(100% 0 0 / .16); border: 1px solid oklch(100% 0 0 / .3);
  border-radius: var(--r-pill); padding: 8px 16px; font-size: var(--fs-xs); font-weight: 600;
}
@media (max-width: 640px) {
  .wt-hero__spark { display: none; }
  .wt-hero__stats { gap: var(--s-5); }
}
</style>
