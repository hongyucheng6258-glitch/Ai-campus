# -*- coding: utf-8 -*-
"""阶段7：恢复 DeepSeek Key 后重测 AI 全链路"""
import sys, io, os, json, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import *

TK = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "tokens.json"), encoding="utf-8"))
T1 = TK["2021001"]
TA = TK["admin"]
KEY = os.environ.get("AI_API_KEY", "")
WQID = None

print("=" * 70)
print("阶段7 AI 全链路（恢复 api_key 后）")
print("=" * 70)

if not KEY:
    raise RuntimeError("请先通过环境变量 AI_API_KEY 提供测试密钥")

# ---- 1. 读现有配置
c, r = call("GET", "/api/admin/ai/config", token=TA)
rows = data_of(r) or []
kv = {x["configKey"]: x["configValue"] for x in rows} if isinstance(rows, list) else {}
print("当前配置:", json.dumps(kv, ensure_ascii=False)[:400])
rec("R01", "管理端可读取AI配置", biz(r) == 200, f"code={biz(r)} keys={list(kv)}", "")

# ---- 2. 写回 Key（体格式：{configs:{key:value}}）
kv["api_key"] = KEY
c, r = call("PUT", "/api/admin/ai/config", token=TA, body={"configs": kv})
rec("R02", "★管理端写回 DeepSeek api_key（热更新）", biz(r) == 200,
    f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

c, r = call("GET", "/api/admin/ai/config", token=TA)
rows = data_of(r) or []
kv2 = {x["configKey"]: x["configValue"] for x in rows} if isinstance(rows, list) else {}
got = kv2.get("api_key", "")
rec("R03", "配置回读确认Key已落库", bool(got),
    f"api_key回显='{got[:8]}...{got[-4:] if len(got)>12 else ''}' 长度={len(got)}（注意：明文回显，未脱敏）", "P2")

# ---- 3. 会话
c, r = call("POST", "/api/ai/session", token=T1, body={"scene": "chat", "title": f"QA会话{time.strftime('%H%M%S')}"})
d = data_of(r); sid = d.get("id") if isinstance(d, dict) else d
rec("R04", "创建AI会话", biz(r) == 200 and sid, f"code={biz(r)} id={sid}", "P1")

# ---- 4. 同步问答
if sid:
    t0 = time.time()
    c, r = call("POST", "/api/ai/chat/sync", token=T1,
                body={"sessionId": sid, "question": "用一句话介绍什么是快速排序"}, timeout=90)
    ans = str(data_of(r))[:200]
    rec("R05", "★AI同步问答返回真实回答", biz(r) == 200 and len(ans) > 10,
        f"code={biz(r)} 耗时{time.time()-t0:.1f}s 回答={ans}", "P0")

    c, r = call("GET", f"/api/ai/session/{sid}/messages", token=T1, params={"pageNum": 1, "pageSize": 20})
    msgs = plist(r) or (data_of(r) if isinstance(data_of(r), list) else [])
    rec("R06", "会话消息已落库（含user+assistant）", len(msgs) >= 2, f"code={biz(r)} 条数={len(msgs)}", "P1")

# ---- 5. SSE 流式
t0 = time.time()
import urllib.request
_req = urllib.request.Request("http://localhost:8080/api/ai/chat",
    data=json.dumps({"sessionId": sid, "question": "3的平方是多少？只回答数字"}, ensure_ascii=False).encode(),
    headers={"Content-Type": "application/json;charset=UTF-8", "Accept": "text/event-stream",
             "Authorization": "Bearer " + T1}, method="POST")
txt, ct = "", ""
try:
    with urllib.request.urlopen(_req, timeout=90) as _rs:
        ct = _rs.headers.get("Content-Type")
        _b = b""
        while len(_b) < 1500:
            _c = _rs.read(256)
            if not _c: break
            _b += _c
        txt = _b.decode("utf-8", "replace")
except Exception as e:
    txt = f"ERR {e}"
deltas = txt.count("event:delta")
rec("R07", "★AI流式问答(SSE)真实打字机输出", deltas > 0 and "event:done" in txt,
    f"Content-Type={ct} 耗时{time.time()-t0:.1f}s delta片数={deltas} 片段={txt[:160]!r}", "P0")

# ---- 6. 代码纠错
t0 = time.time()
c, r = call("POST", "/api/ai/code/fix", token=T1, body={
    "language": "java",
    "code": "public class A{public static void main(String[] a){int x=1/0;System.out.println(x);}}"},
    timeout=90)
rec("R08", "★AI代码纠错", biz(r) == 200 and data_of(r),
    f"code={biz(r)} 耗时{time.time()-t0:.1f}s 结果={str(data_of(r))[:180]}", "P0")

# ---- 7. 大纲生成
t0 = time.time()
c, r = call("POST", "/api/ai/outline", token=T1,
            body={"subject": "数据结构", "chapter": "第五章 树", "topic": "二叉树遍历"}, timeout=90)
rec("R09", "★AI论文大纲生成", biz(r) == 200 and data_of(r),
    f"code={biz(r)} 耗时{time.time()-t0:.1f}s 结果={str(data_of(r))[:180]}", "P0")

# ---- 8. 出题（需要真实错题ID）
c, r = call("GET", "/api/wrong-question/list", token=T1, params={"pageNum": 1, "pageSize": 5})
_l = plist(r)
if not _l:
    c, r = call("POST", "/api/wrong-question", token=T1, body={
        "subject": "数据结构", "question": "二叉树中序遍历的结果顺序是？", "answer": "左-根-右",
        "analysis": "中序遍历定义", "source": "QA", "images": []})
    _d = data_of(r); WQID = _d.get("id") if isinstance(_d, dict) else _d
else:
    WQID = _l[0].get("id")
print("  用于出题的错题ID:", WQID)

t0 = time.time()
c, r = call("POST", "/api/ai/quiz", token=T1,
            body={"wrongQuestionId": WQID}, timeout=90)
rec("R10", "★AI智能出题", biz(r) == 200 and data_of(r),
    f"code={biz(r)} 耗时{time.time()-t0:.1f}s 结果={str(data_of(r))[:180]}", "P0")

# ---- 9. 调用日志与限流
c, r = call("GET", "/api/admin/ai/logs", token=TA, params={"pageNum": 1, "pageSize": 10})
logs = plist(r)
ok_cnt = len([x for x in logs if x.get("status") in (1, "1", True)])
rec("R11", "AI调用日志已记录", len(logs) > 0,
    f"共{ptotal(r)}条，本页{len(logs)}条，成功{ok_cnt}条；样例={json.dumps(logs[0], ensure_ascii=False)[:250] if logs else ''}", "P1")

c, r = call("GET", "/api/admin/ai/prompts", token=TA)
rec("R12", "提示词模板可读", biz(r) == 200, f"code={biz(r)} 条数={len(plist(r)) or len(data_of(r) or [])}", "P1")

# ---- 10. AI 接口鉴权
c, r = call("POST", "/api/ai/chat/sync", body={"content": "hi"})
rec("R13", "AI接口需登录", biz(r) in (401, 403), f"code={biz(r)}", "P1")

dump(os.path.join(os.path.dirname(os.path.abspath(__file__)), "r7.json"))
