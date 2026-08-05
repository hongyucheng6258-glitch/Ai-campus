package com.campus.platform.controller.admin;

import com.campus.platform.common.R;
import com.campus.platform.service.StatsService;
import com.campus.platform.vo.StatsOverviewVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/stats")
@RequiredArgsConstructor
public class AdminStatsController {
    private final StatsService statsService;

    @GetMapping("/overview")
    public R<StatsOverviewVO> overview() {
        return R.ok(statsService.overview());
    }

    @GetMapping("/trend")
    public R<Map<String, Object>> trend() {
        return R.ok(statsService.trend());
    }

    @GetMapping("/module")
    public R<List<Map<String, Object>>> moduleStats() {
        return R.ok(statsService.moduleStats());
    }

    @GetMapping("/pie")
    public R<Map<String, Object>> pieStats() {
        return R.ok(statsService.pieStats());
    }
}
