# -*- coding: utf-8 -*-
import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(__file__))
from harness import *
D = os.path.dirname(__file__)
tk = json.load(open(os.path.join(D, "tokens.json"), encoding="utf-8"))
T1, T2, T5 = tk["2021001"], tk["2021002"], tk["2021005"]
ctx = json.load(open(os.path.join(D, "ctx3.json"), encoding="utf-8"))

print("### 1) 陈七token是否仍有效")
c, r = call("GET", "/api/user/info", token=T5)
print("user/info:", json.dumps(r, ensure_ascii=False)[:150])

print("\n### 2) 复现 PUT /api/idle/{id} 越权")
c, r = call("PUT", f"/api/idle/{ctx['idle_id']}", token=T5,
            body={"title": "x", "description": "x", "images": [], "expectItem": "y", "category": "书籍"})
print("PUT idle 陈七:", c, json.dumps(r, ensure_ascii=False)[:200])
c, r = call("PUT", f"/api/idle/{ctx['idle_id']}", token=T1,
            body={"title": "QA闲置-高数教材(本人改)", "description": "x", "images": [], "expectItem": "y", "category": "书籍"})
print("PUT idle 本人:", c, json.dumps(r, ensure_ascii=False)[:200])
c, r = call("DELETE", f"/api/idle/{ctx['idle_id']}", token=T5)
print("DELETE idle 陈七:", c, json.dumps(r, ensure_ascii=False)[:200])

print("\n### 3) 动态审核链")
c, r = call("GET", "/api/admin/audit/list", token=tk["admin"], params={"type": "post", "status": 0, "pageNum": 1, "pageSize": 10})
print("待审核动态:", json.dumps(data_of(r), ensure_ascii=False)[:500])

print("\n### 4) 敏感词落库内容")
c, r = call("GET", "/api/post/list", token=T1, params={"pageNum": 1, "pageSize": 10})
for p in plist(r):
    print("  post:", json.dumps(p, ensure_ascii=False)[:230])

print("\n### 5) 敏感词直接测试（不同词）")
for w in ["代考", "办证", "赌博", "毒品", "枪支"]:
    c, r = call("POST", "/api/post", token=T2, body={"content": f"测试{w}内容", "images": []})
    print(f"  含[{w}]: code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''} data={data_of(r)}")
