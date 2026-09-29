package com.tatonimatteo.familymanager.core.domain;

/**
 * Tipi di relazione ATOMICA. Deliberatamente non esistono GRANDPARENT_OF,
 * UNCLE_OF, COUSIN_OF: si calcolano navigando il grafo con query ricorsive
 * (vedi {@link com.tatonimatteo.familymanager.core.repository.RelationshipRepository}).
 */
public enum RelationshipType {
    PARENT_OF,
    SPOUSE_OF,
    PARTNER_OF,
}
