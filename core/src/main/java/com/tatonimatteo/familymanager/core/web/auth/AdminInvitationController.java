package com.tatonimatteo.familymanager.core.web.auth;

import com.tatonimatteo.familymanager.core.domain.Account;
import com.tatonimatteo.familymanager.core.domain.InvitationType;
import com.tatonimatteo.familymanager.core.repository.AccountRepository;
import com.tatonimatteo.familymanager.core.repository.FamilyInvitationRepository;
import com.tatonimatteo.familymanager.core.security.InviteService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/invitations")
@PreAuthorize("hasRole('ADMIN')")
public class AdminInvitationController {

    private final InviteService inviteService;

    private final FamilyInvitationRepository invitations;

    private final AccountRepository accounts;

    public AdminInvitationController(InviteService inviteService, FamilyInvitationRepository invitations,
            AccountRepository accounts) {
        this.inviteService = inviteService;
        this.invitations = invitations;
        this.accounts = accounts;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<InvitationResponse> list() {
        return invitations.findByRegisteredAccountIsNullOrderByCreatedAtDesc().stream()
                .map(invitation -> new InvitationResponse(invitation.getId(), invitation.getEmail(),
                        invitation.getType().name(),
                        invitation.getPerson() == null ? null : invitation.getPerson().getDisplayName(),
                        invitation.getExpiresAt()))
                .toList();
    }

    @PostMapping
    public InviteService.CreatedInvitation create(@Valid @RequestBody CreateInvitationRequest request,
            org.springframework.security.core.Authentication authentication) {
        Account creator = accounts.findByEmail(authentication.getName()).orElseThrow();
        return inviteService.create(creator, request.email(), request.type(), request.personId(),
                request.expiresInHours());
    }

    public record CreateInvitationRequest(@NotBlank @Email String email, @NotNull InvitationType type,
                                          UUID personId, @Min(1) @Max(8760) long expiresInHours) {

    }

    public record InvitationResponse(UUID id, String email, String type, String profileName, Instant expiresAt) {

    }
}
