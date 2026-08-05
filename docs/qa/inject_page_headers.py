#!/usr/bin/env python3
# 为功能页注入统一的 WtPageHeader（品牌页头 + 分类 eyebrow + 右侧操作区 slot）。
# 跳过：原型页(home/chat)、登录注册(auth)。Vue3 支持多根节点，头部作为 <template> 首个片段子节点。
import re, pathlib

# key = 相对 frontend/src 的路径；value = (title, subtitle, eyebrow)
STUDENT = {
    'views/ai/CodeFix.vue':        ("AI 代码诊所", "粘贴报错，智能定位问题根因", "AI 学习"),
    'views/ai/WrongBook.vue':      ("我的错题本", "收集你做错的题目，逐个击破", "AI 学习"),
    'views/idle/List.vue':         ("闲置物品", "校园里的二手好物，流转给需要的人", "校园服务"),
    'views/idle/Publish.vue':      ("发布闲置", "把闲置好物分享给同学", "校园服务"),
    'views/idle/Detail.vue':       ("闲置详情", "查看物品详情与交换条件", "校园服务"),
    'views/idle/MyAppointments.vue': ("我的预约", "我申请交换的闲置物品", "我的"),
    'views/activity/List.vue':     ("校园活动", "一起参与，一起成长", "校园服务"),
    'views/activity/Publish.vue':  ("发布活动", "发起一场属于同学们的聚会", "校园服务"),
    'views/activity/Detail.vue':   ("活动详情", "查看活动信息并报名参与", "校园服务"),
    'views/activity/MySignup.vue': ("我的报名", "我参与和发起的活动", "我的"),
    'views/lostfound/List.vue':    ("失物招领", "遗失与拾获，都在这里相遇", "校园服务"),
    'views/lostfound/Publish.vue': ("发布招领", "帮物品找到它的主人", "校园服务"),
    'views/lostfound/Detail.vue':  ("招领详情", "查看失物信息并联系失主", "校园服务"),
    'views/social/PostSquare.vue': ("校园动态", "同学们都在聊些什么", "同辈圈"),
    'views/notice/List.vue':       ("校园公告", "学校与平台的重要通知", "资讯"),
    'views/notice/Detail.vue':     ("公告详情", "查看公告完整内容", "资讯"),
    'views/message/MessageCenter.vue': ("消息中心", "来自平台与同学的提醒", "我的"),
    'views/profile/Profile.vue':   ("个人中心", "管理你的资料与发布", "我的"),
}
ADMIN = {
    'views/user/UserList.vue':     ("用户管理", "查看与管理平台用户", "管理后台"),
    'views/audit/AuditQueue.vue':  ("审核队列", "待处理的发布与举报", "管理后台"),
    'views/report/ReportList.vue': ("举报处理", "查看与处置用户举报", "管理后台"),
    'views/notice/NoticeManage.vue': ("公告管理", "发布与维护校园公告", "管理后台"),
    'views/notice/NoticeEdit.vue': ("编辑公告", "撰写或更新一条公告", "管理后台"),
    'views/ai/AiConfig.vue':       ("AI 配置", "配置模型与调用参数", "管理后台"),
    'views/ai/AiLogs.vue':         ("AI 调用日志", "查看平台 AI 调用记录", "管理后台"),
    'views/system/AdminList.vue':  ("管理员", "管理系统后台账号", "管理后台"),
    'views/dashboard/Dashboard.vue': ("数据概览", "平台运营核心指标", "管理后台"),
}

roots = {
    pathlib.Path(r'E:/work/毕业设计/web/frontend/student/src'): STUDENT,
    pathlib.Path(r'E:/work/毕业设计/web/frontend/admin/src'): ADMIN,
}

done = []
for root, mapping in roots.items():
    for rel, (title, sub, eyebrow) in mapping.items():
        f = root / rel
        if not f.exists():
            print("MISSING", f); continue
        text = f.read_text(encoding='utf-8')
        if 'WtPageHeader' in text:
            print("SKIP(has header)", rel); continue

        header = (f'  <WtPageHeader title="{title}" subtitle="{sub}" eyebrow="{eyebrow}" />\n')
        # 1) 模板：<template> 后插入头部
        text = text.replace('<template>', '<template>\n' + header, 1)

        # 2) 脚本：首个 import 行后插入组件 import
        lines = text.split('\n')
        inserted = False
        for i, line in enumerate(lines):
            if re.match(r'^\s*import\s', line):
                indent = re.match(r'^(\s*)', line).group(1)
                lines.insert(i + 1, f"{indent}import WtPageHeader from '../../components/wt/WtPageHeader.vue'")
                inserted = True
                break
        if not inserted:
            print("NO-IMPORT", rel); continue
        text = '\n'.join(lines)

        f.write_text(text, encoding='utf-8')
        done.append(rel)

print(f"\ninjected WtPageHeader into {len(done)} views:")
for d in done:
    print("  +", d)
