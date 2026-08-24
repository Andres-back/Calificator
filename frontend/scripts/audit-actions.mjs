import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(process.cwd(), 'src');
const actionableEvents = new Set([
  'onclick', 'onmousedown', 'onmouseup', 'onpointerdown', 'onpointerup',
  'onkeydown', 'onkeypress', 'onkeyup', 'onchange', 'onsubmit',
]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return /\.tsx$/.test(entry.name) && !/\.(test|spec)\.tsx$/.test(entry.name) ? [fullPath] : [];
  });
}

function attributesOf(attributes) {
  return attributes.properties.map((attribute) => {
    if (ts.isJsxSpreadAttribute(attribute)) return { name: '...spread', value: '' };
    const name = attribute.name.getText().toLowerCase();
    const initializer = attribute.initializer;
    if (!initializer) return { name, value: 'true' };
    if (ts.isStringLiteral(initializer)) return { name, value: initializer.text.trim() };
    return { name, value: initializer.getText().trim() };
  });
}

function hasButtonAction(attributes) {
  const names = new Set(attributes.map(({ name }) => name));
  const type = attributes.find(({ name }) => name === 'type')?.value.toLowerCase();
  return names.has('...spread')
    || [...names].some((name) => actionableEvents.has(name))
    || type === 'submit'
    || type === 'reset'
    || names.has('formaction');
}

function hasLinkDestination(attributes) {
  const destination = attributes.find(({ name }) => name === 'to' || name === 'href');
  if (!destination) return false;
  return destination.value !== '""' && destination.value !== "''" && destination.value !== '#';
}

function openingElementOf(node) {
  if (ts.isJsxElement(node)) return node.openingElement;
  if (ts.isJsxSelfClosingElement(node)) return node;
  return null;
}

function hasActionableAncestor(node, allowImplicitFormSubmit = false) {
  let current = node.parent;
  while (current) {
    const opening = openingElementOf(current);
    if (opening) {
      const tag = opening.tagName.getText();
      const normalized = tag.toLowerCase();
      const attributes = attributesOf(opening.attributes);
      if ((normalized === 'a' || tag === 'Link' || tag === 'NavLink') && hasLinkDestination(attributes)) return true;
      if (normalized === 'form' && allowImplicitFormSubmit) return true;
    }
    current = current.parent;
  }
  return false;
}

const findings = [];
let buttonCount = 0;
let linkCount = 0;

for (const file of walk(root)) {
  const sourceText = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const unsafeEventUpdater = /set[A-Za-z0-9_$]+\s*\(\s*\([^)]*\)\s*=>[\s\S]{0,240}?\b(?:event|e)\.(?:currentTarget|target)\.(?:value|checked|files)/g;
  for (const match of sourceText.matchAll(unsafeEventUpdater)) {
    const line = sourceText.slice(0, match.index).split('\n').length;
    findings.push(`${path.relative(process.cwd(), file)}:${line} evento DOM leído dentro de un actualizador diferido; captura el valor antes de setState`);
  }

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText();
      const normalized = tag.toLowerCase();
      const attributes = attributesOf(node.attributes);
      const location = source.getLineAndCharacterOfPosition(node.getStart(source));
      const at = `${path.relative(process.cwd(), file)}:${location.line + 1}`;

      if (normalized === 'button' || tag === 'Button' || tag === 'BotonGrande') {
        buttonCount += 1;
        const declaredType = attributes.find(({ name }) => name === 'type')?.value.toLowerCase();
        const allowsImplicitFormSubmit = normalized === 'button' && declaredType === undefined;
        if (!hasButtonAction(attributes) && !hasActionableAncestor(node, allowsImplicitFormSubmit)) {
          findings.push(`${at} botón sin acción, envío o navegación verificable`);
        }
      }

      if (normalized === 'a' || tag === 'Link' || tag === 'NavLink') {
        linkCount += 1;
        if (!hasLinkDestination(attributes)) findings.push(`${at} enlace sin destino válido`);
      }

      const role = attributes.find(({ name }) => name === 'role')?.value.toLowerCase();
      if (role === 'button' && !hasButtonAction(attributes)) {
        findings.push(`${at} role="button" sin interacción de teclado o puntero`);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
}

if (findings.length) {
  console.error(`Auditoría de acciones fallida (${findings.length} hallazgo(s)):`);
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Auditoría de acciones completa: ${buttonCount} botones y ${linkCount} enlaces con propósito verificable.`);