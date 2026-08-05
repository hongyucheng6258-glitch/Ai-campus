<template>
  <!-- 通用内容卡片：封面图 + 标题 + 摘要 + 底部信息（闲置/活动/失物列表复用） -->
  <el-card class="item-card" shadow="hover" @click="$emit('click')">
    <div class="cover" v-if="cover">
      <el-image :src="cover" fit="cover" class="cover-img" lazy />
    </div>
    <div class="cover placeholder" v-else>
      <el-icon :size="36" color="var(--ink-3)"><Picture /></el-icon>
    </div>
    <div class="body">
      <div class="title">{{ title }}</div>
      <div class="desc">{{ desc }}</div>
      <div class="footer">
        <slot name="footer">
          <span class="time">{{ timeText }}</span>
        </slot>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'
import { Picture } from '@element-plus/icons-vue'
import { fromNow } from '../utils/date'

const props = defineProps({
  cover: { type: String, default: '' },
  title: { type: String, default: '' },
  desc: { type: String, default: '' },
  time: { type: String, default: '' }
})
defineEmits(['click'])

const timeText = computed(() => fromNow(props.time))
</script>

<style scoped>
.item-card {
  cursor: pointer;
  overflow: hidden;
}
.item-card :deep(.el-card__body) {
  padding: 0;
}
.cover {
  width: 100%;
  height: 160px;
  background: var(--surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-img {
  width: 100%;
  height: 100%;
}
.body {
  padding: 12px;
}
.title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.desc {
  font-size: 13px;
  color: var(--ink-3);
  margin-top: 6px;
  height: 36px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.footer {
  margin-top: 8px;
  font-size: 12px;
  color: var(--ink-3);
}
</style>
