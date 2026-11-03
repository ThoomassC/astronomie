import { AdditiveBlending, DoubleSide, type ShaderMaterial } from "three";
import { describe, expect, it } from "vitest";
import { createBubbleMaterial, createCmbMaterial } from "@/components/scene/extragalacticMaterials";
import type { Uniform } from "@/components/scene/materials";

/** Réglages communs aux deux coquilles : lumière ajoutée, sans profondeur ni tone mapping, vues des deux côtés. */
function expectGlowingShell(material: ShaderMaterial): void {
  expect(material.blending).toBe(AdditiveBlending);
  expect(material.transparent).toBe(true);
  expect(material.depthWrite).toBe(false);
  expect(material.toneMapped).toBe(false);
  expect(material.side).toBe(DoubleSide);
}

describe("createCmbMaterial", () => {
  it("devrait ajouter sa lumière sans écrire la profondeur ni passer par le tone mapping, vu de l'intérieur comme de l'extérieur", () => {
    expectGlowingShell(createCmbMaterial().material);
  });

  it("devrait encoder sa couleur en sRGB à la sortie, sans tone mapping", () => {
    const { fragmentShader } = createCmbMaterial().material;
    expect(fragmentShader).toContain("#include <colorspace_fragment>");
    expect(fragmentShader).not.toContain("tonemapping_fragment");
  });

  it("devrait exposer l'uniforme d'opacité lu par le programme (le moteur y écrit le poids de la couche)", () => {
    const { material, uniforms } = createCmbMaterial();
    expect(material.uniforms.uOpacity).toBe(uniforms.uOpacity);
    expect(uniforms.uOpacity.value).toBe(1);
  });
});

describe("createBubbleMaterial", () => {
  it("devrait ajouter sa lumière sans écrire la profondeur ni passer par le tone mapping, vue des deux côtés", () => {
    expectGlowingShell(createBubbleMaterial(0.5, { value: 1 }).material);
  });

  it("devrait encoder sa couleur en sRGB à la sortie, sans tone mapping", () => {
    const { fragmentShader } = createBubbleMaterial(0.5, { value: 1 }).material;
    expect(fragmentShader).toContain("#include <colorspace_fragment>");
    expect(fragmentShader).not.toContain("tonemapping_fragment");
  });

  it("devrait partager l'opacité fournie : un seul poids pour toutes les bulles", () => {
    const opacity: Uniform<number> = { value: 0.3 };
    const first = createBubbleMaterial(0.45, opacity);
    const second = createBubbleMaterial(0.8, opacity);
    expect(first.material.uniforms.uOpacity).toBe(opacity);
    expect(second.material.uniforms.uOpacity).toBe(opacity);
  });

  it("devrait teinter chaque bulle de sa teinte : turquoise à 0,5 de tour, plus de vert et de bleu que de rouge", () => {
    const { uniforms } = createBubbleMaterial(0.5, { value: 1 });
    const { r, g, b } = uniforms.uRim.value;
    expect(g).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(r);
  });

  it("devrait donner deux couleurs différentes à deux teintes différentes, avec le même programme GPU", () => {
    const first = createBubbleMaterial(0.45, { value: 1 });
    const second = createBubbleMaterial(0.8, { value: 1 });
    expect(first.uniforms.uRim.value.equals(second.uniforms.uRim.value)).toBe(false);
    expect(first.material.vertexShader).toBe(second.material.vertexShader);
    expect(first.material.fragmentShader).toBe(second.material.fragmentShader);
  });

  it("devrait décaler le motif de chaque teinte : deux bulles n'ont pas le même grain", () => {
    const first = createBubbleMaterial(0.45, { value: 1 });
    const second = createBubbleMaterial(0.8, { value: 1 });
    expect(first.uniforms.uPattern.value.equals(second.uniforms.uPattern.value)).toBe(false);
  });
});
