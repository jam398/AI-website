(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./site-policy.js'));
    return;
  }
  root.AdminLogic = factory(root.SitePolicy);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (sitePolicy) {
  'use strict';

  if (!sitePolicy) {
    throw new Error('SitePolicy is required before loading AdminLogic.');
  }

  function getLiveUrl(repo) {
    var parts = String(repo || '').split('/');
    var owner = parts[0];
    var repoName = parts[1];
    if (!owner || !repoName) return '#';
    if (repoName.toLowerCase() === owner.toLowerCase() + '.github.io') {
      return 'https://' + owner + '.github.io/';
    }
    return 'https://' + owner + '.github.io/' + repoName + '/';
  }

  function isLocalUrl(url) {
    try {
      var hostname = new URL(url).hostname;
      return hostname === 'localhost' || hostname === '127.0.0.1';
    } catch (_) {
      return false;
    }
  }

  function getEnabledToolDefinitions(toolDefinitions, githubCaps) {
    return toolDefinitions.filter(function (tool) {
      if (tool.name === 'check_deploy' && githubCaps && githubCaps.actionsReadable === false) {
        return false;
      }
      return true;
    });
  }

  return {
    REQUIRED_SECTIONS: sitePolicy.REQUIRED_SECTIONS,
    PROTECTED_FIELDS: sitePolicy.PROTECTED_FIELDS,
    PROTECTED_DERIVED_FIELDS: sitePolicy.PROTECTED_DERIVED_FIELDS,
    buildDiffSummary: sitePolicy.buildDiffSummary,
    deriveMailtoUrl: sitePolicy.deriveMailtoUrl,
    getAtPath: sitePolicy.getAtPath,
    getBlockedPaths: sitePolicy.getBlockedPaths,
    getChangedPaths: sitePolicy.getChangedPaths,
    getEnabledToolDefinitions: getEnabledToolDefinitions,
    getLiveUrl: getLiveUrl,
    hasPlaceholderEmail: sitePolicy.hasPlaceholderEmail,
    isLocalUrl: isLocalUrl,
    normalizeEmail: sitePolicy.normalizeEmail,
    stableStringify: sitePolicy.stableStringify,
    summarizeValue: sitePolicy.summarizeValue,
    validateCandidateData: sitePolicy.validateCandidateData,
    validateContentIntegrity: sitePolicy.validateContentIntegrity,
    valuesEqual: sitePolicy.valuesEqual,
  };
});
