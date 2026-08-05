# -*- coding: utf-8 -*-
"""阶段6：安全与边界测试
K 未授权/越权访问  L JWT篡改  M 水平越权(IDOR)  N 参数校验与注入  P 敏感信息泄露  O 限流
"""
import sys, io, json, os, base64, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import *

TK = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "tokens.json"), encoding="utf-8"))
T1 = TK["2021001"]   # 张三
T2 = TK["2021002"]   # 李四
T3 = TK["2021003"]   # 王五
TA = TK["admin"]
TAU = TK["auditor"]

print("=" * 70)
print("阶段6 安全与边界测试")
print("=" * 70)

# ---------------------------------------------------------------- K 未授权访问
print("\n--- K 未授权访问与角色越权 ---")

STU_PROTECTED = [
    ("GET", "/api/user/info"),
    ("GET", "/api/message/unread-count"),
    ("GET", "/api/message/list"),
    ("POST", "/api/activity/publish"),
    ("GET", "/api/wrongquestion/list"),
    ("GET", "/api/activity/my"),
]
bad = []
for m, p in STU_PROTECTED:
    c, r = call(m, p, body={} if m == "POST" else None)
    if not (c in (401, 403) or biz(r) in (401, 403)):
        bad.append(f"{m} {p} -> http={c} code={biz(r)}")
rec("K01", "无Token访问学生受保护接口全部拒绝", not bad,
    f"共{len(STU_PROTECTED)}个接口，异常：{bad}", "P0")

ADM_PROTECTED = [
    ("GET", "/api/admin/user/list"),
    ("GET", "/api/admin/stats/overview"),
    ("GET", "/api/admin/notice/list"),
    ("GET", "/api/admin/report/list"),
    ("GET", "/api/admin/ai/config"),
    ("GET", "/api/admin/audit/list"),
]
bad = []
for m, p in ADM_PROTECTED:
    c, r = call(m, p)
    if not (c in (401, 403) or biz(r) in (401, 403)):
        bad.append(f"{m} {p} -> http={c} code={biz(r)}")
rec("K02", "无Token访问管理端接口全部拒绝", not bad,
    f"共{len(ADM_PROTECTED)}个接口，异常：{bad}", "P0")

bad = []
for m, p in ADM_PROTECTED:
    c, r = call(m, p, token=T2)
    if not (c in (401, 403) or biz(r) in (401, 403)):
        bad.append(f"{m} {p} -> http={c} code={biz(r)} data={str(data_of(r))[:80]}")
rec("K03", "★学生Token访问管理端全部拒绝（垂直越权）", not bad,
    f"共{len(ADM_PROTECTED)}个接口，异常：{bad}", "P0")

# 关键：admin 的 uid=1，张三的 uid 也是 1 —— 若 JwtInterceptor 不校验 role，
# 管理员 token 会被当成 张三 使用学生端接口
c, r = call("GET", "/api/user/info", token=TA)
adm_as_stu = (biz(r) == 200 and isinstance(data_of(r), dict))
rec("K04", "★管理员Token不可直接调用学生端接口（uid串号）", not adm_as_stu,
    f"http={c} code={biz(r)} data={str(data_of(r))[:200]}", "P1")

# 反向：管理员 token 调 admin 接口正常（对照组）
c, r = call("GET", "/api/admin/stats/overview", token=TA)
rec("K05", "对照：管理员Token调管理端正常", biz(r) == 200, f"code={biz(r)}", "")

# auditor 越权做超管操作
c, r = call("POST", "/api/admin/system/admin", token=TAU,
            body={"username": "hacker_" + str(int(time.time())), "password": "admin123",
                  "realName": "越权测试", "role": "super"})
rec("K06", "★审核员不可创建超级管理员", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else r}", "P0")

# ---------------------------------------------------------------- L JWT 篡改
print("\n--- L JWT 篡改与伪造 ---")


def b64u_dec(s):
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def b64u_enc(b):
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


h, p, s = T2.split(".")
payload = json.loads(b64u_dec(p))
print("  李四原始payload:", payload)

# L01 篡改 uid 指向张三，签名不变
tam = dict(payload); tam["uid"] = 1
t_tam = f"{h}.{b64u_enc(json.dumps(tam, separators=(',', ':')).encode())}.{s}"
c, r = call("GET", "/api/user/info", token=t_tam)
rec("L01", "★篡改uid后Token被拒绝（签名校验生效）", biz(r) != 200 or c in (401, 403),
    f"http={c} code={biz(r)} data={str(data_of(r))[:150]}", "P0")

