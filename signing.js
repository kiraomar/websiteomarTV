const encoder = new TextEncoder();

export function md5(input) {
  const src = input instanceof Uint8Array ? input : encoder.encode(String(input));
  const size = Math.ceil((src.length + 9) / 64) * 64;
  const bytes = new Uint8Array(size);
  bytes.set(src);
  bytes[src.length] = 0x80;
  const bitLength = src.length * 8;
  const view = new DataView(bytes.buffer);
  view.setUint32(size - 8, bitLength >>> 0, true);
  view.setUint32(size - 4, Math.floor(bitLength / 0x100000000), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const shifts = [7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21];
  const k = Array.from({length:64}, (_,i) => Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0);
  for (let off=0; off<size; off+=64) {
    const words = Array.from({length:16}, (_,i) => view.getUint32(off + i*4, true));
    let a=a0,b=b0,c=c0,d=d0;
    for (let i=0;i<64;i++) {
      let f,g,s;
      if(i<16){f=(b&c)|(~b&d);g=i;s=shifts[i%4]}
      else if(i<32){f=(d&b)|(~d&c);g=(5*i+1)%16;s=shifts[4+i%4]}
      else if(i<48){f=b^c^d;g=(3*i+5)%16;s=shifts[8+i%4]}
      else{f=c^(b|~d);g=(7*i)%16;s=shifts[12+i%4]}
      const x=(a+f+k[i]+words[g])|0;
      a=d;d=c;c=b;b=(b+((x<<s)|(x>>>(32-s))))|0;
    }
    a0=(a0+a)|0;b0=(b0+b)|0;c0=(c0+c)|0;d0=(d0+d)|0;
  }
  const out=new Uint8Array(16),o=new DataView(out.buffer);
  o.setInt32(0,a0,true);o.setInt32(4,b0,true);o.setInt32(8,c0,true);o.setInt32(12,d0,true);
  return out;
}

export const hex = bytes => [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
export const base64 = bytes => btoa(String.fromCharCode(...bytes));

function decodeBase64(value) {
  const padded = value + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), c=>c.charCodeAt(0));
}

function hmacMd5(key, data) {
  let k=decodeBase64(key);
  if(k.length>64)k=md5(k);
  const inner=new Uint8Array(64+data.length),outer=new Uint8Array(64+16);
  for(let i=0;i<64;i++){const v=k[i]||0;inner[i]=v^0x36;outer[i]=v^0x5c;}
  inner.set(data,64);outer.set(md5(inner),64);
  return md5(outer);
}

export function clientToken(timestamp) {
  const reversed=[...timestamp].reverse().join('');
  return `${timestamp},${hex(md5(reversed))}`;
}

export function signedHeaders(url, method, body, secret, authorization='') {
  const timestamp=String(Date.now());
  const bodyBytes=encoder.encode(body||'');
  const contentType='application/json; charset=utf-8';
  const accept='application/json';
  const query=[...url.searchParams.entries()]
    .sort(([ak,av],[bk,bv])=>ak===bk?av.localeCompare(bv):ak.localeCompare(bk))
    .map(([k,v])=>`${k}=${v}`).join('&');
  const pathAndQuery=url.pathname+(query?`?${query}`:'');
  const bodyHash=bodyBytes.length?hex(md5(bodyBytes.subarray(0,102400))):'';
  const canonical=[method.toUpperCase(),accept,contentType,String(bodyBytes.length),timestamp,bodyHash,pathAndQuery].join('\n');
  const signature=`${timestamp}|2|${base64(hmacMd5(secret,encoder.encode(canonical)))}`;
  const info={package_name:'com.community.mbox.in',version_name:'3.0.03.0529.03',version_code:50020042,os:'android',os_version:'16',device_id:'d7578036d13336cc',install_store:'ps',gaid:'d7578036d13336cc',brand:'google',model:'sdk_gphone64_x86_64',system_language:'en',net:'NETWORK_WIFI',region:'IN',timezone:'Asia/Calcutta',sp_code:''};
  return {'Accept':accept,'Content-Type':contentType,'User-Agent':'com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; sdk_gphone64_x86_64; Build/BP22.250325.006; Cronet/133.0.6876.3)','X-Client-Token':clientToken(timestamp),'x-tr-signature':signature,'x-client-info':JSON.stringify(info),'x-client-status':'0','x-play-mode':'2',...(authorization?{Authorization:`Bearer ${authorization}`}:{})};
}
