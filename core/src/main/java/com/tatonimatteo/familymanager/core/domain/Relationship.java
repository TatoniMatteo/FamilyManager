package com.tatonimatteo.familymanager.core.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Una relazione diretta tra due {@link Person}. Per PARENT_OF, personA è il
 * genitore e personB il figlio. Per SPOUSE_OF/PARTNER_OF la relazione
 * è simmetrica per significato ma va comunque letta in entrambe le
 * direzioni nelle query (vedi repository).
 */
@Entity
@Table(name = "relationships")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Relationship {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Setter
    @ManyToOne
    @JoinColumn(name = "person_a_id", nullable = false)
    private Person personA;

    @Setter
    @ManyToOne
    @JoinColumn(name = "person_b_id", nullable = false)
    private Person personB;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RelationshipType type;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column
    private RelationshipStatus status;

    @Setter
    @Column
    private Boolean biological;

    @Setter
    @Column(name = "start_date")
    private LocalDate startDate;

    @Setter
    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Relationship(Person personA, Person personB, RelationshipType type) {
        this.personA = personA;
        this.personB = personB;
        this.type = type;
    }
}