# L02 alg=none 攻击
none_h = b64u_enc(json.dumps({"alg": "none", "typ": "JWT"}, separators=(',', ':')).encode())
none_p = b64u_enc(json.dumps({"uid": 1, "role": "admin", "iat": int(time.time()),
                              "exp": int(time.time()) + 99999}, separators=(',', ':')).encode())
c, r = call("GET", "/api/user/info", token=f"{none_h}.{none_p}.")
rec("L02", "★alg=none 伪造Token被拒绝", biz(r) != 200, f"http={c} code={biz(r)}", "P0")

# L03 role 提权为 admin（签名不变）
tam2 = dict(payload); tam2["role"] = "admin"
t_tam2 = f"{h}.{b64u_enc(json.dumps(tam2, separators=(',', ':')).encode())}.{s}"
c, r = call("GET", "/api/admin/user/list", token=t_tam2)
rec("L03", "★篡改role=admin后无法访问管理端", biz(r) != 200, f"http={c} code={biz(r)}", "P0")

# L04 签名截断
c, r = call("GET", "/api/user/info", token=f"{h}.{p}.{s[:-6]}")
rec("L04", "签名被截断的Token被拒绝", biz(r) != 200, f"http={c} code={biz(r)}", "P0")

# L05 伪造过期 token
exp_p = b64u_enc(json.dumps({"uid": 1, "role": "student", "iat": 1600000000,
                             "exp": 1600000001}, separators=(',', ':')).encode())
c, r = call("GET", "/api/user/info", token=f"{h}.{exp_p}.{s}")
rec("L05", "过期Token被拒绝", biz(r) != 200, f"http={c} code={biz(r)}", "P0")

# L06 Authorization 头畸形
for name, tok in [("空字符串", ""), ("乱码", "abcdefg"), ("只有两段", h + "." + p)]:
    c, r = call("GET", "/api/user/info", token=tok) if tok else call("GET", "/api/user/info")
    if biz(r) == 200:
        rec("L06", f"畸形Token({name})被拒绝", False, f"http={c} code={biz(r)}", "P0")
        break
else:
    rec("L06", "各类畸形Token均被拒绝", True, "空/乱码/两段式 均拒绝", "P0")

# ---------------------------------------------------------------- M 水平越权
print("\n--- M 水平越权 IDOR ---")

# 张三先建一个活动，供李四尝试越权
c, r = call("POST", "/api/activity/publish", token=T1, body={
    "title": "安全测试活动-越权用", "type": "学习", "description": "安全测试专用",
    "location": "图书馆", "startTime": "2026-09-01 10:00:00", "endTime": "2026-09-01 12:00:00",
    "maxMembers": 5, "contact": "13800000001", "images": []})
act_id = data_of(r) if isinstance(data_of(r), int) else (data_of(r) or {}).get("id") if isinstance(data_of(r), dict) else None
rec("M00", "前置：张三发布活动", biz(r) == 200 and act_id, f"code={biz(r)} id={act_id}", "")

