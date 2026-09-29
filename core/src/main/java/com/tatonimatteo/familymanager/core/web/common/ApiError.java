package com.tatonimatteo.familymanager.core.web.common;

import java.time.Instant;

public record ApiError(
        int status,
        String code,
        String message,
        String errorId,
        String path,
        Instant timestamp
) {

    public static ApiError of(int status, String message) {
        return of(status, "HTTP_" + status, message, java.util.UUID.randomUUID().toString(), null);
    }

    public static ApiError of(int status, String code, String message, String errorId, String path) {
        return new ApiError(status, code, message, errorId, path, Instant.now());
    }
}
