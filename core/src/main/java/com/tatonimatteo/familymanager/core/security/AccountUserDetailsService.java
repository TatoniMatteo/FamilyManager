package com.tatonimatteo.familymanager.core.security;

import com.tatonimatteo.familymanager.core.domain.Account;
import com.tatonimatteo.familymanager.core.repository.AccountRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AccountUserDetailsService implements UserDetailsService {

    private final AccountRepository accounts;

    public AccountUserDetailsService(AccountRepository accounts) {
        this.accounts = accounts;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Account account = accounts.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new UsernameNotFoundException("Credenziali non valide"));
        if (!"ACTIVE".equals(account.getStatus()) || account.getPasswordHash() == null) {
            throw new UsernameNotFoundException("Credenziali non valide");
        }
        return User.withUsername(account.getEmail())
                .password(account.getPasswordHash())
                .roles(account.getRole())
                .build();
    }
}
