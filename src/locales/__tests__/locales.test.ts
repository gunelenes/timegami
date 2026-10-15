import de from '../de.json';
import en from '../en.json';
import es from '../es.json';
import fr from '../fr.json';
import tr from '../tr.json';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

const reference = flatten(en);
const translations = { tr, de, es, fr };

describe.each(Object.entries(translations))('%s locale', (_lang, messages) => {
  const flat = flatten(messages);

  it('has exactly the English keys', () => {
    expect([...flat.keys()].sort()).toEqual([...reference.keys()].sort());
  });

  it('keeps every placeholder of the English text', () => {
    for (const [key, english] of reference) {
      expect({ key, placeholders: placeholders(flat.get(key) ?? '') }).toEqual({ key, placeholders: placeholders(english) });
    }
  });

  it('has no empty strings', () => {
    for (const [key, text] of flat) expect({ key, empty: text.trim() === '' }).toEqual({ key, empty: false });
  });
});