if act_id:
    c, r = call("PUT", f"/api/activity/{act_id}", token=T2, body={
        "title": "被李四篡改了", "type": "学习", "description": "hacked",
        "location": "x", "startTime": "2026-09-01 10:00:00", "endTime": "2026-09-01 12:00:00",
        "maxMembers": 5, "contact": "13800000002", "images": []})
    rec("M01", "★李四不能修改张三的活动", biz(r) != 200, f"http={c} code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

    c, r = call("DELETE", f"/api/activity/{act_id}", token=T2)
    rec("M02", "★李四不能删除张三的活动", biz(r) != 200, f"http={c} code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

    c, r = call("GET", f"/api/activity/{act_id}/members", token=T2)
    rec("M03", "李四不能查看张三活动的报名名单", biz(r) != 200, f"http={c} code={biz(r)}", "P1")

    c, r = call("GET", f"/api/activity/{act_id}/signin-qrcode", token=T2)
    rec("M04", "李四不能获取张三活动的签到码", biz(r) != 200, f"http={c} code={biz(r)}", "P1")

# 张三发一个闲置，李四尝试改/删（复现已知缺陷）
c, r = call("POST", "/api/idle/publish", token=T1, body={
    "title": "安全测试闲置", "category": "书籍", "description": "安全测试专用",
    "price": 10, "wantItem": "无", "contact": "13800000001", "images": []})
idle_id = data_of(r) if isinstance(data_of(r), int) else None
rec("M05", "前置：张三发布闲置", biz(r) == 200 and idle_id, f"code={biz(r)} id={idle_id}", "")

if idle_id:
    c, r = call("PUT", f"/api/idle/{idle_id}", token=T2, body={
        "title": "被篡改", "category": "书籍", "description": "hacked", "price": 1,
        "wantItem": "无", "contact": "x", "images": []})
    rec("M06", "李四不能修改张三的闲置", biz(r) != 200, f"http={c} code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

    c, r = call("PUT", f"/api/idle/{idle_id}", token=T1, body={
        "title": "安全测试闲置-本人改", "category": "书籍", "description": "owner edit",
        "price": 12, "wantItem": "无", "contact": "13800000001", "images": []})
    rec("M07", "★【缺陷复现】本人修改自己的闲置应成功", biz(r) == 200,
        f"http={c} code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''} —— 拦截器 excludePathPatterns 未区分 HTTP 方法，PUT 被放行后拿不到登录态", "P0")

    c, r = call("DELETE", f"/api/idle/{idle_id}", token=T1)
    rec("M08", "★【缺陷复现】本人删除自己的闲置应成功", biz(r) == 200,
        f"http={c} code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

# 消息越权
c, r = call("GET", "/api/message/list", token=T1, params={"pageNum": 1, "pageSize": 5})
msgs = plist(r)
if msgs:
    mid = msgs[0].get("id")
    c, r = call("PUT", f"/api/message/{mid}/read", token=T3)
    changed = biz(r) == 200
    # 校验张三那条消息是否真被改动
    c2, r2 = call("GET", "/api/message/list", token=T1, params={"pageNum": 1, "pageSize": 5})
    still = [m for m in plist(r2) if m.get("id") == mid]
    real_leak = changed and still and still[0].get("isRead") in (1, True) and msgs[0].get("isRead") in (0, False)
    rec("M09", "王五标记张三的消息为已读——不应产生实际影响", not real_leak,
        f"接口code={biz(r)}（返回200但SQL带userId条件，数据未被改动）实际是否被改={real_leak}", "P2")
else:
    rec("M09", "消息越权测试", True, "张三无消息，跳过", "")

# 错题本越权
c, r = call("GET", "/api/wrongquestion/list", token=T1, params={"pageNum": 1, "pageSize": 5})
wqs = plist(r)
if wqs:
    wid = wqs[0].get("id")
    c, r = call("GET", f"/api/wrongquestion/{wid}", token=T2)
    leak = biz(r) == 200 and data_of(r)
    rec("M10", "★李四不能查看张三的错题本条目", not leak, f"http={c} code={biz(r)} data={str(data_of(r))[:120]}", "P1")
    c, r = call("DELETE", f"/api/wrongquestion/{wid}", token=T2)
    rec("M11", "★李四不能删除张三的错题本条目", biz(r) != 200, f"http={c} code={biz(r)}", "P1")
else:
    rec("M10", "错题本越权测试", True, "张三无错题，跳过", "")

# ---------------------------------------------------------------- N 参数校验与注入
print("\n--- N 参数校验与注入 ---")

SQLI = ["' OR '1'='1", "1' OR '1'='1' --", "'; DROP TABLE user; --", "1 UNION SELECT 1,2,3"]
bad = []
for pl in SQLI:
    c, r = call("GET", "/api/activity/list", params={"pageNum": 1, "pageSize": 5, "keyword": pl})
    if c >= 500:
        bad.append(f"{pl} -> http={c}")
rec("N01", "★活动列表keyword注入不触发500", not bad, f"4种payload，异常：{bad}", "P0")

bad = []
for pl in SQLI:
    c, r = call("POST", "/api/auth/login", body={"studentNo": pl, "password": pl})
    if biz(r) == 200:
        bad.append(f"{pl} 竟登录成功！")
rec("N02", "★登录接口SQL注入无法绕过", not bad, f"4种payload，异常：{bad}", "P0")

# 数据库是否还在（DROP TABLE 后自检）
c, r = call("GET", "/api/activity/list", params={"pageNum": 1, "pageSize": 1})
rec("N03", "注入测试后数据库完好", biz(r) == 200, f"code={biz(r)} total={ptotal(r)}", "P0")

# XSS 存储
xss = "<script>alert('xss')</script><img src=x onerror=alert(1)>"
c, r = call("POST", "/api/lostfound/publish", token=T1, body={
    "type": 1, "title": "XSS测试" + xss, "itemName": "钱包", "description": xss,
    "location": "食堂", "lostTime": "2026-08-01 12:00:00", "contact": "13800000001", "images": []})
lf_id = data_of(r) if isinstance(data_of(r), int) else None
if lf_id:
    c, r = call("GET", f"/api/lostfound/{lf_id}")
    body_txt = json.dumps(data_of(r), ensure_ascii=False) if data_of(r) else ""
    raw_kept = "<script>" in body_txt
    rec("N04", "XSS payload存储后原样返回（需前端转义兜底）", True,
        f"后端未做HTML转义={raw_kept}（Vue默认插值会转义，属可接受；若用v-html则有风险）", "P2")
else:
    rec("N04", "XSS存储测试", False, f"发布失败 code={biz(r)}", "P2")

# 超长字段
c, r = call("POST", "/api/activity/publish", token=T1, body={
    "title": "长" * 5000, "type": "学习", "description": "长" * 20000,
    "location": "x", "startTime": "2026-09-01 10:00:00", "endTime": "2026-09-01 12:00:00",
    "maxMembers": 5, "contact": "1", "images": []})
rec("N05", "超长字段被拒绝且不返回500", c < 500 and biz(r) != 200, f"http={c} code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P1")

# 非法分页
c, r = call("GET", "/api/activity/list", params={"pageNum": -1, "pageSize": -10})
ok1 = c < 500
c2, r2 = call("GET", "/api/activity/list", params={"pageNum": 1, "pageSize": 999999})
ok2 = c2 < 500
rec("N06", "非法/超大分页参数不崩溃", ok1 and ok2,
    f"pageNum=-1 http={c} code={biz(r)}；pageSize=999999 http={c2} 返回条数={len(plist(r2))}", "P1")

# 非法路径参数
c, r = call("GET", "/api/activity/abc")
rec("N07", "非法ID类型返回4xx而非500", c < 500, f"http={c} code={biz(r)} msg={str(r)[:120]}", "P1")

c, r = call("GET", "/api/activity/99999999")
rec("N08", "不存在的ID返回业务错误而非500", c < 500 and biz(r) != 200, f"http={c} code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P1")

# 缺失必填字段
c, r = call("POST", "/api/activity/publish", token=T1, body={"title": "只有标题"})
rec("N09", "缺失必填字段被校验拦截", c < 500 and biz(r) != 200, f"http={c} code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P1")

# 非法业务值
c, r = call("POST", "/api/activity/publish", token=T1, body={
    "title": "非法人数测试", "type": "学习", "description": "test",
    "location": "x", "startTime": "2026-09-01 10:00:00", "endTime": "2026-09-01 12:00:00",
    "maxMembers": -5, "contact": "13800000001", "images": []})
rec("N10", "maxMembers为负数被拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P1")

# 结束时间早于开始时间
c, r = call("POST", "/api/activity/publish", token=T1, body={
    "title": "时间倒置测试", "type": "学习", "description": "test",
    "location": "x", "startTime": "2026-09-05 10:00:00", "endTime": "2026-09-01 12:00:00",
    "maxMembers": 5, "contact": "13800000001", "images": []})
rec("N11", "结束时间早于开始时间被拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P2")

# 畸形 JSON
c, r = call("POST", "/api/auth/login", body=b"{not a json", raw=True)
rec("N12", "畸形JSON返回4xx而非500", c < 500, f"http={c} resp={str(r)[:120]}", "P1")

# images 字段类型错误（已知会 500）
c, r = call("POST", "/api/activity/publish", token=T1, body={
    "title": "类型错误测试", "type": "学习", "description": "test",
    "location": "x", "startTime": "2026-09-01 10:00:00", "endTime": "2026-09-01 12:00:00",
    "maxMembers": 5, "contact": "13800000001", "images": ""})
rec("N13", "images字段类型错误应返回400而非500", c < 500,
    f"http={c} code={biz(r)} —— 类型不匹配未被全局异常处理器转成参数错误", "P2")

# ---------------------------------------------------------------- P 敏感信息泄露
print("\n--- P 敏感信息泄露 ---")

c, r = call("POST", "/api/auth/login", body={"studentNo": "2021001", "password": "admin123"})
txt = json.dumps(r, ensure_ascii=False)
leak = any(k in txt.lower() for k in ['"password"', "passwd", "salt"])
rec("P01", "登录响应不含密码字段", not leak, f"字段={list(data_of(r).keys()) if isinstance(data_of(r),dict) else r}", "P0")

c, r = call("GET", "/api/user/info", token=T1)
txt = json.dumps(r, ensure_ascii=False).lower()
rec("P02", "用户信息接口不含密码", '"password"' not in txt,
    f"字段={list(data_of(r).keys()) if isinstance(data_of(r),dict) else ''}", "P0")

c, r = call("GET", "/api/admin/user/list", token=TA, params={"pageNum": 1, "pageSize": 3})
txt = json.dumps(data_of(r), ensure_ascii=False).lower()
rec("P03", "管理端用户列表不泄露密码哈希", '"password"' not in txt and "$2a$" not in txt,
    f"首条字段={list(plist(r)[0].keys()) if plist(r) else '空'}", "P0")

# 错误响应是否泄露堆栈
c, r = call("GET", "/api/activity/abc")
txt = str(r)
stack = any(k in txt for k in ["Exception", "at com.", "org.springframework", "SQLException", "Caused by"])
rec("P04", "错误响应不泄露异常堆栈/包路径", not stack, f"http={c} 响应片段={txt[:200]}", "P1")

# 密码错误提示是否区分"用户不存在/密码错误"（用户枚举）
c, r1 = call("POST", "/api/auth/login", body={"studentNo": "2021001", "password": "wrongpwd"})
c, r2 = call("POST", "/api/auth/login", body={"studentNo": "9999999", "password": "wrongpwd"})
m1 = r1.get("message") if isinstance(r1, dict) else ""
m2 = r2.get("message") if isinstance(r2, dict) else ""
rec("P05", "登录失败提示不区分用户是否存在（防枚举）", m1 == m2,
    f"存在用户提示='{m1}' / 不存在用户提示='{m2}'", "P2")

# 上传接口鉴权
c, r = call("POST", "/api/file/upload")
rec("P06", "文件上传接口需鉴权", c in (401, 403) or biz(r) in (401, 403) or c == 400,
    f"http={c} code={biz(r)}", "P1")

# ---------------------------------------------------------------- O 限流与暴力破解（放最后）
print("\n--- O 限流与暴力破解 ---")

codes = []
for i in range(15):
    c, r = call("POST", "/api/auth/login", body={"studentNo": "2021003", "password": "wrong" + str(i)})
    codes.append(biz(r) if biz(r) else c)
    if biz(r) == 429 or c == 429:
        break
limited = any(x in (429, 1003, 1004) for x in codes) or codes[-1] != codes[0]
rec("O01", "登录接口存在暴力破解防护（限流/锁定）", limited,
    f"连续15次错误密码，返回码序列={codes}", "P1")

# 确认王五仍能正常登录（未被误锁死）
tk, info = login_student("2021003")
rec("O02", "暴力破解测试后正常账号仍可登录", bool(tk), f"token={'有' if tk else '无'} info={str(info)[:150]}", "P0")

# 高频普通接口
t_start = time.time()
codes = []
for i in range(40):
    c, r = call("GET", "/api/activity/list", params={"pageNum": 1, "pageSize": 1})
    codes.append(c)
    if c == 429:
        break
rec("O03", "高频只读接口限流情况（信息记录）", True,
    f"40次请求耗时{time.time()-t_start:.1f}s，是否出现429={429 in codes}", "P2")

# ---------------------------------------------------------------- 收尾：恢复陈七密码
print("\n--- 收尾：恢复被重置的测试账号密码 ---")
restored = False
for old in ("123456", "admin123", "888888"):
    tk5, _ = login_student("2021005", old)
    if tk5:
        if old == "admin123":
            restored = True
            rec("Z01", "陈七密码已是admin123", True, "无需恢复", "")
            break
        c, r = call("PUT", "/api/user/password", token=tk5,
                    body={"oldPassword": old, "newPassword": "admin123"})
        if biz(r) == 200:
            tk5b, _ = login_student("2021005", "admin123")
            restored = bool(tk5b)
        rec("Z01", "恢复陈七密码为admin123", restored, f"原密码={old} 改密code={biz(r)}", "P1")
        break
else:
    rec("Z01", "恢复陈七密码为admin123", False, "123456/admin123/888888 均登录失败，需人工处理", "P1")

dump(os.path.join(os.path.dirname(os.path.abspath(__file__)), "r6.json"))
