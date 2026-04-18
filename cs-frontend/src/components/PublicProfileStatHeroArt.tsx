import Image from "next/image";

const ART = {
  cases: {
    src: "/profile-stats/stat-cases.png",
    imgFilter:
      "[filter:drop-shadow(0_6px_14px_rgba(0,0,0,0.55))_drop-shadow(0_0_20px_rgba(251,146,60,0.35))]",
  },
  withdraw: {
    src: "/profile-stats/stat-withdraw.png",
    imgFilter:
      "[filter:drop-shadow(0_6px_14px_rgba(0,0,0,0.55))_drop-shadow(0_0_18px_rgba(56,189,248,0.3))]",
  },
  upgrade: {
    src: "/profile-stats/stat-upgrade.png",
    imgFilter:
      "[filter:drop-shadow(0_6px_14px_rgba(0,0,0,0.55))_drop-shadow(0_0_22px_rgba(167,139,250,0.35))]",
  },
} as const;

export type PublicProfileStatHeroVariant = keyof typeof ART;

type Props = { variant: PublicProfileStatHeroVariant; className?: string };

/**
 * 3D-арт для блоків статистики публичного профіля. Батьківський рядок має мати `group`, щоб спрацьовував легкий hover-scale.
 */
export function PublicProfileStatHeroArt({ variant, className = "" }: Props) {
  const cfg = ART[variant];
  return (
    <div
      className={`pointer-events-none relative h-[6.25rem] w-[6.25rem] shrink-0 sm:h-[7.25rem] sm:w-[7.25rem] ${className}`}
      aria-hidden
    >
      {/* Великий арт поза потоком; зсув вправо — трохи виступає за правий край картки */}
      <div className="absolute right-0 top-1/2 z-[1] h-[12.5rem] w-[12.5rem] translate-x-10 -translate-y-1/2 sm:h-[14.5rem] sm:w-[14.5rem] sm:translate-x-12">
        <div className="flex h-full w-full items-center justify-center motion-reduce:animate-none motion-reduce:transition-none animate-pp-stat-bob transition duration-500 ease-out will-change-transform group-hover:scale-[1.06]">
          <Image
            src={cfg.src}
            alt=""
            width={400}
            height={400}
            className={`h-full w-full object-contain object-center ${cfg.imgFilter}`}
          />
        </div>
      </div>
    </div>
  );
}
