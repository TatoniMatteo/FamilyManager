package com.tatonimatteo.familymanager.core.repository;

import com.tatonimatteo.familymanager.core.domain.Person;
import com.tatonimatteo.familymanager.core.domain.Relationship;
import com.tatonimatteo.familymanager.core.domain.RelationshipType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RelationshipRepository extends JpaRepository<Relationship, UUID> {

    @EntityGraph(attributePaths = {"personA.account", "personB.account"})
    @Query("select relationship from Relationship relationship")
    List<Relationship> findAllWithPeople();

    List<Relationship> findByPersonA_IdOrPersonB_Id(UUID personAId, UUID personBId);

    List<Relationship> findByPersonA_IdAndType(UUID personAId, RelationshipType type);

    /**
     * Tutti gli antenati di {@code personId} (genitori, nonni, bisnonni, ...),
     * risalendo i collegamenti PARENT_OF. Il grado (1 = genitore, 2 = nonno,
     * 3 = bisnonno, ...) determina l'ordinamento del risultato.
     *
     * <p>Nessun antenato viene "salvato" da nessuna parte: si ottiene sempre
     * navigando {@link Relationship} in tempo reale, quindi resta corretto
     * anche se l'albero cambia (nuove nascite, adozioni...).
     */
    @Query(value = """
            WITH RECURSIVE ancestors AS (
                SELECT r.person_a_id AS id, 1 AS depth
                FROM relationships r
                WHERE r.person_b_id = :personId AND r.type = 'PARENT_OF'
            
                UNION
            
                SELECT r.person_a_id AS id, a.depth + 1
                FROM relationships r
                JOIN ancestors a ON r.person_b_id = a.id
                WHERE r.type = 'PARENT_OF'
            )
            SELECT p.* FROM persons p
            JOIN ancestors a ON p.id = a.id
            ORDER BY a.depth
            """, nativeQuery = true)
    List<Person> findAncestors(@Param("personId") UUID personId);

    /**
     * Tutti i discendenti di {@code personId} (figli, nipoti, ...), simmetrico
     * a {@link #findAncestors} ma percorrendo il grafo in senso opposto.
     */
    @Query(value = """
            WITH RECURSIVE descendants AS (
                SELECT r.person_b_id AS id, 1 AS depth
                FROM relationships r
                WHERE r.person_a_id = :personId AND r.type = 'PARENT_OF'
            
                UNION
            
                SELECT r.person_b_id AS id, d.depth + 1
                FROM relationships r
                JOIN descendants d ON r.person_a_id = d.id
                WHERE r.type = 'PARENT_OF'
            )
            SELECT p.* FROM persons p
            JOIN descendants d ON p.id = d.id
            ORDER BY d.depth
            """, nativeQuery = true)
    List<Person> findDescendants(@Param("personId") UUID personId);

    /**
     * Fratelli/sorelle di {@code personId}: persone che condividono almeno
     * un genitore, escludendo la persona stessa.
     */
    @Query(value = """
            SELECT DISTINCT p.* FROM persons p
            JOIN relationships r_sibling ON r_sibling.person_b_id = p.id AND r_sibling.type = 'PARENT_OF'
            WHERE r_sibling.person_a_id IN (
                SELECT r.person_a_id FROM relationships r
                WHERE r.person_b_id = :personId AND r.type = 'PARENT_OF'
            )
            AND p.id <> :personId
            """, nativeQuery = true)
    List<Person> findSiblings(@Param("personId") UUID personId);
}
