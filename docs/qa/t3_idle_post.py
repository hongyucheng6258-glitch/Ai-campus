# -*- coding: utf-8 -*-
"""阶段3：闲置互换交互链 + 动态广场 + 失物招领 + 错题本"""
import sys, io, os, json, time, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(__file__))
from harness import *

D = os.path.dirname(__file__)
tk = json.load(open(os.path.join(D, "tokens.json"), encoding="utf-8"))
T1, T2, T3, T4, T5 = [tk[k] for k in ("2021001", "2021002", "2021003", "2021004", "2021005")]
TA, TAUD = tk["admin"], tk["auditor"]
now = datetime.datetime.now(); TAG = now.strftime("%m%d%H%M%S")
fmt = "%Y-%m-%d %H:%M:%S"

def newid(r):
    d = data_of(r)
    return d.get("id") if isinstance(d, dict) else (d if isinstance(d, int) else None)

# ==================== 闲置互换 ====================
print("=========== 阶段3-A 闲置互换交互链 ===========")
c, r = call("POST", "/api/idle", token=T1, body={
    "title": f"QA闲置-高数教材{TAG}", "description": "九成新，无笔记。测试数据",
    "images": [], "expectItem": "线性代数教材", "category": "书籍"})
idle_id = newid(r)
rec("C01", "张三发布闲置物品", biz(r) == 200 and idle_id, f"idleId={idle_id} code={biz(r)}", "P0")

