# -*- coding: utf-8 -*-
"""阶段6-B：修正路径后的补测 + 权限提升深挖"""
import sys, io, os, json, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import *

TK = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "tokens.json"), encoding="utf-8"))
T1, T2, T3 = TK["2021001"], TK["2021002"], TK["2021003"]
TA, TAU = TK["admin"], TK["auditor"]
TAG = time.strftime("%H%M%S")

print("=" * 70)
print("阶段6-B 安全补测（修正接口路径）")
print("=" * 70)

# ------------------------------------------------ K01 重测：无Token访问
print("\n--- K 重测 ---")
STU = [("GET", "/api/user/info"), ("GET", "/api/message/unread-count"),
       ("GET", "/api/message/list"), ("POST", "/api/activity"),
       ("POST", "/api/idle"), ("POST", "/api/lostfound"), ("POST", "/api/post"),
       ("GET", "/api/wrongquestion/list"), ("GET", "/api/activity/my"),
       ("POST", "/api/wrongquestion")]
bad = []
for m, p in STU:
    c, r = call(m, p, body={} if m == "POST" else None)
    if not (c in (401, 403) or biz(r) in (401, 403)):
        bad.append(f"{m} {p} -> http={c} code={biz(r)}")
rec("K01", "★无Token访问学生受保护接口全部拒绝", not bad, f"共{len(STU)}个接口，异常：{bad}", "P0")

# 未映射路径的兜底
c, r = call("GET", "/api/no-such-endpoint-" + TAG)
c2, r2 = call("POST", "/api/activity/publish", body={"x": 1})
rec("K07", "未映射路径应返回404而非500", biz(r) == 404 and biz(r2) == 404,
    f"GET未知路径 code={biz(r)}；POST /api/activity/publish code={biz(r2)} —— 后者被 /api/activity/{{id}} 匹配后类型转换失败，兜底成500", "P2")

# ------------------------------------------------ K06 深挖：审核员提权
print("\n--- K06 深挖：审核员(audit)越权做超管操作 ---")
c, r = call("GET", "/api/admin/system/admin", token=TAU, params={"pageNum": 1, "pageSize": 20})
rec("K08", "审核员可读取管理员账号列表", True,
    f"code={biz(r)} 条数={len(plist(r))} —— 记录：是否应对audit角色开放", "P2")

uname = f"esc_{TAG}"
c, r = call("POST", "/api/admin/system/admin", token=TAU,
            body={"username": uname, "password": "admin123", "realName": "提权测试", "role": "super"})
