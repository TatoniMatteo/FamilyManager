package com.tatonimatteo.familymanager.core.repository;

import com.tatonimatteo.familymanager.core.domain.PersonHousehold;
import com.tatonimatteo.familymanager.core.domain.PersonHouseholdId;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonHouseholdRepository extends JpaRepository<PersonHousehold, PersonHouseholdId> {

    List<PersonHousehold> findByPerson_Id(UUID personId);

    List<PersonHousehold> findByHousehold_Id(UUID householdId);
}
