package com.tatonimatteo.familymanager.core.security;

import com.tatonimatteo.familymanager.core.domain.Account;
import com.tatonimatteo.familymanager.core.domain.FamilyInvitation;
import com.tatonimatteo.familymanager.core.domain.InvitationType;
import com.tatonimatteo.familymanager.core.domain.Person;
import com.tatonimatteo.familymanager.core.repository.FamilyInvitationRepository;
import com.tatonimatteo.familymanager.core.repository.PersonRepository;
import jakarta.persistence.EntityNotFoundException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InviteService {

    private static final Logger log = LoggerFactory.getLogger(InviteService.class);

    private final FamilyInvitationRepository invitations;

    private final PersonRepository people;

    private final JavaMailSender mail;

    private final SecureRandom random = new SecureRandom();

    @Value("${family.auth.web-base-url:https://localhost}")
    private String webBaseUrl;

    @Value("${spring.mail.username:}")
    private String sender;

    public InviteService(FamilyInvitationRepository invitations, PersonRepository people, JavaMailSender mail) {
        this.invitations = invitations;
        this.people = people;
        this.mail = mail;
    }

    @Transactional
    public CreatedInvitation create(Account creator, String email, InvitationType type, UUID personId,
            long expiresInHours) {
        if (expiresInHours < 1 || expiresInHours > 8760) {
            throw new IllegalArgumentException(
                    "La durata deve essere compresa tra 1 ora e 365 giorni.");
        }
        String normalizedEmail = email.trim().toLowerCase();
        Person person = null;
        if (type == InvitationType.SIMPLE && personId != null) {
            throw new IllegalArgumentException(
                    "L'invito semplice non deve indicare un profilo.");
        }
        if (type != InvitationType.SIMPLE) {
            if (personId == null) {
                throw new IllegalArgumentException("Seleziona il profilo da associare.");
            }
            person = people.findById(personId).orElseThrow(() -> new EntityNotFoundException("Profilo non trovato."));
            if (person.getAccount() != null) {
                throw new IllegalArgumentException(
                        "Il profilo selezionato è già collegato a un account.");
            }
            boolean pendingInvite = invitations.findByRegisteredAccountIsNullOrderByCreatedAtDesc().stream()
                    .anyMatch(invitation -> invitation.getPerson() != null && invitation.getPerson()
                            .getId()
                            .equals(personId) && !invitation.isExpired());
            if (pendingInvite) {
                throw new IllegalArgumentException("Esiste già un invito attivo per questo profilo.");
            }
        }
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        FamilyInvitation invitation = invitations.save(new FamilyInvitation(normalizedEmail, type, person, digest(raw),
                Instant.now().plus(expiresInHours, ChronoUnit.HOURS), creator));
        String url = webBaseUrl + "/register?invitation=" + raw;
        SimpleMailMessage message = new SimpleMailMessage();
        if (sender != null && !sender.isBlank()) {
            message.setFrom(sender);
        }
        message.setTo(normalizedEmail);
        message.setSubject("Invito a FamilyManager");
        message.setText("Sei stato invitato a FamilyManager. Crea il tuo account usando questo link:\n\n" + url
                + "\n\nL'invito scade il " + invitation.getExpiresAt() + ". Il link è personale e richiede l'indirizzo "
                + normalizedEmail + ".");
        try {
            mail.send(message);
        } catch (RuntimeException exception) {
            log.warn(
                    "Invito creato per {} ma l'email non è stata inviata; il link resta disponibile per la condivisione",
                    normalizedEmail, exception);
        }
        return new CreatedInvitation(invitation.getId(), normalizedEmail, url, invitation.getExpiresAt());
    }

    private String digest(String raw) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("SHA-256 non disponibile", exception);
        }
    }

    @Transactional(readOnly = true)
    public InviteInfo info(String rawToken) {
        FamilyInvitation invitation = invitations.findByTokenHash(digest(rawToken))
                .orElseThrow(() -> new IllegalArgumentException("Invito non valido o scaduto."));
        validate(invitation);
        return new InviteInfo(invitation.getEmail(), invitation.getType().name(), invitation.getExpiresAt());
    }

    private void validate(FamilyInvitation invitation) {
        if (invitation.isUsed()) {
            throw new IllegalArgumentException("L'invito è già stato utilizzato.");
        }
        if (invitation.isExpired()) {
            throw new IllegalArgumentException("L'invito è scaduto.");
        }
    }

    @Transactional
    public void bindRegistration(String rawToken, String email, Account account) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        FamilyInvitation invitation = invitations.findByTokenHash(digest(rawToken))
                .orElseThrow(() -> new IllegalArgumentException("Invito non valido o scaduto."));
        validate(invitation);
        if (!invitation.getEmail().equalsIgnoreCase(email.trim())) {
            throw new IllegalArgumentException("Questo invito è destinato a un altro indirizzo email.");
        }
        invitation.bind(account);
        invitations.save(invitation);
    }

    @Transactional
    public void completeVerifiedInvitation(Account account) {
        Optional<FamilyInvitation> optional = invitations.findByRegisteredAccount_Id(account.getId());
        if (optional.isEmpty()) {
            return;
        }
        FamilyInvitation invitation = optional.get();
        if (invitation.getType() != InvitationType.PROFILE_EMAIL) {
            return;
        }
        attachPerson(invitation, account);
        account.approve();
        SimpleMailMessage notification = new SimpleMailMessage();
        if (sender != null && !sender.isBlank()) {
            notification.setFrom(sender);
        }
        notification.setTo(invitation.getCreatedBy().getEmail());
        notification.setSubject("Un account ha completato l'invito FamilyManager");
        notification.setText(
                "L'account " + account.getEmail() + " ha completato l'invito ed è stato collegato al profilo "
                        + invitation.getPerson().getDisplayName() + ".");
        try {
            mail.send(notification);
        } catch (RuntimeException exception) {
            log.warn("Invito completato per {} ma la notifica email non è stata inviata", account.getEmail(),
                    exception);
        }
    }

    private void attachPerson(FamilyInvitation invitation, Account account) {
        Person person = invitation.getPerson();
        if (person.getAccount() != null && !person.getAccount().getId().equals(account.getId())) {
            throw new IllegalArgumentException("Il profilo invitato è già associato a un altro account.");
        }
        person.setAccount(account);
        people.save(person);
    }

    @Transactional(readOnly = true)
    public Optional<Person> invitedPerson(UUID accountId) {
        return invitations.findByRegisteredAccount_Id(accountId)
                .filter(invitation -> invitation.getType() != InvitationType.SIMPLE)
                .map(FamilyInvitation::getPerson);
    }

    @Transactional(readOnly = true)
    public Optional<InvitedProfile> invitedProfile(UUID accountId) {
        return invitations.findByRegisteredAccount_Id(accountId)
                .filter(invitation -> invitation.getType() != InvitationType.SIMPLE)
                .map(invitation -> new InvitedProfile(invitation.getType().name(),
                        invitation.getPerson().getDisplayName()));
    }

    @Transactional
    public void attachInvitedPerson(UUID accountId, Account account) {
        invitations.findByRegisteredAccount_Id(accountId)
                .filter(invitation -> invitation.getType() != InvitationType.SIMPLE)
                .ifPresent(invitation -> attachPerson(invitation, account));
    }

    public record CreatedInvitation(UUID id, String email, String url, Instant expiresAt) {

    }

    public record InviteInfo(String email, String type, Instant expiresAt) {

    }

    public record InvitedProfile(String type, String displayName) {

    }
}
