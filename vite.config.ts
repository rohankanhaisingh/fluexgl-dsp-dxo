import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import yaml from "@modyfi/vite-plugin-yaml";

export default defineConfig({
    plugins: [react(), tailwindcss(), yaml()],
    base: "./",
    preview: {
        allowedHosts: ["fluexgl.dev", "www.fluexgl.dev"],
        port: 3002,
        host: true
    }
})
