package com.tatonimatteo.familymanager.core.repository;

import com.tatonimatteo.familymanager.core.domain.Person;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonRepository extends JpaRepository<Person, UUID> {

    Optional<Person> findByAccountId(UUID accountId);

    List<Person> findByAccountIsNullOrderByDisplayNameAsc();
}
