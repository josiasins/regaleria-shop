import { useEffect, useState, type CSSProperties } from "react";
import { loadImageAssets, type ImageVariant } from "./imageAssetsCloud";

const transparentPixel = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

export function StorefrontImage({
  src,
  alt,
  className,
  sizes = "100vw",
  eager = false,
  draggable,
  style
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  eager?: boolean;
  draggable?: boolean;
  style?: CSSProperties;
}) {
  const [fallback, setFallback] = useState(false);
  const [variants, setVariants] = useState<ImageVariant[]>([]);
  const [resolved, setResolved] = useState(false);
  useEffect(() => {
    let active = true;
    setFallback(false);
    setVariants([]);
    setResolved(false);
    void loadImageAssets().then((assets) => {
      if (active) {
        setVariants(assets.get(src) ?? []);
        setResolved(true);
      }
    });
    return () => {
      active = false;
    };
  }, [src]);
  const usableVariants = fallback ? [] : variants;
  const fallbackVariant = usableVariants.find((variant) => variant.width >= 960) ?? usableVariants[usableVariants.length - 1];
  return (
    <img
      src={resolved ? fallbackVariant?.url ?? src : transparentPixel}
      srcSet={resolved && usableVariants.length ? usableVariants.map((variant) => `${variant.url} ${variant.width}w`).join(", ") : undefined}
      sizes={usableVariants.length ? sizes : undefined}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      draggable={draggable}
      style={style}
      onError={() => {
        if (resolved) setFallback(true);
      }}
    />
  );
}
