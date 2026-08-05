package com.campus.platform.service;

import cn.hutool.core.util.StrUtil;
import com.campus.platform.common.BizException;
import com.campus.platform.common.ResultCode;
import com.campus.platform.entity.UploadResource;
import com.campus.platform.mapper.UploadResourceMapper;
import com.campus.platform.utils.MinioUtils;
import com.campus.platform.vo.UploadVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;

/**
 * 上传服务（A4）：图片 ≤5MB，文件（PDF）≤20MB。
 */
@Service
@RequiredArgsConstructor
public class UploadService {

    private static final long IMAGE_MAX_SIZE = 5 * 1024 * 1024;
    private static final long FILE_MAX_SIZE = 20 * 1024 * 1024;
    private static final Set<String> IMAGE_TYPES =
            Set.of("image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg");

    private final MinioUtils minioUtils;
    private final UploadResourceMapper uploadResourceMapper;

    public UploadVO uploadImage(Long ownerUserId, MultipartFile file) {
        checkFile(file, IMAGE_MAX_SIZE, "图片不能超过5MB");
        String contentType = StrUtil.nullToEmpty(file.getContentType()).toLowerCase();
        if (!IMAGE_TYPES.contains(contentType)) {
            throw new BizException(ResultCode.BAD_REQUEST, "仅支持 jpg/png/gif/webp 图片");
        }
        String url = minioUtils.upload(file, "images");
        record(ownerUserId, url, "image", contentType, file.getSize());
        return new UploadVO(url);
    }

    public UploadVO uploadFile(Long ownerUserId, MultipartFile file) {
        checkFile(file, FILE_MAX_SIZE, "文件不能超过20MB");
        String url = minioUtils.upload(file, "files");
        record(ownerUserId, url, "file", StrUtil.nullToEmpty(file.getContentType()), file.getSize());
        return new UploadVO(url);
    }

    private void record(Long ownerUserId, String url, String type, String contentType, long size) {
        UploadResource resource = new UploadResource();
        resource.setOwnerUserId(ownerUserId);
        resource.setResourceUrl(url);
        resource.setResourceType(type);
        resource.setContentType(contentType);
        resource.setFileSize(size);
        uploadResourceMapper.insert(resource);
    }

    private void checkFile(MultipartFile file, long maxSize, String sizeMsg) {
        if (file == null || file.isEmpty()) {
            throw new BizException(ResultCode.BAD_REQUEST, "文件不能为空");
        }
        if (file.getSize() > maxSize) {
            throw new BizException(ResultCode.BAD_REQUEST, sizeMsg);
        }
    }
}
