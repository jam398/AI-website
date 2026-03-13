(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.AdminLogic = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var REQUIRED_SECTIONS = ['meta', 'nav', 'home', 'about', 'services', 'contact', 'footer'];
  var PROTECTED_FIELDS = ['meta.siteTitle', 'meta.consultant', 'meta.email', 'contact.email'];
  var PROTECTED_DERIVED_FIELDS = ['home.ctaButtonUrl', 'services.ctaButtonUrl'];

  function getAtPath(obj, path) {
    return path.split('.').reduce(function (acc, part) {
      return acc && acc[part];
    }, obj);
  }

  function valuesEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function deriveMailtoUrl(email) {
    var normalized = normalizeEmail(email);
    return normalized ? 'mailto:' + normalized : '';
  }

  function hasPlaceholderEmail(email) {
    var normalized = normalizeEmail(email);
    return !normalized || /(^example@|@example\.|placeholder|test@test|demo@)/i.test(normalized);
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

  function validateContentIntegrity(candidate, options) {
    var errors = [];
    var settings = options || {};
    var canonicalEmail = normalizeEmail(candidate && candidate.meta && candidate.meta.email);
    var contactEmail = normalizeEmail(candidate && candidate.contact && candidate.contact.email);
    var homeMailto = String(getAtPath(candidate, 'home.ctaButtonUrl') || '');
    var servicesMailto = String(getAtPath(candidate, 'services.ctaButtonUrl') || '');
    var expectedMailto = deriveMailtoUrl(canonicalEmail);

    if (!canonicalEmail) {
      errors.push('Canonical contact email is required.');
    } else if (!settings.allowPlaceholderEmail && hasPlaceholderEmail(canonicalEmail)) {
      errors.push('Canonical contact email still uses placeholder/demo content.');
    }

    if (contactEmail !== canonicalEmail) {
      errors.push('contact.email must match meta.email.');
    }

    if (homeMailto && homeMailto !== expectedMailto) {
      errors.push('home.ctaButtonUrl must match the canonical contact email.');
    }

    if (servicesMailto && servicesMailto !== expectedMailto) {
      errors.push('services.ctaButtonUrl must match the canonical contact email.');
    }

    return { ok: errors.length === 0, errors: errors };
  }

  function validateCandidateData(current, candidate, options) {
    var errors = [];

    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      errors.push('AI response did not contain a valid site.json object.');
      return { ok: false, errors: errors };
    }

    REQUIRED_SECTIONS.forEach(function (section) {
      if (!(section in candidate)) errors.push('Missing required section: ' + section);
    });

    PROTECTED_FIELDS.forEach(function (path) {
      if (!valuesEqual(getAtPath(current, path), getAtPath(candidate, path))) {
        errors.push('Blocked protected field change: ' + path);
      }
    });

    if (!valuesEqual(current.nav, candidate.nav)) {
      errors.push('Blocked protected field change: nav');
    }

    PROTECTED_DERIVED_FIELDS.forEach(function (path) {
      var currentValue = String(getAtPath(current, path) || '');
      var nextValue = String(getAtPath(candidate, path) || '');
      if (currentValue.indexOf('mailto:') === 0 && currentValue !== nextValue) {
        errors.push('Blocked protected field change: ' + path);
      }
    });

    var integrity = validateContentIntegrity(candidate, options);
    if (!integrity.ok) {
      errors = errors.concat(integrity.errors);
    }

    return { ok: errors.length === 0, errors: errors };
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
    REQUIRED_SECTIONS: REQUIRED_SECTIONS,
    PROTECTED_FIELDS: PROTECTED_FIELDS,
    PROTECTED_DERIVED_FIELDS: PROTECTED_DERIVED_FIELDS,
    deriveMailtoUrl: deriveMailtoUrl,
    getAtPath: getAtPath,
    getEnabledToolDefinitions: getEnabledToolDefinitions,
    getLiveUrl: getLiveUrl,
    hasPlaceholderEmail: hasPlaceholderEmail,
    isLocalUrl: isLocalUrl,
    normalizeEmail: normalizeEmail,
    validateCandidateData: validateCandidateData,
    validateContentIntegrity: validateContentIntegrity,
    valuesEqual: valuesEqual,
  };
});
