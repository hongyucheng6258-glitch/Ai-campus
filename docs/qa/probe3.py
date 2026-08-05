# -*- coding: utf-8 -*-
import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(__file__))
from harness import *
D = os.path.dirname(__file__)
tk = json.load(open(os.path.join(D, "tokens.json"), encoding="utf-8"))
T1, T2 = tk["2021001"], tk["2021002"]

print("### A) AI 会话创建 400 原因")
for scene in ["qa", "QA", "chat", "code", "outline", "quiz", "pdf", "study", None]:
    body = {"title": "t"}
    if scene: body["scene"] = scene
    c, r = call("POST", "/api/ai/session", token=T1, body=body)
    print(f"  scene={scene!r:10} -> code={biz(r)} msg={r.get('message') if isinstance(r,dict) else r}")

print("\n### B) 越权标记已读是否真的改了数据")
c, r = call("GET", "/api/message/list", token=T2, params={"pageNum": 1, "pageSize": 3})
for m in plist(r):
    print("  李四消息:", m["id"], "isRead=", m["isRead"])
mine = plist(r)
if mine:
    tgt = mine[0]["id"]
    c, r = call("PUT", f"/api/message/{tgt}/read", token=T1)   # 张三去标记李四的消息
    print(f"  张三标记李四消息{tgt}: code={biz(r)}")
    c, r = call("GET", "/api/message/list", token=T2, params={"pageNum": 1, "pageSize": 3})
    for m in plist(r):
        if m["id"] == tgt:
            print(f"  → 该消息实际 isRead={m['isRead']}  (0=未读，说明未被真正改动)")
