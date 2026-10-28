import { Matrix4, Vector3, type Object3D } from "three";
import { equatorNode, poleDirection, primeMeridianDeg, type RotationModel } from "@/lib/astro/orientation";

const basis = new Matrix4();
const node = new Vector3();
const third = new Vector3();

/**
 * Oriente le repère d'axe d'un astre : x local = nœud de l'équateur (origine de W), y local = pôle
 * nord. Avec `rotation.y = primeMeridianAngle(…)` sur la sphère enfant, le méridien origine
 * (u = 0,5 d'une SphereGeometry, en +X local) tombe à sa vraie place. Écrit le pôle dans `pole`.
 */
export function orientAxis(axis: Object3D, model: RotationModel, jd: number, pole: Vector3): Vector3 {
  poleDirection(model, jd, pole);
  equatorNode(model, jd, node);
  basis.makeBasis(node, pole, third.crossVectors(node, pole));
  axis.quaternion.setFromRotationMatrix(basis);
  return pole;
}

/** Rotation à donner à la sphère, en radians, pour placer son méridien origine à la date `jd`. */
export function primeMeridianAngle(model: RotationModel, jd: number): number {
  return (primeMeridianDeg(model, jd) * Math.PI) / 180;
}
