FROM amazoncorretto:25-alpine

WORKDIR /app
COPY core/familymanager-core.jar app.jar

EXPOSE 8080
ENV SERVER_PORT=8080

ENTRYPOINT ["java", "-jar", "app.jar"]
