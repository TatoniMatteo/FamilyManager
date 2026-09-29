package com.tatonimatteo.familymanager.core.web.auth;

import com.tatonimatteo.familymanager.core.domain.Account;
import com.tatonimatteo.familymanager.core.domain.Person;
import com.tatonimatteo.familymanager.core.repository.AccountRepository;
import com.tatonimatteo.familymanager.core.repository.FamilyInvitationRepository;
import com.tatonimatteo.familymanager.core.repository.PersonRepository;
import com.tatonimatteo.familymanager.core.security.AccountAuthService;
import com.tatonimatteo.familymanager.core.security.InviteService;
import com.tatonimatteo.familymanager.core.security.PasswordManagementService;
import com.tatonimatteo.familymanager.core.web.person.dto.PersonResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String GOOGLE_INVITATION_SESSION_KEY = "familymanager.google.invitation";

    private static final String GOOGLE_LINK_SESSION_KEY = "familymanager.google.link.account";

    private final AccountAuthService authService;

    private final AccountRepository accounts;

    private final PersonRepository people;

    private final AuthenticationManager authenticationManager;

    private final InviteService inviteService;

    private final PasswordManagementService passwordManagementService;

    private final FamilyInvitationRepository invitations;

    private final UserDetailsService userDetailsService;

    @Value("${family.auth.google.enabled:false}")
    private boolean googleEnabled;

    public AuthController(AccountAuthService authService, AccountRepository accounts, PersonRepository people,
            AuthenticationManager authenticationManager, InviteService inviteService,
            PasswordManagementService passwordManagementService, FamilyInvitationRepository invitations,
            UserDetailsService userDetailsService) {
        this.authService = authService;
        this.accounts = accounts;
        this.people = people;
        this.authenticationManager = authenticationManager;
        this.inviteService = inviteService;
        this.passwordManagementService = passwordManagementService;
        this.invitations = invitations;
        this.userDetailsService = userDetailsService;
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken());
    }

    @GetMapping("/status")
    public Map<String, Boolean> status() {
        return Map.of("bootstrapRequired", accounts.countByInitialAdminTrue() == 0);
    }

    @GetMapping("/google/status")
    public Map<String, Boolean> googleStatus() {
        return Map.of("enabled", googleEnabled);
    }

    @PostMapping("/google/invitation")
    public Map<String, String> prepareGoogleInvitation(@Valid @RequestBody GoogleInvitationRequest request,
            HttpServletRequest servletRequest) {
        inviteService.info(request.invitationToken());
        servletRequest.getSession(true).setAttribute(GOOGLE_INVITATION_SESSION_KEY, request.invitationToken());
        return Map.of("authorizationUrl", "/oauth2/authorization/google");
    }

    @PostMapping("/google/link")
    public Map<String, String> beginGoogleLink(Authentication authentication, HttpServletRequest servletRequest) {
        Account account = authService.getActiveAccount(authentication.getName());
        servletRequest.getSession(true).setAttribute(GOOGLE_LINK_SESSION_KEY, account.getId().toString());
        return Map.of("authorizationUrl", "/oauth2/authorization/google");
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> register(@Valid @RequestBody RegistrationRequest request) {
        authService.register(request.email(), request.password(), request.invitationToken());
        return Map.of("status", "EMAIL_VERIFICATION_REQUIRED");
    }

    @GetMapping("/invitation")
    public InviteService.InviteInfo invitation(@RequestParam String token) {
        return inviteService.info(token);
    }

    @PostMapping("/password/reset-request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        passwordManagementService.requestReset(request.email());
        return Map.of("status", "IF_ACCOUNT_EXISTS_EMAIL_SENT");
    }

    @PostMapping("/password/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ChangePasswordRequest request) {
        passwordManagementService.resetPassword(request.token(), request.password());
    }

    @PostMapping("/password/setup")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, String> setupPassword(@Valid @RequestBody ChangePasswordRequest request) {
        Account account = passwordManagementService.setPassword(request.token(), request.password());
        return Map.of("status", account.getStatus());
    }

    @PostMapping("/google/password-setup")
    @PreAuthorize("hasAuthority('ROLE_GOOGLE_SETUP')")
    public Map<String, String> setupGooglePassword(@Valid @RequestBody GooglePasswordSetupRequest request,
            Authentication authentication) {
        Account account = passwordManagementService.completeGooglePasswordSetup(authentication.getName(),
                request.password());
        return Map.of("status", account.getStatus());
    }

    @PostMapping("/verify-email")
    public Map<String, String> verifyEmail(@Valid @RequestBody VerifyRequest request) {
        Account account = authService.verifyEmail(request.token());
        return Map.of("status", account.getStatus(), "initialAdmin", Boolean.toString(account.isInitialAdmin()),
                "profileComplete", Boolean.toString(people.findByAccountId(account.getId()).isPresent()));
    }

    @PostMapping("/login")
    public AccountResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        String email = request.email().trim().toLowerCase();
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, request.password()));
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Email o password non validi, oppure account non ancora attivo.");
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        if (servletRequest.getSession(false) != null) {
            servletRequest.changeSessionId();
        }
        HttpSession session = servletRequest.getSession(true);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
        return accountResponse(authService.getActiveAccount(email));
    }

    private AccountResponse accountResponse(Account account) {
        return accountResponse(account, null);
    }

    private AccountResponse accountResponse(Account account, HttpServletRequest request) {
        Person person = people.findByAccountId(account.getId()).orElse(null);
        HttpSession session = request == null ? null : request.getSession(false);
        return new AccountResponse(account.getId().toString(), account.getEmail(), account.getRole(),
                person != null, personDetailsComplete(person), account.getGoogleSub() != null,
                person == null ? null : person.getId().toString(),
                "PENDING_PASSWORD_SETUP".equals(account.getStatus()), "PENDING_APPROVAL".equals(account.getStatus()),
                firstNonBlank(person == null ? null : person.getFirstName(),
                        sessionValue(session, "familymanager.google.given-name")),
                firstNonBlank(person == null ? null : person.getLastName(),
                        sessionValue(session, "familymanager.google.family-name")),
                firstNonBlank(person == null || person.getBirthDate() == null ? null : person.getBirthDate().toString(),
                        sessionValue(session, "familymanager.google.birth-date")),
                firstNonBlank(person == null ? null : normalizeGender(person.getGender()),
                        sessionValue(session, "familymanager.google.gender")));
    }

    private boolean personDetailsComplete(Person person) {
        return person != null && person.getFirstName() != null && !person.getFirstName().isBlank()
                && person.getLastName() != null && !person.getLastName().isBlank()
                && person.getBirthDate() != null && normalizeGender(person.getGender()) != null;
    }

    private String firstNonBlank(String preferred, String fallback) {
        return preferred == null || preferred.isBlank() ? fallback : preferred;
    }

    private String sessionValue(HttpSession session, String key) {
        Object value = session == null ? null : session.getAttribute(key);
        return value instanceof String text ? text : null;
    }

    private String normalizeGender(String gender) {
        if (gender == null) {
            return null;
        }
        String normalized = gender.toUpperCase(java.util.Locale.ROOT);
        return switch (normalized) {
            case "MALE", "FEMALE", "OTHER" -> normalized;
            default -> null;
        };
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
    }

    @GetMapping("/me")
    public AccountResponse me(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        Account account = accounts.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account non trovato."));
        if ("ACTIVE".equals(account.getStatus()) && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_GOOGLE_SETUP".equals(authority.getAuthority()))) {
            var user = userDetailsService.loadUserByUsername(account.getEmail());
            Authentication applicationAuthentication = UsernamePasswordAuthenticationToken.authenticated(
                    user, null, user.getAuthorities());
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(applicationAuthentication);
            SecurityContextHolder.setContext(context);
            new HttpSessionSecurityContextRepository().saveContext(context, request, response);
        }
        return accountResponse(account, request);
    }

    @DeleteMapping("/account")
    @Transactional
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOwnAccount(Authentication authentication, HttpServletRequest request) {
        Account account = authService.getActiveAccount(authentication.getName());
        if (account.isInitialAdmin()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Prima di eliminare l'account, nomina un nuovo amministratore dalle impostazioni.");
        }
        invitations.deleteByCreatedBy_Id(account.getId());
        accounts.delete(account);
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
    }

    @PostMapping("/profile")
    @PreAuthorize("hasAnyRole('ADMIN', 'MEMBER')")
    @ResponseStatus(HttpStatus.CREATED)
    public PersonResponse createOwnProfile(Authentication authentication, @Valid @RequestBody ProfileRequest request,
            HttpServletRequest servletRequest) {
        Person person = authService.createOwnProfile(authentication.getName(), request.firstName(), request.lastName(),
                request.birthDate(), request.gender());
        HttpSession session = servletRequest.getSession(false);
        if (session != null) {
            session.removeAttribute("familymanager.google.given-name");
            session.removeAttribute("familymanager.google.family-name");
            session.removeAttribute("familymanager.google.birth-date");
            session.removeAttribute("familymanager.google.gender");
        }
        return PersonResponse.from(person);
    }

    public record RegistrationRequest(@NotBlank @Email String email,
                                      @NotBlank @Size(min = 12, max = 128) String password,
                                      String invitationToken) {

    }

    public record GoogleInvitationRequest(@NotBlank String invitationToken) {

    }

    public record VerifyRequest(@NotBlank String token) {

    }

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {

    }

    public record ProfileRequest(@NotBlank @Size(max = 100) String firstName,
                                 @NotBlank @Size(max = 100) String lastName,
                                 @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.PastOrPresent LocalDate birthDate,
                                 @NotBlank @jakarta.validation.constraints.Pattern(regexp = "MALE|FEMALE|OTHER") String gender) {

    }

    public record GooglePasswordSetupRequest(@NotBlank @Size(min = 12, max = 128) String password) {

    }

    public record PasswordResetRequest(@NotBlank @Email String email) {

    }

    public record ChangePasswordRequest(@NotBlank String token, @NotBlank @Size(min = 12, max = 128) String password) {

    }

    public record AccountResponse(String id, String email, String role, boolean profileComplete,
                                  boolean profileDetailsComplete, boolean googleConnected,
                                  String personId, boolean passwordSetupRequired, boolean approvalPending,
                                  String suggestedFirstName, String suggestedLastName, String suggestedBirthDate,
                                  String suggestedGender) {

    }
}
