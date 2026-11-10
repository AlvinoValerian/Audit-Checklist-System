"use client";

import React, { useState, useEffect } from "react";
import { decryptImageData } from "@/lib/image-crypto";

interface DecryptedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallbackText?: string;
}

export default function DecryptedImage({
  src,
  alt = "Foto",
  className = "",
  fallbackText,
  ...props
}: DecryptedImageProps) {
  const [decryptedSrc, setDecryptedSrc] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setHasError(false);
    if (!src) {
      setDecryptedSrc("");
      setLoading(false);
      return;
    }

    if (src.startsWith("data:") || src.startsWith("http") || src.startsWith("/")) {
      setDecryptedSrc(src);
      setLoading(false);
      return;
    }

    setLoading(true);
    decryptImageData(src)
      .then(async (dec) => {
        if ((!dec || dec === src) && src.startsWith("enc:v1:")) {
          const { CryptoService } = await import("@/lib/crypto");
          return CryptoService.decryptImage(src);
        }
        return dec;
      })
      .then((dec) => {
        if (isMounted) {
          setDecryptedSrc(dec);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn("Failed to decrypt image preview:", err);
        if (isMounted) {
          setDecryptedSrc(src);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-slate-900/50 ${className}`}>
        <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (hasError || !decryptedSrc) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 text-xs ${className}`}>
        {fallbackText || "Tidak ada gambar"}
      </div>
    );
  }

  return (
    <img
      src={decryptedSrc}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}
