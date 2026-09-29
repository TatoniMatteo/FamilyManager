package com.tatonimatteo.familymanager.core.web.household.dto;

import com.tatonimatteo.familymanager.core.domain.PersonHousehold;
import com.tatonimatteo.familymanager.core.web.person.dto.PersonResponse;

public record HouseholdMemberResponse(PersonResponse person, String role) {

    public static HouseholdMemberResponse from(PersonHousehold membership) {
        return new HouseholdMemberResponse(PersonResponse.from(membership.getPerson()), membership.getRole().name());
    }
}
