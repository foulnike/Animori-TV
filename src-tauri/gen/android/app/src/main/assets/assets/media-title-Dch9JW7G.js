import{M as B,aK as Dt,b9 as Ot,N as E,L as o,q as C,aV as Ct,O as vt,Q as N,ba as Tt,bb as Ft,J as Lt,b6 as U,W as I,$ as K,bc as P,bd as nt,Z as G,a2 as S,be as Wt,bf as b,bg as x,a3 as at,bh as gt,R as D,bi as wt,X as j}from"./index-PSTwVwrj.js";const v=50,$t=27,Ut=5e3,xt=27,Ht="MED3_",Yt=60;function Bt(t){const e=new Set,n=[];for(const a of t)e.has(a.mediaId)||(e.add(a.mediaId),n.push(a));return n}const g=new Map,A=new Map;let it=Promise.resolve();const Kt=`query ($ids: [Int], $perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    media(id_in: $ids, type: ANIME) {
      id
      idMal
    }
  }
}`,Gt=`query ($id: Int!) {
  Media(id: $id) {
    id
    idMal
    type
    format
    status
    episodes
    duration
    averageScore
    seasonYear
    genres
    isAdult
    siteUrl
    bannerImage
    description(asHtml: false)
    nextAiringEpisode {
      episode
      airingAt
    }
    trailer {
      id
      site
      thumbnail
    }
    title {
      romaji
      english
      native
    }
    coverImage {
      extraLarge
      large
      color
    }
    studios {
      edges {
        isMain
        node {
          id
          name
        }
      }
    }
  }
}`,jt=`query ($word: String!, $page: Int!, $perPage: Int!) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      hasNextPage
      total
    }
    media(search: $word, type: ANIME, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
      id
      idMal
      type
      format
      status
      episodes
      seasonYear
      averageScore
      isAdult
      nextAiringEpisode {
        episode
        airingAt
      }
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        medium
        color
      }
    }
  }
}`,Qt=`query ($id: Int!, $page: Int!, $perPage: Int!) {
  Studio(id: $id) {
    id
    name
    media(page: $page, perPage: $perPage, sort: POPULARITY_DESC) {
      pageInfo {
        hasNextPage
        total
      }
      nodes {
        id
        idMal
        type
        format
        status
        episodes
        seasonYear
        averageScore
        isAdult
        nextAiringEpisode {
          episode
          airingAt
        }
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          medium
          color
        }
      }
    }
  }
}`;async function yt(t){const e=Array.from(new Set(t.filter(s=>Number.isFinite(s)&&s>0))),n=new Map;if(e.length===0)return n;const a=e.filter(s=>!g.has(s));let i=0;if(a.length>0){await Dt();for(const s of a){const c=Ot(s);c!==null&&(g.set(s,c),i++)}}const l=a.filter(s=>!g.has(s));let r=0;if(l.length>0){const s=await Promise.all(l.map(async c=>{const p=(await E("malCache",c))?.data?.idMal;return{id:c,malId:typeof p=="number"&&p>0?p:null}}));for(const c of s)c.malId!==null&&(g.set(c.id,c.malId),r++)}const u=l.filter(s=>!g.has(s));u.length>0&&await Xt(u);for(const s of e){const c=g.get(s);c!=null&&n.set(s,c)}return o("API",`Соответствия MAL: спросили ${e.length}, из выпуска ${i}, со склада ${r}, у сети ${u.length}, нашли ${n.size}`),n}function Xt(t){const e=async()=>{const a=t.filter(i=>!g.has(i));if(a.length!==0)for(let i=0;i<a.length;i+=v){const l=a.slice(i,i+v),u=(await C(Kt,{ids:l,perPage:v})).data?.Page?.media;if(!Array.isArray(u)){o("WARN",`Соответствия MAL: пустой ответ на пачку из ${l.length}`);continue}const s=new Set;for(const c of u)!c||typeof c.id!="number"||(s.add(c.id),Q(c.id,typeof c.idMal=="number"&&c.idMal>0?c.idMal:null));for(const c of l)s.has(c)||g.set(c,null)}},n=it.then(e,e);return it=n.catch(()=>{}),n}function Q(t,e){t<=0||(g.set(t,e),e!==null&&Jt(t,e).catch(n=>{o("WARN",`Соответствие MAL ${t}: на склад не легло`,n)}))}async function Jt(t,e){await N("malCache",{id:t,data:{id:t,type:"ANIME",idMal:e}})}function X(t){return`${Ht}${t}`}function zt(t){return t==="FINISHED"||t==="CANCELLED"?Tt:Ft}function Zt(t,e){const n=e.data;if(!n||typeof n.mediaId!="number"||n.mediaId<=0)return!1;const a=n.airingAt;return typeof a=="number"&&a>0&&Date.now()>=a*1e3?!1:vt(t,e.ts,zt(n.status))}async function qt(t){const e=X(t);try{const n=await E("mediaCache",e);return!n||!Zt(e,n)?null:n.data}catch(n){return o("WARN",`Карточка ${t}: склад не прочитался`,n),null}}async function Vt(t){try{const e={key:X(t.mediaId),data:t,ts:Date.now()};await N("mediaCache",e)}catch(e){o("WARN",`Карточка ${t.mediaId}: на склад не легла`,e)}}function f(t){return typeof t=="number"&&t>0?t:null}function te(t,e,n,a){if(!a)return(e-1)*$t+n;const i=f(t);return i!==null&&i<Ut?i:null}function d(t){return typeof t=="string"&&t.trim()!==""?t:null}const ee=[["youtube",t=>`https://www.youtube.com/embed/${t}`,t=>`https://www.youtube.com/watch?v=${t}`],["dailymotion",t=>`https://www.dailymotion.com/embed/video/${t}`,t=>`https://www.dailymotion.com/video/${t}`],["vimeo",t=>`https://player.vimeo.com/video/${t}`,t=>`https://vimeo.com/${t}`]];function ne(t){const e=d(t?.id),n=d(t?.site)?.toLowerCase()??null;if(e===null||n===null)return null;const a=ee.find(([i])=>i===n);return a?{title:"Трейлер",thumb:d(t?.thumbnail),embed:a[1](e),url:a[2](e)}:null}function ae(t){if(!Array.isArray(t))return[];const e=[];for(const n of t){if(!n?.node||typeof n.node.id!="number")continue;const a=d(n.node.name);a!==null&&e.push({studioId:n.node.id,name:a,main:n.isMain===!0})}return e.sort((n,a)=>Number(a.main)-Number(n.main)),e}function At(t){return!t||typeof t.id!="number"?null:{mediaId:t.id,malId:f(t.idMal),type:"ANIME",format:d(t.format),status:d(t.status),episodes:f(t.episodes),chapters:null,seasonYear:f(t.seasonYear),averageScore:f(t.averageScore),isAdult:t.isAdult===!0,romaji:d(t.title?.romaji),english:d(t.title?.english),native:d(t.title?.native),cover:d(t.coverImage?.large)??d(t.coverImage?.medium),color:d(t.coverImage?.color),airingEpisode:f(t.nextAiringEpisode?.episode),airingAt:f(t.nextAiringEpisode?.airingAt),ownEntry:null}}async function Ue(t){if(!Number.isFinite(t)||t<=0)return null;const e=await qt(t);return e!==null?(Q(e.mediaId,e.malId),o("DB",`Карточка ${t}: со склада, без запроса`),e):B(X(t),()=>ie(t))}async function ie(t){const e=await C(Gt,{id:t}),n=e.data?.Media;if(!n||typeof n.id!="number")return o("WARN",`Карточка ${t}: сервер тайтл не назвал`,e.errors),null;Q(n.id,f(n.idMal));const a={mediaId:n.id,malId:f(n.idMal),type:"ANIME",format:d(n.format),status:d(n.status),episodes:f(n.episodes),chapters:null,volumes:null,duration:f(n.duration),averageScore:f(n.averageScore),seasonYear:f(n.seasonYear),genres:Array.isArray(n.genres)?n.genres.filter(i=>typeof i=="string"&&i!==""):[],isAdult:n.isAdult===!0,siteUrl:d(n.siteUrl),description:d(n.description),romaji:d(n.title?.romaji),english:d(n.title?.english),native:d(n.title?.native),cover:d(n.coverImage?.extraLarge)??d(n.coverImage?.large),banner:d(n.bannerImage),trailer:ne(n.trailer),color:d(n.coverImage?.color),airingEpisode:f(n.nextAiringEpisode?.episode),airingAt:f(n.nextAiringEpisode?.airingAt),studios:ae(n.studios?.edges),ownEntry:null};return Vt(a),a}function re(t,e){return`${t.toLowerCase()}|${e}`}function se(t){const e=A.get(t);return!e||!Ct(e.at,Lt)?null:e.page}function oe(t,e){if(A.set(t,{at:Date.now(),page:e}),A.size<=Yt)return;const n=A.keys().next().value;n!==void 0&&A.delete(n)}async function xe(t,e=1){const n=t.trim();if(n==="")return{items:[],hasNext:!1,total:0};const a=re(n,e),i=se(a);return i!==null?(o("DB",`Поиск «${n}»: страница ${e} из памяти, без запроса`),i):B(`search-${a}`,()=>ce(n,e,a))}async function ce(t,e,n){const a=await C(jt,{word:t,page:e,perPage:$t}),i=a.data?.Page;if(!i||!Array.isArray(i.media))return o("WARN",`Поиск «${t}»: сервер ответил пустотой`,a.errors),null;const l=[];for(const s of i.media){const c=At(s);c&&l.push(c)}const r=i.pageInfo?.hasNextPage===!0;o("API",`Поиск «${t}»: страница ${e}, нашлось ${l.length}`);const u={items:l,hasNext:r,total:te(i.pageInfo?.total,e,l.length,r)};return oe(n,u),u}async function He(t,e=1,n=[]){return B(`studio-${t}|${e}|${n.length}`,()=>ue(t,e,n))}async function ue(t,e,n){const a=await C(Qt,{id:t,page:e,perPage:xt}),i=a.data?.Studio;if(!i||typeof i.id!="number")return o("WARN",`Студия ${t}: сервер её не назвал`,a.errors),null;const l=new Set(n.map(p=>p.mediaId)),r=[],u=i.media?.nodes;if(Array.isArray(u))for(const p of u){const M=At(p);!M||l.has(M.mediaId)||(l.add(M.mediaId),r.push(M))}const s=f(i.media?.pageInfo?.total),c=Bt(r),m=n.length+c.length;return o("API",`Студия ${t}: страница ${e}, новых работ ${r.length}`),{name:d(i.name)??`Студия #${t}`,items:c,hasNext:i.media?.pageInfo?.hasNextPage===!0&&c.length>0,total:s,known:m}}const rt=5e3,St=5e3,le=8e3,Rt="SHIKI_MIRROR",de="/api/animes/1";let y=null,k=null;function R(t){return`shikimori:${t}`}function fe(){return k||(k=(async()=>{try{const t=await I.storage.get(Rt,""),e=typeof t=="string"?t:"";e&&S.includes(e)&&(y=e,o("API",`Shikimori: прошлый запуск ходил через ${e}`))}catch(t){o("ERROR","Ошибка чтения рабочего зеркала Shikimori",t)}})(),k)}async function st(t){try{await I.storage.set(Rt,t)}catch(e){o("ERROR","Ошибка записи рабочего зеркала Shikimori",e)}}function me(){const t=y;return!t||!S.includes(t)?[...S]:[t,...S.filter(e=>e!==t)]}function Et(t,e){return"https://"+t+e}async function J(t,e,n){const a=t.note?` — ${t.note}`:"";o("API",`Запрос к Shikimori API: ${t.path}${a}`),await fe();let i=null,l=0;for(const r of me()){const u=Date.now();try{await U.acquireSlot();const s=await I.http.request({method:t.method,url:Et(r,t.path),headers:t.headers,body:t.body,timeoutMs:t.timeoutMs??St,credentials:"omit"});if(K(R(r),`Shikimori (${r})`,s.status,Date.now()-u),s.status===429){if(U.pause(rt),n+1>=P)throw o("ERROR",`Shikimori: лимит 429 не отпустил, запрос отменён: ${t.path}`,{domain:r,attempts:n+1}),new nt("Shikimori",t.path);return o("WARN",`Shikimori 429 (${r}): пауза ${rt}мс, повтор ${n+2}/${P} — ${t.path}`),await J(t,e,n+1)}if(s.status===404){i={data:null,domain:r};continue}if(s.status!==200)throw new Error(`Shikimori HTTP ${s.status}`);const c=e(s.text);return y!==r&&(y=r,st(r),o("API",`Shikimori: рабочее зеркало — ${r}`)),{data:c,domain:r}}catch(s){if(s instanceof nt)throw s;l++,y===r&&(y=null,st(""),o("WARN",`Shikimori: зеркало ${r} больше не предпочтительное`)),G(R(r),`Shikimori (${r})`,s,Date.now()-u),o("WARN",`Shikimori: зеркало ${r} не ответило по ${t.path}`,s)}}if(i)return o("WARN",`Shikimori: данных нет ни на одном зеркале (404): ${t.path}`),i;throw o("ERROR",`Все зеркала Shikimori недоступны для ${t.path}`,{mirrorFailures:l}),new Error(`Все зеркала Shikimori недоступны для ${t.path}`)}async function he(t,e=0){return await J({method:"GET",path:t},n=>JSON.parse(n),e)}async function pe(t,e,n){return await J({method:"POST",path:"/api/graphql",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({query:t,variables:e}),timeoutMs:le,note:n},a=>{const i=JSON.parse(a);if(i.data===void 0||i.data===null)throw new Error("Shikimori GraphQL: ответ без данных");return i.data},0)}async function ge(t){const e=Date.now(),n=`Shikimori (${t})`;try{await U.acquireSlot();const a=await I.http.request({method:"GET",url:Et(t,de),timeoutMs:St,credentials:"omit"});K(R(t),n,a.status,Date.now()-e)}catch(a){G(R(t),n,a,Date.now()-e)}}for(const t of S)Wt(R(t),`Shikimori (${t})`,()=>ge(t));const ot=50,we="query($ids: String!, $limit: Int!) { animes(ids: $ids, limit: $limit) { id russian name } }",ct=new Map,T=new Map;function $e(t){if(typeof t!="string")return null;const e=t.trim();return e===""?null:e}async function ye(t){const e=ct.get(t);if(e)return e;const n=T.get(t);if(n)return await n;const a=he(`/api/animes/${t}`).then(i=>{const l={data:i.data,domain:i.domain};return ct.set(t,l),l});T.set(t,a);try{return await a}finally{T.delete(t)}}async function Ae(t){const e=new Map,n=new Set,a=[...new Set(t.filter(l=>Number.isFinite(l)&&l>0))];if(a.length===0)return{names:e,answered:n};let i=0;for(let l=0;l<a.length;l+=ot){const r=a.slice(l,l+ot);i++;try{const u=await pe(we,{ids:r.join(","),limit:r.length},`имена: ${r.length}`);if(!u.data){o("WARN",`Имена Шикимори: пачка из ${r.length} осталась без ответа`);continue}r.forEach(s=>n.add(s));for(const s of u.data.animes??[]){if(!s)continue;const c=Number(s.id);if(!Number.isFinite(c)||c<=0)continue;const m=$e(s.russian);m&&e.set(c,m)}}catch(u){o("WARN",`Имена Шикимори: пачка из ${r.length} не доехала`,u)}}return o("INFO",`Имена Шикимори: спросили ${a.length} пачками ${i}, ответили про ${n.size}, нашли ${e.size}`),{names:e,answered:n}}const Se=[403,502,503,520,521,522,523,524],ut=5e3,H=15e3,Re=5e3,Ee="titles,url,descriptions",F=1,lt=2,dt=10*60*1e3;let $=0,Nt=!1;const _=new Map,z=new Map;function ft(t,e){return"https://"+t+e}function mt(t){return`anime365:${t}`}function Ne(){const t=Date.now(),e=at.filter(n=>(z.get(n)??0)<=t);return e.length>0?e:at}function L(t){_.delete(t),z.delete(t)&&o("INFO",`anime365: зеркало ${t} снова отвечает, отсрочка снята`)}function Ie(t){const e=(_.get(t)??0)+1;_.set(t,e),!(e<lt)&&(_.set(t,0),z.set(t,Date.now()+dt),o("WARN",`anime365: зеркало ${t} молчало ${lt} раза подряд — отложено на ${dt/6e4} мин.`))}function Me(t){return t instanceof gt&&(t.kind==="network"||t.kind==="timeout")}function ke(t){return t instanceof gt&&t.kind==="abort"}function ht(){$<x||(Nt=!0,b.pause(H),o("ERROR","anime365 отключён на эту сессию после серии сбоев — цепочка уходит на фоллбэк/оригинал."))}async function It(t,e=0){if(!t||Nt)return null;o("API",`Запрос к anime365 API: myAnimeListId=${t}`);let n=!1;for(const a of Ne())for(let i=0;i<=F;i++){const l=Date.now();try{await b.acquireSlot();const r=await I.http.request({method:"GET",url:ft(a,`/api/series?myAnimeListId=${t}&limit=1&fields=${Ee}`),timeoutMs:Re,credentials:"omit"});if(K(mt(a),`anime365 (${a})`,r.status,Date.now()-l),r.status===429)return L(a),b.pause(ut),e+1>=P?(o("ERROR",`anime365: лимит 429 не отпустил, запрос отменён (malId=${t})`,{domain:a,attempts:e+1}),null):(o("WARN",`anime365 429 (${a}): пауза ${ut}мс, повтор ${e+2}/${P} — malId=${t}`),It(t,e+1));if(Se.includes(r.status))return L(a),$++,b.pause(H),o("WARN",`anime365 недоступен: HTTP ${r.status} (${a}). Сбой ${$}/${x}, бэкофф ${H}мс.`),ht(),null;if(L(a),r.status!==200&&r.status!==404)throw new Error(`anime365 HTTP ${r.status}`);if($=0,r.status===404)return o("WARN",`anime365: тайтл не найден (404, ${a}): malId=${t}`),null;const s=JSON.parse(r.text).data?.[0];if(s){let c="";if(Array.isArray(s.descriptions)){const m=s.descriptions.find(p=>p&&p.value);m?.value&&(c=m.value)}return{russian:s.titles?.ru??"",description:c,url:s.url||ft(a,"/"),domain:a}}return o("WARN",`anime365: пустой ответ без данных (${a}): malId=${t}`),null}catch(r){if(ke(r))return o("WARN",`anime365: запрос отменён (${a}): malId=${t}`),null;if(G(mt(a),`anime365 (${a})`,r,Date.now()-l),Me(r)){if(Ie(a),i<F){o("WARN",`anime365: зеркало ${a} промолчало (${String(r)}), повторная попытка — malId=${t}`);continue}o("WARN",`anime365: зеркало ${a} молчит после ${F+1} попыток (${String(r)}) — malId=${t}`),n=!0;break}o("WARN",`Сбой запроса к зеркалу anime365: ${a} (${String(r)})`),n=!0;break}}return n&&($++,o("ERROR",`Все зеркала anime365 недоступны для malId=${t}. Сбой ${$}/${x}.`),ht()),null}function pt(t){if(typeof t!="string")return null;const e=t.trim();return e===""?null:e}async function be(t){const e=[...new Set([D.titlePrimary,D.titleFallback])].filter(n=>n&&n!=="off"&&n!=="none");for(const n of e)if(n==="shikimori"){if(t===null)continue;const a=await ye(t);if(a.data?.russian){const i=Number(a.data.score);return{russian:a.data.russian,description:pt(a.data.description),url:"https://"+(a.domain??"")+(a.data.url??""),sourceName:"Shikimori",score:Number.isFinite(i)&&i>0?i:null,rates:Array.isArray(a.data.rates_scores_stats)?a.data.rates_scores_stats:null}}}else if(n==="anime365"){const a=await It(t);if(a?.russian)return{russian:a.russian,description:pt(a.description),url:a.url,sourceName:"anime365",score:null,rates:null}}return null}const _e="RU4_",Pe="NAME1_",De="NONAME1_",h=new Map,w=new Map,O=new Set,Z=new Set,q=new Set,Y=new Set,W=new Map;function Mt(t){return`${_e}${t}`}function kt(t){return`${Pe}${t}`}function bt(t){return`${De}${t}`}async function V(t){Z.add(t);const e=await E("mediaCache",Mt(t));if(!e||typeof e.ts!="number"||Date.now()-e.ts>j)return null;const n=e.data;return n&&typeof n.russian=="string"&&n.russian?n:null}async function Oe(t,e){await N("mediaCache",{key:Mt(t),data:e,ts:Date.now()})}async function _t(t){q.add(t);const e=await E("mediaCache",kt(t));return!e||typeof e.ts!="number"||Date.now()-e.ts>j?null:typeof e.data=="string"&&e.data!==""?e.data:null}async function tt(t,e){e!==""&&await N("mediaCache",{key:kt(t),data:e,ts:Date.now()})}async function Ce(t){if(O.has(t))return!0;if(Y.has(t))return!1;Y.add(t);const e=await E("mediaCache",bt(t));return!e||typeof e.ts!="number"||Date.now()-e.ts>j?!1:(O.add(t),!0)}async function et(t){O.add(t),Y.add(t),await N("mediaCache",{key:bt(t),data:1,ts:Date.now()})}async function Pt(t,e){const n=await be(e);if(!n||!n.russian)return h.set(t,null),await et(t),null;const a={russian:n.russian,description:n.description,url:n.url,sourceName:n.sourceName,score:n.score,rates:n.rates};return h.set(t,a),await Promise.all([Oe(t,a),tt(t,a.russian)]),a}async function ve(t){const e=await V(t);if(e)return h.set(t,e),e;const n=(await yt([t])).get(t);return n?await Pt(t,n):(h.set(t,null),null)}async function Ye(t){if(h.has(t)){const a=h.get(t)??null;return{state:a===null?"none":"ready",title:a}}const e=W.get(t);if(e)return await e;const n=ve(t).then(a=>({state:a===null?"none":"ready",title:a})).catch(a=>(o("WARN",`Русское название: добыть не вышло (тайтл ${t})`,a),{state:"fail",title:null}));W.set(t,n);try{return await n}finally{W.delete(t)}}function Be(t,e){const n=e.trim();n!==""&&w.set(t,n)}async function Ke(t){let e=0;for(const n of t)if(!(h.has(n)||w.has(n)))try{const a=await wt(n);if(a.kind==="name"){w.set(n,a.name),e++;continue}if(a.kind==="none"){O.add(n);continue}const i=q.has(n)?null:await _t(n);if(i!==null){w.set(n,i),e++;continue}const l=Z.has(n)?null:await V(n);if(!l)continue;h.set(n,l),e++}catch(a){return o("WARN",`Русские имена: склад не ответил по тайтлу ${n}`,a),e}return e>0&&o("DB",`Русские имена: без сети поднято ${e}`),e}function Te(){return D.titlePrimary==="shikimori"||D.titleFallback==="shikimori"}async function Fe(t){const e=await Ae(t.map(a=>a.malId));let n=0;for(const a of t)try{const i=e.names.get(a.malId);if(i){w.set(a.mediaId,i),await tt(a.mediaId,i),n++;continue}e.answered.has(a.malId)&&await et(a.mediaId)}catch(i){o("WARN",`Русское имя: тайтл ${a.mediaId} не лёг на склад`,i)}return n}async function Le(t){let e=0;for(const n of t)try{await Pt(n.mediaId,n.malId)&&e++}catch(a){o("WARN",`Русское имя: тайтл ${n.mediaId} пропущен`,a)}return e}async function Ge(t){const e=[];let n=0;for(const u of t){if(h.has(u)||w.has(u))continue;const s=await wt(u);if(s.kind==="name"){w.set(u,s.name);continue}const c=q.has(u)?null:await _t(u);if(c!==null){w.set(u,c);continue}const m=Z.has(u)?null:await V(u);if(m){h.set(u,m),await tt(u,m.russian);continue}if(await Ce(u)){n++;continue}e.push(u)}if(e.length===0)return n>0&&o("DB",`Русские имена: ${n} без перевода, сеть не трогаем`),0;const a=await yt(e),i=[];for(const u of e){const s=a.get(u);if(!s){await et(u);continue}i.push({mediaId:u,malId:s})}if(i.length===0){const u=e.length;return o("INFO",`Русские имена: соответствий MAL нет ни у одного из ${u}`),0}const l=Te()?await Fe(i):await Le(i),r=n>0?`, пропущено ${n}`:"";return o("INFO",`Русские имена: добыто ${l} из ${e.length}${r}`),l}function je(t){return h.get(t)?.russian??w.get(t)??null}export{xt as S,Ge as a,he as b,ye as c,Ue as d,He as e,yt as f,Ye as g,je as p,Be as r,xe as s,Ke as w};
