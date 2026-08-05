# -*- coding: utf-8 -*-
"""探测真实响应结构，避免误报"""
import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(__file__))
from harness import *

D = os.path.dirname(__file__)
tk = json.load(open(os.path.join(D, "tokens.json"), encoding="utf-8"))
T1, T2, TA = tk["2021001"], tk["2021002"], tk["admin"]

def show(label, *a, **kw):
    c, r = call(*a, **kw)
    print(f"\n----- {label} [http={c}]")
    print(json.dumps(r, ensure_ascii=False)[:900])

show("消息列表 张三", "GET", "/api/message/list", token=T1, params={"pageNum": 1, "pageSize": 3})
show("消息列表 张三(无参)", "GET", "/api/message/list", token=T1)
show("未读数 张三", "GET", "/api/message/unread-count", token=T1)
show("我的活动 张三", "GET", "/api/activity/my", token=T1, params={"pageNum": 1, "pageSize": 5})
show("我的报名 李四", "GET", "/api/activity/my/signups", token=T2, params={"pageNum": 1, "pageSize": 5})
show("活动列表(无keyword)", "GET", "/api/activity/list", token=T2, params={"pageNum": 1, "pageSize": 5})
show("活动列表(keyword=QA)", "GET", "/api/activity/list", token=T2, params={"pageNum": 1, "pageSize": 5, "keyword": "QA"})
show("管理端审核列表 type=activity", "GET", "/api/admin/audit/list", token=TA, params={"type": "activity", "status": 0, "pageNum": 1, "pageSize": 5})
show("管理端审核列表 无status", "GET", "/api/admin/audit/list", token=TA, params={"type": "activity", "pageNum": 1, "pageSize": 5})
