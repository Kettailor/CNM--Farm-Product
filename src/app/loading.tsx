import Image from "next/image";

export default function Loading() {
  return (
    <main className="farm-loading-page farm-loading-page-cow-only" aria-label="Dang tai">
      <Image
        src="/assets/img/con_bo.svg"
        alt=""
        width={96}
        height={96}
        className="farm-loading-cow-only"
        priority
      />
    </main>
  );
}
