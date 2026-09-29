package com.tatonimatteo.familymanager.core.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Credenziali di accesso. Non ogni {@link Person} ha un account: un account
 * esiste solo per chi effettivamente usa l'app.
 */
@Entity
@Table(name = "accounts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Setter
    @Column(nullable = false, unique = true)
    private String email;

    @Setter
    @Column(name = "google_sub", unique = true)
    private String googleSub;

    @Setter
    @Column(name = "password_hash")
    private String passwordHash;

    @Column(nullable = false, length = 32)
    private String status = "PENDING_EMAIL_VERIFICATION";

    @Column(nullable = false, length = 16)
    private String role = "MEMBER";

    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    @Column(name = "initial_admin", nullable = false)
    private boolean initialAdmin;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Account(String email) {
        this.email = email;
    }

    public Account(String email, String passwordHash, boolean initialAdmin) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.initialAdmin = initialAdmin;
        this.role = initialAdmin ? "ADMIN" : "MEMBER";
    }

    public void verifyEmail(Instant verifiedAt) {
        this.emailVerifiedAt = verifiedAt;
        this.status = initialAdmin ? "ACTIVE" : "PENDING_APPROVAL";
    }

    public void approve() {
        this.status = "ACTIVE";
    }

    public void requirePasswordSetup() {
        this.passwordHash = null;
        this.status = "PENDING_PASSWORD_SETUP";
    }

    public void completeGooglePasswordSetup(String passwordHash) {
        this.passwordHash = passwordHash;
        this.status = initialAdmin ? "ACTIVE" : "PENDING_APPROVAL";
    }

    public void promoteToAdministrator() {
        this.role = "ADMIN";
        this.initialAdmin = true;
    }

    public void demoteFromAdministrator() {
        this.role = "MEMBER";
        this.initialAdmin = false;
    }
}
