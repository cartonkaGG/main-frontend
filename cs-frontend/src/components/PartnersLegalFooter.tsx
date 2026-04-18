import { FreeKassaBanner } from "@/components/FreeKassaBanner";

type Props = {
  className?: string;
};

/**
 * Лише банер FreeKassa на головній (юридичний блок — глобальний GlobalLegalFooter у SiteShell).
 */
export function PartnersLegalFooter({ className = "" }: Props) {
  return (
    <section
      className={`border-t border-cb-stroke/70 bg-gradient-to-b from-black/90 to-zinc-950/95 px-4 py-8 ${className}`.trim()}
      aria-label="Платёжные системы"
    >
      <div className="mx-auto flex max-w-7xl justify-center">
        <FreeKassaBanner className="flex justify-center" imgClassName="max-h-16 sm:max-h-20" />
      </div>
    </section>
  );
}
