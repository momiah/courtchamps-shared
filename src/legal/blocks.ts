export interface LegalTable {
  id: string;
  columns: string[];
  rows: string[][];
}

/** A paragraph, a list of short points, or a table. */
export type LegalBlock = string | string[] | LegalTable;

export interface LegalSection {
  id: string;
  title: string;
  body: LegalBlock[];
}

export const isLegalTable = (block: LegalBlock): block is LegalTable =>
  typeof block === "object" && !Array.isArray(block);

/** Every paragraph and point of a section, without its tables. */
export const getLegalSectionText = (blocks: LegalBlock[]): string[] =>
  blocks.flatMap((block) =>
    typeof block === "string" ? [block] : Array.isArray(block) ? block : [],
  );

export const numberLegalSections = (sections: LegalSection[]): LegalSection[] =>
  sections.map((section, index) => ({
    ...section,
    title: `${index + 1}. ${section.title}`,
  }));
