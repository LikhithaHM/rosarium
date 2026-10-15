FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
COPY frontend ./src/main/resources/static
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /build/target/*.jar app.jar
# small memory footprint for Render's 512 MB free instance
ENV JAVA_TOOL_OPTIONS="-Xmx256m -Xss512k -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:MaxMetaspaceSize=128m"
ENTRYPOINT ["sh", "-c", "java -jar /app/app.jar --server.port=${PORT:-8080} --spring.h2.console.enabled=false --spring.datasource.url=jdbc:h2:file:/tmp/weeddb"]
