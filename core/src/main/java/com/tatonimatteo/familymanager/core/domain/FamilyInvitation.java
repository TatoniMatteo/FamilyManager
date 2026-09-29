package com.tatonimatteo.familymanager.core.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "family_invitations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FamilyInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private InvitationType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id")
    private Person person;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_account_id", nullable = false)
    private Account createdBy;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registered_account_id", unique = true)
    private Account registeredAccount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    public FamilyInvitation(String email, InvitationType type, Person person, String tokenHash,
            Instant expiresAt, Account createdBy) {
        this.email = email;
        this.type = type;
        this.person = person;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.createdBy = createdBy;
    }

    public boolean isExpired() {
        return expiresAt.isBefore(Instant.now());
    }

    public boolean isUsed() {
        return registeredAccount != null;
    }

    public void bind(Account account) {
        registeredAccount = account;
        acceptedAt = Instant.now();
    }
}
