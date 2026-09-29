package com.tatonimatteo.familymanager.core.security;

import com.tatonimatteo.familymanager.core.domain.Account;
import com.tatonimatteo.familymanager.core.repository.AccountRepository;
import com.tatonimatteo.familymanager.core.repository.PersonRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class GoogleOAuthSuccessHandler implements AuthenticationSuccessHandler {

    private static final String INVITATION_SESSION_KEY = "familymanager.google.invitation";

    private static final String LINK_SESSION_KEY = "familymanager.google.link.account";

    private final AccountRepository accounts;

    private final PersonRepository people;

    private final InviteService invites;

    private final UserDetailsService userDetailsService;

    @Value("${family.auth.web-base-url:https://localhost}")
    private String webBaseUrl;

    @Value("${family.auth.google.enabled:false}")
    private boolean googleEnabled;

    public GoogleOAuthSuccessHandler(AccountRepository accounts, PersonRepository people, InviteService invites,
            UserDetailsService userDetailsService) {
        this.accounts = accounts;
        this.people = people;
        this.invites = invites;
        this.userDetailsService = userDetailsService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {
        if (!googleEnabled) {
            clearAuthentication(request);
            response.sendRedirect(webBaseUrl + "/login?error=google-not-configured");
            return;
        }
        OAuth2User googleUser = (OAuth2User) authentication.getPrincipal();
        String email = googleUser.getAttribute("email");
        String sub = googleUser instanceof OidcUser oidc ? oidc.getSubject() : googleUser.getAttribute("sub");
        Object verifiedClaim = googleUser.getAttribute("email_verified");
        boolean emailVerified = Boolean.TRUE.equals(verifiedClaim) || "true".equalsIgnoreCase(
                String.valueOf(verifiedClaim));
        if (email == null || sub == null || !emailVerified) {
            clearAuthentication(request);
            response.sendRedirect(webBaseUrl + "/login?error=google-email-unverified");
            return;
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        rememberGoogleProfile(request, googleUser);
        String linkedAccountId = request.getSession(false) == null ? null
                : (String) request.getSession(false).getAttribute(LINK_SESSION_KEY);
        if (linkedAccountId != null) {
            request.getSession(false).removeAttribute(LINK_SESSION_KEY);
            Account target = accounts.findById(java.util.UUID.fromString(linkedAccountId)).orElse(null);
            Account owner = accounts.findByGoogleSub(sub).orElse(null);
            if (target == null || !"ACTIVE".equals(target.getStatus()) || target.getPasswordHash() == null
                    || (owner != null && !owner.getId().equals(target.getId()))
                    || (target.getGoogleSub() != null && !target.getGoogleSub().equals(sub))) {
                clearAuthentication(request);
                response.sendRedirect(webBaseUrl + "/settings?google=link-error");
                return;
            }
            target.setGoogleSub(sub);
            accounts.save(target);
            authenticate(target, request, response);
            response.sendRedirect(webBaseUrl + "/settings?google=linked");
            return;
        }
        Account account = accounts.findByGoogleSub(sub).orElseGet(
                () -> accounts.findByEmail(normalizedEmail).orElse(null));
        String invitationToken = request.getSession(false) == null ? null
                : (String) request.getSession(false).getAttribute(INVITATION_SESSION_KEY);
        if (request.getSession(false) != null) {
            request.getSession(false).removeAttribute(INVITATION_SESSION_KEY);
        }

        if (account == null) {
            boolean initialAdmin = accounts.countByInitialAdminTrue() == 0;
            account = new Account(normalizedEmail, null, initialAdmin);
            account.setGoogleSub(sub);
            account.verifyEmail(Instant.now());
            account.requirePasswordSetup();
            account = accounts.save(account);
            try {
                invites.bindRegistration(invitationToken, normalizedEmail, account);
            } catch (RuntimeException exception) {
                accounts.delete(account);
                clearAuthentication(request);
                response.sendRedirect(webBaseUrl + "/login?error=invitation-invalid");
                return;
            }
            authenticateForPasswordSetup(account, request, response);
            response.sendRedirect(webBaseUrl + "/set-password");
            return;
        }

        if (account.getGoogleSub() != null && !account.getGoogleSub().equals(sub)) {
            clearAuthentication(request);
            response.sendRedirect(webBaseUrl + "/login?error=google-account-linked");
            return;
        }
        if (invitationToken != null && !invitationToken.isBlank()) {
            try {
                invites.bindRegistration(invitationToken, normalizedEmail, account);
            } catch (RuntimeException exception) {
                clearAuthentication(request);
                response.sendRedirect(webBaseUrl + "/login?error=invitation-invalid");
                return;
            }
        }
        if (account.getGoogleSub() == null) {
            account.setGoogleSub(sub);
        }
        if ("PENDING_EMAIL_VERIFICATION".equals(account.getStatus())) {
            account.verifyEmail(Instant.now());
        }
        if (account.getPasswordHash() == null) {
            account.requirePasswordSetup();
        }
        if (account.getPasswordHash() != null && account.getEmailVerifiedAt() != null) {
            invites.completeVerifiedInvitation(account);
        }
        accounts.save(account);
        if ("PENDING_PASSWORD_SETUP".equals(account.getStatus())) {
            authenticateForPasswordSetup(account, request, response);
            response.sendRedirect(webBaseUrl + "/set-password");
            return;
        }
        if (!"ACTIVE".equals(account.getStatus())) {
            clearAuthentication(request);
            response.sendRedirect(webBaseUrl + "/login?google=pending-approval");
            return;
        }

        authenticate(account, request, response);
        boolean profileComplete = people.findByAccountId(account.getId()).isPresent();
        response.sendRedirect(UriComponentsBuilder.fromUriString(webBaseUrl)
                .path(profileComplete ? "/" : "/initial-setup").build().toUriString());
    }

    private void clearAuthentication(HttpServletRequest request) {
        SecurityContextHolder.clearContext();
        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
        }
    }

    private void rememberGoogleProfile(HttpServletRequest request, OAuth2User googleUser) {
        var session = request.getSession(true);
        session.removeAttribute("familymanager.google.given-name");
        session.removeAttribute("familymanager.google.family-name");
        session.removeAttribute("familymanager.google.birth-date");
        session.removeAttribute("familymanager.google.gender");
        saveProfileAttribute(session, "familymanager.google.given-name", googleUser.getAttribute("given_name"));
        saveProfileAttribute(session, "familymanager.google.family-name", googleUser.getAttribute("family_name"));
        saveProfileAttribute(session, "familymanager.google.birth-date", googleUser.getAttribute("birthdate"));
        Object genderClaim = googleUser.getAttribute("gender");
        if (genderClaim instanceof String gender) {
            switch (gender.toLowerCase(Locale.ROOT)) {
                case "male" -> session.setAttribute("familymanager.google.gender", "MALE");
                case "female" -> session.setAttribute("familymanager.google.gender", "FEMALE");
                case "other" -> session.setAttribute("familymanager.google.gender", "OTHER");
                default -> {}
            }
        }
    }

    private void authenticate(Account account, HttpServletRequest request, HttpServletResponse response) {
        var user = userDetailsService.loadUserByUsername(account.getEmail());
        Authentication applicationAuthentication = UsernamePasswordAuthenticationToken.authenticated(user, null,
                user.getAuthorities());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(applicationAuthentication);
        SecurityContextHolder.setContext(context);
        request.changeSessionId();
        new HttpSessionSecurityContextRepository().saveContext(context, request, response);
    }

    private void authenticateForPasswordSetup(Account account, HttpServletRequest request,
            HttpServletResponse response) {
        var user = org.springframework.security.core.userdetails.User.withUsername(account.getEmail())
                .password("")
                .authorities("ROLE_GOOGLE_SETUP")
                .build();
        Authentication applicationAuthentication = UsernamePasswordAuthenticationToken.authenticated(user, null,
                user.getAuthorities());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(applicationAuthentication);
        SecurityContextHolder.setContext(context);
        request.changeSessionId();
        new HttpSessionSecurityContextRepository().saveContext(context, request, response);
    }

    private void saveProfileAttribute(jakarta.servlet.http.HttpSession session, String key, Object value) {
        if (value instanceof String text && !text.isBlank()) {
            session.setAttribute(key, text);
        }
    }
}
