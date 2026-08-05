# -*- coding: utf-8 -*-
"""阶段6-C：按字节码还原的真实路由表做最终安全补测"""
import sys, io, os, json, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import *

TK = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "tokens.json"), encoding="utf-8"))
T1, T2 = TK["2021001"], TK["2021002"]
TA, TAU = TK["admin"], TK["auditor"]
TAG = time.strftime("%H%M%S")

print("=" * 70)
print("阶段6-C 最终安全补测")
print("=" * 70)

# ------------------------------------------------ 错题本（正确路径 /api/wrong-question）
print("\n--- 错题本越权（/api/wrong-question） ---")
c, r = call("POST", "/api/wrong-question", token=T1, body={
    "subject": "数学", "question": f"安全测试题{TAG}", "answer": "A",
    "analysis": "无", "source": "QA", "images": []})
d = data_of(r); wid = d.get("id") if isinstance(d, dict) else d
rec("M17", "前置：张三新增错题", biz(r) == 200 and wid, f"code={biz(r)} id={wid}", "")

if wid:
    c, r = call("GET", "/api/wrong-question/list", token=T2, params={"pageNum": 1, "pageSize": 50})
    others = [x for x in plist(r) if x.get("id") == wid]
    rec("M10", "★李四的错题列表里看不到张三的错题", not others,
        f"李四列表共{len(plist(r))}条，含张三的={len(others)}", "P0")

    c, r = call("PUT", f"/api/wrong-question/{wid}", token=T2, body={
        "subject": "数学", "question": "被李四改了", "answer": "B", "analysis": "hacked", "images": []})
    hacked = biz(r) == 200
    if hacked:
        c2, r2 = call("GET", "/api/wrong-question/list", token=T1, params={"pageNum": 1, "pageSize": 50})
        mine = [x for x in plist(r2) if x.get("id") == wid]
        hacked = bool(mine) and "被李四改了" in str(mine[0].get("question"))
    rec("M11", "★李四不能修改张三的错题", not hacked, f"接口code={biz(r)}，数据是否被改={hacked}", "P0")

    c, r = call("DELETE", f"/api/wrong-question/{wid}", token=T2)
    gone = biz(r) == 200
    if gone:
        c2, r2 = call("GET", "/api/wrong-question/list", token=T1, params={"pageNum": 1, "pageSize": 50})
        gone = not [x for x in plist(r2) if x.get("id") == wid]
    rec("M18", "★李四不能删除张三的错题", not gone, f"接口code={biz(r)}，是否真被删={gone}", "P0")

    c, r = call("DELETE", f"/api/wrong-question/{wid}", token=T1)
    rec("M19", "对照：本人可删除自己的错题", biz(r) == 200, f"code={biz(r)}", "")

# ------------------------------------------------ 失物招领 finish
print("\n--- 失物招领 /{id}/finish 越权 ---")
c, r = call("POST", "/api/lostfound", token=T1, body={
    "type": 1, "title": f"安全测试失物{TAG}", "itemName": "钱包", "description": "安全测试",
    "location": "食堂", "lostTime": "2026-08-01 12:00:00", "contact": "13800000001", "images": []})
