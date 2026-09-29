package com.tatonimatteo.familymanager.core.web.person;

import com.tatonimatteo.familymanager.core.domain.Account;
import com.tatonimatteo.familymanager.core.domain.Person;
import com.tatonimatteo.familymanager.core.repository.AccountRepository;
import com.tatonimatteo.familymanager.core.repository.PersonRepository;
import com.tatonimatteo.familymanager.core.web.person.dto.CreatePersonRequest;
import com.tatonimatteo.familymanager.core.web.person.dto.PersonResponse;
import com.tatonimatteo.familymanager.core.web.person.dto.UpdatePersonRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/persons")
@Tag(name = "Persons", description = "Person management")
public class PersonController {

    private final PersonRepository personRepository;

    private final AccountRepository accounts;

    public PersonController(PersonRepository personRepository, AccountRepository accounts) {
        this.personRepository = personRepository;
        this.accounts = accounts;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a person")
    @ApiResponse(responseCode = "201", description = "Person created")
    public ResponseEntity<PersonResponse> create(@Valid @RequestBody CreatePersonRequest request) {

        Person person = new Person(request.displayName());
        person.setBirthDate(request.birthDate());
        person.setGender(request.gender());

        Person saved = personRepository.save(person);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(PersonResponse.from(saved));
    }

    @GetMapping
    @Operation(summary = "List persons")
    public List<PersonResponse> list() {
        return personRepository.findAll().stream()
                .map(PersonResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a person by ID")
    public PersonResponse getById(@PathVariable UUID id) {
        return PersonResponse.from(findOrThrow(id));
    }

    private Person findOrThrow(UUID id) {
        return personRepository.findById(id)
                .orElseThrow(() ->
                        new EntityNotFoundException("Person non trovata: " + id));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update a person")
    public PersonResponse update(@PathVariable UUID id, @RequestBody UpdatePersonRequest request,
            Authentication authentication) {

        Person person = findOrThrow(id);
        Account actor = accounts.findByEmail(authentication.getName()).orElseThrow();
        if (!"ADMIN".equals(actor.getRole()) && (person.getAccount() == null || !person.getAccount().getId().equals(
                actor.getId()))) {
            throw new org.springframework.security.access.AccessDeniedException("Puoi modificare solo il tuo profilo.");
        }

        if (request.displayName() != null) {
            person.setDisplayName(request.displayName());
        }
        if (request.birthDate() != null) {
            person.setBirthDate(request.birthDate());
        }
        if (request.gender() != null) {
            person.setGender(request.gender());
        }

        Person saved = personRepository.save(person);

        return PersonResponse.from(saved);
    }

    @Operation(summary = "Delete a person")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        Person person = findOrThrow(id);
        if (person.getAccount() != null && "ACTIVE".equals(person.getAccount().getStatus())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.CONFLICT,
                    "Non puoi eliminare un profilo associato a un account attivo. Elimina prima l'account.");
        }
        personRepository.delete(person);

        return ResponseEntity.noContent().build();
    }
}
