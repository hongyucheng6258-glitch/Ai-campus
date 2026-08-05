# -*- coding: utf-8 -*-
"""阶段4：消息中心 + 用户资料 + AI 学习中心"""
import sys, io, os, json, time, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(__file__))
from harness import *
D = os.path.dirname(__file__)
tk = json.load(open(os.path.join(D, "tokens.json"), encoding="utf-8"))
T1, T2, T3, T4, T5 = [tk[k] for k in ("2021001", "2021002", "2021003", "2021004", "2021005")]
TAG = datetime.datetime.now().strftime("%m%d%H%M%S")

def newid(r):
    d = data_of(r)
    return d.get("id") if isinstance(d, dict) else (d if isinstance(d, int) else None)

print("=========== 阶段4-A 消息中心 ===========")
n0 = unread(T1)
rec("H01", "获取未读数", isinstance(n0, int), f"未读={n0}", "P0")
c, r = call("GET", "/api/message/list", token=T1, params={"pageNum": 1, "pageSize": 5})
ms = plist(r)
rec("H02", "消息列表分页", biz(r) == 200 and len(ms) > 0, f"total={ptotal(r)} 本页={len(ms)}", "P0")

mid = ms[0]["id"] if ms else None
if mid:
    c, r = call("PUT", f"/api/message/{mid}/read", token=T1)
    rec("H03", "标记单条已读", biz(r) == 200, f"code={biz(r)}", "P0")
    n1 = unread(T1)
    rec("H04", "★已读后未读数-1", isinstance(n1, int) and n1 == n0 - 1, f"{n0}->{n1}", "P0")
    c, r = call("PUT", f"/api/message/{mid}/read", token=T2)
    rec("H05", "★越权标记他人消息已读", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

c, r = call("PUT", "/api/message/read-all", token=T1)
rec("H06", "全部已读", biz(r) == 200, f"code={biz(r)}", "P0")
n2 = unread(T1)
rec("H07", "★全部已读后未读数归零", n2 == 0, f"未读={n2}", "P0")
c, r = call("GET", "/api/message/list", token=T2, params={"pageNum": 1, "pageSize": 5})
rec("H08", "★消息隔离：李四消息不含张三的", all(x.get("userId") == 2 for x in plist(r)),
    f"userId集合={set(x.get('userId') for x in plist(r))}", "P0")

print("\n=========== 阶段4-B 用户资料 ===========")
c, r = call("PUT", "/api/user/profile", token=T5, body={"nickname": "陈七", "avatar": None, "gender": 1, "bio": f"QA修改签名{TAG}", "phone": "13800000005"})
rec("I01", "修改个人资料", biz(r) == 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
c, r = call("GET", "/api/user/info", token=T5)
rec("I02", "资料修改已生效", (data_of(r) or {}).get("bio") == f"QA修改签名{TAG}", f"bio={(data_of(r) or {}).get('bio')}", "P0")
c, r = call("PUT", "/api/user/password", token=T5, body={"oldPassword": "wrongold", "newPassword": "newpass123"})
rec("I03", "★旧密码错误应拒绝改密", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
c, r = call("PUT", "/api/user/password", token=T5, body={"oldPassword": "admin123", "newPassword": "temp_qa_9988"})
chg = biz(r) == 200
rec("I04", "正确旧密码可改密", chg, f"code={biz(r)}", "P0")
if chg:
    t_new, _ = login_student("2021005", "temp_qa_9988")
    rec("I05", "★新密码可登录", t_new is not None, "登录成功" if t_new else "登录失败", "P0")
    t_old, _ = login_student("2021005", "admin123")
    rec("I06", "★旧密码已失效", t_old is None, "旧密码仍可用（异常）" if t_old else "旧密码已拒绝", "P0")
    tk_r = t_new or tk["2021005"]
    c, r = call("PUT", "/api/user/password", token=tk_r, body={"oldPassword": "temp_qa_9988", "newPassword": "admin123"})
    rec("I07", "还原陈七密码为admin123", biz(r) == 200, f"code={biz(r)}", "P0")

print("\n=========== 阶段4-C AI 学习中心 ===========")
c, r = call("POST", "/api/ai/session", token=T1, body={"scene": "qa", "title": f"QA会话{TAG}"})
sid = newid(r)
rec("J01", "创建AI会话", biz(r) == 200 and sid, f"sessionId={sid} code={biz(r)}", "P0")
c, r = call("GET", "/api/ai/session/list", token=T1, params={"scene": "qa"})
rec("J02", "会话列表", biz(r) == 200, f"条数={len(plist(r)) if plist(r) else len(data_of(r) or [])}", "P1")

if sid:
    c, r = call("PUT", f"/api/ai/session/{sid}", token=T1, body={"title": f"QA会话已改名{TAG}"})
    rec("J03", "会话改名", biz(r) == 200, f"code={biz(r)}", "P1")
    c, r = call("PUT", f"/api/ai/session/{sid}", token=T2, body={"title": "越权改名"})
    rec("J04", "★越权改他人会话名应拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
    c, r = call("GET", f"/api/ai/session/{sid}/messages", token=T2, params={"pageNum": 1, "pageSize": 10})
    rec("J05", "★越权读他人会话消息应拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

# SSE 流式问答（真实调用 DeepSeek）
print("--- SSE 流式问答（真实调用上游，约需数秒） ---")
import urllib.request
try:
    req = urllib.request.Request(BASE + "/api/ai/chat", method="POST",
        data=json.dumps({"sessionId": sid, "question": "用一句话说明什么是二分查找"}).encode("utf-8"),
        headers={"Content-Type": "application/json;charset=UTF-8", "Authorization": "Bearer " + T1, "Accept": "text/event-stream"})
    chunks, evts, t0 = [], [], time.time()
    with urllib.request.urlopen(req, timeout=60) as resp:
        for raw in resp:
            line = raw.decode("utf-8", "replace").rstrip("\n")
            if line.startswith("event:"):
                evts.append(line[6:].strip())
            elif line.startswith("data:"):
                chunks.append(line[5:])
            if "done" in evts or time.time() - t0 > 55:
                break
    text = "".join(chunks)
    rec("J06", "★SSE流式问答返回内容", len(text.strip()) > 0 and "delta" in evts,
        f"事件={list(dict.fromkeys(evts))[:5]} 片段数={len(chunks)} 耗时={time.time()-t0:.1f}s 内容前80={text[:80]}", "P0")
except Exception as e:
    rec("J06", "★SSE流式问答返回内容", False, f"异常: {e}", "P0")

if sid:
    time.sleep(0.5)
    c, r = call("GET", f"/api/ai/session/{sid}/messages", token=T1, params={"pageNum": 1, "pageSize": 10})
    mm = plist(r)
    rec("J07", "★问答已落库（含user+assistant）", len(mm) >= 2,
        f"消息数={len(mm)} 角色={[x.get('role') for x in mm]}", "P0")

# 代码纠错
c, r = call("POST", "/api/ai/code/fix", token=T1, body={
    "code": "public class A{public static void main(String[] a){int x=1/0;}}", "language": "java", "extra": "为什么运行报错"})
rec("J08", "AI代码纠错", biz(r) == 200 and data_of(r), f"code={biz(r)} 返回前100={str(data_of(r))[:100]}", "P1")

# 提纲
c, r = call("POST", "/api/ai/outline", token=T1, body={"subject": "数据结构", "chapter": "第3章 栈与队列", "topic": "栈的应用"})
rec("J09", "AI生成提纲", biz(r) == 200 and data_of(r), f"code={biz(r)} 返回前100={str(data_of(r))[:100]}", "P1")

# 习题生成（基于错题）
c, r = call("GET", "/api/wrong-question/list", token=T1, params={"pageNum": 1, "pageSize": 1})
wl = plist(r)
if wl:
    c, r = call("POST", "/api/ai/quiz", token=T1, body={"wrongQuestionId": wl[0]["id"]})
    rec("J10", "AI基于错题生成习题", biz(r) == 200 and data_of(r), f"code={biz(r)} 返回前100={str(data_of(r))[:100]}", "P1")

# 会话删除
if sid:
    c, r = call("DELETE", f"/api/ai/session/{sid}", token=T2)
    rec("J11", "★越权删除他人会话应拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
    c, r = call("DELETE", f"/api/ai/session/{sid}", token=T1)
    rec("J12", "本人删除会话", biz(r) == 200, f"code={biz(r)}", "P1")

dump(os.path.join(D, "r4.json"))
