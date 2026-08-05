package com.campus.platform.utils;

import cn.hutool.core.date.DateUtil;
import cn.hutool.core.util.IdUtil;
import com.campus.platform.common.BizException;
import com.campus.platform.common.ResultCode;
import com.campus.platform.config.MinioConfig;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.SetBucketPolicyArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;

/**
 * MinIO 工具：统一图片/文件上传，返回可公开访问的 URL。
 * 共享约定 #8：一律「先传 /upload/* 拿 URL，再随业务表单提交」，DB 只存 URL。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MinioUtils {

    private final MinioClient minioClient;
    private final MinioConfig minioConfig;

    /**
     * 上传文件到 MinIO。
     *
     * @param file   上传文件
     * @param dir    业务目录（如 idle/activity/pdf）
     * @return 可访问的文件 URL
     */
    public String upload(MultipartFile file, String dir) {
        try {
            ensureBucket();
            // 对象名：目录/日期/UUID.扩展名
            String original = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
            String ext = original.contains(".")
                    ? original.substring(original.lastIndexOf('.')) : "";
            String objectName = dir + "/" + DateUtil.format(DateUtil.date(), "yyyyMMdd")
                    + "/" + IdUtil.fastSimpleUUID() + ext;
            try (InputStream in = file.getInputStream()) {
                minioClient.putObject(PutObjectArgs.builder()
                        .bucket(minioConfig.getBucket())
                        .object(objectName)
                        .stream(in, file.getSize(), -1)
                        .contentType(file.getContentType())
                        .build());
            }
            return minioConfig.getEndpoint() + "/" + minioConfig.getBucket() + "/" + objectName;
        } catch (Exception e) {
            log.error("MinIO 上传失败", e);
            throw new BizException(ResultCode.SYSTEM_ERROR, "文件上传失败，请稍后重试");
        }
    }

    /** 确保 bucket 存在并设置匿名读策略（供图片回显，架构设计第10章假设3） */
    private void ensureBucket() throws Exception {
        String bucket = minioConfig.getBucket();
        boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
        }
        // 每次都确保匿名读策略有效，兼容已存在但未配置公开读权限的 bucket
        String policy = """
                {
                  "Version": "2012-10-17",
                  "Statement": [{
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": ["arn:aws:s3:::%s/*"]
                  }]
                }
                """.formatted(bucket);
        minioClient.setBucketPolicy(SetBucketPolicyArgs.builder()
                .bucket(bucket).config(policy).build());
    }

    /** 按文件URL删除（用于删除记录时清理，可选） */
    public String getBucket() {
        return minioConfig.getBucket();
    }
}
