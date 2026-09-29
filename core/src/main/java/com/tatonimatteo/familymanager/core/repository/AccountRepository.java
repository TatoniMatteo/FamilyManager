package com.tatonimatteo.familymanager.core.repository;

import com.tatonimatteo.familymanager.core.domain.Account;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRepository extends JpaRepository<Account, UUID> {

    Optional<Account> findByEmail(String email);

    Optional<Account> findByGoogleSub(String googleSub);

    long countByInitialAdminTrue();

    List<Account> findByStatusOrderByCreatedAtAsc(String status);

    List<Account> findByStatusAndIdNotOrderByEmailAsc(String status, UUID id);
}
