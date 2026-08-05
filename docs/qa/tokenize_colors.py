#!/usr/bin/env python3
# 把 .vue 文件 <style> 块里的硬编码中性色统一替换为梧桐校园设计 token。
# 仅在 <style>...</style> 内替换，且要求 # 前是分隔符(空格/:/;/,/(/=)，避免误伤 id 选择器。
import re, pathlib

MAP = {
    '#f5f7fa': 'var(--surface-2)', '#f4f4f5': 'var(--surface-2)',
    '#f8f9fb': 'var(--surface-2)', '#fafafa': 'var(--surface-2)',
    '#f7f8fa': 'var(--surface-2)', '#f0f2f5': 'var(--surface-2)',
    '#ebeef5': 'var(--line)', '#e9e9eb': 'var(--line)',
    '#edf2fc': 'var(--brand-soft)', '#ecf5ff': 'var(--brand-soft)', '#ecf2ff': 'var(--brand-soft)',
    '#e4e7ed': 'var(--line-strong)', '#dcdfe6': 'var(--line-strong)',
    '#303133': 'var(--ink)', '#606266': 'var(--ink-2)',
    '#909399': 'var(--ink-3)', '#a8abb2': 'var(--ink-3)',
    '#c0c4cc': 'var(--ink-3)', '#cdd0d6': 'var(--ink-3)',
    '#e6a23c': 'var(--warning)', '#e6a23a': 'var(--warning)',
    '#f56c6c': 'var(--error)', '#f56c6b': 'var(--error)', '#fef0f0': 'var(--error-soft)',
    '#67c23a': 'var(--success)', '#85ce61': 'var(--success)',
    '#409eff': 'var(--brand)', '#337ecc': 'var(--brand-strong)',
    '#2b5aed': 'var(--brand)', '#6f9bff': 'var(--brand)', '#5b86f5': 'var(--brand)',
    '#a0b8f5': 'var(--brand-line)',
    '#001529': 'var(--surface-3)',
}

hex_re = re.compile(r'([:;\s,(=])#([0-9a-fA-F]{6})\b')

def repl(m):
    pre = m.group(1)
    h = '#' + m.group(2).lower()
    return pre + MAP.get(h, '#' + m.group(2))

style_block = re.compile(r'<style[^>]*>.*?</style>', re.S)

roots = [
    pathlib.Path(r'E:/work/毕业设计/web/frontend/student/src'),
    pathlib.Path(r'E:/work/毕业设计/web/frontend/admin/src'),
]
scanned = changed = 0
changed_files = []
for root in roots:
    for f in root.rglob('*.vue'):
        text = f.read_text(encoding='utf-8')
        def style_repl(mm):
            return hex_re.sub(repl, mm.group(0))
        new = style_block.sub(style_repl, text)
        if new != text:
            f.write_text(new, encoding='utf-8')
            changed += 1
            changed_files.append(str(f.relative_to(root.parent.parent.parent)))  # web/frontend/...
        scanned += 1

print(f"scanned {scanned} .vue files, tokenized {changed}")
for p in changed_files:
    print("  -", p)
