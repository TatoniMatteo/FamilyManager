package com.tatonimatteo.familymanager.core.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class JsonConfiguration {

    @Bean
    ObjectMapper objectMapper() {
        return new ObjectMapper().findAndRegisterModules();
    }
}
