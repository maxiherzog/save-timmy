import { characterById, type CharacterId } from '../game/characters';

type Props = {
  characterId: CharacterId;
  size?: number;
  showName?: boolean;
};

export function CharacterAvatar({ characterId, size = 48, showName = false }: Props) {
  const c = characterById(characterId);
  return (
    <div className="inline-flex items-center gap-3">
      <div
        className="rounded-full flex items-center justify-center font-black shadow-md border-2"
        style={{
          width: size,
          height: size,
          background: c.color,
          borderColor: c.accent,
          color: '#374151',
          fontSize: size * 0.38,
        }}
      >
        {c.initials}
      </div>
      {showName && (
        <div className="flex flex-col">
          <div className="font-bold text-sm leading-tight">{c.name}</div>
          <div className="text-xs text-slate-400">{c.title}</div>
        </div>
      )}
    </div>
  );
}
