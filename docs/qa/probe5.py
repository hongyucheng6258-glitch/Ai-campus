# -*- coding: utf-8 -*-
import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import *

t1, _ = login_student("2021001")
t2, _ = login_student("2021002")

def show(tag, res):
    c, r = res
    m = r.get("message") if isinstance(r, dict) else str(r)[:60]
    print(f"  {tag:<46} http={c} code={biz(r)} msg={m}")

print("=== A. 学生端各POST/PUT 无Token（探测拦截器排除表） ===")
show("POST /api/activity/publish", call("POST", "/api/activity/publish", body={"title":"x"}))
show("POST /api/idle/publish", call("POST", "/api/idle/publish", body={"title":"x"}))
show("POST /api/lostfound/publish", call("POST", "/api/lostfound/publish", body={"title":"x"}))
show("POST /api/post/publish", call("POST", "/api/post/publish", body={"content":"x"}))
show("POST /api/activity/1/signup", call("POST", "/api/activity/1/signup", body={}))
show("PUT  /api/user/password", call("PUT", "/api/user/password", body={}))
show("POST /api/wrongquestion", call("POST", "/api/wrongquestion", body={}))

print("\n=== B. 带Token（张三） ===")
show("POST /api/activity/1/signup(李四)", call("POST", "/api/activity/1/signup", token=t2, body={"remark":"探针"}))
show("POST /api/wrongquestion", call("POST", "/api/wrongquestion", token=t1,
     body={"subject":"数学","question":"探针题","answer":"A","analysis":"无","tags":"","images":[]}))
show("PUT  /api/user/profile", call("PUT", "/api/user/profile", token=t1,
     body={"nickname":"张三","phone":"13800000001","gender":1,"bio":"计算机学院大三学生，爱编程"}))
show("POST /api/post/publish", call("POST", "/api/post/publish", token=t1,
     body={"content":"探针帖子内容","topic":"学习","images":[]}))
show("POST /api/post", call("POST", "/api/post", token=t1,
     body={"content":"探针帖子内容2","topic":"学习","images":[]}))

print("\n=== C. activity/publish 逐字段裁剪 ===")
full = {"title":"探针","category":"学习","description":"探针","location":"图书馆",
        "startTime":"2026-09-01 10:00:00","endTime":"2026-09-01 12:00:00",
        "signupDeadline":"2026-08-30 10:00:00","maxMembers":5,"images":[]}
show("full(category版)", call("POST","/api/activity/publish",token=t1,body=full))
b = dict(full); b.pop("images")
show("去掉images", call("POST","/api/activity/publish",token=t1,body=b))
b = {"title":"探针最小","maxMembers":5}
show("最小字段", call("POST","/api/activity/publish",token=t1,body=b))
b = dict(full); b["images"]=["http://x/1.png"]
show("images有值", call("POST","/api/activity/publish",token=t1,body=b))

print("\n=== D. idle/publish 逐字段 ===")
i_full = {"title":"探针闲置","category":"书籍","description":"探针","price":10.0,
          "originalPrice":20.0,"tradeType":1,"wantItem":"","images":[]}
show("idle full", call("POST","/api/idle/publish",token=t1,body=i_full))
show("idle 最小", call("POST","/api/idle/publish",token=t1,body={"title":"探针闲置2","price":1}))
