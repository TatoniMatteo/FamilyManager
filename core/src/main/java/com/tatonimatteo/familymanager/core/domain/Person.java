package com.tatonimatteo.familymanager.core.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Un membro della famiglia. Può non avere un {@link Account} collegato
 * (es. un neonato, un familiare che non usa l'app, una persona deceduta
 * inserita solo per completare l'albero genealogico).
 */
@Entity
@Table(name = "persons")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Person {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Setter
    @OneToOne
    @JoinColumn(name = "account_id")
    private Account account;

    @Setter
    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Setter
    @Column(name = "first_name", length = 100)
    private String firstName;

    @Setter
    @Column(name = "last_name", length = 100)
    private String lastName;

    @Setter
    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Setter
    @Column
    private String gender;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Person(String displayName) {
        this.displayName = displayName;
    }
}
