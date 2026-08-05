# -*- coding: utf-8 -*-
"""端到端功能测试公共框架（纯标准库，避免依赖问题）"""
import json, urllib.request, urllib.error, urllib.parse, time, sys, io, os

BASE = "http://localhost:8080"
RESULTS = []
_t0 = time.time()


def call(method, path, token=None, body=None, params=None, raw=False, timeout=30,
         content_type="application/json"):
    """发起 HTTP 请求，返回 (http_status, parsed_json_or_text)"""
    url = BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        if raw:
            data = body
            if content_type:
                headers["Content-Type"] = content_type
        else:
            data = json.dumps(body, ensure_ascii=False).encode("utf-8")
            headers["Content-Type"] = "application/json;charset=UTF-8"
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            txt = r.read().decode("utf-8", "replace")
            code = r.getcode()
    except urllib.error.HTTPError as e:
        txt = e.read().decode("utf-8", "replace")
        code = e.code
    except Exception as e:
        return -1, {"_err": str(e)}
    try:
        return code, json.loads(txt)
    except Exception:
        return code, txt


def biz(resp):
    """取业务 code"""
    return resp.get("code") if isinstance(resp, dict) else None


def data_of(resp):
    return resp.get("data") if isinstance(resp, dict) else None


def plist(resp):
    """从分页响应中取列表，兼容 list / records 两种字段名"""
    d = data_of(resp)
    if isinstance(d, dict):
        return d.get("list") or d.get("records") or []
    if isinstance(d, list):
        return d
    return []


def ptotal(resp):
    d = data_of(resp)
    return d.get("total") if isinstance(d, dict) else None


def unread(token):
    """取未读消息总数"""
    c, r = call("GET", "/api/message/unread-count", token=token)
    d = data_of(r)
    if isinstance(d, dict):
        for k in ("count", "total", "unread"):
            if isinstance(d.get(k), int):
                return d[k]
    return d if isinstance(d, int) else None


def rec(cid, name, ok, detail="", severity=""):
    """记录一条用例结果"""
    RESULTS.append({"id": cid, "name": name, "ok": bool(ok),
                    "detail": str(detail)[:600], "severity": severity})
    flag = "PASS" if ok else "FAIL"
    print(f"[{flag}] {cid} {name} | {str(detail)[:220]}", flush=True)
    return ok


def login_student(student_no, pwd="admin123"):
    c, r = call("POST", "/api/auth/login",
                body={"studentNo": student_no, "password": pwd})
    if biz(r) == 200 and data_of(r):
        d = data_of(r)
        return d.get("token"), d
    return None, {"http": c, "resp": r}


def login_admin(username, pwd="admin123"):
    c, r = call("POST", "/api/admin/auth/login",
                body={"username": username, "password": pwd})
    if biz(r) == 200 and data_of(r):
        d = data_of(r)
        return d.get("token"), d
    return None, {"http": c, "resp": r}


def dump(path):
    ok = sum(1 for x in RESULTS if x["ok"])
    total = len(RESULTS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"pass": ok, "total": total, "cases": RESULTS}, f,
                  ensure_ascii=False, indent=1)
    print(f"\n==== {ok}/{total} PASS, {total-ok} FAIL  ({time.time()-_t0:.1f}s) ====")
    fails = [x for x in RESULTS if not x["ok"]]
    if fails:
        print("---- 失败用例 ----")
        for x in fails:
            print(f"  {x['id']} {x['name']}: {x['detail'][:200]}")
