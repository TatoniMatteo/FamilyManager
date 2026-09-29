package com.tatonimatteo.familymanager.core.web.relationship;

import com.tatonimatteo.familymanager.core.domain.Person;
import com.tatonimatteo.familymanager.core.domain.Relationship;
import com.tatonimatteo.familymanager.core.repository.PersonRepository;
import com.tatonimatteo.familymanager.core.repository.RelationshipRepository;
import com.tatonimatteo.familymanager.core.web.person.dto.PersonResponse;
import com.tatonimatteo.familymanager.core.web.relationship.dto.CreateRelationshipRequest;
import com.tatonimatteo.familymanager.core.web.relationship.dto.RelationshipResponse;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RelationshipController {

    private final RelationshipRepository relationshipRepository;

    private final PersonRepository personRepository;

    public RelationshipController(RelationshipRepository relationshipRepository, PersonRepository personRepository) {
        this.relationshipRepository = relationshipRepository;
        this.personRepository = personRepository;
    }

    @PostMapping("/api/relationships")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<RelationshipResponse> create(@Valid @RequestBody CreateRelationshipRequest request) {
        Person personA = personRepository.findById(request.personAId())
                .orElseThrow(() -> new EntityNotFoundException("personA non trovata: " + request.personAId()));
        Person personB = personRepository.findById(request.personBId())
                .orElseThrow(() -> new EntityNotFoundException("personB non trovata: " + request.personBId()));

        Relationship relationship = new Relationship(personA, personB, request.type());
        relationship.setStatus(request.status());
        relationship.setBiological(request.biological());
        relationship.setStartDate(request.startDate());
        relationship.setEndDate(request.endDate());

        Relationship saved = relationshipRepository.save(relationship);
        return ResponseEntity.status(HttpStatus.CREATED).body(RelationshipResponse.from(saved));
    }

    @GetMapping("/api/relationships")
    @Transactional(readOnly = true)
    public List<RelationshipResponse> list() {
        return relationshipRepository.findAllWithPeople().stream()
                .map(RelationshipResponse::from)
                .toList();
    }

    @GetMapping("/api/persons/{id}/ancestors")
    @Transactional(readOnly = true)
    public List<PersonResponse> ancestors(@PathVariable UUID id) {
        return relationshipRepository.findAncestors(id).stream()
                .map(PersonResponse::from)
                .toList();
    }

    @GetMapping("/api/persons/{id}/descendants")
    @Transactional(readOnly = true)
    public List<PersonResponse> descendants(@PathVariable UUID id) {
        return relationshipRepository.findDescendants(id).stream()
                .map(PersonResponse::from)
                .toList();
    }

    @GetMapping("/api/persons/{id}/siblings")
    @Transactional(readOnly = true)
    public List<PersonResponse> siblings(@PathVariable UUID id) {
        return relationshipRepository.findSiblings(id).stream()
                .map(PersonResponse::from)
                .toList();
    }
}
