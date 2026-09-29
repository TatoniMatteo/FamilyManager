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
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Concessione di accesso generica per modulo. {@link #getResourceType()}
 * identifica il modulo/tipo di dato (es. "HEALTH_RECORD", "CALENDAR_EVENT"),
 * così i moduli futuri non richiedono modifiche a questo modello.
 *
 * <p>{@link #getResourceId()} nullo significa "tutte le risorse di questo
 * tipo appartenenti a owner". Il destinatario ({@link #getGranteeType()})
 * può essere una persona specifica, un tipo di relazione (es. "tutti i
 * genitori di owner") o un intero household.
 */
@Entity
@Table(name = "permission_grants")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PermissionGrant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "owner_person_id", nullable = false)
    private Person ownerPerson;

    @Setter
    @Column(name = "resource_type", nullable = false)
    private String resourceType;

    @Setter
    @Column(name = "resource_id")
    private UUID resourceId;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(name = "grantee_type", nullable = false)
    private GranteeType granteeType;

    @Setter
    @ManyToOne
    @JoinColumn(name = "grantee_person_id")
    private Person granteePerson;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(name = "grantee_relationship_type")
    private RelationshipType granteeRelationshipType;

    @Setter
    @ManyToOne
    @JoinColumn(name = "grantee_household_id")
    private Household granteeHousehold;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(name = "permission_level", nullable = false)
    private PermissionLevel permissionLevel;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public PermissionGrant(Person ownerPerson, String resourceType, GranteeType granteeType,
            PermissionLevel permissionLevel) {
        this.ownerPerson = ownerPerson;
        this.resourceType = resourceType;
        this.granteeType = granteeType;
        this.permissionLevel = permissionLevel;
    }
}
