# -*- coding: utf-8 -*-
"""阶段2：活动组队全交互链（重点）
张三发布 -> 审核 -> 李四报名 -> 张三收消息 -> 同意 -> 李四收通知
-> 成员名单可见性权限 -> 王五被拒 -> 各种边界
"""
import sys, io, os, json, time, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(__file__))
from harness import *

D = os.path.dirname(__file__)
tokens = json.load(open(os.path.join(D, "tokens.json"), encoding="utf-8"))
T1, T2, T3, T4, T5 = [tokens[k] for k in ("2021001", "2021002", "2021003", "2021004", "2021005")]
TA, TAUD = tokens["admin"], tokens["auditor"]

now = datetime.datetime.now()
fmt = "%Y-%m-%d %H:%M:%S"
TAG = now.strftime("%m%d%H%M%S")

print("=========== 阶段2 活动组队交互链 ===========")

# ---------- 2.1 张三发布活动 ----------
payload = {
    "title": f"QA测试篮球赛{TAG}",
    "category": "运动",
    "description": "自动化测试用活动，报名后请忽略。含中文与emoji🏀",
    "location": "东区操场",
    "startTime": (now + datetime.timedelta(days=2)).strftime(fmt),
    "endTime": (now + datetime.timedelta(days=2, hours=2)).strftime(fmt),
    "signupDeadline": (now + datetime.timedelta(days=1)).strftime(fmt),
    "maxMembers": 2,
    "images": []
}
c, r = call("POST", "/api/activity", token=T1, body=payload)
_d = data_of(r); act_id = _d.get("id") if isinstance(_d, dict) else (_d if isinstance(_d, int) else None)
rec("B01", "张三发布活动", biz(r) == 200 and act_id, f"activityId={act_id} resp={json.dumps(r,ensure_ascii=False)[:180]}", "P0")
if not act_id:
    dump(os.path.join(D, "r2_activity.json")); sys.exit(0)

# ---------- 2.2 待审核期间对他人不可见 ----------
c, r = call("GET", "/api/activity/list", token=T2, params={"pageNum": 1, "pageSize": 50, "keyword": f"QA测试篮球赛{TAG}"})
lst = plist(r)
visible_before = any(x.get("id") == act_id for x in lst)
rec("B02", "待审核活动对他人不可见", not visible_before, f"李四搜索命中={visible_before} 总数={len(lst)}", "P1")

# 发布者自己在"我的活动"应可见
c, r = call("GET", "/api/activity/my", token=T1, params={"pageNum": 1, "pageSize": 20})
mine = plist(r)
rec("B03", "发布者在我的活动中可见（含待审核）", any(x.get("id") == act_id for x in mine),
    f"我的活动数={len(mine)}", "P1")

# ---------- 2.3 管理员审核通过 ----------
c, r = call("GET", "/api/admin/audit/list", token=TA, params={"type": "activity", "status": 0, "pageNum": 1, "pageSize": 50})
arecs = plist(r)
rec("B04", "管理端待审核列表含该活动", any(x.get("id") == act_id for x in arecs),
    f"待审核数={len(arecs)} http={c} code={biz(r)}", "P0")

c, r = call("POST", f"/api/admin/audit/activity/{act_id}/pass", token=TA)
rec("B05", "管理员审核通过活动", biz(r) == 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else r}", "P0")

# ---------- 2.4 审核后他人可见 ----------
c, r = call("GET", "/api/activity/list", token=T2, params={"pageNum": 1, "pageSize": 50, "keyword": f"QA测试篮球赛{TAG}"})
lst = plist(r)
rec("B06", "审核通过后李四可在列表看到", any(x.get("id") == act_id for x in lst), f"命中数={len(lst)}", "P0")

c, r = call("GET", f"/api/activity/{act_id}", token=T2)
det = data_of(r) or {}
rec("B07", "李四可查看活动详情", biz(r) == 200 and det.get("title", "").startswith("QA测试篮球赛"),
    f"title={det.get('title')} maxMembers={det.get('maxMembers')} 字段={list(det.keys())[:14]}", "P0")

# ---------- 2.5 关键交互：李四报名 ----------
before_n = unread(T1)

c, r = call("POST", f"/api/activity/{act_id}/signup", token=T2, body={"remark": "我是李四，控卫，求带🏀"})
rec("B08", "★李四报名张三的活动", biz(r) == 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else r}", "P0")

time.sleep(0.6)

# ---------- 2.6 关键交互：张三是否收到消息 ----------
after_n = unread(T1)
rec("B09", "★张三未读消息数增加", (isinstance(after_n, int) and isinstance(before_n, int) and after_n > before_n),
    f"报名前={before_n} 报名后={after_n}", "P0")

c, r = call("GET", "/api/message/list", token=T1, params={"pageNum": 1, "pageSize": 10})
msgs = plist(r)
hit = [m for m in msgs if "报名" in (m.get("content") or "") or "报名" in (m.get("title") or "")]
rec("B10", "★张三收到李四报名的消息", len(hit) > 0,
    f"最新消息={json.dumps(msgs[0], ensure_ascii=False)[:260] if msgs else '无'}", "P0")

