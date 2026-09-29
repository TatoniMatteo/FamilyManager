package com.tatonimatteo.familymanager.core.repository;

import com.tatonimatteo.familymanager.core.domain.FamilyInvitation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FamilyInvitationRepository extends JpaRepository<FamilyInvitation, UUID> {

    void deleteByCreatedBy_Id(UUID accountId);

    Optional<FamilyInvitation> findByTokenHash(String tokenHash);

    List<FamilyInvitation> findByRegisteredAccountIsNullOrderByCreatedAtDesc();

    Optional<FamilyInvitation> findByRegisteredAccount_Id(UUID accountId);
}
