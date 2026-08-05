#!/usr/bin/env python3
# 小程序 wxss 里的 Element-Plus 默认色统一替换为 wutong 调色板（与 wutong.wxss 语义一致）。
import re, pathlib

MAP = {
    '#f56c6c': '#d9543f',  # EP error -> wt-error
    '#f56c6b': '#d9543f',
    '#e6a23c': '#e0a93f',  # EP warning -> wt-warning
    '#e6a23a': '#e0a93f',
    '#67c23a': '#4ca46a',  # EP success -> wt-success
    '#409eff': '#2f9e8a',  # EP primary blue -> wt-brand
    '#2b5aed': '#2f9e8a',
}
hex_re = re.compile(r'#[0-9a-fA-F]{6}\b')
def repl(m):
    h = m.group(0).lower()
    return MAP.get(h, m.group(0))

root = pathlib.Path(r'E:/work/毕业设计/miniprogram/frontend')
scanned = changed = 0
changed_files = []
for f in root.rglob('*.wxss'):
    text = f.read_text(encoding='utf-8')
    new = hex_re.sub(repl, text)
    if new != text:
        f.write_text(new, encoding='utf-8')
        changed += 1
        changed_files.append(str(f.relative_to(root)))
    scanned += 1

print(f"scanned {scanned} wxss, tokenized {changed}")
for p in changed_files:
    print("  -", p)
