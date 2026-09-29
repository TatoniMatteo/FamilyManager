import {defineConfig} from "orval";

export default defineConfig({
    familyManager: {
        input: {
            target: "http://localhost:8080/api-docs",
        },
        output: {
            mode: "tags-split",
            target: "src/api/generated",
            schemas: "src/api/models",
            client: "fetch",
            httpClient: "fetch",
            clean: true,
            indexFiles: true,
        },
    },
});