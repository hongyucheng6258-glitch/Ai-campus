# -*- coding: utf-8 -*-
import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import *

TK = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "tokens.json"), encoding="utf-8"))
T1 = TK["2021001"]
TA = TK["admin"]
TAU = TK["auditor"]

# 用一个全新登录的 token
t1n, info = login_student("2021001")
print("新token:", "OK" if t1n else info)

body = {"title": "探针活动A", "type": "学习", "description": "探针",
        "location": "图书馆", "startTime": "2026-09-01 10:00:00", "endTime": "2026-09-01 12:00:00",
        "maxMembers": 5, "contact": "13800000001", "images": []}
print("\n[1] 旧token发布:", call("POST", "/api/activity/publish", token=T1, body=body))
print("[2] 新token发布:", call("POST", "/api/activity/publish", token=t1n, body=body))
print("[3] 无token发布:", call("POST", "/api/activity/publish", body=body))

# 试试 phase2 里成功过的那种 body
body2 = dict(body); body2["tags"] = ""
print("[4] 带tags:", call("POST", "/api/activity/publish", token=t1n, body=body2))

# 试试不同时间格式
body3 = dict(body); body3["startTime"] = "2026-09-01T10:00:00"; body3["endTime"] = "2026-09-01T12:00:00"
print("[5] ISO时间:", call("POST", "/api/activity/publish", token=t1n, body=body3))

# 闲置
ib = {"title": "探针闲置", "category": "书籍", "description": "探针", "price": 10,
      "wantItem": "无", "contact": "13800000001", "images": []}
print("[6] 闲置发布:", call("POST", "/api/idle/publish", token=t1n, body=ib))

# 张三状态
print("[7] 张三info:", call("GET", "/api/user/info", token=t1n)[1])

# 张三我的活动数
print("[8] 我的活动:", ptotal(call("GET", "/api/activity/my", token=t1n, params={"pageNum":1,"pageSize":1})[1]))

# 帖子还能发吗
print("[9] 帖子发布:", call("POST", "/api/post/publish", token=t1n,
      body={"content": "探针帖子", "topic": "学习", "images": []}))

# 失物招领
print("[10] 失物发布:", call("POST", "/api/lostfound/publish", token=t1n,
      body={"type": 1, "title": "探针失物", "itemName": "钱包", "description": "探针",
            "location": "食堂", "lostTime": "2026-08-01 12:00:00", "contact": "138", "images": []}))

# K06 复查：auditor 创建的管理员
print("\n[11] admin列表:", json.dumps(data_of(call("GET", "/api/admin/system/admin/list", token=TA,
      params={"pageNum":1,"pageSize":50})[1]), ensure_ascii=False)[:1500])
