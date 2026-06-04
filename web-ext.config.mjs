export default {
  sourceDir: "dist",
  artifactsDir: "web-ext-artifacts",
  build: {
    overwriteDest: true,
  },
  run: {
    firefox: "firefox",
    startUrl: ["https://www.stepstone.de"],
    browserConsole: true,
  },
  lint: {
    warningsAsErrors: false,
  },
};
