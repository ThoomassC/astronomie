import { posix } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { parseSource, sourceFiles } from "@/i18n/testUtils";

/*
 * Frontière serveur/client des textes (ADR 0003) : les contenus longs (`src/content/**`) restent sur le serveur, rendus
 * dans le HTML de la page ; les composants client lisent leurs textes dans les tables `*.strings.ts`. Un module client
 * qui importerait un contenu, même de loin, l'enverrait au navigateur dans les trois langues : tout ce que ce module
 * atteint par ses imports part avec lui dans le paquet client.
 */

const FILES = sourceFiles();
const KNOWN: ReadonlySet<string> = new Set(FILES);

/** Fichier du dépôt d'un module importé : alias `@/`, chemin relatif, extension ou `index` implicites ; null ailleurs. */
function resolveImport(from: string, specifier: string): string | null {
  const base = specifier.startsWith("@/")
    ? `src/${specifier.slice(2)}`
    : specifier.startsWith(".")
      ? posix.join(posix.dirname(from), specifier)
      : null;
  // Paquets (react, three, next/…) et fichiers qui ne sont pas du code (feuilles de style) : hors du graphe.
  if (base === null) return null;
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
  return candidates.find((file) => KNOWN.has(file)) ?? null;
}

/** Import effacé à la compilation : `import type …`, ou dont chaque nom importé est un type (`import { type A } …`). */
function isTypeOnlyImport({ importClause }: ts.ImportDeclaration): boolean {
  if (!importClause) return false;
  if (importClause.isTypeOnly) return true;
  const bindings = importClause.namedBindings;
  return (
    importClause.name === undefined &&
    bindings !== undefined &&
    ts.isNamedImports(bindings) &&
    bindings.elements.length > 0 &&
    bindings.elements.every((element) => element.isTypeOnly)
  );
}

/** Réexport effacé à la compilation : `export type … from`, ou dont chaque nom est un type. */
function isTypeOnlyExport({ isTypeOnly, exportClause }: ts.ExportDeclaration): boolean {
  if (isTypeOnly) return true;
  return (
    exportClause !== undefined &&
    ts.isNamedExports(exportClause) &&
    exportClause.elements.length > 0 &&
    exportClause.elements.every((element) => element.isTypeOnly)
  );
}

/** Ce qu'un fichier importe à l'exécution : imports, réexports et `import()` dynamiques, types exclus. */
function runtimeImports(source: ts.SourceFile): string[] {
  const specifiers: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      if (!isTypeOnlyImport(node)) specifiers.push(node.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      if (!isTypeOnlyExport(node)) specifiers.push(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [specifier] = node.arguments;
      if (specifier && ts.isStringLiteral(specifier)) specifiers.push(specifier.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers.flatMap((specifier) => resolveImport(source.fileName, specifier) ?? []);
}

/** Fichier client : la directive `"use client"` dans le prologue du module. */
function isClientModule(source: ts.SourceFile): boolean {
  for (const statement of source.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) return false;
    if (statement.expression.text === "use client") return true;
  }
  return false;
}

const SOURCES = FILES.map(parseSource);
const IMPORTS: ReadonlyMap<string, readonly string[]> = new Map(
  SOURCES.map((source) => [source.fileName, runtimeImports(source)]),
);
const CLIENT_MODULES = SOURCES.filter(isClientModule).map((source) => source.fileName);

const isContent = (file: string) => file.startsWith("src/content/");

/** Plus court chemin d'imports d'un module vers un contenu serveur (« a.tsx → b.ts → src/content/… »), ou null. */
function pathToContent(start: string): string[] | null {
  const parents = new Map<string, string | null>([[start, null]]);
  const queue = [start];
  for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
    if (isContent(file)) {
      const path = [file];
      for (let parent = parents.get(file); parent; parent = parents.get(parent)) path.unshift(parent);
      return path;
    }
    for (const target of IMPORTS.get(file) ?? []) {
      if (!parents.has(target)) {
        parents.set(target, file);
        queue.push(target);
      }
    }
  }
  return null;
}

describe("frontière serveur/client des textes", () => {
  it("devrait trouver les modules client et les imports des contenus (garde contre le test vide)", () => {
    expect(CLIENT_MODULES.length).toBeGreaterThanOrEqual(40);
    expect(CLIENT_MODULES).toContain("src/components/site/LanguageMenu.tsx");
    // Un composant serveur lit bien son contenu par l'alias `@/content/…` : le graphe voit ces imports.
    expect(IMPORTS.get("src/components/journey/SolarStops.tsx")).toContain("src/content/voyage/structure.ts");
    expect(pathToContent("src/components/journey/SolarStops.tsx")).not.toBeNull();
  });

  it("ne devrait laisser aucun module client atteindre src/content/, même par un import indirect", () => {
    const crossings = CLIENT_MODULES.flatMap((file) => pathToContent(file)?.join(" → ") ?? []);
    expect(crossings).toEqual([]);
  });
});
