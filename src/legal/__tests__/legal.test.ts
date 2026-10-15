import { CONTACT_EMAIL, LEGAL_DOCUMENTS } from '..';

describe.each(Object.entries(LEGAL_DOCUMENTS))('%s legal texts', (_lang, docs) => {
  const english = LEGAL_DOCUMENTS.en;

  it.each(['privacy', 'terms'] as const)('%s has the same sections as English', (kind) => {
    expect(docs[kind].sections.map((s) => s.paragraphs.length)).toEqual(english[kind].sections.map((s) => s.paragraphs.length));
    for (const s of docs[kind].sections) expect(s.heading.trim()).not.toBe('');
  });

  it('names the controller and the contact address', () => {
    const all = JSON.stringify(docs);
    expect(all).toContain('Enes Günel');
    expect(all).toContain(CONTACT_EMAIL);
  });

  it('states where Firestore data is stored', () => {
    expect(JSON.stringify(docs.privacy)).toMatch(/Belgi|Belçika|Belgique|Bélgica/);
  });
});
