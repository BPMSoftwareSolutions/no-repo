import { escapeHtml, renderWarning } from './html.js';

export function renderRegisteredElement(definition, model = {}) {
  const normalized = Array.isArray(model) ? { items: model } : model;
  const attrs = renderAttributes(definition, normalized);
  const content = definition.slots
    ? definition.slots.map((slot) => renderSlot(slot, normalized)).join('')
    : [
      renderRegistryFields(definition.fields, normalized.fields || {}),
      renderRegistryList(definition.list, normalized.listItems || []),
      renderRegistryItems(definition, normalized[definition.itemSource || 'items'] || normalized.items || []),
      definition.contentField ? renderContentField(definition, normalized) : '',
      definition.children ? normalized.childrenHtml || '' : '',
    ].filter(Boolean).join('');

  return `<${definition.element}${attrs}>${content}</${definition.element}>`;
}

function renderAttributes(definition, model) {
  const classes = [definition.className];
  if (definition.variantPrefix && model.variant) classes.push(`${definition.variantPrefix}${model.variant}`);
  const attrs = classes.filter(Boolean).length ? [`class="${escapeHtml(classes.filter(Boolean).join(' '))}"`] : [];
  return attrs.length ? ` ${attrs.join(' ')}` : '';
}

function renderRegistryFields(fields = {}, values = {}) {
  return Object.entries(fields)
    .map(([name, field]) => renderField({ name, ...field }, { fields: values }))
    .join('');
}

function renderRegistryList(list, items) {
  if (!list || !items.length) return '';
  const attrs = list.className ? ` class="${escapeHtml(list.className)}"` : '';
  return `<${list.element}${attrs}>${items.map((item) => `<${list.itemElement}>${escapeHtml(item)}</${list.itemElement}>`).join('')}</${list.element}>`;
}

function renderRegistryItems(definition, records) {
  const item = definition.repeatedItem || definition.item;
  if (!item) return '';
  if (!records.length && definition.requiredItems) {
    return renderWarning({
      title: 'Missing required items',
      detail: `Block "${definition.className || definition.element}" requires at least one list item.`,
    });
  }
  if (!records.length) return '';
  return records.map((record) => renderRegistryItem(item, record)).join('');
}

function renderRegistryItem(item, record) {
  const attrs = [];
  if (item.className) attrs.push(`class="${escapeHtml(item.className)}"`);
  if (item.type) attrs.push(`type="${escapeHtml(item.type)}"`);
  Object.entries(item.data || {}).forEach(([name, config]) => {
    const value = record[config.field];
    if (config.required && !value) return renderMissingFieldWarning(config.field);
    attrs.push(`data-${escapeHtml(name)}="${escapeHtml(value || '')}"`);
  });

  const content = item.fields
    ? renderRegistryFields(item.fields, record)
    : renderItemField(item, record);

  return `<${item.element}${attrs.length ? ` ${attrs.join(' ')}` : ''}>${content}</${item.element}>`;
}

function renderSlot(slot, model) {
  const content = [
    renderRegistryFields(slot.fields, model.fields || {}),
    slot.itemSource ? renderRegistryItems(slot, model[slot.itemSource] || []) : '',
    slot.field ? renderContentField(slot, model) : '',
  ].filter(Boolean).join('');
  if (!content) return '';
  const attrs = slot.className ? ` class="${escapeHtml(slot.className)}"` : '';
  return `<${slot.element}${attrs}>${content}</${slot.element}>`;
}

function renderField(field, model) {
  const value = field.literal || readValue(model, field.source || field.name) || readValue(model, field.alias);
  if (field.required && !value) return renderMissingFieldWarning(field.source || field.name);
  if (!value) return '';
  const attrs = field.className ? ` class="${escapeHtml(field.className)}"` : '';
  return `<${field.element}${attrs}>${escapeHtml(value)}</${field.element}>`;
}

function renderContentField(definition, model) {
  const fieldName = definition.contentField || definition.field;
  const value = readValue(model, fieldName);
  if (definition.required && !value) return renderMissingFieldWarning(fieldName);
  return value ? escapeHtml(value) : '';
}

function renderItemField(item, record) {
  const value = record[item.field];
  if (item.required && !value) return renderMissingFieldWarning(item.field);
  return value ? escapeHtml(value) : '';
}

function renderMissingFieldWarning(fieldName) {
  return renderWarning({
    title: 'Missing required field',
    detail: `Required field "${fieldName}" was not provided by the markdown contract.`,
  });
}

function readValue(model, path) {
  if (!path) return '';
  const fields = model.fields || model;
  if (Object.prototype.hasOwnProperty.call(fields, path)) return fields[path];
  return String(path).split('.').reduce((value, key) => {
    if (value && typeof value === 'object') return value[key];
    return undefined;
  }, fields) || '';
}
