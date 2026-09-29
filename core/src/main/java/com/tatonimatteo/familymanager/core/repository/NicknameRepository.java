package com.tatonimatteo.familymanager.core.repository;

import com.tatonimatteo.familymanager.core.domain.Nickname;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NicknameRepository extends JpaRepository<Nickname, UUID> {

    Optional<Nickname> findByViewer_IdAndTarget_Id(UUID viewerId, UUID targetId);

    List<Nickname> findByViewer_Id(UUID viewerId);
}
