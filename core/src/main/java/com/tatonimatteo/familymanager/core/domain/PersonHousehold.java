package com.tatonimatteo.familymanager.core.domain;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "person_households")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PersonHousehold {

    @EmbeddedId
    private PersonHouseholdId id;

    @ManyToOne
    @MapsId("personId")
    @JoinColumn(name = "person_id")
    private Person person;

    @ManyToOne
    @MapsId("householdId")
    @JoinColumn(name = "household_id")
    private Household household;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HouseholdRole role = HouseholdRole.MEMBER;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt = Instant.now();

    public PersonHousehold(Person person, Household household, HouseholdRole role) {
        this.id = new PersonHouseholdId(person.getId(), household.getId());
        this.person = person;
        this.household = household;
        this.role = role;
    }
}
