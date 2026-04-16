(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SitePolicy = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var REQUIRED_SECTIONS = ['meta', 'nav', 'home', 'about', 'services', 'contact', 'footer'];
  var PROTECTED_FIELDS = ['meta.siteTitle', 'meta.consultant', 'meta.email', 'contact.email'];
  var PROTECTED_DERIVED_FIELDS = ['home.ctaButtonUrl', 'services.ctaButtonUrl'];

  function getAtPath(obj, path) {
    return String(path || '').split('.').reduce(function (acc, part) {
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
      if (!(section in candidate)) {
        errors.push('Missing required section: ' + section);
      }
    });

    PROTECTED_FIELDS.forEach(function (path) {
      if (!valuesEqual(getAtPath(current, path), getAtPath(candidate, path))) {
        errors.push('Blocked protected field change: ' + path);
      }
    });

    if (!valuesEqual(current && current.nav, candidate.nav)) {
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

  function summarizeValue(value) {
    if (value === undefined) return '(empty)';
    var text = typeof value === 'string' ? value : JSON.stringify(value);
    text = String(text);
    return text.length > 160 ? text.slice(0, 157) + '...' : text;
  }

  function collectChangedPaths(current, candidate, prefix, out) {
    var keys = new Set([].concat(Object.keys(current || {}), Object.keys(candidate || {})));
    Array.from(keys).sort().forEach(function (key) {
      var path = prefix ? prefix + '.' + key : key;
      var before = current ? current[key] : undefined;
      var after = candidate ? candidate[key] : undefined;
      var beforeIsObject = before && typeof before === 'object';
      var afterIsObject = after && typeof after === 'object';

      if (beforeIsObject && afterIsObject && !Array.isArray(before) && !Array.isArray(after)) {
        collectChangedPaths(before, after, path, out);
        return;
      }

      if (!valuesEqual(before, after)) {
        out.push(path);
      }
    });
    return out;
  }

  function getChangedPaths(current, candidate) {
    return collectChangedPaths(current, candidate, '', []);
  }

  function buildDiffSummary(current, candidate) {
    return getChangedPaths(current, candidate).map(function (path) {
      return {
        path: path,
        before: summarizeValue(getAtPath(current, path)),
        after: summarizeValue(getAtPath(candidate, path)),
      };
    });
  }

  function getBlockedPaths(errors) {
    return (errors || [])
      .filter(function (message) { return /^Blocked protected field change: /.test(message); })
      .map(function (message) { return message.replace(/^Blocked protected field change: /, ''); });
  }

  function stableSortValue(value) {
    if (Array.isArray(value)) {
      return value.map(stableSortValue);
    }
    if (value && typeof value === 'object') {
      var sorted = {};
      Object.keys(value).sort().forEach(function (key) {
        sorted[key] = stableSortValue(value[key]);
      });
      return sorted;
    }
    return value;
  }

  function stableStringify(value) {
    return JSON.stringify(stableSortValue(value));
  }

  return {
    REQUIRED_SECTIONS: REQUIRED_SECTIONS,
    PROTECTED_FIELDS: PROTECTED_FIELDS,
    PROTECTED_DERIVED_FIELDS: PROTECTED_DERIVED_FIELDS,
    buildDiffSummary: buildDiffSummary,
    deriveMailtoUrl: deriveMailtoUrl,
    getAtPath: getAtPath,
    getBlockedPaths: getBlockedPaths,
    getChangedPaths: getChangedPaths,
    hasPlaceholderEmail: hasPlaceholderEmail,
    normalizeEmail: normalizeEmail,
    stableStringify: stableStringify,
    summarizeValue: summarizeValue,
    validateCandidateData: validateCandidateData,
    validateContentIntegrity: validateContentIntegrity,
    valuesEqual: valuesEqual,
  };
});
