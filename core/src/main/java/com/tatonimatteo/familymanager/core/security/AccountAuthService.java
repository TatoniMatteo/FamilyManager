package com.tatonimatteo.familymanager.core.security;

import com.tatonimatteo.familymanager.core.domain.Account;
import com.tatonimatteo.familymanager.core.domain.EmailVerificationToken;
import com.tatonimatteo.familymanager.core.domain.Person;
import com.tatonimatteo.familymanager.core.repository.AccountRepository;
import com.tatonimatteo.familymanager.core.repository.EmailVerificationTokenRepository;
import com.tatonimatteo.familymanager.core.repository.PersonRepository;
import jakarta.persistence.EntityNotFoundException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountAuthService {

    private final AccountRepository accounts;

    private final EmailVerificationTokenRepository tokens;

    private final PersonRepository people;

    private final PasswordEncoder passwordEncoder;

    private final JavaMailSender mailSender;

    private final InviteService inviteService;

    private final SecureRandom random = new SecureRandom();

    @Value("${family.auth.web-base-url:https://localhost}")
    private String webBaseUrl;

    @Value("${family.auth.verification-hours:24}")
    private long verificationHours;

    @Value("${spring.mail.username:}")
    private String sender;

    public AccountAuthService(AccountRepository accounts, EmailVerificationTokenRepository tokens,
            PersonRepository people, PasswordEncoder passwordEncoder, JavaMailSender mailSender,
            InviteService inviteService) {
        this.accounts = accounts;
        this.tokens = tokens;
        this.people = people;
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSender;
        this.inviteService = inviteService;
    }

    @Transactional
    public void register(String email, String password, String invitationToken) {
        String normalizedEmail = email.trim().toLowerCase();
        if (accounts.findByEmail(normalizedEmail).isPresent()) {
            throw new IllegalArgumentException("Esiste già un account con questo indirizzo email.");
        }
        boolean initialAdmin = accounts.countByInitialAdminTrue() == 0;
        Account account = accounts.save(new Account(normalizedEmail, passwordEncoder.encode(password), initialAdmin));
        inviteService.bindRegistration(invitationToken, normalizedEmail, account);
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokens.save(new EmailVerificationToken(account, digest(rawToken),
                Instant.now().plus(verificationHours, ChronoUnit.HOURS)));

        SimpleMailMessage message = new SimpleMailMessage();
        if (sender != null && !sender.isBlank()) {
            message.setFrom(sender);
        }
        message.setTo(normalizedEmail);
        message.setSubject("Verifica il tuo indirizzo email – FamilyManager");
        message.setText("Per verificare il tuo indirizzo email e continuare, apri questo link:\n\n"
                + webBaseUrl + "/verify-email?token=" + rawToken
                + "\n\nIl link scade tra " + verificationHours + " ore.");
        mailSender.send(message);
    }

    private String digest(String value) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("SHA-256 non disponibile", exception);
        }
    }

    @Transactional
    public Account verifyEmail(String rawToken) {
        EmailVerificationToken token = tokens.findByTokenHash(digest(rawToken))
                .orElseThrow(
                        () -> new IllegalArgumentException("Il link di verifica non è valido o è già stato usato."));
        if (token.getExpiresAt().isBefore(Instant.now())) {
            tokens.delete(token);
            throw new IllegalArgumentException("Il link di verifica è scaduto. Richiedi un nuovo link.");
        }
        Account account = token.getAccount();
        account.verifyEmail(Instant.now());
        inviteService.completeVerifiedInvitation(account);
        tokens.delete(token);
        return accounts.save(account);
    }

    @Transactional
    public Person createOwnProfile(String email, String firstName, String lastName,
            java.time.LocalDate birthDate, String gender) {
        Account account = getActiveAccount(email);
        String normalizedFirstName = firstName.trim();
        String normalizedLastName = lastName.trim();
        Person person = people.findByAccountId(account.getId())
                .orElseGet(() -> {
                    Person created = new Person(normalizedFirstName + " " + normalizedLastName);
                    created.setAccount(account);
                    return created;
                });
        person.setDisplayName(normalizedFirstName + " " + normalizedLastName);
        person.setFirstName(normalizedFirstName);
        person.setLastName(normalizedLastName);
        person.setBirthDate(birthDate);
        person.setGender(gender);
        return people.save(person);
    }

    @Transactional(readOnly = true)
    public Account getActiveAccount(String email) {
        return accounts.findByEmail(email).filter(account -> "ACTIVE".equals(account.getStatus()))
                .orElseThrow(() -> new EntityNotFoundException("Account non trovato."));
    }
}
