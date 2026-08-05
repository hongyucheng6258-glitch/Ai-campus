# -*- coding: utf-8 -*-
"""阶段5：管理后台 + 端到端联动（公告/举报/封禁/重置密码/统计/角色权限）"""
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

print("=========== 阶段5-A 公告：管理端发布 → 学生端可见 ===========")
c, r = call("POST", "/api/admin/notice", token=TA, body={"title": f"QA公告{TAG}", "content": "这是自动化测试公告内容，含中文与emoji📢", "cover": None})
nid = newid(r)
rec("K01", "管理员创建公告", biz(r) == 200 and nid, f"noticeId={nid} code={biz(r)}", "P0")

if nid:
    c, r = call("GET", "/api/notice/list", token=T1, params={"pageNum": 1, "pageSize": 30})
    rec("K02", "未发布公告学生端不可见", not any(x.get("id") == nid for x in plist(r)), f"学生可见数={len(plist(r))}", "P0")
    c, r = call("PUT", f"/api/admin/notice/{nid}/publish", token=TA)
    rec("K03", "发布公告", biz(r) == 200, f"code={biz(r)}", "P0")
    c, r = call("GET", "/api/notice/list", token=T1, params={"pageNum": 1, "pageSize": 30})
    rec("K04", "★发布后学生端可见", any(x.get("id") == nid for x in plist(r)), f"学生可见数={len(plist(r))}", "P0")
    c, r = call("GET", f"/api/notice/{nid}", token=T1)
    rec("K05", "学生查看公告详情", biz(r) == 200 and (data_of(r) or {}).get("title") == f"QA公告{TAG}",
        f"title={(data_of(r) or {}).get('title')} viewCount={(data_of(r) or {}).get('viewCount')}", "P0")
    c, r = call("GET", "/api/home/aggregate", token=T1)
    hn = (data_of(r) or {}).get("notices") or []
    rec("K06", "★首页聚合包含新公告", any(x.get("id") == nid for x in hn), f"首页公告数={len(hn)}", "P1")
    c, r = call("PUT", f"/api/admin/notice/{nid}", token=TA, body={"title": f"QA公告{TAG}-已修改", "content": "修改后的内容", "cover": None})
    rec("K07", "编辑公告", biz(r) == 200, f"code={biz(r)}", "P1")
    c, r = call("PUT", f"/api/admin/notice/{nid}/offline", token=TA)
    rec("K08", "下线公告", biz(r) == 200, f"code={biz(r)}", "P1")
    c, r = call("GET", "/api/notice/list", token=T1, params={"pageNum": 1, "pageSize": 30})
    rec("K09", "★下线后学生端不可见", not any(x.get("id") == nid for x in plist(r)), f"学生可见数={len(plist(r))}", "P0")

