package com.tatonimatteo.familymanager.core.web.common;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Un solo posto in cui decidere "come appare un errore" per tutta l'API,
 * invece di gestirlo (o dimenticarsene) in ogni singolo controller.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(EntityNotFoundException ex, HttpServletRequest request) {
        return response(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), request);
    }

    private ResponseEntity<ApiError> response(HttpStatus status, String code, String message,
            HttpServletRequest request) {
        return ResponseEntity.status(status).body(ApiError.of(status.value(), code, message,
                java.util.UUID.randomUUID().toString(), request.getRequestURI()));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> handleMissingRoute(NoResourceFoundException ex, HttpServletRequest request) {
        return response(HttpStatus.NOT_FOUND, "NOT_FOUND", "La risorsa richiesta non esiste.", request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleBadRequest(IllegalArgumentException ex, HttpServletRequest request) {
        return response(HttpStatus.BAD_REQUEST, "BAD_REQUEST", ex.getMessage(), request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataConflict(DataIntegrityViolationException ex, HttpServletRequest request) {
        return response(HttpStatus.CONFLICT, "DATA_CONFLICT",
                "Il dato è già presente o non è compatibile con i dati esistenti.", request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(fieldError -> fieldError.getField() + ": " + fieldError.getDefaultMessage())
                .collect(Collectors.joining(", "));

        return response(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleForbidden(AccessDeniedException ex, HttpServletRequest request) {
        return response(HttpStatus.FORBIDDEN, "FORBIDDEN", "Non hai i permessi per eseguire questa operazione.",
                request);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> handleStatus(ResponseStatusException ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        return response(status, status.name(), ex.getReason() == null ? status.getReasonPhrase() : ex.getReason(),
                request);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, ConstraintViolationException.class})
    public ResponseEntity<ApiError> handleMalformedRequest(Exception ex, HttpServletRequest request) {
        return response(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST", "La richiesta non è valida o non è leggibile.",
                request);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiError> handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex,
            HttpServletRequest request) {
        return response(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED",
                "Metodo non supportato per questa risorsa.", request);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiError> handleUnsupportedMediaType(HttpMediaTypeNotSupportedException ex,
            HttpServletRequest request) {
        return response(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE",
                "Il formato inviato non è supportato.", request);
    }

    @ExceptionHandler(HttpMediaTypeNotAcceptableException.class)
    public ResponseEntity<ApiError> handleNotAcceptable(HttpMediaTypeNotAcceptableException ex,
            HttpServletRequest request) {
        return response(HttpStatus.NOT_ACCEPTABLE, "NOT_ACCEPTABLE",
                "Il formato di risposta richiesto non è supportato.", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest request) {
        String errorId = java.util.UUID.randomUUID().toString();
        log.error("Errore inatteso durante la richiesta {} [{}]", request.getRequestURI(), errorId, ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiError.of(500, "INTERNAL_ERROR", "Si è verificato un errore inatteso. Riprova più tardi.",
                        errorId, request.getRequestURI()));
    }
}
