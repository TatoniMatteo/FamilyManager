package com.tatonimatteo.familymanager.core.repository;

import com.tatonimatteo.familymanager.core.domain.PermissionGrant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionGrantRepository extends JpaRepository<PermissionGrant, UUID> {

    List<PermissionGrant> findByOwnerPerson_Id(UUID ownerPersonId);
}
