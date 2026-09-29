package com.tatonimatteo.familymanager.core.security;

import com.tatonimatteo.familymanager.core.domain.Account;
import com.tatonimatteo.familymanager.core.domain.AccountActionToken;
import com.tatonimatteo.familymanager.core.repository.AccountActionTokenRepository;
import com.tatonimatteo.familymanager.core.repository.AccountRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordManagementService {

    private static final Logger log = LoggerFactory.getLogger(PasswordManagementService.class);

    private static final String RESET = "PASSWORD_RESET";

    private static final String SETUP = "PASSWORD_SETUP";

    private final AccountRepository accounts;

    private final AccountActionTokenRepository tokens;

    private final PasswordEncoder passwordEncoder;

    private final JavaMailSender mail;

    private final InviteService inviteService;

    private final SecureRandom random = new SecureRandom();

    @Value("${family.auth.web-base-url:https://localhost}")
    private String webBaseUrl;

    @Value("${spring.mail.username:}")
    private String sender;

    @Value("${family.auth.password-token-hours:1}")
    private long tokenHours;

    public PasswordManagementService(AccountRepository accounts, AccountActionTokenRepository tokens,
            PasswordEncoder passwordEncoder, JavaMailSender mail, InviteService inviteService) {
        this.accounts = accounts;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
        this.mail = mail;
        this.inviteService = inviteService;
    }

    @Transactional
    public void requestReset(String email) {
        accounts.findByEmail(email.trim().toLowerCase())
                .filter(account -> "ACTIVE".equals(account.getStatus()) && account.getPasswordHash() != null)
                .ifPresent(account -> sendToken(account, RESET, "/reset-password?token="));
    }

    private void sendToken(Account account, String purpose, String route) {
        tokens.deleteByAccount_IdAndPurpose(account.getId(), purpose);
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokens.save(new AccountActionToken(account, purpose, digest(raw),
                Instant.now().plus(tokenHours, ChronoUnit.HOURS)));
        SimpleMailMessage message = new SimpleMailMessage();
        if (sender != null && !sender.isBlank()) {
            message.setFrom(sender);
        }
        message.setTo(account.getEmail());
        message.setSubject(RESET.equals(purpose)
                ? "Reimposta la password – FamilyManager"
                : "Imposta la password – FamilyManager");
        message.setText("Per continuare, apri questo link:\n\n" + webBaseUrl + route + raw
                + "\n\nIl link scade tra " + tokenHours + " ora/e.");
        try {
            mail.send(message);
        } catch (RuntimeException exception) {
            log.warn("Token {} creato per l'account {} ma l'email non è stata inviata", purpose, account.getId(),
                    exception);
        }
    }

    private String digest(String raw) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("SHA-256 non disponibile", exception);
        }
    }

    @Transactional
    public Account setPassword(String rawToken, String password) {
        AccountActionToken token = tokens.findByTokenHashAndPurpose(digest(rawToken), SETUP)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Il link per impostare la password non è valido o è scaduto."));
        Account account = token.getAccount();
        if ("PENDING_PASSWORD_SETUP".equals(account.getStatus())) {
            if (token.isExpired()) {
                throw new IllegalArgumentException("Il link è scaduto. Richiedine uno nuovo.");
            }
            account.completeGooglePasswordSetup(passwordEncoder.encode(password));
            tokens.delete(token);
            inviteService.completeVerifiedInvitation(account);
        } else {
            consume(token, password);
        }
        accounts.save(account);
        return account;
    }

    private void consume(AccountActionToken token, String password) {
        if (token.isExpired()) {
            throw new IllegalArgumentException("Il link è scaduto. Richiedine uno nuovo.");
        }
        token.getAccount().setPasswordHash(passwordEncoder.encode(password));
        tokens.delete(token);
    }

    @Transactional
    public Account completeGooglePasswordSetup(String email, String password) {
        Account account = accounts.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Account non trovato."));
        if (!"PENDING_PASSWORD_SETUP".equals(account.getStatus())) {
            throw new IllegalArgumentException("La configurazione della password non è più necessaria.");
        }
        account.completeGooglePasswordSetup(passwordEncoder.encode(password));
        accounts.save(account);
        inviteService.completeVerifiedInvitation(account);
        return account;
    }

    @Transactional
    public void resetPassword(String rawToken, String password) {
        AccountActionToken token = tokens.findByTokenHashAndPurpose(digest(rawToken), RESET)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Il link per reimpostare la password non è valido o è scaduto."));
        consume(token, password);
        accounts.save(token.getAccount());
    }

    @Transactional
    public void issueSetupToken(Account account) {
        sendToken(account, SETUP, "/set-password?token=");
    }
}
