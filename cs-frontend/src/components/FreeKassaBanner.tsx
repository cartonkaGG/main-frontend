import Image from "next/image";

type Props = {
  className?: string;
  imgClassName?: string;
};

/** Офіційний банер FreeKassa (вимога партнёрської програми). */
export function FreeKassaBanner({ className = "", imgClassName = "" }: Props) {
  return (
    <a
      href="https://freekassa.net/"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-block max-w-full ${className}`.trim()}
    >
      <Image
        src="https://cdn.freekassa.net/banners/big-dark-1.png"
        title="Прием платежей на сайте для физических лиц и т.д."
        alt=""
        width={468}
        height={60}
        className={`h-auto max-h-24 w-full max-w-2xl object-contain object-left sm:max-h-28 ${imgClassName}`.trim()}
      />
    </a>
  );
}
