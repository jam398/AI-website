module.exports = function (eleventyConfig) {
  // --- Passthrough copy ---
  // CSS
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  // CMS admin panel (lives at /admin on the live site)
  eleventyConfig.addPassthroughCopy({ "admin": "admin" });
  // Static assets (images, .nojekyll, etc.)
  eleventyConfig.addPassthroughCopy({ "public": "." });

  return {
    // pathPrefix is set via ELEVENTY_PATH_PREFIX env var in GitHub Actions
    // for project-site deploys (username.github.io/repo-name).
    pathPrefix: process.env.ELEVENTY_PATH_PREFIX || "/",
    dir: {
      input: "src",
      output: "_site",
      data: "../content",   // resolves to  <root>/content/
      includes: "_includes"
    },
    templateFormats: ["njk", "md"],
    htmlTemplateEngine: "njk"
  };
};
