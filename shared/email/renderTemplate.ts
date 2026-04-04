import fs from 'node:fs/promises';
import path from 'node:path';
import type { EmailTemplateKey } from './templateMeta';
import { TEMPLATE_META } from './templateMeta';

const TEMPLATES_DIR = path.join(process.cwd(), 'shared', 'email', 'templates');

/** Replace {{key}} with values; missing keys become empty string. */
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) =>
    vars[key] != null ? vars[key] : ''
  );
}

export async function loadAndRender(
  key: EmailTemplateKey,
  vars: Record<string, string>
): Promise<{ html: string; text: string; subject: string }> {
  const meta = TEMPLATE_META[key];
  const htmlPath = path.join(TEMPLATES_DIR, meta.htmlFile);
  const textPath = path.join(TEMPLATES_DIR, meta.textFile);
  const [htmlRaw, textRaw] = await Promise.all([
    fs.readFile(htmlPath, 'utf8'),
    fs.readFile(textPath, 'utf8'),
  ]);
  return {
    html: interpolate(htmlRaw, vars),
    text: interpolate(textRaw, vars),
    subject: interpolate(meta.subjectTemplate, vars),
  };
}
