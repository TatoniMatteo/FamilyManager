package com.tatonimatteo.familymanager.core.web.auth;

import com.tatonimatteo.familymanager.core.domain.Account;
import com.tatonimatteo.familymanager.core.domain.Person;
import com.tatonimatteo.familymanager.core.repository.AccountRepository;
import com.tatonimatteo.familymanager.core.repository.PersonRepository;
import com.tatonimatteo.familymanager.core.security.InviteService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/accounts")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAccountController {

    private final AccountRepository accounts;

    private final PersonRepository people;

    private final InviteService inviteService;

    public AdminAccountController(AccountRepository accounts, PersonRepository people, InviteService inviteService) {
        this.accounts = accounts;
        this.people = people;
        this.inviteService = inviteService;
    }

    @GetMapping("/active")
    public List<ActiveAccountResponse> activeAccounts(org.springframework.security.core.Authentication authentication) {
        Account current = accounts.findByEmail(authentication.getName()).orElseThrow();
        return accounts.findByStatusAndIdNotOrderByEmailAsc("ACTIVE", current.getId()).stream()
                .map(account -> new ActiveAccountResponse(account.getId(), account.getEmail(), account.getRole()))
                .toList();
    }

    @PostMapping("/transfer-administrator")
    @Transactional
    public void transferAdministrator(org.springframework.security.core.Authentication authentication,
            @Valid @RequestBody TransferAdministratorRequest request) {
        Account current = accounts.findByEmail(authentication.getName()).orElseThrow();
        Account replacement = accounts.findById(request.accountId())
                .orElseThrow(() -> new EntityNotFoundException("Account non trovato."));
        if (current.getId().equals(replacement.getId()) || !"ACTIVE".equals(replacement.getStatus())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Seleziona un altro account attivo.");
        }
        if ("ADMIN".equals(current.getRole())) {
            current.demoteFromAdministrator();
            accounts.saveAndFlush(current);
        }
        replacement.promoteToAdministrator();
        accounts.save(replacement);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                current.getEmail(), null, java.util.List.of(new SimpleGrantedAuthority("ROLE_MEMBER"))));
    }

    @GetMapping("/pending")
    public List<PendingAccountResponse> pending() {
        return accounts.findByStatusOrderByCreatedAtAsc("PENDING_APPROVAL").stream()
                .map(account -> {
                    var invitedProfile = inviteService.invitedProfile(account.getId()).orElse(null);
                    return new PendingAccountResponse(account.getId(), account.getEmail(), account.getCreatedAt(),
                            invitedProfile == null ? null : invitedProfile.type(),
                            invitedProfile == null ? null : invitedProfile.displayName());
                })
                .toList();
    }

    @GetMapping("/available-profiles")
    public List<AvailableProfileResponse> availableProfiles() {
        return people.findByAccountIsNullOrderByDisplayNameAsc().stream()
                .map(person -> new AvailableProfileResponse(person.getId(), person.getDisplayName()))
                .toList();
    }

    @PostMapping("/{accountId}/approve")
    @Transactional
    public AccountApprovalResponse approve(@PathVariable UUID accountId,
            @Valid @RequestBody ApproveAccountRequest request) {
        Account account = accounts.findById(accountId)
                .orElseThrow(() -> new EntityNotFoundException("Account non trovato."));
        if (!"PENDING_APPROVAL".equals(account.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "L'account non è in attesa di approvazione.");
        }
        if (people.findByAccountId(accountId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "L'account ha già un profilo associato.");
        }

        Person person;
        var invitedPerson = inviteService.invitedPerson(accountId);
        if (invitedPerson.isPresent()) {
            person = invitedPerson.get();
            if (person.getAccount() != null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Il profilo invitato è già associato a un account.");
            }
        } else if (request.personId() != null) {
            person = people.findById(request.personId())
                    .orElseThrow(() -> new EntityNotFoundException("Profilo non trovato."));
            if (person.getAccount() != null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Il profilo è già associato a un account.");
            }
        } else if (request.displayName() != null && !request.displayName().isBlank()) {
            person = new Person(request.displayName().trim());
            person.setBirthDate(request.birthDate());
            person.setGender(request.gender());
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Indica un profilo esistente oppure i dati per crearne uno.");
        }

        person.setAccount(account);
        person = people.save(person);
        account.approve();
        accounts.save(account);
        return new AccountApprovalResponse(account.getId(), account.getStatus(), person.getId());
    }

    public record PendingAccountResponse(UUID id, String email, java.time.Instant registeredAt, String invitationType,
                                         String invitedProfileName) {

    }

    public record AvailableProfileResponse(UUID id, String displayName) {

    }

    public record ApproveAccountRequest(UUID personId, @Size(max = 255) String displayName,
                                        LocalDate birthDate, @Size(max = 50) String gender) {

    }

    public record AccountApprovalResponse(UUID accountId, String status, UUID personId) {

    }

    public record ActiveAccountResponse(UUID id, String email, String role) {

    }

    public record TransferAdministratorRequest(@jakarta.validation.constraints.NotNull UUID accountId) {

    }
}
