const express = require('express');
const originalSendFile = express.response.sendFile;

const script = `<script id="max-account-init-hotfix">(function(){
if(window.__MAX_ACCOUNT_INIT_HOTFIX__)return;window.__MAX_ACCOUNT_INIT_HOTFIX__=true;
function extractInitData(){
  try{if(window.WebApp&&typeof window.WebApp.initData==='string'&&window.WebApp.initData.trim())return window.WebApp.initData.trim()}catch(_){}
  try{
    const hash=String(location.hash||'').replace(/^#/,'');
    if(hash){const params=new URLSearchParams(hash);let value=params.get('WebAppData');if(value)return value.trim();value=params.get('initData');if(value)return value.trim()}
  }catch(_){}
  try{
    const params=new URLSearchParams(location.search||'');
    let value=params.get('WebAppData');if(value)return value.trim();value=params.get('initData');if(value)return value.trim()
  }catch(_){}
  return '';
}
function extractUser(data){try{const value=new URLSearchParams(data).get('user');return value?JSON.parse(value):null}catch(_){return null}}
function patch(){
  const initData=extractInitData();
  if(!initData)return false;
  const user=extractUser(initData);
  try{
    if(!window.WebApp)window.WebApp={};
    try{window.WebApp.initData=initData}catch(_){}
    if(!window.WebApp.initDataUnsafe)window.WebApp.initDataUnsafe={};
    if(user)window.WebApp.initDataUnsafe.user=user;
    if(typeof window.WebApp.ready!=='function')window.WebApp.ready=function(){};
  }catch(error){console.warn('[MAX ACCOUNT HOTFIX] WebApp patch failed',error)}
  if(!window.__MAX_ACCOUNT_FETCH_PATCH__){
    const originalFetch=window.fetch.bind(window);
    const patchedFetch=function(input,options){
      try{
        const url=typeof input==='string'?input:(input&&input.url)||'';
        if(/\\/api\\//.test(url)){
          const nextOptions={...(options||{})};
          const headers=new Headers(nextOptions.headers||{});
          headers.set('X-MAX-Init-Data',initData);
          nextOptions.headers=headers;
          return originalFetch(input,nextOptions);
        }
      }catch(error){console.warn('[MAX ACCOUNT HOTFIX] fetch patch',error)}
      return originalFetch(input,options);
    };
    patchedFetch.__MAX_ACCOUNT_FETCH_PATCH__=true;
    window.fetch=patchedFetch;
    window.__MAX_ACCOUNT_FETCH_PATCH__=true;
  }
  if(user){
    const name=user.first_name||user.name||user.username||'Пользователь MAX';
    const nameEl=document.getElementById('user-name');if(nameEl)nameEl.textContent=name;
    const avatarEl=document.getElementById('avatar');if(avatarEl)avatarEl.textContent=name.charAt(0).toUpperCase();
    const homeName=document.getElementById('ai-home-account-name');if(homeName)homeName.textContent=name;
    const homeAvatar=document.getElementById('ai-home-account-avatar');if(homeAvatar)homeAvatar.textContent=name.charAt(0).toUpperCase();
  }
  return true;
}
let attempts=0;function tick(){attempts++;if(patch()||attempts>=120)clearInterval(timer)}const timer=setInterval(tick,100);tick();
})();</script>`;

function inject(body){if(typeof body!=='string'||!body.includes('<body')||body.includes('max-account-init-hotfix'))return body;const i=body.toLowerCase().lastIndexOf('</body>');if(i<0)return body;return body.slice(0,i)+script+body.slice(i)}

express.response.sendFile=function(filePath,...args){const isIndex=typeof filePath==='string'&&/(?:^|[\\/])index\.html$/i.test(filePath);if(!isIndex)return originalSendFile.call(this,filePath,...args);const old=this.send;this.send=body=>old.call(this,inject(body));try{return originalSendFile.call(this,filePath,...args)}finally{this.send=old}};
console.log('[MAX ACCOUNT INIT HOTFIX] initData/hash fallback and API auth loaded');
