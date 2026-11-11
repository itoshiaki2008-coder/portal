/*!
 * gate.js — 社内限定パスワード画面（ULリスト方式の共通版）
 * 使い方：各ページの <head> 内、できるだけ先頭に次の1行を入れる
 *   <meta name="robots" content="noindex,nofollow">
 *   <script src="https://itoshiaki2008-coder.github.io/portal/gate.js"></script>
 * パスワードを変更するときは PASS_HASH だけ差し替える（gate_hash.html で生成）。
 * ※ 抑止用です。ページの中身自体は公開されたままで、HTMLを直接読めば見えます。
 */
(function(){
  'use strict';
  // ===== 設定 =====
  var PASS_HASH  = '0d311d0c410721b169225badc1bdb8fd64c2a96be6484f45f4cfc05140f9586d';
  var VALID_MIN  = 10;                 // 有効時間（分）
  var STORE_KEY  = 'portal_gate_exp';  // 同一ドメイン（portal/ul 等）で共有されるキー
  var SALT       = 'portal:';
  var TITLE      = '社内限定';
  // =================

  function rotr(n,x){return (x>>>n)|(x<<(32-n));}
  function sha256(str){
    var K=[],H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],p=2,c=0,i,j;
    function isP(n){for(var k=2;k*k<=n;k++)if(n%k===0)return false;return true;}
    while(c<64){if(isP(p)){K[c++]=(Math.pow(p,1/3)*4294967296)|0;}p++;}
    var b=unescape(encodeURIComponent(str)),l=b.length*8,w=[];
    for(i=0;i<b.length;i++)w[i>>2]|=b.charCodeAt(i)<<(24-(i%4)*8);
    w[l>>5]|=0x80<<(24-l%32);w[(((l+64)>>9)<<4)+15]=l;
    for(j=0;j<w.length;j+=16){
      var a=H.slice(),W=[];
      for(i=0;i<64;i++){
        if(i<16)W[i]=w[j+i]|0;
        else{var s0=rotr(7,W[i-15])^rotr(18,W[i-15])^(W[i-15]>>>3),s1=rotr(17,W[i-2])^rotr(19,W[i-2])^(W[i-2]>>>10);W[i]=(W[i-16]+s0+W[i-7]+s1)|0;}
        var S1=rotr(6,a[4])^rotr(11,a[4])^rotr(25,a[4]),ch=(a[4]&a[5])^(~a[4]&a[6]),t1=(a[7]+S1+ch+K[i]+W[i])|0,
            S0=rotr(2,a[0])^rotr(13,a[0])^rotr(22,a[0]),mj=(a[0]&a[1])^(a[0]&a[2])^(a[1]&a[2]),t2=(S0+mj)|0;
        a=[(t1+t2)|0,a[0],a[1],a[2],(a[3]+t1)|0,a[4],a[5],a[6]];
      }
      for(i=0;i<8;i++)H[i]=(H[i]+a[i])|0;
    }
    return H.map(function(x){return ('00000000'+(x>>>0).toString(16)).slice(-8);}).join('');
  }
  window.__gateHash=function(pw){return sha256(SALT+pw);};
  if(window.GATE_OFF)return;

  var mem=0;
  function getExp(){try{return +localStorage.getItem(STORE_KEY)||0;}catch(e){return mem;}}
  function setExp(v){try{localStorage.setItem(STORE_KEY,String(v));}catch(e){mem=v;}}
  function clearExp(){try{localStorage.removeItem(STORE_KEY);}catch(e){mem=0;}}
  function valid(){return getExp()>Date.now();}

  var root=document.documentElement, timer=null;
  var st=document.createElement('style');
  st.textContent='html.gate-locked body>*:not(#gate-ov){display:none!important}'+
   'html.gate-locked body{margin:0;background:#0b1624!important}'+
   '#gate-ov{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;'+
   'background:linear-gradient(160deg,#0b1624,#152538);font-family:"Noto Sans JP","Hiragino Sans",Meiryo,sans-serif;color:#e3edf7}'+
   '#gate-ov .bx{width:min(340px,88vw);padding:1.6rem 1.4rem;border:1px solid rgba(100,180,255,.25);border-radius:14px;background:rgba(255,255,255,.04);text-align:center}'+
   '#gate-ov h2{margin:0 0 .3rem;font-size:17px}#gate-ov p{margin:0 0 1rem;font-size:12px;color:#8fa6bd}'+
   '#gate-ov input{width:100%;padding:11px 12px;font-size:16px;border-radius:8px;border:1px solid rgba(100,180,255,.3);background:rgba(8,16,28,.7);color:#e3edf7;text-align:center;outline:none}'+
   '#gate-ov button{width:100%;margin-top:.7rem;padding:11px;font-size:14px;font-weight:700;border:0;border-radius:8px;background:#4dd0e1;color:#06202b;cursor:pointer}'+
   '#gate-ov .er{min-height:1.3em;margin-top:.6rem;font-size:12px;color:#ef7a7a}';
  (document.head||root).appendChild(st);

  function lock(){
    root.classList.add('gate-locked');
    if(document.getElementById('gate-ov'))return;
    var build=function(){
      if(document.getElementById('gate-ov')||!document.body)return;
      var ov=document.createElement('div');ov.id='gate-ov';
      ov.innerHTML='<div class="bx"><h2>'+TITLE+'</h2><p>パスワードを入力してください（有効 '+VALID_MIN+' 分）</p>'+
        '<input id="gate-pw" type="password" autocomplete="current-password" aria-label="パスワード">'+
        '<button id="gate-go" type="button">開く</button><div class="er" id="gate-er"></div></div>';
      document.body.appendChild(ov);
      var fails=0,wait=0,pw=document.getElementById('gate-pw'),er=document.getElementById('gate-er');
      function go(){
        if(Date.now()<wait){er.textContent='しばらくしてからもう一度お試しください。';return;}
        if(window.__gateHash(pw.value)===PASS_HASH){unlock();}
        else{fails++;pw.value='';er.textContent='パスワードが違います。';
          if(fails>=5){wait=Date.now()+30000;fails=0;er.textContent='5回失敗しました。30秒お待ちください。';}}
      }
      document.getElementById('gate-go').onclick=go;
      pw.onkeydown=function(e){if(e.key==='Enter')go();};
      pw.focus();
    };
    if(document.body)build();else document.addEventListener('DOMContentLoaded',build);
  }
  function unlock(){
    setExp(Date.now()+VALID_MIN*60000);
    root.classList.remove('gate-locked');
    var ov=document.getElementById('gate-ov');if(ov)ov.remove();
    schedule();
  }
  function schedule(){
    clearTimeout(timer);
    var ms=getExp()-Date.now();
    if(ms<=0){clearExp();lock();return;}
    timer=setTimeout(function(){clearExp();lock();},ms+200);
  }
  // 他タブで期限切れ／ログインしたときも同期
  window.addEventListener('storage',function(e){if(e.key===STORE_KEY){if(valid()){root.classList.remove('gate-locked');var o=document.getElementById('gate-ov');if(o)o.remove();schedule();}else lock();}});

  if(valid()){schedule();}else{lock();}
})();
