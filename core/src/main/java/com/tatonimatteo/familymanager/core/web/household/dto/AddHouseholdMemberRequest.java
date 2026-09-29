package com.tatonimatteo.familymanager.core.web.household.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AddHouseholdMemberRequest(@NotNull UUID personId) {

}
