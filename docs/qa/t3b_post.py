# -*- coding: utf-8 -*-
"""阶段3-B 补测：动态广场（补齐审核步骤）+ 评论敏感词机审 + 闲置编辑/下架缺陷复现"""
import sys, io, os, json, time, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(__file__))
from harness import *
D = os.path.dirname(__file__)
tk = json.load(open(os.path.join(D, "tokens.json"), encoding="utf-8"))
T1, T2, T3, T4, T5 = [tk[k] for k in ("2021001", "2021002", "2021003", "2021004", "2021005")]
TA, TAUD = tk["admin"], tk["auditor"]
TAG = datetime.datetime.now().strftime("%m%d%H%M%S")

def newid(r):
    d = data_of(r)
    return d.get("id") if isinstance(d, dict) else (d if isinstance(d, int) else None)

print("=========== 阶段3-B 动态广场（含审核） ===========")
c, r = call("POST", "/api/post", token=T1, body={"content": f"QA动态{TAG} 今天天气不错☀️ 一起自习吗", "images": []})
pid = newid(r)
rec("D01", "张三发布动态", biz(r) == 200 and pid, f"postId={pid} auditStatus={(data_of(r) or {}).get('auditStatus')}", "P0")

c, r = call("GET", "/api/post/list", token=T2, params={"pageNum": 1, "pageSize": 30})
rec("D02", "待审核动态对他人不可见", not any(x.get("id") == pid for x in plist(r)), f"列表数={len(plist(r))}", "P1")

c, r = call("POST", f"/api/admin/audit/post/{pid}/pass", token=TA)
rec("D03", "管理员审核通过动态", biz(r) == 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

c, r = call("GET", "/api/post/list", token=T2, params={"pageNum": 1, "pageSize": 30})
rec("D04", "★审核后李四能看到张三的动态", any(x.get("id") == pid for x in plist(r)), f"列表数={len(plist(r))}", "P0")

# 点赞
c, r = call("POST", f"/api/post/{pid}/like", token=T2)
rec("D05", "★李四点赞", biz(r) == 200, f"code={biz(r)}", "P0")
c, r = call("POST", f"/api/post/{pid}/like", token=T2)
rec("D06", "重复点赞应被拦截", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P1")
c, r = call("POST", f"/api/post/{pid}/like", token=T3)
rec("D07", "王五也点赞", biz(r) == 200, f"code={biz(r)}", "P1")
c, r = call("GET", "/api/post/list", token=T4, params={"pageNum": 1, "pageSize": 30})
tgt = [x for x in plist(r) if x.get("id") == pid]
rec("D08", "★点赞数累计正确(应为2)", tgt and tgt[0].get("likeCount") == 2, f"likeCount={tgt[0].get('likeCount') if tgt else '-'}", "P0")

# 评论 + 消息
b = unread(T1)
c, r = call("POST", f"/api/post/{pid}/comment", token=T2, body={"content": "同去！几点在图书馆？"})
rec("D09", "★李四评论", biz(r) == 200, f"code={biz(r)}", "P0")
time.sleep(0.5)
a = unread(T1)
rec("D10", "★张三收到评论消息", isinstance(a, int) and isinstance(b, int) and a > b, f"{b}->{a}", "P0")
c, r = call("GET", "/api/message/list", token=T1, params={"pageNum": 1, "pageSize": 1})
ms = plist(r)
rec("D11", "★评论消息内容正确", ms and "评论" in json.dumps(ms[0], ensure_ascii=False),
    f"{json.dumps(ms[0],ensure_ascii=False)[:230] if ms else '无'}", "P0")

c, r = call("POST", f"/api/post/{pid}/comment", token=T3, body={"content": "我也想去，带我一个"})
rec("D12", "王五评论", biz(r) == 200, f"code={biz(r)}", "P1")
c, r = call("GET", f"/api/post/{pid}/comments", token=T5, params={"pageNum": 1, "pageSize": 10})
cl = plist(r)
rec("D13", "★陈七可看到全部评论(应2条)", len(cl) == 2, f"评论数={len(cl)} 内容={json.dumps(cl,ensure_ascii=False)[:280]}", "P0")

c, r = call("GET", "/api/post/list", token=T4, params={"pageNum": 1, "pageSize": 30})
tgt = [x for x in plist(r) if x.get("id") == pid]
rec("D14", "评论数累计正确(应为2)", tgt and tgt[0].get("commentCount") == 2, f"commentCount={tgt[0].get('commentCount') if tgt else '-'}", "P1")

# 取消赞
c, r = call("DELETE", f"/api/post/{pid}/like", token=T2)
rec("D15", "李四取消点赞", biz(r) == 200, f"code={biz(r)}", "P1")
c, r = call("GET", "/api/post/list", token=T4, params={"pageNum": 1, "pageSize": 30})
tgt = [x for x in plist(r) if x.get("id") == pid]
rec("D16", "取消赞后点赞数回退为1", tgt and tgt[0].get("likeCount") == 1, f"likeCount={tgt[0].get('likeCount') if tgt else '-'}", "P0")
c, r = call("DELETE", f"/api/post/{pid}/like", token=T2)
rec("D17", "重复取消赞行为", True, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}（记录）", "INFO")

# 评论敏感词机审
print("\n--- 评论敏感词 DFA 机审 ---")
for w in ["赌博", "代考", "毒品"]:
    c, r = call("POST", f"/api/post/{pid}/comment", token=T4, body={"content": f"你要不要试试{w}"})
    rec(f"D18-{w}", f"★评论含敏感词[{w}]应被拦截", biz(r) != 200,
        f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
c, r = call("GET", f"/api/post/{pid}/comments", token=T5, params={"pageNum": 1, "pageSize": 20})
rec("D19", "★被拦截的敏感评论不出现在列表", len(plist(r)) == 2, f"可见评论数={len(plist(r))}（应仍为2）", "P0")

# 发帖敏感词（对照）
c, r = call("POST", "/api/post", token=T4, body={"content": f"QA发帖敏感词{TAG} 赌博 代考 毒品", "images": []})
rec("D20", "★发布动态含敏感词（对照：发帖未做机审）", True,
    f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''} → 发帖{'未' if biz(r)==200 else '已'}拦截，依赖人工审核", "INFO")

# 越权删除他人动态？（若有该接口）
c, r = call("DELETE", f"/api/post/{pid}", token=T5)
rec("D21", "删除他人动态接口行为", True, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}（记录）", "INFO")

# ===== 闲置编辑/下架缺陷复现 =====
print("\n=========== 缺陷复现：闲置编辑/下架 401 ===========")
c, r = call("POST", "/api/idle", token=T1, body={"title": f"QA闲置B{TAG}", "description": "d", "images": [], "expectItem": "e", "category": "书籍"})
iid = newid(r)
c, r = call("PUT", f"/api/idle/{iid}", token=T1, body={"title": f"QA闲置B{TAG}-改", "description": "d2", "images": [], "expectItem": "e", "category": "书籍"})
rec("G01", "★物主编辑自己的闲置（应成功）", biz(r) == 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
c, r = call("DELETE", f"/api/idle/{iid}", token=T1)
rec("G02", "★物主下架自己的闲置（应成功）", biz(r) == 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
# 对照：同为需登录的 POST /api/idle 正常
c, r = call("GET", "/api/idle/my", token=T1, params={"pageNum": 1, "pageSize": 5})
rec("G03", "对照：GET /api/idle/my 鉴权正常", biz(r) == 200, f"code={biz(r)}", "P1")

dump(os.path.join(D, "r3b.json"))
