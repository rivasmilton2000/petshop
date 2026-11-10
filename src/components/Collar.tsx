import { useEffect, useRef, useState } from 'react';

/** Closed by default for SSR, no JavaScript and reduced motion. Plays once on entry. */
export function Collar() {
  const scene = useRef<HTMLDivElement>(null);
  const [motion, setMotion] = useState(false);
  const [fastened, setFastened] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer: IntersectionObserver | undefined;
    const observe = () => {
      observer?.disconnect();
      setMotion(!preference.matches);
      if (preference.matches || !scene.current || !('IntersectionObserver' in window)) {
        setFastened(true);
        return;
      }
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setFastened(true);
          observer?.disconnect();
        }
      }, { threshold: 0.45 });
      observer.observe(scene.current);
    };
    observe();
    preference.addEventListener('change', observe);
    return () => { observer?.disconnect(); preference.removeEventListener('change', observe); };
  }, []);

  return <div className="collar-scene" ref={scene} data-motion={motion} data-fastened={fastened} aria-hidden="true">
    <svg className="collar-scene__drawing" viewBox="0 0 1440 180" fill="none" focusable="false">
      <defs>
        <linearGradient id="collar-webbing" x2="0" y2="1"><stop stopColor="#C8936D" /><stop offset=".45" stopColor="#AD7653" /><stop offset="1" stopColor="#8D5B3D" /></linearGradient>
        <linearGradient id="collar-hardware" x2="0" y2="1"><stop stopColor="#6A4D4E" /><stop offset="1" stopColor="#322326" /></linearGradient>
        <pattern id="collar-weave" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 0l6 6M-3 3l6 6M3-3l6 6" stroke="#F7EEE7" strokeOpacity=".12" /></pattern>
      </defs>
      <g className="collar-scene__half collar-scene__half--left">
        <rect x="-1440" y="58" width="2086" height="64" rx="12" fill="url(#collar-webbing)" />
        <rect x="-1440" y="58" width="2086" height="64" rx="12" fill="url(#collar-weave)" />
        <path d="M-1440 67H633M-1440 113H633" stroke="#F7EEE7" strokeOpacity=".65" strokeWidth="2" strokeDasharray="6 5" />
        <rect x="572" y="48" width="45" height="84" rx="10" stroke="#493234" strokeWidth="9" />
        <rect x="612" y="43" width="66" height="94" rx="12" fill="url(#collar-hardware)" />
        <rect x="624" y="57" width="24" height="66" rx="5" fill="#AD7653" />
        <path d="M668 50h63q19 0 26 18l-9 7-13-10h-67ZM668 130h63q19 0 26-18l-9-7-13 10h-67Z" fill="#493234" />
        <rect x="669" y="82" width="81" height="16" rx="6" fill="#493234" />
      </g>
      <g className="collar-scene__half collar-scene__half--right">
        <rect x="800" y="58" width="2080" height="64" rx="12" fill="url(#collar-webbing)" />
        <rect x="800" y="58" width="2080" height="64" rx="12" fill="url(#collar-weave)" />
        <path d="M810 67H2880M810 113H2880" stroke="#F7EEE7" strokeOpacity=".65" strokeWidth="2" strokeDasharray="6 5" />
        <rect x="707" y="40" width="122" height="100" rx="16" fill="url(#collar-hardware)" />
        <path d="M709 61v58" stroke="#23191C" strokeWidth="5" />
        <rect x="792" y="56" width="23" height="68" rx="5" fill="#AD7653" />
        <rect x="725" y="52" width="48" height="76" rx="10" stroke="#947579" strokeOpacity=".5" strokeWidth="2" />
        <path d="M742 81c-9-11-19 3 7 18 26-15 16-29 7-18l-7 6-7-6Z" fill="#E8CFCC" />
      </g>
    </svg>
  </div>;
}
