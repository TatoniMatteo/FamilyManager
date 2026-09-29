package com.tatonimatteo.familymanager.core.web.relationship.dto;

import com.tatonimatteo.familymanager.core.domain.Relationship;
import com.tatonimatteo.familymanager.core.domain.RelationshipStatus;
import com.tatonimatteo.familymanager.core.domain.RelationshipType;
import com.tatonimatteo.familymanager.core.web.person.dto.PersonResponse;

import java.time.LocalDate;
import java.util.UUID;

public record RelationshipResponse(
        UUID id,
        PersonResponse personA,
        PersonResponse personB,
        RelationshipType type,
        RelationshipStatus status,
        Boolean biological,
        LocalDate startDate,
        LocalDate endDate
) {

    public static RelationshipResponse from(Relationship relationship) {
        return new RelationshipResponse(
                relationship.getId(),
                PersonResponse.from(relationship.getPersonA()),
                PersonResponse.from(relationship.getPersonB()),
                relationship.getType(),
                relationship.getStatus(),
                relationship.getBiological(),
                relationship.getStartDate(),
                relationship.getEndDate()
        );
    }
}
