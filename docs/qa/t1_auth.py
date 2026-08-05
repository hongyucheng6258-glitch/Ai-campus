# -*- coding: utf-8 -*-
"""阶段1：环境连通 + 全账号登录 + 基础鉴权"""
import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, __import__("os").path.dirname(__file__))
from harness import *

STUDENTS = [("2021001", "张三"), ("2021002", "李四"), ("2021003", "王五"),
            ("2021004", "赵六"), ("2021005", "陈七")]
tokens = {}

print("=========== 阶段1 认证与连通性 ===========")

# 1.1 学生登录
for no, name in STUDENTS:
    tk, info = login_student(no)
    ok = tk is not None
    tokens[no] = tk
    detail = f"nickname={info.get('nickname') or info.get('user', {}).get('nickname')}" if ok else info
    rec(f"A-{no}", f"学生登录 {name}({no})", ok, detail, "P0")

# 1.2 管理员登录
for u in ["admin", "auditor"]:
    tk, info = login_admin(u)
    ok = tk is not None
    tokens[u] = tk
    rec(f"A-{u}", f"管理员登录 {u}", ok,
        (f"role={info.get('role')}" if ok else info), "P0")

# 1.3 错误密码
c, r = call("POST", "/api/auth/login", body={"studentNo": "2021001", "password": "wrong_pwd"})
rec("A-ERRPWD", "错误密码应拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else r}", "P0")

# 1.4 不存在的账号
c, r = call("POST", "/api/auth/login", body={"studentNo": "9999999", "password": "admin123"})
rec("A-NOUSER", "不存在账号应拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else r}", "P1")

# 1.5 未登录访问受保护接口
c, r = call("GET", "/api/user/info")
rec("A-NOAUTH", "未带token访问/user/info应401", c == 401 or biz(r) == 401,
    f"http={c} code={biz(r)}", "P0")

# 1.6 伪造 token
c, r = call("GET", "/api/user/info", token="eyJhbGciOiJIUzI1NiJ9.fake.sig")
rec("A-FAKETOKEN", "伪造token应拒绝", c == 401 or biz(r) == 401, f"http={c} code={biz(r)}", "P0")

# 1.7 学生 token 访问管理端
c, r = call("GET", "/api/admin/stats/overview", token=tokens["2021001"])
rec("A-CROSS", "学生token访问管理端应拒绝", c in (401, 403) or biz(r) in (401, 403),
    f"http={c} code={biz(r)}", "P0")

# 1.8 用户信息
c, r = call("GET", "/api/user/info", token=tokens["2021001"])
rec("A-USERINFO", "获取当前用户信息", biz(r) == 200, json.dumps(data_of(r), ensure_ascii=False)[:200], "P1")

# 1.9 首页聚合
c, r = call("GET", "/api/home/aggregate", token=tokens["2021001"])
d = data_of(r) or {}
rec("A-HOME", "首页聚合数据", biz(r) == 200,
    f"keys={list(d.keys()) if isinstance(d,dict) else d}", "P1")

with open(__import__("os").path.join(__import__("os").path.dirname(__file__), "tokens.json"), "w", encoding="utf-8") as f:
    json.dump(tokens, f)

dump(__import__("os").path.join(__import__("os").path.dirname(__file__), "r1_auth.json"))
