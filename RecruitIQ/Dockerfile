# Stage 1: Build the Spring Boot executable JAR
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Compile and package application
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Minimal JRE Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create upload directory for PDF storage
RUN mkdir -p uploads/resumes

# Copy compiled artifact from build stage
COPY --from=build /workspace/target/*.jar app.jar

# Expose HTTP port
EXPOSE 8080

# Run Spring Boot
ENTRYPOINT ["java", "-XX:+UseG1GC", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]