package com.tatonimatteo.familymanager.core.web.common;

import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/system")
public class SystemStatusController {

    private final JdbcTemplate jdbc;

    @Value("${family.system.maintenance:false}")
    private boolean maintenance;

    public SystemStatusController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/status")
    public ResponseEntity<SystemStatus> status() {
        if (maintenance) {
            return ResponseEntity.ok(new SystemStatus("MAINTENANCE", Instant.now()));
        }
        try {
            jdbc.queryForObject("SELECT 1", Integer.class);
            return ResponseEntity.ok(new SystemStatus("OPERATIONAL", Instant.now()));
        } catch (RuntimeException unavailable) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(new SystemStatus("UNAVAILABLE", Instant.now()));
        }
    }

    public record SystemStatus(String status, Instant checkedAt) {

    }
}
