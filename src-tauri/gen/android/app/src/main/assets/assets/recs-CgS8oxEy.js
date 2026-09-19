import{aV as X,M as p,q as d,L as o,aW as Z,N as R,O as P,aX as V,Q as w,aY as k,aZ as J,a_ as ee,a$ as te,b0 as ne,b1 as re,W as b,H as ae}from"./index-PSTwVwrj.js";import{k as se}from"./adult-D8rnoZ-I.js";import{s as H}from"./collection-view-CXm3KsI4.js";const x=14,oe=25,D=50,ie=40,ce="NOT_YET_RELEASED",Y="SHELF1_",M="TAGS1_all",j="GENRE1_",le="RECS1_",ue={airing:ne,trending:te,top:ee,genre:J},ge=60;let _=null;const T=new Map,m=new Map,L=`
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
      }`,q=`fragment Brief on Media {${L}
}`,fe={airing:"season: $season, seasonYear: $seasonYear, sort: [POPULARITY_DESC]",trending:"sort: [TRENDING_DESC]",top:"sort: [SCORE_DESC]",genre:"genre_in: $genres, sort: [SCORE_DESC]"};function de(e){let n="";return n=", $genres: [String]",`query ($perPage: Int!${n}) {
  Page(page: 1, perPage: $perPage) {
    media(type: ANIME, ${fe[e]}) {
${L}
    }
  }
}`}const ye=`${q}

query ($perPage: Int!, $season: MediaSeason, $seasonYear: Int) {
  airing: Page(page: 1, perPage: $perPage) {
    media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: [POPULARITY_DESC]) {
      ...Brief
    }
  }
  trending: Page(page: 1, perPage: $perPage) {
    media(type: ANIME, sort: [TRENDING_DESC]) {
      ...Brief
    }
  }
  top: Page(page: 1, perPage: $perPage) {
    media(type: ANIME, sort: [SCORE_DESC]) {
      ...Brief
    }
  }
}`,Ee=`query ($id: Int!, $perPage: Int!) {
  Media(id: $id) {
    recommendations(sort: RATING_DESC, page: 1, perPage: $perPage) {
      edges {
        node {
          rating
          mediaRecommendation {
${L}
          }
        }
      }
    }
  }
}`,me=`query ($ids: [Int], $perPage: Int!) {
  Page(page: 1, perPage: $perPage) {
    media(id_in: $ids, type: ANIME) {
      id
      genres
    }
  }
}`,pe=`query {
  MediaTagCollection {
    name
    category
    isAdult
    isGeneralSpoiler
  }
}`,O=["airing","trending","top"],he={score:"SCORE_DESC",popular:"POPULARITY_DESC",trending:"TRENDING_DESC",new:"START_DATE_DESC"};function ze(){return{genres:[],tags:[],formats:[],yearFrom:null,yearTo:null,sort:"score"}}function Xe(e){return e.genres.length>0||e.tags.length>0||e.formats.length>0||e.yearFrom!==null||e.yearTo!==null}function Ae(e){return[e.genres.slice().sort().join("+"),e.tags.slice().sort().join("+"),e.formats.slice().sort().join("+"),e.yearFrom??"",e.yearTo??"",e.sort].join("|")}function g(e){return typeof e=="number"&&e>0?e:null}function c(e){return typeof e=="string"&&e.trim()!==""?e:null}function B(e){return!e||typeof e.id!="number"||e.type==="MANGA"?null:{mediaId:e.id,malId:g(e.idMal),type:"ANIME",format:c(e.format),status:c(e.status),episodes:g(e.episodes),chapters:null,seasonYear:g(e.seasonYear),averageScore:g(e.averageScore),isAdult:e.isAdult===!0,romaji:c(e.title?.romaji),english:c(e.title?.english),native:c(e.title?.native),cover:c(e.coverImage?.large)??c(e.coverImage?.medium),color:c(e.coverImage?.color),airingEpisode:g(e.nextAiringEpisode?.episode),airingAt:g(e.nextAiringEpisode?.airingAt),ownEntry:null}}function G(e){if(!Array.isArray(e))return[];const n=[];for(const t of e){const r=B(t);r&&n.push(r)}return n}function $e(){const e=new Date,n=e.getMonth();return{season:n<=2?"WINTER":n<=5?"SPRING":n<=8?"SUMMER":"FALL",seasonYear:e.getFullYear()}}function W(e,n){return e!=="genre"?`${Y}${e}`:`${Y}genre_${(n??[]).slice().sort().join("+")}`}async function I(e,n){const t=W(e,n),r=await R("mediaCache",t);return!r||!Array.isArray(r.data)||r.data.length===0||!P(t,r.ts,ue[e])?null:r.data}async function U(e,n,t){n.length!==0&&await w("mediaCache",{key:W(e,t),data:n,ts:Date.now()})}async function Se(e,n){const t={perPage:x};t.genres=n;const r=await d(de(e),t),a=r.data?.Page?.media;if(!Array.isArray(a))return o("WARN",`Витрина «${e}»: сервер ответил пустотой`,r.errors),[];const s=G(a);return o("API",`Витрина «${e}»: пришло ${s.length}`),U(e,s,n).catch(i=>{o("WARN",`Витрина «${e}»: на склад не легла`,i)}),s}async function _e(e,n){if(n===void 0||n.length===0)return[];const t=await I(e,n);return t||await p(W(e,n),()=>Se(e,n))}async function Ie(){const[e,n,t]=await Promise.all([I("airing"),I("trending"),I("top")]);return!e||!n||!t?null:{airing:e,trending:n,top:t}}async function Re(){const e={perPage:x,...$e()},n=await d(ye,e),t={airing:[],trending:[],top:[]};for(const r of O){const a=n.data?.[r]?.media;if(!Array.isArray(a)){o("WARN",`Витрина «${r}»: сервер ответил пустотой`,n.errors);continue}t[r]=G(a)}return o("API",`Витрина пачкой: сезон ${t.airing.length}, тренд ${t.trending.length}, лучшее ${t.top.length}`),Promise.all(O.map(r=>U(r,t[r]))).catch(r=>{o("WARN","Витрина пачкой: на склад не легла",r)}),t}async function Pe(){const e=await Ie();return e||await p("shelf-pack",Re)}function we(e,n){const t=["$page: Int!","$perPage: Int!"],r=["type: ANIME"],a={page:n,perPage:ie};return e.genres.length>0&&(t.push("$genres: [String]"),r.push("genre_in: $genres"),a.genres=e.genres),e.tags.length>0&&(t.push("$tags: [String]"),r.push("tag_in: $tags"),a.tags=e.tags),e.formats.length>0&&(t.push("$formats: [MediaFormat]"),r.push("format_in: $formats"),a.formats=e.formats),e.yearFrom!==null&&(t.push("$from: FuzzyDateInt"),r.push("startDate_greater: $from"),a.from=e.yearFrom*1e4),e.yearTo!==null&&(t.push("$till: FuzzyDateInt"),r.push("startDate_lesser: $till"),a.till=e.yearTo*1e4+1231),r.push(`status_not_in: [${ce}]`),e.sort==="score"&&r.push("averageScore_greater: 0"),r.push(`sort: [${he[e.sort]}, ID_DESC]`),{query:`${q}

query (${t.join(", ")}) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      hasNextPage
    }
    media(${r.join(", ")}) {
      ...Brief
    }
  }
}`,vars:a}}function Ne(e,n){if(n.items.length!==0){if(m.size>=ge){const t=m.keys().next();t.done||m.delete(t.value)}m.set(e,{at:Date.now(),page:n})}}async function Fe(e,n,t){const{query:r,vars:a}=we(e,n),s=await d(r,a),i=s.data?.Page?.media;if(!Array.isArray(i))return o("WARN",`Лента подбора: пустой ответ на страницу ${n}`,s.errors),{items:[],hasNext:!1};const l=G(i),h=s.data?.Page?.pageInfo?.hasNextPage===!0;o("API",`Лента подбора: страница ${n}, пришло ${l.length}`);const A={items:l,hasNext:h};return Ne(t,A),A}async function De(e,n){const t=`${Ae(e)}|${n}`,r=m.get(t);return r&&X(r.at,Z)?r.page:await p(`feed-${t}`,()=>Fe(e,n,t))}async function Te(){const e=await d(pe,{}),n=e.data?.MediaTagCollection;if(!Array.isArray(n))return o("WARN","Тэги каталога: сервер ответил пустотой",e.errors),[];const t=[];for(const r of n){const a=c(r?.name);a===null||r?.isGeneralSpoiler===!0||t.push({name:a,category:c(r?.category)??"Другое",adult:r?.isAdult===!0})}return t.sort((r,a)=>r.category.localeCompare(a.category)||r.name.localeCompare(a.name)),o("API",`Тэги каталога: пришло ${t.length}`),t.length>0&&(_=t,w("mediaCache",{key:M,data:t,ts:Date.now()}).catch(r=>{o("WARN","Тэги каталога: на склад не легли",r)})),t}async function Ce(){if(_)return _;const e=await R("mediaCache",M);return e&&Array.isArray(e.data)&&e.data.length>0&&P(M,e.ts,re)?(_=e.data,e.data):await p("tags",Te)}async function Me(e,n){const t=await d(Ee,{id:e,perPage:oe}),r=t.data?.Media?.recommendations?.edges;if(!Array.isArray(r))return o("WARN",`Советы для ${e}: сервер ответил пустотой`,t.errors),[];const a=[];for(const s of r){const i=s?.node,l=B(i?.mediaRecommendation);l!==null&&a.push({brief:l,rating:typeof i?.rating=="number"?i.rating:0})}return o("API",`Советы для ${e}: пришло ${a.length}`),w("mediaCache",{key:n,data:a,ts:Date.now()}).catch(s=>{o("WARN",`Советы для ${e}: на склад не легли`,s)}),a}async function ve(e){const n=`${le}${e}`,t=await R("mediaCache",n);return t&&Array.isArray(t.data)&&P(n,t.ts,V)?t.data:await p(n,()=>Me(e,n))}async function Le(e){const n=`${j}${e}`,t=await R("mediaCache",n);return!t||!Array.isArray(t.data)||!P(n,t.ts,k)?null:t.data}async function Ge(e){const n=new Map,t=Array.from(new Set(e.filter(s=>Number.isFinite(s)&&s>0))),r=[],a=await Promise.all(t.map(async s=>{const i=T.get(s);return i?{id:s,genres:i}:{id:s,genres:await Le(s)}}));for(const s of a){if(s.genres===null){r.push(s.id);continue}T.set(s.id,s.genres),n.set(s.id,s.genres)}r.length>0&&o("DB",`Жанры: со склада ${n.size}, спросим ${r.length}`);for(let s=0;s<r.length;s+=D){const i=r.slice(s,s+D),l=await d(me,{ids:i,perPage:D}),h=l.data?.Page?.media;if(!Array.isArray(h)){o("WARN",`Жанры: пустой ответ на пачку из ${i.length}`,l.errors);continue}const A=Date.now();for(const u of h){if(!u||typeof u.id!="number"||!Array.isArray(u.genres))continue;const $=u.genres.filter(S=>typeof S=="string"&&S!=="");n.set(u.id,$),T.set(u.id,$),$.length!==0&&w("mediaCache",{key:`${j}${u.id}`,data:$,ts:A}).catch(S=>{o("WARN",`Жанры ${u.id}: на склад не легли`,S)})}}return n}const We=30,Ye=2,Oe=2,be=8,K=8,He=3,Q="am_recs_hidden";let f=null;const v=new Map;let C=null,y=null,E=null;function Ze(){v.clear()}async function z(){if(f!==null)return f;try{const e=await b.storage.get(Q,[]);f=new Set(Array.isArray(e)?e.filter(n=>Number.isFinite(n)):[])}catch(e){o("WARN","Рекомендации: скрытое не поднялось",e),f=new Set}return f}async function Ve(e){const n=await z();n.add(e);const t=Array.from(n).slice(-500);f=new Set(t);try{await b.storage.set(Q,t)}catch(r){o("WARN","Рекомендации: скрытое не записалось",r)}}async function xe(){if(C!==null)return C;let e=[];const n=H({onlyRated:!0,minScore:K},{key:"score"},{limit:We});if(n.length>0)try{const t=await Ge(n.map(a=>a.mediaId)),r=new Map;for(const a of n)for(const s of t.get(a.mediaId)??[])r.set(s,(r.get(s)??0)+a.score10);e=Array.from(r.entries()).sort((a,s)=>s[1]-a[1]).slice(0,Ye).map(([a])=>a)}catch(t){o("WARN","Рекомендации: жанры вкуса не доехали",t)}return C=e,e}function je(){return H({onlyRated:!0,minScore:K},{key:"score"},{limit:be}).slice().sort(()=>Math.random()-.5).slice(0,Oe).map(n=>n.mediaId)}async function N(e){const n=await z();return se(e.filter(t=>ae(t.mediaId)===void 0&&!n.has(t.mediaId)),t=>t.isAdult).slice()}function F(e,n){const t=v.get(e);if(t!==void 0)return t;const r=n();return v.set(e,r),r}function qe(){return y!==null||(y=Pe().catch(e=>(o("WARN","Рекомендации: пачка полок не доехала",e),y=null,{airing:[],trending:[],top:[]}))),y}function ke(e){return F(`pack:${e}`,async()=>N((await qe())[e]))}function Be(e,n){return F(`${e}:${(n??[]).join(",")}`,async()=>{try{return await N(await _e(e,n))}catch(t){return o("WARN",`Рекомендации: полка «${e}» не доехала`,t),[]}})}function Je(){return F("taste",async()=>{const e=await xe();return e.length===0?[]:Be("genre",e)})}function et(){return F("motif",async()=>{const e=je();if(e.length===0)return[];const n=await Promise.all(e.map(async r=>{try{return await ve(r)}catch(a){return o("WARN",`Рекомендации: советы для ${r} не доехали`,a),[]}})),t=new Map;for(const r of n)for(const a of r){const s=t.get(a.brief.mediaId);s!==void 0?s.rating+=a.rating:t.set(a.brief.mediaId,{brief:a.brief,rating:a.rating})}return N(Array.from(t.values()).sort((r,a)=>a.rating-r.rating).map(r=>r.brief))})}function tt(){return E!==null||(E=Ce().catch(e=>(o("WARN","Рекомендации: справочник тэгов не доехал",e),E=null,[]))),E}function nt(e){return{pick:e,page:0,done:!1,over:!1,seen:new Set,rest:[]}}async function rt(e,n){const t=e.rest.splice(0,n);for(let r=0;r<He&&!e.over&&t.length<n;r++){const a=e.page+1;let s;try{s=await De(e.pick,a)}catch(i){o("WARN",`Лента подбора: страница ${a} не доехала`,i);break}e.page=a,s.hasNext||(e.over=!0);for(const i of await N(s.items))e.seen.has(i.mediaId)||(e.seen.add(i.mediaId),t.length<n?t.push(i):e.rest.push(i))}return e.done=e.over&&e.rest.length===0,t}export{Ae as a,Je as b,ke as c,Ze as d,ze as e,rt as f,Ve as h,et as m,nt as n,Xe as p,tt as t};
