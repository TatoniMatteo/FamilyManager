package com.tatonimatteo.familymanager.core.web.person.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

public record CreatePersonRequest(

        @Schema(description = "Display name of the person", example = "Mario Rossi", minLength = 1, maxLength = 100)
        String displayName,

        @Schema(description = "Birth date of the person", example = "1985-04-23")
        LocalDate birthDate,

        @Schema(description = "Gender of the person", example = "MALE")
        String gender
) {

}