esc = biz(r) == 200
rec("K06", "★★审核员不应能创建超级管理员（垂直提权）", not esc,
    f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

if esc:
    # 用新建的超管登录，验证提权确实拿到完整权限
    tk_esc, info = login_admin(uname, "admin123")
    ok = bool(tk_esc)
    if ok:
        c2, r2 = call("GET", "/api/admin/user/list", token=tk_esc, params={"pageNum": 1, "pageSize": 1})
        c3, r3 = call("PUT", "/api/admin/user/1/reset-password", token=tk_esc)
        rec("K09", "★★提权后的账号确实获得超管能力", False,
            f"新超管登录成功，可读用户列表code={biz(r2)}，可重置任意用户密码code={biz(r3)} —— 完整提权链成立", "P0")
    else:
        rec("K09", "提权账号无法登录", True, f"{info}", "P1")

# 审核员改超管信息
c, r = call("PUT", "/api/admin/system/admin/1", token=TAU,
            body={"realName": "被审核员改了", "role": "audit", "status": 1})
rec("K10", "★审核员不应能修改超级管理员账号", biz(r) != 200,
    f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

# 审核员做用户封禁/重置密码
c, r = call("PUT", "/api/admin/user/3/reset-password", token=TAU)
rec("K11", "审核员重置学生密码（是否符合权限设计）", True,
    f"code={biz(r)} —— 记录：审核员按设计应只能审核内容", "P2")

# ------------------------------------------------ M 越权重测
print("\n--- M 水平越权重测 ---")
c, r = call("POST", "/api/activity", token=T1, body={
    "title": f"安全测试活动{TAG}", "category": "学习", "description": "安全测试专用",
    "location": "图书馆", "startTime": "2026-09-01 10:00:00", "endTime": "2026-09-01 12:00:00",
    "signupDeadline": "2026-08-30 10:00:00", "maxMembers": 5, "images": []})
d = data_of(r)
act_id = d.get("id") if isinstance(d, dict) else d
rec("M00", "前置：张三发布活动", biz(r) == 200 and act_id, f"code={biz(r)} id={act_id}", "")

if act_id:
    c, r = call("PUT", f"/api/activity/{act_id}", token=T2, body={
        "title": "被李四篡改", "category": "学习", "description": "hacked", "location": "x",
        "startTime": "2026-09-01 10:00:00", "endTime": "2026-09-01 12:00:00", "maxMembers": 5, "images": []})
    rec("M01", "★李四不能修改张三的活动", biz(r) != 200,
        f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

    c, r = call("DELETE", f"/api/activity/{act_id}", token=T2)
    rec("M02", "★李四不能删除张三的活动", biz(r) != 200,
        f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

    c, r = call("GET", f"/api/activity/{act_id}/members", token=T2)
    rec("M03", "李四不能查看张三活动的报名名单", biz(r) != 200, f"code={biz(r)}", "P1")

    c, r = call("GET", f"/api/activity/{act_id}/signin-qrcode", token=T2)
    rec("M04", "李四不能获取张三活动的签到码", biz(r) != 200, f"code={biz(r)}", "P1")

    c, r = call("PUT", f"/api/activity/{act_id}", token=T1, body={
        "title": f"安全测试活动{TAG}-本人改", "category": "学习", "description": "owner edit",
        "location": "图书馆", "startTime": "2026-09-01 10:00:00", "endTime": "2026-09-01 12:00:00",
        "maxMembers": 5, "images": []})
    rec("M01B", "对照：本人可以修改自己的活动", biz(r) == 200, f"code={biz(r)}", "")

# 闲置：复现 PUT/DELETE 401 缺陷
c, r = call("POST", "/api/idle", token=T1, body={
    "title": f"安全测试闲置{TAG}", "category": "书籍", "description": "安全测试专用",
    "price": 10, "originalPrice": 30, "tradeType": 1, "wantItem": "", "images": []})
d = data_of(r)
idle_id = d.get("id") if isinstance(d, dict) else d
rec("M05", "前置：张三发布闲置", biz(r) == 200 and idle_id, f"code={biz(r)} id={idle_id}", "")

if idle_id:
    c, r = call("PUT", f"/api/idle/{idle_id}", token=T2, body={
        "title": "被篡改", "category": "书籍", "description": "hacked", "price": 1,
        "originalPrice": 2, "tradeType": 1, "wantItem": "", "images": []})
    rec("M06", "李四不能修改张三的闲置", biz(r) != 200,
        f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

    c, r = call("PUT", f"/api/idle/{idle_id}", token=T1, body={
        "title": f"安全测试闲置{TAG}-本人改", "category": "书籍", "description": "owner edit",
        "price": 12, "originalPrice": 30, "tradeType": 1, "wantItem": "", "images": []})
    rec("M07", "★【缺陷复现】本人修改自己的闲置应成功", biz(r) == 200,
        f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''} —— WebMvcConfig 把 /api/idle/{{id:\\\\d+}} 加进 excludePathPatterns 且不区分方法，PUT/DELETE 同样被放行，Controller 取不到登录态", "P0")

    c, r = call("DELETE", f"/api/idle/{idle_id}", token=T1)
    rec("M08", "★【缺陷复现】本人删除自己的闲置应成功", biz(r) == 200,
        f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

# 失物招领同类检查
c, r = call("POST", "/api/lostfound", token=T1, body={
    "type": 1, "title": f"安全测试失物{TAG}", "itemName": "钱包", "description": "安全测试",
    "location": "食堂", "lostTime": "2026-08-01 12:00:00", "contact": "13800000001", "images": []})
d = data_of(r)
lf_id = d.get("id") if isinstance(d, dict) else d
rec("M12", "前置：张三发布失物招领", biz(r) == 200 and lf_id, f"code={biz(r)} id={lf_id}", "")
if lf_id:
    c, r = call("PUT", f"/api/lostfound/{lf_id}/status", token=T1, body={"status": 1})
    rec("M13", "失物招领本人可改状态", biz(r) == 200,
        f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P1")
    c, r = call("PUT", f"/api/lostfound/{lf_id}/status", token=T2, body={"status": 2})
    rec("M14", "★李四不能改张三失物招领的状态", biz(r) != 200,
        f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

# 帖子越权
c, r = call("POST", "/api/post", token=T1, body={"content": f"安全测试动态{TAG}", "images": []})
d = data_of(r)
pid = d.get("id") if isinstance(d, dict) else d
if pid:
    c, r = call("DELETE", f"/api/post/{pid}", token=T2)
    rec("M15", "★李四不能删除张三的动态", biz(r) != 200,
        f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
    c, r = call("DELETE", f"/api/post/{pid}", token=T1)
    rec("M16", "对照：本人可删除自己的动态", biz(r) == 200, f"code={biz(r)}", "")

# 错题本越权
c, r = call("POST", "/api/wrongquestion", token=T1, body={
    "subject": "数学", "question": f"安全测试题{TAG}", "answer": "A",
    "analysis": "无", "source": "QA", "images": []})
d = data_of(r)
wid = d.get("id") if isinstance(d, dict) else d
rec("M17", "前置：张三新增错题", biz(r) == 200 and wid, f"code={biz(r)} id={wid}", "")
if wid:
    c, r = call("GET", f"/api/wrongquestion/{wid}", token=T2)
    rec("M10", "★李四不能查看张三的错题详情", biz(r) != 200, f"code={biz(r)} data={str(data_of(r))[:100]}", "P1")
    c, r = call("DELETE", f"/api/wrongquestion/{wid}", token=T2)
    leak = biz(r) == 200
    if leak:
        c2, r2 = call("GET", f"/api/wrongquestion/{wid}", token=T1)
        leak = biz(r2) != 200
    rec("M11", "★李四不能删除张三的错题", not leak, f"删除code={biz(r)}（若200需确认是否真删）", "P1")

# ------------------------------------------------ N 参数校验重测
print("\n--- N 参数校验重测（正确路径） ---")
base = {"title": "参数校验", "category": "学习", "description": "test", "location": "x",
        "startTime": "2026-09-01 10:00:00", "endTime": "2026-09-01 12:00:00",
        "signupDeadline": "2026-08-30 10:00:00", "maxMembers": 5, "images": []}

b = dict(base); b["title"] = "长" * 500
c, r = call("POST", "/api/activity", token=T1, body=b)
rec("N05", "超长title(500字，DB上限64)被校验拦截而非500", biz(r) not in (200, 500),
    f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P1")

c, r = call("POST", "/api/activity", token=T1, body={"title": "只有标题"})
rec("N09", "缺失必填字段被参数校验拦截（应400非500）", biz(r) not in (200, 500),
    f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P1")

b = dict(base); b["maxMembers"] = -5; b["title"] = "负数人数"
c, r = call("POST", "/api/activity", token=T1, body=b)
rec("N10", "maxMembers=-5 被拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P1")

b = dict(base); b["startTime"] = "2026-09-05 10:00:00"; b["title"] = "时间倒置"
c, r = call("POST", "/api/activity", token=T1, body=b)
rec("N11", "结束时间早于开始时间被拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P2")

b = dict(base); b["images"] = ""; b["title"] = "类型错误"
c, r = call("POST", "/api/activity", token=T1, body=b)
rec("N13", "images类型错误应返回参数错误而非500", biz(r) not in (200, 500),
    f"code={biz(r)} —— 反序列化异常未被转换成400", "P2")

# XSS 存储
xss = "<script>alert('xss')</script><img src=x onerror=alert(1)>"
c, r = call("POST", "/api/post", token=T1, body={"content": f"XSS测试{TAG}" + xss, "images": []})
d = data_of(r); xid = d.get("id") if isinstance(d, dict) else d
if xid:
    c, r = call("GET", f"/api/post/{xid}", token=T1)
    txt = json.dumps(data_of(r), ensure_ascii=False)
    rec("N04", "XSS payload存储情况（记录，前端需转义兜底）", True,
        f"后端原样存储={'<script>' in txt}；Vue默认{{{{}}}}插值会转义，仅当使用v-html才有风险", "P2")
    call("DELETE", f"/api/post/{xid}", token=T1)
else:
    rec("N04", "XSS存储测试", False, f"发帖失败 code={biz(r)}", "P2")

dump(os.path.join(os.path.dirname(os.path.abspath(__file__)), "r6b.json"))
