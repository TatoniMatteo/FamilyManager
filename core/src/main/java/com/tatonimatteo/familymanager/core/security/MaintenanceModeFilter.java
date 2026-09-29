package com.tatonimatteo.familymanager.core.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tatonimatteo.familymanager.core.web.common.ApiError;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class MaintenanceModeFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;

    @Value("${family.system.maintenance:false}")
    private boolean maintenance;

    public MaintenanceModeFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        boolean statusCheck = "/api/system/status".equals(path);
        if (maintenance && path.startsWith("/api/") && !statusCheck) {
            response.setStatus(HttpStatus.SERVICE_UNAVAILABLE.value());
            response.setHeader("Retry-After", "300");
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getOutputStream(), ApiError.of(
                    HttpStatus.SERVICE_UNAVAILABLE.value(), "MAINTENANCE",
                    "FamilyManager è temporaneamente in manutenzione.",
                    UUID.randomUUID().toString(), path));
            return;
        }
        chain.doFilter(request, response);
    }
}
