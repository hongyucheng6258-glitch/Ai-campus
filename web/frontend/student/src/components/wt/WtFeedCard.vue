<script setup>
// 推荐流条目卡：左侧缩略图(slot) + 标题 + 元信息 + 标签/价格 + 操作按钮
import WtTag from './WtTag.vue'

const props = defineProps({
  title:        String,
  meta:         { type: Array, default: () => [] }, // [string, ...]
  tag:          { type: Object, default: null },      // { type, label }
  price:        String,
  image:        { type: String, default: '' },
  actionLabel:  { type: String, default: '查看' },
})
const emit = defineEmits(['action'])

function onImageError(event) {
  event.currentTarget.style.display = 'none'
}
</script>

<template>
  <article class="wt-fcard">
    <div class="wt-fcard__thumb">
      <slot name="thumb" />
      <img v-if="image" class="wt-fcard__image" :src="image" :alt="title" loading="lazy" @error="onImageError" />
    </div>
    <div class="wt-fcard__body">
      <h3 class="wt-fcard__title">{{ title }}</h3>
      <div v-if="meta.length" class="wt-fcard__meta">
        <span v-for="(m, i) in meta" :key="i" class="wt-fcard__m">
          {{ m }}<span v-if="i < meta.length - 1" class="wt-fcard__sep">·</span>
        </span>
      </div>
      <div class="wt-fcard__foot">
        <div class="wt-fcard__left">
          <WtTag v-if="tag" :type="tag.type" dot>{{ tag.label }}</WtTag>
          <span v-if="price" class="wt-fcard__price">{{ price }}</span>
        </div>
        <button class="wt-fcard__act" @click="emit('action')">{{ actionLabel }}</button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.wt-fcard {
  display: grid; grid-template-columns: 96px 1fr; gap: var(--s-4);
  padding: var(--s-4); border-radius: var(--r-md);
  background: var(--surface); border: 1px solid var(--line);
  transition: border-color .2s, transform .2s var(--ease-out), box-shadow .2s;
}
.wt-fcard:hover { border-color: var(--brand-line); transform: translateY(-2px); box-shadow: var(--shadow-sm); }
.wt-fcard__thumb {
  position: relative; width: 96px; height: 96px; border-radius: var(--r-sm);
  background: linear-gradient(140deg, var(--brand-soft), var(--accent-soft));
  display: grid; place-items: center; color: var(--brand-strong); overflow: hidden;
}
.wt-fcard__thumb :deep(svg) { width: 34px; height: 34px; }
.wt-fcard__image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.wt-fcard__body { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.wt-fcard__title { font-size: var(--fs-body); font-weight: 600; line-height: 1.35; }
.wt-fcard__meta { display: flex; align-items: center; gap: var(--s-3); flex-wrap: wrap; font-size: var(--fs-xs); color: var(--ink-3); }
.wt-fcard__sep { opacity: .5; }
.wt-fcard__foot { display: flex; align-items: center; justify-content: space-between; gap: var(--s-3); margin-top: auto; }
.wt-fcard__left { display: flex; align-items: center; gap: var(--s-3); min-width: 0; }
.wt-fcard__price { font-family: var(--font-display); font-weight: 700; color: var(--accent-strong); font-size: 1.1rem; }
.wt-fcard__act {
  flex: none; padding: 6px 14px; border-radius: var(--r-pill);
  border: 1px solid var(--line-strong); background: var(--surface);
  color: var(--ink); font-size: var(--fs-xs); font-weight: 600; font-family: var(--font-sans); cursor: pointer;
  transition: background .2s, border-color .2s, color .2s;
}
.wt-fcard__act:hover { background: var(--brand-soft); border-color: var(--brand-line); color: var(--brand-strong); }
.wt-fcard__act:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.wt-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
@media (max-width: 520px) {
  .wt-fcard { grid-template-columns: 72px 1fr; }
  .wt-fcard__thumb { width: 72px; height: 72px; }
}
</style>
