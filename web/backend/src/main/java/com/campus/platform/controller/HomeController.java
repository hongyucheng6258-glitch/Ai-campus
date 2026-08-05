package com.campus.platform.controller;

import com.campus.platform.common.R;
import com.campus.platform.service.NoticeService;
import com.campus.platform.vo.HomeAggregateVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/home")
@RequiredArgsConstructor
public class HomeController {
    private final NoticeService noticeService;

    @GetMapping("/aggregate")
    public R<HomeAggregateVO> aggregate() {
        return R.ok(noticeService.homeAggregate());
    }
}
