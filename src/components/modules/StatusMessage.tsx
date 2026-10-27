import type { StatusMessageState } from "./useAnnouncer";

/**
 * Région d'annonce masquée, présente dès le rendu (une région ajoutée tardivement n'est pas
 * toujours suivie). La clé force l'insertion d'un nouveau nœud : un texte identique est
 * annoncé de nouveau.
 */
export function StatusMessage({ message }: { message: StatusMessageState }) {
  return (
    <div className="sr" role="status">
      <span key={message.id}>{message.text}</span>
    </div>
  );
}
