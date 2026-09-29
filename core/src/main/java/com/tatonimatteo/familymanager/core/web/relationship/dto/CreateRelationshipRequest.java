package com.tatonimatteo.familymanager.core.web.relationship.dto;

import com.tatonimatteo.familymanager.core.domain.RelationshipStatus;
import com.tatonimatteo.familymanager.core.domain.RelationshipType;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record CreateRelationshipRequest(
        @NotNull(message = "personAId è obbligatorio")
        UUID personAId,

        @NotNull(message = "personBId è obbligatorio")
        UUID personBId,

        @NotNull(message = "type è obbligatorio")
        RelationshipType type,

        RelationshipStatus status,
        Boolean biological,
        LocalDate startDate,
        LocalDate endDate
) {

}
