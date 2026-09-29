package com.tatonimatteo.familymanager.core.web.household.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateHouseholdRequest(@NotBlank String name) {

}
