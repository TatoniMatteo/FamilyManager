package com.tatonimatteo.familymanager.core.repository;

import com.tatonimatteo.familymanager.core.domain.AccountActionToken;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountActionTokenRepository extends JpaRepository<AccountActionToken, UUID> {

    Optional<AccountActionToken> findByTokenHashAndPurpose(String tokenHash, String purpose);

    void deleteByAccount_IdAndPurpose(UUID accountId, String purpose);
}
