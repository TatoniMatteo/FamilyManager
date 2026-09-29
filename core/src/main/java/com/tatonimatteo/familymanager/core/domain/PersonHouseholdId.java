package com.tatonimatteo.familymanager.core.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Value object puro (nessuna relazione JPA): qui {@code @EqualsAndHashCode}
 * di Lombok è sicuro da usare, a differenza delle entità vere e proprie
 * dove equals/hashCode generati automaticamente possono dare problemi con
 * proxy Hibernate e relazioni bidirezionali.
 */
@Embeddable
@Getter
@EqualsAndHashCode
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
@AllArgsConstructor
public class PersonHouseholdId implements Serializable {

    @Column(name = "person_id")
    private UUID personId;

    @Column(name = "household_id")
    private UUID householdId;
}
