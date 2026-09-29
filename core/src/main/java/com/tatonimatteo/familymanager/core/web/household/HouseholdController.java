package com.tatonimatteo.familymanager.core.web.household;

import com.tatonimatteo.familymanager.core.domain.Household;
import com.tatonimatteo.familymanager.core.domain.HouseholdRole;
import com.tatonimatteo.familymanager.core.domain.Person;
import com.tatonimatteo.familymanager.core.domain.PersonHousehold;
import com.tatonimatteo.familymanager.core.domain.PersonHouseholdId;
import com.tatonimatteo.familymanager.core.repository.HouseholdRepository;
import com.tatonimatteo.familymanager.core.repository.PersonHouseholdRepository;
import com.tatonimatteo.familymanager.core.repository.PersonRepository;
import com.tatonimatteo.familymanager.core.web.common.ApiError;
import com.tatonimatteo.familymanager.core.web.household.dto.AddHouseholdMemberRequest;
import com.tatonimatteo.familymanager.core.web.household.dto.AddHouseholdMembersRequest;
import com.tatonimatteo.familymanager.core.web.household.dto.CreateHouseholdRequest;
import com.tatonimatteo.familymanager.core.web.household.dto.HouseholdMemberResponse;
import com.tatonimatteo.familymanager.core.web.household.dto.HouseholdResponse;
import com.tatonimatteo.familymanager.core.web.household.dto.UpdateHouseholdRequest;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/households")
public class HouseholdController {

    private final HouseholdRepository householdRepository;

    private final PersonHouseholdRepository membershipRepository;

    private final PersonRepository personRepository;

    public HouseholdController(HouseholdRepository householdRepository, PersonHouseholdRepository membershipRepository,
            PersonRepository personRepository) {
        this.householdRepository = householdRepository;
        this.membershipRepository = membershipRepository;
        this.personRepository = personRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<HouseholdResponse> list() {
        return householdRepository.findAll().stream().map(this::response).toList();
    }

    private HouseholdResponse response(Household household) {
        List<HouseholdMemberResponse> members = membershipRepository.findByHousehold_Id(household.getId()).stream()
                .map(HouseholdMemberResponse::from).toList();
        return HouseholdResponse.from(household, members);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> create(@Valid @RequestBody CreateHouseholdRequest request) {
        String name = request.name().trim();
        if (householdRepository.existsByNameIgnoreCase(name)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiError.of(HttpStatus.CONFLICT.value(), "Esiste già un nucleo con questo nome."));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(response(householdRepository.save(new Household(name))));
    }

    @PatchMapping("/{householdId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> rename(@PathVariable UUID householdId,
            @Valid @RequestBody UpdateHouseholdRequest request) {
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new EntityNotFoundException("Nucleo non trovato: " + householdId));
        String name = request.name().trim();
        if (householdRepository.existsByNameIgnoreCaseAndIdNot(name, householdId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiError.of(HttpStatus.CONFLICT.value(), "Esiste già un nucleo con questo nome."));
        }
        household.setName(name);
        return ResponseEntity.ok(response(household));
    }

    @PostMapping("/{householdId}/members")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public HouseholdResponse addMember(@PathVariable UUID householdId,
            @Valid @RequestBody AddHouseholdMemberRequest request) {
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new EntityNotFoundException("Nucleo non trovato: " + householdId));
        Person person = personRepository.findById(request.personId())
                .orElseThrow(() -> new EntityNotFoundException("Persona non trovata: " + request.personId()));
        PersonHouseholdId id = new PersonHouseholdId(person.getId(), household.getId());
        if (!membershipRepository.existsById(id)) {
            membershipRepository.save(new PersonHousehold(person, household, HouseholdRole.MEMBER));
        }
        return response(household);
    }

    @PostMapping("/{householdId}/members/batch")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public HouseholdResponse addMembers(@PathVariable UUID householdId,
            @Valid @RequestBody AddHouseholdMembersRequest request) {
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new EntityNotFoundException("Nucleo non trovato: " + householdId));
        List<UUID> personIds = request.personIds().stream().distinct().toList();
        List<Person> people = personRepository.findAllById(personIds);
        if (people.size() != personIds.size()) {
            throw new EntityNotFoundException("Una o più persone selezionate non sono state trovate.");
        }
        var existingPersonIds = membershipRepository.findByHousehold_Id(householdId).stream()
                .map(membership -> membership.getPerson().getId())
                .collect(java.util.stream.Collectors.toSet());
        List<PersonHousehold> memberships = people.stream()
                .filter(person -> !existingPersonIds.contains(person.getId()))
                .map(person -> new PersonHousehold(person, household, HouseholdRole.MEMBER))
                .toList();
        membershipRepository.saveAll(memberships);
        return response(household);
    }

    @DeleteMapping("/{householdId}/members/{personId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public HouseholdResponse removeMember(@PathVariable UUID householdId, @PathVariable UUID personId) {
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new EntityNotFoundException("Nucleo non trovato: " + householdId));
        membershipRepository.deleteById(new PersonHouseholdId(personId, householdId));
        return response(household);
    }

    @DeleteMapping("/{householdId}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable UUID householdId) {
        if (!householdRepository.existsById(householdId)) {
            throw new EntityNotFoundException("Nucleo non trovato: " + householdId);
        }
        householdRepository.deleteById(householdId);
    }
}
