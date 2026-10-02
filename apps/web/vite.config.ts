import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { registrationPlugin } from "./server/main";

export default defineConfig({
  build: { manifest: true },
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset({ target: "19", panicThreshold: "all_errors" })],
    }),
    tailwindcss(),
    registrationPlugin(),
  ],
});
