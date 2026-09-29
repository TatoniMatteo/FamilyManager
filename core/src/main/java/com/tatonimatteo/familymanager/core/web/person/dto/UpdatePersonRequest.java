package com.tatonimatteo.familymanager.core.web.person.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

/**
 * Partial update: ogni campo è opzionale, il controller applica solo
 * quelli non nulli. Nessuna {@code @NotBlank} qui, a differenza di
 * {@link CreatePersonRequest} — "non fornito" è una risposta legittima.
 */
public record UpdatePersonRequest(
        @Schema(description = "Display name of the person", example = "Mario Rossi", minLength = 1, maxLength = 100)
        String displayName,

        @Schema(description = "Birth date of the person", example = "1990-01-01")
        LocalDate birthDate,

        @Schema(description = "Gender of the person", example = "MALE")
        String gender
) {

}
