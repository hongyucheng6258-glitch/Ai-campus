package com.campus.platform.controller;

import com.campus.platform.common.R;
import com.campus.platform.common.UserContext;
import com.campus.platform.service.UploadService;
import com.campus.platform.vo.UploadVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
public class UploadController {
    private final UploadService uploadService;

    @PostMapping("/image")
    public R<UploadVO> uploadImage(@RequestParam("file") MultipartFile file) {
        return R.ok(uploadService.uploadImage(UserContext.getUid(), file));
    }

    @PostMapping("/file")
    public R<UploadVO> uploadFile(@RequestParam("file") MultipartFile file) {
        return R.ok(uploadService.uploadFile(UserContext.getUid(), file));
    }
}
