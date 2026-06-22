export function RadarProfile() {
  return (
    <section className="panel radar-card">
      <h2>Profil Bisnis</h2>
      <p>Radar 6 dimensi analitik</p>
      <svg viewBox="0 0 220 220" className="radar-svg" aria-label="Profil bisnis radar">
        <g className="radar-grid">
          <polygon points="110,22 186,66 186,154 110,198 34,154 34,66" />
          <polygon points="110,52 160,81 160,139 110,168 60,139 60,81" />
          <polygon points="110,82 134,96 134,124 110,138 86,124 86,96" />
          <line x1="110" y1="22" x2="110" y2="198" />
          <line x1="34" y1="66" x2="186" y2="154" />
          <line x1="186" y1="66" x2="34" y2="154" />
        </g>
        <polygon className="radar-area" points="110,55 158,82 166,147 110,169 63,145 72,85" />
        {[
          [110, 55],
          [158, 82],
          [166, 147],
          [110, 169],
          [63, 145],
          [72, 85],
        ].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="5" />)}
        <text x="110" y="16">PROFITABILITAS</text>
        <text x="190" y="70">CASHFLOW</text>
        <text x="190" y="158">MARKETING</text>
        <text x="110" y="214">RETENSI</text>
        <text x="4" y="158">OPERASIONAL</text>
        <text x="12" y="70">SDM</text>
      </svg>
    </section>
  );
}
