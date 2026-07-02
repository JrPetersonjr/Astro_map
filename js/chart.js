(function (global) {
  function createChartUx(config) {
    const cfg = config || {};

    function getLatestDate() {
      return typeof cfg.getLatestDate === 'function' ? cfg.getLatestDate() : null;
    }

    function getLatestData() {
      return typeof cfg.getLatestData === 'function' ? cfg.getLatestData() : [];
    }

    function renderZodiacWheel() {
      const container = document.getElementById('zodiacWheelContainer');
      const info = document.getElementById('zodiacWheelInfo');
      if (!container) return;

      const latestDate = getLatestDate();
      const latestData = getLatestData();
      const appDate = latestDate || new Date();
      const yr = appDate.getFullYear() + appDate.getMonth() / 12;
      const AYANAMSA = 23.857 + (yr - 2000) * 0.01397;
      const NS = 'http://www.w3.org/2000/svg';
      const CX = 300;
      const CY = 300;

      function pt(lon, r) {
        const rad = (lon - 90) * Math.PI / 180;
        return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
      }

      function S(n) {
        return n.toFixed(2);
      }

      function sector(g, startL, endL, rIn, rOut, fill, strokeCol) {
        const span = ((endL - startL) + 360) % 360;
        const la = span > 180 ? 1 : 0;
        const s_out = pt(startL, rOut);
        const e_out = pt(endL, rOut);
        const s_in = pt(startL, rIn);
        const e_in = pt(endL, rIn);
        const d = `M${S(s_out.x)},${S(s_out.y)} A${rOut},${rOut} 0 ${la},1 ${S(e_out.x)},${S(e_out.y)} L${S(e_in.x)},${S(e_in.y)} A${rIn},${rIn} 0 ${la},0 ${S(s_in.x)},${S(s_in.y)}Z`;
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', fill);
        path.setAttribute('stroke', strokeCol || 'rgba(255,255,255,0.18)');
        path.setAttribute('stroke-width', '0.7');
        g.appendChild(path);
      }

      function svgText(g, lon, r, txt, opts) {
        const p = pt(lon, r);
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', S(p.x));
        t.setAttribute('y', S(p.y));
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('dominant-baseline', 'middle');
        t.setAttribute('font-size', opts.size || 10);
        t.setAttribute('fill', opts.fill || '#fff');
        t.setAttribute('font-family', opts.font || 'inherit');
        if (opts.weight) t.setAttribute('font-weight', opts.weight);
        if (opts.rotate) t.setAttribute('transform', `rotate(${opts.rotate},${S(p.x)},${S(p.y)})`);
        t.textContent = txt;
        g.appendChild(t);
        return t;
      }

      function spoke(g, lon, r1, r2, col) {
        const a = pt(lon, r1);
        const b = pt(lon, r2);
        const l = document.createElementNS(NS, 'line');
        l.setAttribute('x1', S(a.x));
        l.setAttribute('y1', S(a.y));
        l.setAttribute('x2', S(b.x));
        l.setAttribute('y2', S(b.y));
        l.setAttribute('stroke', col || 'rgba(255,255,255,0.22)');
        l.setAttribute('stroke-width', '0.8');
        g.appendChild(l);
      }

      function circle(g, r, fill, stroke, sw) {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', CX);
        c.setAttribute('cy', CY);
        c.setAttribute('r', r);
        c.setAttribute('fill', fill || 'none');
        c.setAttribute('stroke', stroke || 'none');
        if (sw) c.setAttribute('stroke-width', sw);
        g.appendChild(c);
      }

      const GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
      const NAMES = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'];

      const TROP_A = 'rgba(38,72,155,0.82)';
      const TROP_B = 'rgba(52,90,175,0.82)';
      const SID_A = 'rgba(18,118,100,0.82)';
      const SID_B = 'rgba(28,148,124,0.82)';
      const ASTRO_A = 'rgba(148,40,70,0.82)';
      const ASTRO_B = 'rgba(118,30,55,0.82)';
      const OPH_COL = 'rgba(80,60,120,0.82)';

      const R_TROP_IN = 148;
      const R_TROP_OUT = 194;
      const R_SID_IN = 198;
      const R_SID_OUT = 244;
      const R_ASTRO_IN = 248;
      const R_ASTRO_OUT = 290;
      const R_LABEL = 308;

      const ASTRO_CONSTS = [
        { name: 'Psc', glyph: '♓', start: 349.75, end: 386.5 },
        { name: 'Ari', glyph: '♈', start: 26.5, end: 51.5 },
        { name: 'Tau', glyph: '♉', start: 51.5, end: 89.0 },
        { name: 'Gem', glyph: '♊', start: 89.0, end: 116.0 },
        { name: 'Cnc', glyph: '♋', start: 116.0, end: 136.0 },
        { name: 'Leo', glyph: '♌', start: 136.0, end: 173.0 },
        { name: 'Vir', glyph: '♍', start: 173.0, end: 218.0 },
        { name: 'Lib', glyph: '♎', start: 218.0, end: 241.0 },
        { name: 'Sco', glyph: '♏', start: 241.0, end: 249.0 },
        { name: 'Oph', glyph: '⛎', start: 249.0, end: 268.0 },
        { name: 'Sgr', glyph: '♐', start: 268.0, end: 301.0 },
        { name: 'Cap', glyph: '♑', start: 301.0, end: 328.0 },
        { name: 'Aqr', glyph: '♒', start: 328.0, end: 349.75 }
      ];

      const STARS = [
        { name: 'Aldebaran', sid: 45.0, short: 'Ald 15°♉' },
        { name: 'Regulus', sid: 149.8, short: 'Reg 29°♌' },
        { name: 'SG Centre', sid: 157.0, short: 'SGC 7°♍' },
        { name: 'Spica', sid: 173.7, short: 'Spica 23°♍' },
        { name: 'Antares', sid: 225.3, short: 'Ant 15°♏' },
        { name: 'Gal.Centre', sid: 240.7, short: 'GC 0°♐' },
        { name: 'Gate of God', sid: 245.0, short: '⊕ God 5°♐' },
        { name: 'Solar Apex', sid: 256.0, short: 'SA 16°♐' },
        { name: 'Gate of Man', sid: 65.0, short: '⊕ Man 5°♊' },
        { name: 'Fomalhaut', sid: 339.0, short: 'Fom 9°♓' },
        { name: 'Scheat', sid: 332.0, short: 'Sch 2°♓' }
      ];

      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 600 600');
      svg.setAttribute('width', '100%');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Zodiac precession wheel showing Tropical, Sidereal and Astronomical systems');

      const bg = document.createElementNS(NS, 'rect');
      bg.setAttribute('width', 600);
      bg.setAttribute('height', 600);
      bg.setAttribute('fill', '#0d0d10');
      svg.appendChild(bg);

      const g = document.createElementNS(NS, 'g');
      svg.appendChild(g);

      for (let i = 0; i < 12; i++) {
        const start = i * 30;
        const end = start + 30;
        sector(g, start, end, R_TROP_IN, R_TROP_OUT, i % 2 ? TROP_B : TROP_A);
        svgText(g, start + 15, (R_TROP_IN + R_TROP_OUT) / 2, GLYPHS[i], {
          size: 13,
          fill: 'rgba(170,200,255,0.95)',
          font: "'Noto Sans Symbols 2','Segoe UI Symbol',Symbol,sans-serif"
        });
      }
      circle(g, R_TROP_IN, 'none', 'rgba(80,120,220,0.5)', 0.8);
      circle(g, R_TROP_OUT, 'none', 'rgba(80,120,220,0.5)', 0.8);

      for (let i = 0; i < 12; i++) {
        const start = i * 30 + AYANAMSA;
        const end = start + 30;
        sector(g, start, end, R_SID_IN, R_SID_OUT, i % 2 ? SID_B : SID_A);
        svgText(g, start + 15, (R_SID_IN + R_SID_OUT) / 2, GLYPHS[i], {
          size: 12,
          fill: 'rgba(140,240,210,0.95)',
          font: "'Noto Sans Symbols 2','Segoe UI Symbol',Symbol,sans-serif"
        });
      }
      circle(g, R_SID_IN, 'none', 'rgba(40,180,150,0.5)', 0.8);
      circle(g, R_SID_OUT, 'none', 'rgba(40,180,150,0.5)', 0.8);

      const ASTRO_COLORS = { Oph: OPH_COL };
      ASTRO_CONSTS.forEach((c, i) => {
        let s = c.start % 360;
        let e = c.end % 360;
        if (e <= s) e += 360;
        const fill = ASTRO_COLORS[c.name] || (i % 2 ? ASTRO_B : ASTRO_A);
        sector(g, s, e, R_ASTRO_IN, R_ASTRO_OUT, fill);
        const mid = (s + e) / 2;
        svgText(g, mid, (R_ASTRO_IN + R_ASTRO_OUT) / 2, c.glyph, {
          size: 11,
          fill: c.name === 'Oph' ? 'rgba(200,180,255,0.95)' : 'rgba(255,170,170,0.95)',
          font: "'Noto Sans Symbols 2','Segoe UI Symbol',Symbol,sans-serif"
        });
        spoke(g, s, R_ASTRO_IN, R_ASTRO_OUT, 'rgba(255,255,255,0.28)');
      });
      circle(g, R_ASTRO_IN, 'none', 'rgba(180,50,80,0.5)', 0.8);
      circle(g, R_ASTRO_OUT, 'none', 'rgba(180,50,80,0.5)', 0.8);

      for (let i = 0; i < 12; i++) spoke(g, i * 30, R_TROP_IN, R_TROP_OUT);
      for (let i = 0; i < 12; i++) spoke(g, i * 30 + AYANAMSA, R_SID_IN, R_SID_OUT);

      STARS.forEach((star) => {
        const tropLon = star.sid + AYANAMSA;
        const pOuter = pt(tropLon, R_ASTRO_OUT + 6);
        const tick = document.createElementNS(NS, 'line');
        tick.setAttribute('x1', S(pt(tropLon, R_ASTRO_IN).x));
        tick.setAttribute('y1', S(pt(tropLon, R_ASTRO_IN).y));
        tick.setAttribute('x2', S(pOuter.x));
        tick.setAttribute('y2', S(pOuter.y));
        tick.setAttribute('stroke', 'rgba(255,220,100,0.7)');
        tick.setAttribute('stroke-width', '1');
        g.appendChild(tick);

        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('cx', S(pOuter.x));
        dot.setAttribute('cy', S(pOuter.y));
        dot.setAttribute('r', 2.5);
        dot.setAttribute('fill', '#fad56a');
        g.appendChild(dot);

        const rotAngle = tropLon - 90;
        svgText(g, tropLon, R_LABEL, star.short, {
          size: 6.5,
          fill: 'rgba(250,213,106,0.9)',
          rotate: rotAngle
        });
      });

      const VE_lon = 0;
      const ve_outer = pt(VE_lon, R_ASTRO_OUT + 14);
      const ve_inner = pt(VE_lon, R_TROP_IN - 14);
      const veL = document.createElementNS(NS, 'line');
      veL.setAttribute('x1', S(ve_inner.x));
      veL.setAttribute('y1', S(ve_inner.y));
      veL.setAttribute('x2', S(ve_outer.x));
      veL.setAttribute('y2', S(ve_outer.y));
      veL.setAttribute('stroke', '#fff');
      veL.setAttribute('stroke-width', '1.5');
      veL.setAttribute('stroke-dasharray', '4 3');
      g.appendChild(veL);
      svgText(g, VE_lon, R_TROP_IN - 22, '♈ 0°', { size: 7, fill: '#fff', weight: 700 });

      [{ sid: 245 }, { sid: 65 }].forEach((gm) => {
        const tlon = gm.sid + AYANAMSA;
        const gp = pt(tlon, R_ASTRO_OUT + 3);
        const gc = document.createElementNS(NS, 'circle');
        gc.setAttribute('cx', S(gp.x));
        gc.setAttribute('cy', S(gp.y));
        gc.setAttribute('r', 3.5);
        gc.setAttribute('fill', 'none');
        gc.setAttribute('stroke', '#7fe8d0');
        gc.setAttribute('stroke-width', '1.5');
        g.appendChild(gc);
      });

      const gcTrop = 240.7 + AYANAMSA;
      const gcp = pt(gcTrop, R_ASTRO_OUT + 5);
      const gcStar = document.createElementNS(NS, 'circle');
      gcStar.setAttribute('cx', S(gcp.x));
      gcStar.setAttribute('cy', S(gcp.y));
      gcStar.setAttribute('r', 4);
      gcStar.setAttribute('fill', '#7fe8d0');
      g.appendChild(gcStar);

      ['TROPICAL', 'SIDEREAL', 'ASTRO'].forEach((label, idx) => {
        const r = [171, 221, 268][idx];
        const col = ['rgba(130,170,255,0.7)', 'rgba(80,210,180,0.7)', 'rgba(220,100,130,0.7)'][idx];
        const pathId = `ring-arc-${idx}`;
        const arcPath = document.createElementNS(NS, 'path');
        const p1 = pt(95, r);
        const p2 = pt(265, r);
        arcPath.setAttribute('id', pathId);
        arcPath.setAttribute('d', `M${S(p1.x)},${S(p1.y)} A${r},${r} 0 1,1 ${S(p2.x)},${S(p2.y)}`);
        arcPath.setAttribute('fill', 'none');
        svg.appendChild(arcPath);

        const tp = document.createElementNS(NS, 'text');
        tp.setAttribute('font-size', 6.5);
        tp.setAttribute('fill', col);
        tp.setAttribute('letter-spacing', 1.2);
        const tpSpan = document.createElementNS(NS, 'textPath');
        tpSpan.setAttribute('href', `#${pathId}`);
        tpSpan.setAttribute('startOffset', '30%');
        tpSpan.setAttribute('text-anchor', 'middle');
        tpSpan.textContent = label;
        tp.appendChild(tpSpan);
        svg.appendChild(tp);
      });

      circle(g, R_TROP_IN - 1, '#0d0d10', 'none');
      const ayan_deg = Math.floor(AYANAMSA);
      const ayan_min = Math.round((AYANAMSA - ayan_deg) * 60);
      const veqSid = ((360 - AYANAMSA) % 360).toFixed(1);
      const veqSign = Math.floor(veqSid / 30);
      const veqDeg = (veqSid % 30).toFixed(1);

      [
        { y: -36, txt: 'PRECESSION', size: 8, fill: 'rgba(255,255,255,0.5)', weight: 700, ls: 2 },
        { y: -24, txt: 'OF THE ZODIAC', size: 7, fill: 'rgba(255,255,255,0.4)', ls: 1.5 },
        { y: -6, txt: 'Ayanamsa (Lahiri)', size: 7.5, fill: 'rgba(200,200,210,0.7)' },
        { y: 8, txt: `${ayan_deg}° ${ayan_min}'`, size: 14, fill: '#fad56a', weight: 700 },
        { y: 24, txt: '♈ 0° Tropical', size: 7, fill: 'rgba(200,200,210,0.6)' },
        { y: 34, txt: `= ${NAMES[veqSign]} ${veqDeg}° Sidereal`, size: 7, fill: 'rgba(140,240,210,0.8)' },
        { y: 48, txt: appDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }), size: 6.5, fill: 'rgba(200,200,210,0.45)' }
      ].forEach((item) => {
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', CX);
        t.setAttribute('y', CY + item.y);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('dominant-baseline', 'middle');
        t.setAttribute('font-size', item.size);
        t.setAttribute('fill', item.fill);
        if (item.weight) t.setAttribute('font-weight', item.weight);
        if (item.ls) t.setAttribute('letter-spacing', item.ls);
        t.textContent = item.txt;
        g.appendChild(t);
      });

      if (latestData && latestData.length) {
        const planets = document.createElementNS(NS, 'g');
        latestData.forEach((planet) => {
          const lon = planet.longitude;
          const dp = pt(lon, (R_TROP_IN + R_TROP_OUT) / 2);
          const dc = document.createElementNS(NS, 'circle');
          dc.setAttribute('cx', S(dp.x));
          dc.setAttribute('cy', S(dp.y));
          dc.setAttribute('r', 3.5);
          dc.setAttribute('fill', planet.color);
          dc.setAttribute('stroke', '#0d0d10');
          dc.setAttribute('stroke-width', '0.8');
          planets.appendChild(dc);
          svgText(planets, lon, R_TROP_IN - 12, planet.glyph.replace('️', ''), {
            size: 8,
            fill: planet.color,
            font: "'Noto Sans Symbols 2','Segoe UI Symbol',Symbol,sans-serif"
          });
        });
        g.appendChild(planets);
      }

      container.innerHTML = '';
      container.appendChild(svg);

      if (info) {
        info.innerHTML = `<strong>Ayanamsa ${ayan_deg}°${ayan_min}'</strong> - the tropical vernal equinox (♈ 0°) currently falls at <strong>${NAMES[veqSign]} ${veqDeg}°</strong> in the sidereal system. The zodiac precesses ~1° every 72 years. Ophiuchus <span style="color:#b0a0e0">⛎</span> shows in the astronomical ring where the Sun actually crosses this constellation (~Nov 30-Dec 17).`;
      }
    }

    return {
      renderZodiacWheel
    };
  }

  global.LuminaChart = {
    createChartUx
  };
})(window);
