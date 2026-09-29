package com.tatonimatteo.familymanager.core.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tatonimatteo.familymanager.core.web.common.ApiError;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

@Configuration
@EnableMethodSecurity
public class SecurityConfiguration {

    private final GoogleOAuthSuccessHandler googleOAuthSuccessHandler;

    private final ObjectMapper objectMapper;

    private final MaintenanceModeFilter maintenanceModeFilter;

    @Value("${family.auth.web-base-url:https://localhost}")
    private String webBaseUrl;

    public SecurityConfiguration(GoogleOAuthSuccessHandler googleOAuthSuccessHandler, ObjectMapper objectMapper,
            MaintenanceModeFilter maintenanceModeFilter) {
        this.googleOAuthSuccessHandler = googleOAuthSuccessHandler;
        this.objectMapper = objectMapper;
        this.maintenanceModeFilter = maintenanceModeFilter;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/system/status", "/api/auth/register", "/api/auth/verify-email",
                                "/api/auth/login", "/api/auth/logout", "/api/auth/csrf", "/api/auth/status",
                                "/api/auth/google/status", "/api/auth/google/invitation", "/api/auth/invitation",
                                "/api/auth/password/reset-request", "/api/auth/password/reset",
                                "/api/auth/password/setup").permitAll()
                        .requestMatchers("/swagger/**", "/api-docs/**", "/oauth2/**", "/login/oauth2/**").permitAll()
                        .requestMatchers("/api/auth/me").hasAnyAuthority("ROLE_ADMIN", "ROLE_MEMBER",
                                "ROLE_GOOGLE_SETUP")
                        .requestMatchers("/api/auth/google/password-setup").hasAuthority("ROLE_GOOGLE_SETUP")
                        .requestMatchers("/api/auth/profile").hasAnyAuthority("ROLE_ADMIN", "ROLE_MEMBER")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_MEMBER")
                        .anyRequest().permitAll())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .oauth2Login(oauth -> oauth.successHandler(googleOAuthSuccessHandler)
                        .failureHandler((request, response, exception) -> response.sendRedirect(
                                webBaseUrl + "/login?error=google")))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, exception) -> writeApiError(request, response,
                                HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED",
                                "È necessario accedere per continuare."))
                        .accessDeniedHandler((request, response, exception) -> writeApiError(request, response,
                                HttpStatus.FORBIDDEN, "FORBIDDEN",
                                "Non hai i permessi per eseguire questa operazione.")))
                .addFilterBefore(maintenanceModeFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    private void writeApiError(jakarta.servlet.http.HttpServletRequest request,
            jakarta.servlet.http.HttpServletResponse response,
            HttpStatus status, String code, String message) throws java.io.IOException {
        response.setStatus(status.value());
        response.setContentType(org.springframework.http.MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), ApiError.of(status.value(), code, message,
                java.util.UUID.randomUUID().toString(), request.getRequestURI()));
    }

    @Bean
    FilterRegistrationBean<MaintenanceModeFilter> disableContainerRegistration(MaintenanceModeFilter filter) {
        FilterRegistrationBean<MaintenanceModeFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }
}