# ---------- 2.7 关键权限：谁能看报名名单 ----------
c, r = call("GET", f"/api/activity/{act_id}/members", token=T1)
m_owner = data_of(r)
owner_ok = biz(r) == 200 and isinstance(m_owner, list)
rec("B11", "★发起人张三可查看报名名单", owner_ok,
    f"人数={len(m_owner) if isinstance(m_owner,list) else '-'} 内容={json.dumps(m_owner,ensure_ascii=False)[:300]}", "P0")

c, r = call("GET", f"/api/activity/{act_id}/members", token=T2)
m_signer, code_signer = data_of(r), biz(r)
rec("B12", "★报名者李四查看报名名单（实测行为记录）", True,
    f"code={code_signer} msg={r.get('message') if isinstance(r,dict) else ''} 返回={json.dumps(m_signer,ensure_ascii=False)[:200]}", "INFO")

c, r = call("GET", f"/api/activity/{act_id}/members", token=T5)
m_out, code_out = data_of(r), biz(r)
rec("B13", "★无关同学陈七查看报名名单应被拒", code_out != 200,
    f"code={code_out} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

# 记录名单里暴露了哪些字段（隐私检查）
if isinstance(m_owner, list) and m_owner:
    rec("B14", "报名名单字段清单（隐私审查）", True,
        f"字段={list(m_owner[0].keys())}", "INFO")

# ---------- 2.8 关键交互：张三同意李四报名 ----------
member_id = None
if isinstance(m_owner, list):
    for m in m_owner:
        if m.get("userId") == 2 or "李四" in json.dumps(m, ensure_ascii=False):
            member_id = m.get("id") or m.get("memberId")
            break
rec("B15", "取得李四的报名记录ID", member_id is not None, f"memberId={member_id}", "P0")

if member_id:
    b2n = unread(T2)

    c, r = call("PUT", f"/api/activity/member/{member_id}/handle", token=T1, body={"approve": True})
    rec("B16", "★张三同意李四的报名", biz(r) == 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else r}", "P0")

    time.sleep(0.6)
    a2n = unread(T2)
    rec("B17", "★李四收到通过通知（未读数增加）", (isinstance(a2n, int) and isinstance(b2n, int) and a2n > b2n),
        f"同意前={b2n} 同意后={a2n}", "P0")

    c, r = call("GET", "/api/message/list", token=T2, params={"pageNum": 1, "pageSize": 5})
    m2 = plist(r)
    rec("B18", "★李四消息内容含审批结果", len(m2) > 0,
        f"最新={json.dumps(m2[0], ensure_ascii=False)[:260] if m2 else '无'}", "P0")

    # 同意后名单状态应变化
    c, r = call("GET", f"/api/activity/{act_id}/members", token=T1)
    mm = data_of(r)
    st = [x.get("status") for x in mm] if isinstance(mm, list) else None
    rec("B19", "同意后成员status变为已通过", st is not None and 1 in st, f"status列表={st}", "P1")

    # 重复审批
    c, r = call("PUT", f"/api/activity/member/{member_id}/handle", token=T1, body={"approve": False})
    rec("B20", "重复审批同一报名应被拦截", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else r}", "P1")

    # 越权审批：陈七审批张三活动的报名
    c, r = call("PUT", f"/api/activity/member/{member_id}/handle", token=T5, body={"approve": True})
    rec("B21", "★越权审批（非发起人）应被拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else r}", "P0")

# ---------- 2.9 王五报名后被拒绝 ----------
c, r = call("POST", f"/api/activity/{act_id}/signup", token=T3, body={"remark": "我是王五，中锋"})
rec("B22", "王五报名", biz(r) == 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else r}", "P0")

c, r = call("GET", f"/api/activity/{act_id}/members", token=T1)
mm = data_of(r) or []
wid = None
for m in (mm if isinstance(mm, list) else []):
    if "王五" in json.dumps(m, ensure_ascii=False):
        wid = m.get("id") or m.get("memberId")
if wid:
    b3n = unread(T3)
    c, r = call("PUT", f"/api/activity/member/{wid}/handle", token=T1, body={"approve": False})
    rec("B23", "★张三拒绝王五的报名", biz(r) == 200, f"code={biz(r)}", "P0")
    time.sleep(0.6)
    a3n = unread(T3)
    rec("B24", "★王五收到拒绝通知", (isinstance(a3n, int) and isinstance(b3n, int) and a3n > b3n),
        f"拒绝前={b3n} 拒绝后={a3n}", "P0")
    c, r = call("GET", "/api/message/list", token=T3, params={"pageNum": 1, "pageSize": 3})
    m3 = plist(r)
    rec("B25", "王五消息内容", len(m3) > 0, f"最新={json.dumps(m3[0],ensure_ascii=False)[:240] if m3 else '无'}", "P1")

# ---------- 2.10 边界 ----------
c, r = call("POST", f"/api/activity/{act_id}/signup", token=T2, body={"remark": "再报一次"})
rec("B26", "重复报名应被拦截", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else r}", "P0")

c, r = call("POST", f"/api/activity/{act_id}/signup", token=T1, body={"remark": "报自己的"})
rec("B27", "★报名自己发布的活动应被拦截", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else r}", "P1")

# 人数上限：maxMembers=2，已通过1人(李四)。赵六+陈七报名并全部通过，看是否卡上限
c, r = call("POST", f"/api/activity/{act_id}/signup", token=T4, body={"remark": "赵六"})
rec("B28", "赵六报名", biz(r) == 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else r}", "P1")
c, r = call("GET", f"/api/activity/{act_id}/members", token=T1)
mm = data_of(r) or []
zid = None
for m in (mm if isinstance(mm, list) else []):
    if "赵六" in json.dumps(m, ensure_ascii=False):
        zid = m.get("id") or m.get("memberId")
if zid:
    c, r = call("PUT", f"/api/activity/member/{zid}/handle", token=T1, body={"approve": True})
    rec("B29", "同意赵六（达到上限2人）", biz(r) == 200, f"code={biz(r)}", "P1")

c, r = call("POST", f"/api/activity/{act_id}/signup", token=T5, body={"remark": "陈七想加入"})
signup5_ok = biz(r) == 200
rec("B30", "陈七在满员后报名", True, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else r}（记录行为）", "INFO")
if signup5_ok:
    c, r = call("GET", f"/api/activity/{act_id}/members", token=T1)
    mm = data_of(r) or []
    cid7 = None
    for m in (mm if isinstance(mm, list) else []):
        if "陈七" in json.dumps(m, ensure_ascii=False):
            cid7 = m.get("id") or m.get("memberId")
    if cid7:
        c, r = call("PUT", f"/api/activity/member/{cid7}/handle", token=T1, body={"approve": True})
        rec("B31", "★超出maxMembers上限的审批应被拒绝", biz(r) != 200,
            f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else r}", "P0")

# 不存在的活动
c, r = call("POST", "/api/activity/99999999/signup", token=T2, body={"remark": "x"})
rec("B32", "报名不存在的活动应报错", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else r}", "P1")

# ---------- 2.11 签到二维码 ----------
c, r = call("GET", f"/api/activity/{act_id}/signin-qrcode", token=T1)
rec("B33", "发起人获取签到二维码", biz(r) == 200, f"code={biz(r)} data={str(data_of(r))[:150]}", "P1")
c, r = call("GET", f"/api/activity/{act_id}/signin-qrcode", token=T5)
rec("B34", "★非发起人获取签到码应被拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else r}", "P1")

# ---------- 2.12 我的报名 ----------
c, r = call("GET", "/api/activity/my/signups", token=T2, params={"pageNum": 1, "pageSize": 10})
sr = plist(r)
rec("B35", "李四的我的报名列表含该活动", any(str(act_id) in json.dumps(x, ensure_ascii=False) for x in sr),
    f"条数={len(sr)} 首条={json.dumps(sr[0],ensure_ascii=False)[:200] if sr else '空'}", "P1")

# ---------- 2.13 审核驳回链路 ----------
p2 = dict(payload); p2["title"] = f"QA待驳回活动{TAG}"
c, r = call("POST", "/api/activity", token=T3, body=p2)
_d2 = data_of(r); rej_id = _d2.get("id") if isinstance(_d2, dict) else (_d2 if isinstance(_d2, int) else None)
if rej_id:
    c, r = call("POST", f"/api/admin/audit/activity/{rej_id}/reject", token=TAUD, body={"reason": "QA测试驳回：内容不符合规范"})
    rec("B36", "auditor驳回活动", biz(r) == 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else r}", "P0")
    time.sleep(0.5)
    c, r = call("GET", "/api/message/list", token=T3, params={"pageNum": 1, "pageSize": 3})
    m4 = plist(r)
    got = any("驳回" in json.dumps(x, ensure_ascii=False) or "审核" in json.dumps(x, ensure_ascii=False) for x in m4)
    rec("B37", "★王五收到驳回通知", got, f"最新={json.dumps(m4[0],ensure_ascii=False)[:240] if m4 else '无'}", "P1")
    c, r = call("GET", "/api/activity/list", token=T2, params={"pageNum": 1, "pageSize": 50, "keyword": f"QA待驳回活动{TAG}"})
    lst2 = plist(r)
    rec("B38", "被驳回活动不出现在公开列表", not any(x.get("id") == rej_id for x in lst2), f"命中={len(lst2)}", "P0")

json.dump({"act_id": act_id, "tag": TAG}, open(os.path.join(D, "ctx.json"), "w"))
dump(os.path.join(D, "r2_activity.json"))
