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
 * Un nucleo abitativo. Distinto dalla famiglia allargata/albero
 * genealogico: genitori separati hanno due household ma restano
 * collegati dalle stesse {@link Relationship} verso i figli.
 */
@Entity
@Table(name = "households")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Household {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Setter
    @Column(nullable = false)
    private String name;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Household(String name) {
        this.name = name;
    }
}
