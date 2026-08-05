package com.campus.platform.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 上传响应：文件可访问 URL。
 */
@Data
@AllArgsConstructor
public class UploadVO {

    private String url;
}