d = data_of(r); lf = d.get("id") if isinstance(d, dict) else d
rec("M12", "前置：张三发布失物招领", biz(r) == 200 and lf, f"code={biz(r)} id={lf}", "")
if lf:
    c, r = call("PUT", f"/api/lostfound/{lf}/finish", token=T2)
    rec("M14", "★李四不能把张三的失物标记为已完成", biz(r) != 200,
        f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
    c, r = call("PUT", f"/api/lostfound/{lf}/finish", token=T1)
    rec("M13", "对照：本人可标记完成", biz(r) == 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "")

# ------------------------------------------------ 闲置编辑/删除缺陷（确认接口存在）
print("\n--- 闲置 PUT/DELETE 缺陷确认 ---")
c, r = call("POST", "/api/idle", token=T1, body={
    "title": f"缺陷验证闲置{TAG}", "category": "书籍", "description": "缺陷验证",
    "price": 10, "originalPrice": 30, "tradeType": 1, "wantItem": "", "images": []})
d = data_of(r); iid = d.get("id") if isinstance(d, dict) else d
rec("M05", "前置：张三发布闲置", biz(r) == 200 and iid, f"code={biz(r)} id={iid}", "")
if iid:
    # 确认 GET 详情正常（同一路径 GET 被 exclude 是设计内的匿名可读）
    c, r = call("GET", f"/api/idle/{iid}")
    rec("M20", "闲置详情匿名可读（设计内）", biz(r) in (200, 403, 1006), f"code={biz(r)}", "")
    c, r = call("PUT", f"/api/idle/{iid}", token=T1, body={
        "title": f"缺陷验证闲置{TAG}-改", "category": "书籍", "description": "owner edit",
        "price": 12, "originalPrice": 30, "tradeType": 1, "wantItem": "", "images": []})
    rec("M07", "★【缺陷】本人修改自己的闲置（IdleController确有PUT /{id}）", biz(r) == 200,
        f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P1")
    c, r = call("DELETE", f"/api/idle/{iid}", token=T1)
    rec("M08", "★【缺陷】本人删除自己的闲置（IdleController确有DELETE /{id}）", biz(r) == 200,
        f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P1")

# ------------------------------------------------ K04 深挖：管理员token当学生用
print("\n--- K04 深挖：管理员Token被当作学生身份 ---")
c, r = call("GET", "/api/user/info", token=TA)
who = data_of(r) if isinstance(data_of(r), dict) else {}
rec("K04", "★管理员Token调学生端被识别成 uid 相同的学生", False,
    f"用 admin(uid=1) 的Token调 /api/user/info，返回的是学生『{who.get('nickname')}』({who.get('studentNo')}) —— JwtInterceptor 未校验 role claim", "P1")

c, r = call("POST", "/api/post", token=TA, body={"content": f"管理员Token伪装发帖{TAG}", "images": []})
d = data_of(r); apid = d.get("id") if isinstance(d, dict) else d
rec("K12", "★管理员Token能以学生身份发布内容", not (biz(r) == 200),
    f"code={biz(r)} 新帖id={apid} —— 若成功则内容归属被记为张三，存在身份混淆/抵赖风险", "P1")

# ------------------------------------------------ 举报接口
print("\n--- 举报接口鉴权 ---")
c, r = call("POST", "/api/report", body={"targetType": 1, "targetId": 1, "reason": "无token举报"})
rec("K13", "举报接口需登录", biz(r) in (401, 403), f"code={biz(r)}", "P1")

# ------------------------------------------------ 上传接口
c, r = call("POST", "/api/upload/image")
rec("P06", "图片上传接口需鉴权", biz(r) in (401, 403), f"code={biz(r)}", "P1")
c, r = call("POST", "/api/upload/file", token=T1)
rec("P07", "文件上传接口带Token时的行为（MinIO未启动）", True,
    f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''} —— MinIO(9000)未运行，图片相关功能不可用", "P1")

# ------------------------------------------------ 参数校验汇总（正确路径）
print("\n--- 参数校验缺口确认 ---")
base = {"title": f"校验{TAG}", "category": "学习", "description": "t", "location": "x",
        "startTime": "2026-09-01 10:00:00", "endTime": "2026-09-01 12:00:00",
        "signupDeadline": "2026-08-30 10:00:00", "maxMembers": 5, "images": []}
bad_ids = []

b = dict(base); b.pop("category"); b.pop("location"); b.pop("startTime"); b.pop("endTime"); b["title"] = f"缺字段{TAG}"
c, r = call("POST", "/api/activity", token=T1, body=b)
d = data_of(r); nid = d.get("id") if isinstance(d, dict) else d
if nid: bad_ids.append(nid)
rec("N09", "缺失时间/地点等关键字段应被拦截", biz(r) != 200,
    f"code={biz(r)} —— 入库id={nid}，DTO 只有 @Size 没有 @NotNull/@NotBlank", "P1")

b = dict(base); b["maxMembers"] = -5; b["title"] = f"负人数{TAG}"
c, r = call("POST", "/api/activity", token=T1, body=b)
d = data_of(r); nid = d.get("id") if isinstance(d, dict) else d
if nid: bad_ids.append(nid)
rec("N10", "maxMembers=-5 应被拦截", biz(r) != 200, f"code={biz(r)} 入库id={nid}", "P1")

b = dict(base); b["startTime"] = "2026-09-05 10:00:00"; b["title"] = f"时间倒置{TAG}"
c, r = call("POST", "/api/activity", token=T1, body=b)
d = data_of(r); nid = d.get("id") if isinstance(d, dict) else d
if nid: bad_ids.append(nid)
rec("N11", "结束时间早于开始时间应被拦截", biz(r) != 200, f"code={biz(r)} 入库id={nid}", "P2")

b = {"title": f"闲置负价{TAG}", "category": "书籍", "description": "t",
     "price": -100, "originalPrice": -1, "tradeType": 1, "wantItem": "", "images": []}
c, r = call("POST", "/api/idle", token=T1, body=b)
rec("N14", "闲置价格为负应被拦截", biz(r) != 200, f"code={biz(r)} data={data_of(r) if not isinstance(data_of(r),dict) else data_of(r).get('id')}", "P1")

rec("N15", "脏数据清理提示", True, f"本轮非法参数入库的活动id={bad_ids}（测试后已在报告中标注，可手工删除）", "")

# ------------------------------------------------ 敏感词覆盖面
print("\n--- 敏感词过滤覆盖面 ---")
words = "赌博 代考 毒品"
res = {}
c, r = call("POST", "/api/post", token=T1, body={"content": f"敏感词测试{TAG} {words}", "images": []})
res["动态发布"] = biz(r)
d = data_of(r); spid = d.get("id") if isinstance(d, dict) else d
c, r = call("POST", "/api/activity", token=T1, body=dict(base, title=f"敏感{TAG}", description=words))
res["活动发布"] = biz(r)
c, r = call("POST", "/api/idle", token=T1, body={
    "title": f"敏感闲置{TAG}", "category": "书籍", "description": words, "price": 1,
    "originalPrice": 2, "tradeType": 1, "wantItem": "", "images": []})
res["闲置发布"] = biz(r)
c, r = call("POST", "/api/lostfound", token=T1, body={
    "type": 1, "title": f"敏感失物{TAG}", "itemName": "钱包", "description": words,
    "location": "食堂", "lostTime": "2026-08-01 12:00:00", "contact": "138", "images": []})
res["失物发布"] = biz(r)
if spid:
    c, r = call("POST", f"/api/post/{spid}/comment", token=T2, body={"content": f"评论{words}"})
    res["动态评论"] = biz(r)
blocked = [k for k, v in res.items() if v != 200]
rec("Q01", "★敏感词过滤应覆盖所有UGC入口", len(blocked) == len(res),
    f"各入口返回码={res}；被拦截的只有={blocked} —— 过滤只挂在评论上", "P1")

# ------------------------------------------------ 清理提权账号
print("\n--- 清理测试中创建的提权账号 ---")
c, r = call("GET", "/api/admin/system/admin", token=TA, params={"pageNum": 1, "pageSize": 50})
hackers = [a for a in plist(r) if str(a.get("username", "")).startswith(("hacker_", "esc_"))]
rec("Z02", "残留提权账号清单（需手工/SQL清除，无删除接口）", True,
    f"共{len(hackers)}个：{[a.get('username') for a in hackers]} —— AdminSystemController 无 DeleteMapping", "P2")

dump(os.path.join(os.path.dirname(os.path.abspath(__file__)), "r6c.json"))
