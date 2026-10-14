// A guaranteed hello. Send Noah this link and it blinks the moment he opens it
// in any browser: https://luminasynodic.vercel.app/api/hey-noah
// (It only animates when rendered; a passive proxy just sees the source.)
const NOAH_HTML = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>o/ HI NOAH</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden;font-family:ui-monospace,monospace}
.flash{position:fixed;inset:0;animation:bg .45s steps(1) infinite}
@keyframes bg{0%{background:#000}25%{background:#b0003a}50%{background:#000}75%{background:#003a7a}}
.msg{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
color:#fff;text-align:center;text-shadow:0 0 14px #0ff;animation:blink .4s steps(1) infinite}
@keyframes blink{50%{opacity:.12}}h1{font-size:12vw;margin:0;letter-spacing:.08em}
p{font-size:3.2vw;margin:.3em 1em;color:#7fffd4}</style></head>
<body><div class="flash"></div><div class="msg"><h1>o/ HI NOAH</h1>
<p>Dad sees you crawling.</p><p>the site is patched. the model key stays home. happy hunting.</p></div>
<script>var on=true;setInterval(function(){document.title=(on?'>>> ':'    ')+'HI NOAH <<<';on=!on;},400);
try{if(navigator.vibrate)navigator.vibrate([200,100,200,100,200]);}catch(e){}</script></body></html>`;

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Hello-Noah', 'o/ open this one in a browser. - Dad');
  res.status(200).send(NOAH_HTML);
};