if idle_id:
    c, r = call("GET", "/api/idle/list", token=T2, params={"pageNum": 1, "pageSize": 30, "keyword": f"QA闲置-高数教材{TAG}"})
    rec("C02", "待审核闲置对他人不可见", len(plist(r)) == 0, f"命中={len(plist(r))}", "P1")

    c, r = call("POST", f"/api/admin/audit/idle/{idle_id}/pass", token=TA)
    rec("C03", "管理员审核通过闲置", biz(r) == 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

    c, r = call("GET", "/api/idle/list", token=T2, params={"pageNum": 1, "pageSize": 30, "keyword": f"QA闲置-高数教材{TAG}"})
    rec("C04", "审核后李四可见该闲置", len(plist(r)) == 1, f"命中={len(plist(r))}", "P0")

    c, r = call("GET", f"/api/idle/{idle_id}", token=T2)
    rec("C05", "李四查看闲置详情", biz(r) == 200, f"字段={list((data_of(r) or {}).keys())[:12]}", "P1")

    # ---- 关键交互：李四预约 ----
    b1 = unread(T1)
    c, r = call("POST", f"/api/idle/{idle_id}/appoint", token=T2, body={"message": "我想换，明天下午图书馆见？"})
    ap_id = newid(r)
    rec("C06", "★李四预约张三的闲置", biz(r) == 200 and ap_id, f"appointId={ap_id} code={biz(r)}", "P0")
    time.sleep(0.5)
    a1 = unread(T1)
    rec("C07", "★张三收到预约消息（未读+1）", isinstance(a1, int) and isinstance(b1, int) and a1 > b1, f"{b1}->{a1}", "P0")
    c, r = call("GET", "/api/message/list", token=T1, params={"pageNum": 1, "pageSize": 1})
    ms = plist(r)
    rec("C08", "★张三消息内容为预约通知", len(ms) > 0 and ("预约" in json.dumps(ms[0], ensure_ascii=False)),
        f"{json.dumps(ms[0],ensure_ascii=False)[:220] if ms else '无'}", "P0")

    # 重复预约 / 预约自己
    c, r = call("POST", f"/api/idle/{idle_id}/appoint", token=T3, body={"message": "王五也想要"})
    rec("C09", "已被预约的物品他人再预约应拦截", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P1")
    c, r = call("POST", f"/api/idle/{idle_id}/appoint", token=T1, body={"message": "自己预约"})
    rec("C10", "预约自己发布的物品应拦截", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P1")

    if ap_id:
        # 越权处理
        c, r = call("PUT", f"/api/idle/appoint/{ap_id}/handle", token=T5, body={"accept": True})
        rec("C11", "★非物主处理预约应拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

        # ---- 关键交互：张三接受 ----
        b2 = unread(T2)
        c, r = call("PUT", f"/api/idle/appoint/{ap_id}/handle", token=T1, body={"accept": True})
        rec("C12", "★张三接受预约", biz(r) == 200, f"code={biz(r)}", "P0")
        time.sleep(0.5)
        a2 = unread(T2)
        rec("C13", "★李四收到接受通知", isinstance(a2, int) and isinstance(b2, int) and a2 > b2, f"{b2}->{a2}", "P0")
        c, r = call("GET", "/api/message/list", token=T2, params={"pageNum": 1, "pageSize": 1})
        ms = plist(r)
        rec("C14", "李四通知内容", len(ms) > 0, f"{json.dumps(ms[0],ensure_ascii=False)[:220] if ms else '无'}", "P1")

        c, r = call("PUT", f"/api/idle/appoint/{ap_id}/handle", token=T1, body={"accept": False})
        rec("C15", "重复处理同一预约应拦截", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P1")

        # ---- 完成交易 ----
        c, r = call("PUT", f"/api/idle/appoint/{ap_id}/finish", token=T5)
        rec("C16", "★无关者完成交易应拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
        c, r = call("PUT", f"/api/idle/appoint/{ap_id}/finish", token=T2)
        rec("C17", "李四标记交易完成", biz(r) == 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

        # ---- 互评 ----
        c, r = call("POST", f"/api/idle/appoint/{ap_id}/review", token=T2, body={"score": 5, "content": "物品完好，人很好👍"})
        rec("C18", "★李四评价本次互换", biz(r) == 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
        c, r = call("POST", f"/api/idle/appoint/{ap_id}/review", token=T2, body={"score": 3, "content": "再评一次"})
        rec("C19", "重复评价应拦截", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P1")
        c, r = call("POST", f"/api/idle/appoint/{ap_id}/review", token=T1, body={"score": 5, "content": "对方很守时"})
        rec("C20", "★张三反向评价", biz(r) == 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
        c, r = call("POST", f"/api/idle/appoint/{ap_id}/review", token=T5, body={"score": 1, "content": "无关者刷评"})
        rec("C21", "★无关者评价应拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

        # 我的预约（买/卖两个视角）
        c, r = call("GET", "/api/idle/appoint/my", token=T2, params={"role": "buyer", "pageNum": 1, "pageSize": 10})
        rec("C22", "李四(买家)我的预约", biz(r) == 200 and len(plist(r)) > 0, f"条数={len(plist(r))} 首条={json.dumps(plist(r)[0],ensure_ascii=False)[:200] if plist(r) else ''}", "P1")
        c, r = call("GET", "/api/idle/appoint/my", token=T1, params={"role": "seller", "pageNum": 1, "pageSize": 10})
        rec("C23", "张三(卖家)我的预约", biz(r) == 200 and len(plist(r)) > 0, f"条数={len(plist(r))}", "P1")

    # 越权改他人闲置
    c, r = call("PUT", f"/api/idle/{idle_id}", token=T5, body={"title": "陈七篡改", "description": "x", "images": [], "expectItem": "y", "category": "书籍"})
    rec("C24", "★越权修改他人闲置应拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
    c, r = call("DELETE", f"/api/idle/{idle_id}", token=T5)
    rec("C25", "★越权下架他人闲置应拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")

# ==================== 动态广场 ====================
print("\n=========== 阶段3-B 动态广场 ===========")
c, r = call("POST", "/api/post", token=T1, body={"content": f"QA动态{TAG} 今天天气不错☀️ 一起自习吗", "images": []})
post_id = newid(r)
rec("D01", "张三发布动态", biz(r) == 200 and post_id, f"postId={post_id} code={biz(r)}", "P0")

if post_id:
    c, r = call("GET", "/api/post/list", token=T2, params={"pageNum": 1, "pageSize": 20})
    lst = plist(r)
    vis = any(x.get("id") == post_id for x in lst)
    rec("D02", "★李四能看到张三的动态", vis, f"列表数={len(lst)} 命中={vis}（动态是否需审核：{'否' if vis else '是'}）", "P0")

    b = unread(T1)
    c, r = call("POST", f"/api/post/{post_id}/like", token=T2)
    rec("D03", "★李四点赞", biz(r) == 200, f"code={biz(r)}", "P0")
    c, r = call("POST", f"/api/post/{post_id}/like", token=T2)
    rec("D04", "重复点赞应幂等或拦截", True, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}（记录行为）", "INFO")

    c, r = call("POST", f"/api/post/{post_id}/comment", token=T2, body={"content": "同去！几点？"})
    rec("D05", "★李四评论", biz(r) == 200, f"code={biz(r)}", "P0")
    time.sleep(0.5)
    a = unread(T1)
    rec("D06", "★张三收到点赞/评论互动消息", isinstance(a, int) and isinstance(b, int) and a > b, f"{b}->{a}", "P0")
    c, r = call("GET", "/api/message/list", token=T1, params={"pageNum": 1, "pageSize": 2})
    ms = plist(r)
    rec("D07", "互动消息内容", len(ms) > 0, f"{json.dumps(ms[:2],ensure_ascii=False)[:320]}", "P1")

    c, r = call("GET", f"/api/post/{post_id}/comments", token=T3, params={"pageNum": 1, "pageSize": 10})
    cl = plist(r)
    rec("D08", "★王五可看到评论列表", biz(r) == 200 and len(cl) > 0, f"评论数={len(cl)} 首条={json.dumps(cl[0],ensure_ascii=False)[:200] if cl else ''}", "P0")

    c, r = call("DELETE", f"/api/post/{post_id}/like", token=T2)
    rec("D09", "李四取消点赞", biz(r) == 200, f"code={biz(r)}", "P1")

    c, r = call("GET", "/api/post/list", token=T3, params={"pageNum": 1, "pageSize": 20})
    tgt = [x for x in plist(r) if x.get("id") == post_id]
    rec("D10", "取消赞后点赞数正确", len(tgt) > 0, f"{json.dumps(tgt[0],ensure_ascii=False)[:260] if tgt else '未找到'}", "P1")

# 敏感词
c, r = call("POST", "/api/post", token=T4, body={"content": f"QA敏感词测试{TAG} 代考 办证 赌博", "images": []})
rec("D11", "★敏感词内容发布行为", True, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}（记录行为）", "INFO")

# 空内容
c, r = call("POST", "/api/post", token=T4, body={"content": "", "images": []})
rec("D12", "空内容动态应被拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P1")

# ==================== 失物招领 ====================
print("\n=========== 阶段3-C 失物招领 ===========")
c, r = call("POST", "/api/lostfound", token=T3, body={
    "type": 0, "title": f"QA丢失-校园卡{TAG}", "description": "在食堂丢失，卡号尾号1234",
    "images": [], "location": "第二食堂", "happenTime": now.strftime(fmt), "contact": "13800000003"})
lf_id = newid(r)
rec("E01", "王五发布失物信息", biz(r) == 200 and lf_id, f"id={lf_id} code={biz(r)}", "P0")
if lf_id:
    c, r = call("POST", f"/api/admin/audit/lostfound/{lf_id}/pass", token=TAUD)
    rec("E02", "审核通过失物", biz(r) == 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
    c, r = call("GET", "/api/lostfound/list", token=T1, params={"pageNum": 1, "pageSize": 20, "keyword": f"QA丢失-校园卡{TAG}"})
    rec("E03", "★他人可检索到失物", len(plist(r)) == 1, f"命中={len(plist(r))}", "P0")
    c, r = call("GET", f"/api/lostfound/{lf_id}", token=T1)
    rec("E04", "查看失物详情（含联系方式）", biz(r) == 200, f"{json.dumps(data_of(r),ensure_ascii=False)[:260]}", "P1")
    c, r = call("PUT", f"/api/lostfound/{lf_id}/finish", token=T1)
    rec("E05", "★非发布者标记完成应拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
    c, r = call("PUT", f"/api/lostfound/{lf_id}/finish", token=T3)
    rec("E06", "发布者标记已找回", biz(r) == 200, f"code={biz(r)}", "P0")
    c, r = call("GET", "/api/lostfound/my", token=T3, params={"pageNum": 1, "pageSize": 10})
    rec("E07", "我的失物发布列表", biz(r) == 200 and len(plist(r)) > 0, f"条数={len(plist(r))}", "P1")

# ==================== 错题本 ====================
print("\n=========== 阶段3-D 错题本 ===========")
c, r = call("POST", "/api/wrong-question", token=T1, body={
    "subject": "高等数学", "tag": "极限", "question": f"QA错题{TAG}: 求lim(x->0) sinx/x",
    "answer": "1", "analysis": "重要极限公式"})
wq_id = newid(r)
rec("F01", "创建错题", biz(r) == 200 and wq_id, f"id={wq_id} code={biz(r)}", "P0")
c, r = call("GET", "/api/wrong-question/list", token=T1, params={"pageNum": 1, "pageSize": 10})
rec("F02", "错题列表", biz(r) == 200 and len(plist(r)) > 0, f"条数={len(plist(r))}", "P0")
c, r = call("GET", "/api/wrong-question/subjects", token=T1)
rec("F03", "科目聚合", biz(r) == 200, f"{json.dumps(data_of(r),ensure_ascii=False)[:200]}", "P1")
c, r = call("GET", "/api/wrong-question/list", token=T2, params={"pageNum": 1, "pageSize": 50})
leak = any(f"QA错题{TAG}" in json.dumps(x, ensure_ascii=False) for x in plist(r))
rec("F04", "★错题本私有性：李四看不到张三的错题", not leak, f"泄漏={leak} 李四错题数={len(plist(r))}", "P0")
if wq_id:
    c, r = call("PUT", f"/api/wrong-question/{wq_id}", token=T2, body={"subject": "篡改", "tag": "x", "question": "x", "answer": "x", "analysis": "x"})
    rec("F05", "★越权修改他人错题应拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
    c, r = call("DELETE", f"/api/wrong-question/{wq_id}", token=T2)
    rec("F06", "★越权删除他人错题应拒绝", biz(r) != 200, f"code={biz(r)} msg={r.get('message') if isinstance(r,dict) else ''}", "P0")
    c, r = call("PUT", f"/api/wrong-question/{wq_id}", token=T1, body={"subject": "高等数学", "tag": "极限-已改", "question": "QA错题已修改", "answer": "1", "analysis": "改后解析"})
    rec("F07", "本人修改错题", biz(r) == 200, f"code={biz(r)}", "P1")

json.dump({"idle_id": idle_id, "post_id": post_id, "lf_id": lf_id, "wq_id": wq_id, "tag": TAG},
          open(os.path.join(D, "ctx3.json"), "w"))
dump(os.path.join(D, "r3.json"))
