package com.tatonimatteo.familymanager.core.web.person.dto;

import com.tatonimatteo.familymanager.core.domain.Person;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Ciò che l'API espone di una {@link Person}. Deliberatamente non include
 * {@code account}: l'email o i dettagli dell'account non sono affari di chi
 * chiede "chi è questa persona nell'albero".
 */
public record PersonResponse(
        UUID id,
        String displayName,
        String firstName,
        String lastName,
        LocalDate birthDate,
        String gender,
        Instant createdAt,
        boolean activeAccountLinked
) {

    public static PersonResponse from(Person person) {
        return new PersonResponse(
                person.getId(),
                person.getDisplayName(),
                person.getFirstName(),
                person.getLastName(),
                person.getBirthDate(),
                person.getGender(),
                person.getCreatedAt(),
                person.getAccount() != null && "ACTIVE".equals(person.getAccount().getStatus())
        );
    }
}