print("\n=========== 阶段5-B 举报链路 ===========")
# 找一条已通过审核的动态作为举报对象
c, r = call("GET", "/api/post/list", token=T2, params={"pageNum": 1, "pageSize": 5})
posts = plist(r)
target = next((p for p in posts if p.get("userId") != 2), None)
if target:
    c, r = call("POST", "/api/report", token=T2, body={
        "targetType": "post", "targetId": target["id"], "reasonType": "垃圾广告", "reason": f"QA举报测试{TAG}"})
    rep_ok = biz(r) == 200
    rec("L01", "★李四举报一条动态", rep_ok, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
    c, r = call("POST", "/api/report", token=T2, body={
        "targetType": "post", "targetId": target["id"], "reasonType": "垃圾广告", "reason": "重复举报"})
    rec("L02", "重复举报行为", True, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}（记录）", "INFO")

    c, r = call("GET", "/api/admin/report/list", token=TA, params={"pageNum": 1, "pageSize": 20, "status": 0})
    rl = plist(r)
    mine = [x for x in rl if f"QA举报测试{TAG}" in json.dumps(x, ensure_ascii=False)]
    rec("L03", "★管理端可见该举报", len(mine) > 0, f"待处理举报数={len(rl)} 首条={json.dumps(rl[0],ensure_ascii=False)[:220] if rl else ''}", "P0")

    if mine:
        rid = mine[0]["id"]
        c, r = call("POST", f"/api/admin/report/{rid}/handle", token=TA, body={"action": "offline", "handleResult": f"QA处理：内容已下架{TAG}"})
        rec("L04", "★管理员处理举报（下架内容）", biz(r) == 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
        c, r = call("GET", "/api/post/list", token=T3, params={"pageNum": 1, "pageSize": 30})
        still = any(x.get("id") == target["id"] for x in plist(r))
        rec("L05", "★被举报下架的动态对学生不可见", not still, f"仍可见={still}", "P0")
        time.sleep(0.4)
        c, r = call("GET", "/api/message/list", token=T2, params={"pageNum": 1, "pageSize": 3})
        rec("L06", "举报人是否收到处理结果通知", True,
            f"最新={json.dumps(plist(r)[0],ensure_ascii=False)[:220] if plist(r) else '无'}（记录）", "INFO")

print("\n=========== 阶段5-C 用户管理联动 ===========")
c, r = call("GET", "/api/admin/user/list", token=TA, params={"pageNum": 1, "pageSize": 20})
ul = plist(r)
rec("M01", "用户列表", biz(r) == 200 and len(ul) >= 5, f"用户数={len(ul)} 字段={list(ul[0].keys()) if ul else ''}", "P0")
rec("M02", "★用户列表不返回密码哈希", not any("password" in json.dumps(u, ensure_ascii=False).lower() for u in ul),
    f"抽样={json.dumps(ul[0],ensure_ascii=False)[:200] if ul else ''}", "P0")

# 封禁陈七 → 其 token 应失效
u5 = next((u for u in ul if u.get("studentNo") == "2021005"), None)
if u5:
    c, r = call("PUT", f"/api/admin/user/{u5['id']}/status", token=TA, body={"status": 1})
    rec("M03", "★封禁陈七", biz(r) == 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
    time.sleep(0.4)
    c, r = call("GET", "/api/user/info", token=T5)
    rec("M04", "★封禁后陈七原token失效", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
    t5b, info = login_student("2021005")
    rec("M05", "★封禁后陈七无法重新登录", t5b is None, f"{'仍可登录(异常)' if t5b else info}", "P0")
    c, r = call("PUT", f"/api/admin/user/{u5['id']}/status", token=TA, body={"status": 0})
    rec("M06", "解封陈七", biz(r) == 200, f"code={biz(r)}", "P0")
    time.sleep(0.4)
    t5c, _ = login_student("2021005")
    rec("M07", "★解封后陈七恢复登录", t5c is not None, "登录成功" if t5c else "仍不可登录", "P0")
    if t5c:
        tk["2021005"] = t5c
        json.dump(tk, open(os.path.join(D, "tokens.json"), "w"))

    # 重置密码
    c, r = call("PUT", f"/api/admin/user/{u5['id']}/reset-password", token=TA)
    reset_ok = biz(r) == 200
    rec("M08", "管理员重置陈七密码", reset_ok, f"code={biz(r)} data={data_of(r)}", "P0")
    if reset_ok:
        newpwd = None
        d = data_of(r)
        if isinstance(d, str): newpwd = d
        elif isinstance(d, dict): newpwd = d.get("password") or d.get("newPassword")
        for cand in ([newpwd] if newpwd else []) + ["123456", "admin123", "888888"]:
            if not cand: continue
            t, _ = login_student("2021005", cand)
            if t:
                rec("M09", "★重置后的新密码可登录", True, f"新密码='{cand}'", "P0")
                c, r = call("PUT", "/api/user/password", token=t, body={"oldPassword": cand, "newPassword": "admin123"})
                rec("M10", "还原陈七密码为admin123", biz(r) == 200, f"code={biz(r)}", "P0")
                t5d, _ = login_student("2021005", "admin123")
                if t5d:
                    tk["2021005"] = t5d; json.dump(tk, open(os.path.join(D, "tokens.json"), "w"))
                break
        else:
            rec("M09", "★重置后的新密码可登录", False, f"未能用 {newpwd}/123456/admin123/888888 登录，需人工确认重置规则", "P0")

print("\n=========== 阶段5-D 统计报表 ===========")
for name, path in [("总览", "/api/admin/stats/overview"), ("趋势", "/api/admin/stats/trend"),
                   ("模块", "/api/admin/stats/module"), ("饼图", "/api/admin/stats/pie")]:
    c, r = call("GET", path, token=TA)
    rec(f"N-{name}", f"统计-{name}", biz(r) == 200 and data_of(r) is not None,
        f"code={biz(r)} data={json.dumps(data_of(r),ensure_ascii=False)[:230]}", "P1")

print("\n=========== 阶段5-E 系统管理与角色权限 ===========")
c, r = call("GET", "/api/admin/system/admin", token=TA, params={"pageNum": 1, "pageSize": 10})
rec("O01", "管理员账号列表", biz(r) == 200, f"条数={len(plist(r))}", "P1")
c, r = call("GET", "/api/admin/system/admin", token=TAUD, params={"pageNum": 1, "pageSize": 10})
rec("O02", "★auditor访问系统管理（角色隔离检查）", True, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}（记录）", "INFO")
c, r = call("POST", "/api/admin/system/admin", token=TAUD, body={"username": f"qa_test_{TAG}", "password": "admin123", "nickname": "QA测试", "role": "admin"})
created_by_auditor = biz(r) == 200
rec("O03", "★auditor创建管理员账号", True, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}（记录：{'允许' if created_by_auditor else '拒绝'}）", "INFO")
if created_by_auditor:
    _id = newid(r)
    if _id:
        call("PUT", f"/api/admin/system/admin/{_id}", token=TA, body={"username": f"qa_test_{TAG}", "password": "", "nickname": "QA测试(禁用)", "role": "auditor"})

c, r = call("GET", "/api/admin/ai/config", token=TA)
cfg = data_of(r)
rec("O04", "AI配置读取", biz(r) == 200, f"条数={len(cfg) if isinstance(cfg,list) else '-'}", "P1")
leak = json.dumps(cfg, ensure_ascii=False) if cfg else ""
rec("O05", "★AI配置中的api_key是否脱敏", ("sk-" not in leak) or ("****" in leak) or ('"api_key"' not in leak),
    f"片段={leak[:260]}", "P1")
c, r = call("GET", "/api/admin/ai/prompts", token=TA)
rec("O06", "提示词模板列表", biz(r) == 200, f"条数={len(data_of(r)) if isinstance(data_of(r),list) else len(plist(r))}", "P1")
c, r = call("GET", "/api/admin/ai/logs", token=TA, params={"pageNum": 1, "pageSize": 10})
rec("O07", "AI调用日志", biz(r) == 200, f"条数={len(plist(r))}", "P1")

dump(os.path.join(D, "r5.json"))
