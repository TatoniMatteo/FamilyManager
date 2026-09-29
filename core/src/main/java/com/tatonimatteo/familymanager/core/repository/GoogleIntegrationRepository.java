package com.tatonimatteo.familymanager.core.repository;

import com.tatonimatteo.familymanager.core.domain.GoogleIntegration;
import com.tatonimatteo.familymanager.core.domain.GoogleService;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoogleIntegrationRepository extends JpaRepository<GoogleIntegration, UUID> {

    Optional<GoogleIntegration> findByAccount_IdAndService(UUID accountId, GoogleService service);
}
