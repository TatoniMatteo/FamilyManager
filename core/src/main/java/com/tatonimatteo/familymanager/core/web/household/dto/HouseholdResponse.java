package com.tatonimatteo.familymanager.core.web.household.dto;

import com.tatonimatteo.familymanager.core.domain.Household;
import java.util.List;
import java.util.UUID;

public record HouseholdResponse(UUID id, String name, List<HouseholdMemberResponse> members) {

    public static HouseholdResponse from(Household household, List<HouseholdMemberResponse> members) {
        return new HouseholdResponse(household.getId(), household.getName(), members);
    }
}
