import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { getAboutContent } from "@/content/about/content";
import { getCommonContent } from "@/content/common/content";
import { getCosmicContent } from "@/content/cosmic/content";
import { getHomeContent } from "@/content/home/content";
import { getSizesContent } from "@/content/sizes/content";
import { getVoyageContent } from "@/content/voyage/content";
import { LOCALES, type Locale } from "./locales";

/*
 * Outils des gardes transversales des textes (typographie française, complétude des langues, budget des chaînes
 * client, frontière serveur/client) : tous les textes du site, et le code qui les écrit. Réservé aux tests, qu'il
 * suffit d'exécuter depuis la racine du dépôt, comme Vitest le fait : il lit le disque et charge tous les contenus.
 */

/** Racine du dépôt, d'où Vitest se lance. */
const ROOT = process.cwd();

/** Fichiers sources du site (`src/**`, `.ts` et `.tsx`, hors tests), relatifs à la racine : « src/i18n/names.ts ». */
export function sourceFiles(): string[] {
  return readdirSync(join(ROOT, "src"), { recursive: true, encoding: "utf8" })
    .map((file) => `src/${file.split("\\").join("/")}`)
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
    .sort();
}

/** Texte d'un fichier source, chemin relatif à la racine. */
export function readSource(file: string): string {
  return readFileSync(join(ROOT, file), "utf8");
}

/** Arbre syntaxique d'un fichier source (TypeScript, JSX selon l'extension), parents renseignés. */
export function parseSource(file: string): ts.SourceFile {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, readSource(file), ts.ScriptTarget.Latest, true, kind);
}

/** Contenus serveur, un par domaine de `src/content/`, lus dans une langue. */
export const SERVER_CONTENTS: Readonly<Record<string, (locale: Locale) => object>> = {
  about: getAboutContent,
  common: getCommonContent,
  cosmic: getCosmicContent,
  home: getHomeContent,
  sizes: getSizesContent,
  voyage: getVoyageContent,
};

/** Une table de chaînes client : son export (`JOURNEY_STRINGS`), son fichier, ses textes par langue. */
export interface StringTable {
  name: string;
  file: string;
  strings: Readonly<Record<Locale, unknown>>;
}

/**
 * Toutes les tables de chaînes client : chaque export `*_STRINGS` des fichiers `*.strings.ts`, découverts sur le disque.
 * Aucune liste à tenir : une table neuve est gardée dès sa création.
 */
export async function loadStringTables(): Promise<StringTable[]> {
  const files = sourceFiles().filter((file) => file.endsWith(".strings.ts"));
  const tables = await Promise.all(
    files.map(async (file) => {
      const exports = (await import(/* @vite-ignore */ join(ROOT, file))) as Record<string, unknown>;
      return Object.entries(exports)
        .filter(([name]) => name.endsWith("_STRINGS"))
        .map(([name, strings]) => ({ name, file, strings: strings as Readonly<Record<Locale, unknown>> }));
    }),
  );
  return tables.flat();
}

/** Texte calculé d'une table ou d'un contenu : pluriel, gabarit, phrase construite (« Retour au {date} »). */
export type TextFunction = (...args: never[]) => unknown;

/** Feuille de texte, avec son chemin (« bodies.saturn.facts.7.note ») : une chaîne, ou une fonction qui en écrit une. */
export interface TextLeaf {
  path: string;
  value: string | TextFunction;
}

/** Clés qui ne portent pas de texte : adresses des liens, ancres des sections (les mêmes dans les trois langues). */
const NOT_TEXT_KEYS: ReadonlySet<string> = new Set(["href", "id"]);

/**
 * Feuilles de texte d'un contenu ou d'une table, dans l'ordre de l'objet. Les adresses (`href`) et les ancres (`id`)
 * n'en sont pas, ni les nombres et les booléens (heures de l'échelle, exposants).
 */
export function textLeaves(value: unknown, path = ""): TextLeaf[] {
  if (typeof value === "string") return [{ path, value }];
  if (typeof value === "function") return [{ path, value: value as TextFunction }];
  if (value !== null && typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => !NOT_TEXT_KEYS.has(key))
      .flatMap(([key, child]) => textLeaves(child, path ? `${path}.${key}` : key));
  }
  return [];
}

/** Chaînes seules d'un contenu ou d'une table, avec leur chemin. */
export function stringLeaves(value: unknown): { path: string; text: string }[] {
  return textLeaves(value).flatMap(({ path, value: leaf }) => (typeof leaf === "string" ? [{ path, text: leaf }] : []));
}

/** Littéral de chaîne du code source : chaîne entière, ou morceau de gabarit entre deux `${…}`. */
export interface SourceLiteral {
  /** Fichier, relatif à la racine, et ligne (à partir de 1). */
  file: string;
  line: number;
  /** Texte, échappements résolus (« \u00a0 » devient l'espace insécable). */
  text: string;
  /**
   * Langue que le code donne au littéral, du plus proche au plus lointain : propriété `fr`, `en` ou `es` (tables,
   * données par langue) ; déclaration nommée en `_FR` ou en `Fr` (`TITLE_FR`, `aroundFr`) ; fichier `fr.ts`, `en.ts`
   * ou `es.ts` (contenus serveur). null ailleurs : code commun, messages pour les développeurs, shaders.
   */
  language: Locale | null;
}

/** Langue d'un nom de déclaration : `HOME_FR`, `aroundEn`, `ofPlanetEs` ; null pour `SURFACE_FRAGMENT`, `LINES`. */
function languageOfName(name: string): Locale | null {
  const match = /(?:_|[a-z\d])(FR|EN|ES)$|(?<=[a-z\d])(Fr|En|Es)$/.exec(name);
  const code = (match?.[1] ?? match?.[2])?.toLowerCase();
  return LOCALES.find((locale) => locale === code) ?? null;
}

/** Langue que porte un nœud du code par lui-même : propriété `fr`, déclaration `TITLE_FR` ; null sinon. */
function languageOfNode(node: ts.Node): Locale | null {
  if (ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))) {
    return LOCALES.find((locale) => locale === node.name.getText().replace(/^["']|["']$/g, "")) ?? null;
  }
  if ((ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) && node.name && ts.isIdentifier(node.name)) {
    return languageOfName(node.name.text);
  }
  return null;
}

/** Chemin de module (`import … from "…"`, `export … from "…"`) : du code, pas du texte. */
const isModuleSpecifier = (node: ts.Node) =>
  ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent) || ts.isExternalModuleReference(node.parent);

/** Littéraux de chaîne d'un fichier source (chaînes et morceaux de gabarits), chemins de modules exclus. */
export function sourceLiterals(file: string): SourceLiteral[] {
  const source = parseSource(file);
  const fileLanguage = LOCALES.find((locale) => file.endsWith(`/${locale}.ts`)) ?? null;
  const literals: SourceLiteral[] = [];
  const visit = (node: ts.Node, language: Locale | null) => {
    const own = languageOfNode(node) ?? language;
    const isText =
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node);
    if (isText && !isModuleSpecifier(node)) {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      literals.push({ file, line, text: node.text, language: own });
    }
    ts.forEachChild(node, (child) => visit(child, own));
  };
  visit(source, fileLanguage);
  return literals;
}
