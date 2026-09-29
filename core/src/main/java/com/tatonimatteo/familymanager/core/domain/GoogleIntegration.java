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
 * Token OAuth per un servizio Google, legati all'{@link Account} e non alla
 * {@link Person}: un account potrebbe in futuro essere condiviso tra contesti
 * familiari diversi, mentre l'autorizzazione OAuth resta personale.
 *
 * <p>I campi token sono già pensati come "encrypted": la cifratura a
 * riposo va applicata a livello applicativo prima della persistenza
 * (es. con un {@code AttributeConverter} JPA con una chiave da vault/KMS),
 * non delegata al database.
 */
@Entity
@Table(name = "google_integrations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GoogleIntegration {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GoogleService service;

    @Setter
    @Column(name = "access_token_encrypted", nullable = false, columnDefinition = "TEXT")
    private String accessTokenEncrypted;

    @Setter
    @Column(name = "refresh_token_encrypted", nullable = false, columnDefinition = "TEXT")
    private String refreshTokenEncrypted;

    @Setter
    @Column(nullable = false, columnDefinition = "TEXT")
    private String scope;

    @Setter
    @Column(name = "last_sync_at")
    private Instant lastSyncAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public GoogleIntegration(Account account, GoogleService service, String accessTokenEncrypted,
            String refreshTokenEncrypted, String scope) {
        this.account = account;
        this.service = service;
        this.accessTokenEncrypted = accessTokenEncrypted;
        this.refreshTokenEncrypted = refreshTokenEncrypted;
        this.scope = scope;
    }
}
