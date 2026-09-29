package com.tatonimatteo.familymanager.core.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Come {@link #getViewer()} chiama {@link #getTarget()} (es. viewer=io,
 * target=mia moglie, label="amore"). Indipendente dal tipo formale di
 * relazione, e personalizzabile liberamente da ciascun utente.
 */
@Entity
@Table(name = "nicknames")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Nickname {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "viewer_id", nullable = false)
    private Person viewer;

    @ManyToOne
    @JoinColumn(name = "target_id", nullable = false)
    private Person target;

    @Setter
    @Column(nullable = false)
    private String label;

    public Nickname(Person viewer, Person target, String label) {
        this.viewer = viewer;
        this.target = target;
        this.label = label;
    }
}
