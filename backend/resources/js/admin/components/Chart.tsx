import { useEffect, useRef } from 'react';
import { ArcElement, BarController, BarElement, CategoryScale, Chart, DoughnutController, Filler, Legend, LinearScale, LineController, LineElement, PointElement, Tooltip, type ChartConfiguration } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, BarController, BarElement, DoughnutController, ArcElement, CategoryScale, LinearScale, Filler, Tooltip, Legend);

/** Thin chart.js wrapper that re-themes on dark-mode changes. */
export function ChartBox({ config, height = 260, label }: { config: (dark: boolean) => ChartConfiguration; height?: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let chart: Chart | null = null;
    const draw = () => {
      chart?.destroy();
      const dark = document.documentElement.classList.contains('dark');
      Chart.defaults.color = dark ? '#a8b3bf' : '#5b6b7b';
      Chart.defaults.borderColor = dark ? 'rgba(255,255,255,.07)' : 'rgba(15,23,42,.07)';
      Chart.defaults.font.family = '"Plus Jakarta Sans","Hind Siliguri",system-ui,sans-serif';
      if (ref.current) chart = new Chart(ref.current, config(dark));
    };
    draw();
    const mo = new MutationObserver(draw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => { mo.disconnect(); chart?.destroy(); };
  }, [config]);
  return <div style={{ height }} className="relative"><canvas ref={ref} role="img" aria-label={label} /></div>;
}
