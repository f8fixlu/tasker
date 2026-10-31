const QUANTITY_PLACEHOLDER_PATTERN = /<quantity>|\{\{\s*quantity\s*\}\}|\{\s*quantity\s*\}/gi;
const QUANTITY_PLACEHOLDER_TEST = /<quantity>|\{\{\s*quantity\s*\}\}|\{\s*quantity\s*\}/i;
const FIRST_NUMBER_PATTERN = /(^|[^\d.])(\d+)(?![\d.])/;
const BATCH_SUFFIX_PATTERN = /(\s+-\s+Batch\s+\d+)\s*$/i;

const splitBatchSuffix = (description = '') => {
  const match = description.match(BATCH_SUFFIX_PATTERN);

  if (!match) {
    return { body: description, suffix: '' };
  }

  return {
    body: description.slice(0, match.index),
    suffix: match[0]
  };
};

export const getBatchSuffix = (description = '') =>
  splitBatchSuffix(description).suffix;

export const stripBatchSuffix = (description = '') =>
  description.replace(BATCH_SUFFIX_PATTERN, '').trim();

export const hasBatchSuffix = (description = '') =>
  BATCH_SUFFIX_PATTERN.test(description.trim());

/**
 * Replace the quantity value in a description template.
 *
 * Templates can use an explicit placeholder such as "<quantity>" or
 * "{quantity}". Legacy templates that contain a number (for example
 * "Filed 1 released communication") use that first number as the quantity.
 */
export const applyQuantityToDescription = (description = '', quantity) => {
  const normalizedQuantity = String(quantity ?? '').trim();

  if (
    !description ||
    !/^\d+$/.test(normalizedQuantity) ||
    Number(normalizedQuantity) <= 0
  ) {
    return description;
  }

  const { body, suffix } = splitBatchSuffix(description);
  let renderedBody = body;

  if (QUANTITY_PLACEHOLDER_TEST.test(body)) {
    renderedBody = body.replace(
      QUANTITY_PLACEHOLDER_PATTERN,
      normalizedQuantity
    );
  } else {
    renderedBody = body.replace(
      FIRST_NUMBER_PATTERN,
      (match, prefix) => `${prefix}${normalizedQuantity}`
    );
  }

  if (renderedBody === body) {
    return description;
  }

  return `${renderedBody}${suffix}`;
};

/**
 * Convert a rendered description back into a reusable sub type template.
 * Batch suffixes are removed, and the current quantity is replaced with the
 * "<quantity>" placeholder so future tasks use their own quantity.
 */
export const toQuantityTemplate = (description = '', quantity) => {
  const normalizedQuantity = String(quantity ?? '').trim();
  const body = stripBatchSuffix(description);

  if (!body) {
    return '';
  }

  if (QUANTITY_PLACEHOLDER_TEST.test(body)) {
    return body.replace(QUANTITY_PLACEHOLDER_PATTERN, '<quantity>');
  }

  if (!/^\d+$/.test(normalizedQuantity) || Number(normalizedQuantity) <= 0) {
    return body;
  }

  const quantityPattern = new RegExp(
    `(^|[^\\d.])(${normalizedQuantity})(?![\\d.])`
  );

  if (!quantityPattern.test(body)) {
    return body;
  }

  return body.replace(
    quantityPattern,
    (match, prefix) => `${prefix}<quantity>`
  );
};

/**
 * Check whether a task description was generated from a sub type template.
 * Batch suffixes are ignored, and the first number is treated as the quantity.
 */
export const descriptionMatchesQuantityTemplate = (
  description = '',
  template = ''
) => {
  const descriptionBody = splitBatchSuffix(description).body.trim();
  const templateBody = splitBatchSuffix(template).body.trim();

  if (!descriptionBody || !templateBody) {
    return false;
  }

  if (descriptionBody === templateBody) {
    return true;
  }

  const normalize = value =>
    value
      .replace(QUANTITY_PLACEHOLDER_PATTERN, '<quantity>')
      .replace(FIRST_NUMBER_PATTERN, (match, prefix) => `${prefix}<quantity>`);

  return normalize(descriptionBody) === normalize(templateBody);
};
