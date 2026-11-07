import {signedHeaders} from './signing.js';

const API_HOST='https://api3.aoneroom.com';
const BOOTSTRAP_HOST='https://apig.inmoviebox.com';
const SIGNING_KEYS=[
  '76iRl07s0xSN9jqmEWAt79EBJZulIQIsV64FZr2O',
  'Xqn2nnO41/L92o1iuXhSLHTbXvY4Z5ZZ62m8mSLA'
];
let guestToken='';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors}});

function extractToken(response){
  const raw=response.headers.get('x-user')||response.headers.get('token')||'';
  if(!raw)return '';
  try{const parsed=JSON.parse(raw);return parsed.token||parsed.data?.token||''}catch{return raw}
}

async function upstream(url,method,body='',token=''){
  let lastResponse;
  for(const key of SIGNING_KEYS){
    const signedBody=method==='GET'?null:body;
    const response=await fetch(url,{method,headers:signedHeaders(new URL(url),method,signedBody,key,token),body:method==='GET'?undefined:body,redirect:'follow'});
    lastResponse=response;
    if(response.status!==407)return response;
  }
  return lastResponse;
}

async function getGuestToken(){
  if(guestToken)return guestToken;
  const url=BOOTSTRAP_HOST+'/wefeed-mobile-bff/tab/ranking-list?tabId=0&categoryType=4516404531735022304&page=1&perPage=1';
  const response=await upstream(url,'GET');
  if(!response.ok)throw new Error(`MovieBox token request returned HTTP ${response.status}: ${(await response.text()).slice(0,240)}`);
  guestToken=extractToken(response);
  if(!guestToken)throw new Error('MovieBox did not provide an x-user guest token');
  return guestToken;
}

async function apiRequest(request){
  const url=new URL(request.url),action=url.pathname.slice('/api/'.length);
  let target,method='GET',body='';
  if(action==='list'){
    target=API_HOST+'/wefeed-mobile-bff/tab/ranking-list?tabId=0&categoryType=4516404531735022304&page=1&perPage=24';
  }else if(action==='search'){
    const incoming=request.method==='POST'?await request.json().catch(()=>({})):Object.fromEntries(url.searchParams);
    target=API_HOST+'/wefeed-mobile-bff/subject-api/search/v2';method='POST';
    body=JSON.stringify({page:1,perPage:20,keyword:String(incoming.keyword||incoming.q||'')});
  }else if(action==='detail'){
    const id=url.searchParams.get('subjectId')||url.searchParams.get('id');
    if(!id)return json({error:'معرّف العنوان مطلوب'},400);
    target=API_HOST+'/wefeed-mobile-bff/subject-api/get?subjectId='+encodeURIComponent(id);
  }else return json({error:'مسار API غير معروف'},404);

  try{
    const token=await getGuestToken();
    const response=await upstream(target,method,body,token);
    const text=await response.text();
    if(!response.ok)return new Response(text,{status:response.status,headers:{'Content-Type':response.headers.get('content-type')||'application/json; charset=utf-8',...cors}});
    try{const parsed=JSON.parse(text);if(typeof parsed.code==='number'&&parsed.code!==0)return json({error:parsed.message||parsed.reason||`MovieBox API رفض الطلب (${parsed.code})`,upstreamCode:parsed.code},502)}catch{}
    return new Response(text,{status:response.status,headers:{'Content-Type':response.headers.get('content-type')||'application/json; charset=utf-8',...cors}});
  }catch(error){return json({error:`فشل الاتصال بخدمة MovieBox: ${error.message}`},502)}
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/')){
      if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
      return apiRequest(request);
    }
    return env.ASSETS.fetch(request);
  }
};
