# -*- coding: utf-8 -*-
"""从 .class 字节码常量池里提取路由字符串与注解，还原接口清单"""
import sys, io, os, re, struct, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = r"E:\work\毕业设计\web\backend\target\classes\com\campus\platform\controller"


def consts(path):
    """解析 class 文件常量池里的 UTF8 常量"""
    d = open(path, "rb").read()
    i = 10
    n = struct.unpack(">H", d[8:10])[0]
    out = []
    k = 1
    while k < n:
        tag = d[i]; i += 1
        if tag == 1:
            ln = struct.unpack(">H", d[i:i + 2])[0]; i += 2
            out.append(d[i:i + ln].decode("utf-8", "replace")); i += ln
        elif tag in (7, 8, 16, 19, 20):
            i += 2
        elif tag == 15:
            i += 3
        elif tag in (5, 6):
            i += 8; k += 1
        else:
            i += 4
        k += 1
    return out


MAP_ANN = ("GetMapping", "PostMapping", "PutMapping", "DeleteMapping", "RequestMapping", "PatchMapping")

for f in sorted(glob.glob(os.path.join(ROOT, "**", "*.class"), recursive=True)):
    cs = consts(f)
    anns = [c for c in cs if any(a in c for a in MAP_ANN)]
    paths = [c for c in cs if re.fullmatch(r"/[A-Za-z0-9_\-{}:\\\\./*]*", c) and c != "/"]
    name = os.path.relpath(f, ROOT)
    print(f"\n### {name}")
    print("  注解:", sorted(set(a.split('/')[-1].rstrip(';') for a in anns)))
    print("  路径:", paths)
