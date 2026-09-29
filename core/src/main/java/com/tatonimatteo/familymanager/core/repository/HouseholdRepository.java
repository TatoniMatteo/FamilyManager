package com.tatonimatteo.familymanager.core.repository;

import com.tatonimatteo.familymanager.core.domain.Household;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HouseholdRepository extends JpaRepository<Household, UUID> {

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);
}
