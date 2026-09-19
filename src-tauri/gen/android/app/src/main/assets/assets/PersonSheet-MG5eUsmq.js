import{L as y,q as K,d as _e,m as h,w as ge,A as he,o as ye,r as ke,a as n,b as r,e as o,t as f,h as c,F as g,u as j,g as C,f as Y,i as se,n as we,j as ne,l as Re,C as $e,U as re,R as H,_ as Ae}from"./index-PSTwVwrj.js";import{k as be}from"./adult-D8rnoZ-I.js";import{p as le,a as Ce}from"./media-title-Dch9JW7G.js";import{R as Ie,a as Ne,b as Se,g as Oe}from"./RichText-DFyxjIJX.js";import{o as We,l as Pe,i as Ue,_ as De}from"./SakuraBloom.vue_vue_type_style_index_0_lang-BtkHEqLR.js";const Ee=`
  query ($id: Int!) {
    Character(id: $id) {
      id
      name { full native alternative }
      image { large }
      description(asHtml: false)
      gender
      age
      dateOfBirth { year month day }
      siteUrl
      media(page: 1, perPage: 8, sort: [POPULARITY_DESC]) {
        edges {
          characterRole
          voiceActors(sort: [RELEVANCE, ID]) {
            id
            name { full native }
            language
            image { large medium }
            siteUrl
          }
          node {
            id
            title { romaji english }
            coverImage { medium }
            type
          }
        }
      }
    }
  }
`,Me=`
  query ($id: Int!) {
    Staff(id: $id) {
      id
      name { full native alternative }
      image { large }
      description(asHtml: false)
      primaryOccupations
      languageV2
      dateOfBirth { year month day }
      dateOfDeath { year month day }
      homeTown
      siteUrl
    }
  }
`,Te=2,Be=900;function xe(l){return new Promise(R=>setTimeout(R,l))}async function ie(l,R){for(let v=1;;v+=1)try{const _=await R();return{state:_===null?"none":"ready",card:_}}catch(_){if(v>=Te)return y("WARN",`${l}: карточка не доехала`,_),{state:"fail",card:null};y("WARN",`${l}: повторяем`,_),await xe(Be)}}async function Le(l){return await ie(`Персонаж ${l}`,async()=>{const v=(await K(Ee,{id:l}))?.data?.Character??null;return y("API",`Персонаж ${l}: ${v?.name.full??"нет данных"}`),v})}async function Fe(l){return await ie(`Автор ${l}`,async()=>{const v=(await K(Me,{id:l}))?.data?.Staff??null;return y("API",`Автор ${l}: ${v?.name.full??"нет данных"}`),v})}const Ve=14,je=`query ($id: Int!, $perPage: Int!) {
  Staff(id: $id) {
    staffMedia(sort: [POPULARITY_DESC], type: ANIME, page: 1, perPage: $perPage) {
      edges {
        staffRole
        node {
          id
          isAdult
          seasonYear
          title {
            romaji
            english
          }
          coverImage {
            large
            medium
            color
          }
        }
      }
    }
  }
}`;function S(l){return typeof l=="string"&&l.trim()!==""?l:null}function Ye(l){return typeof l=="number"&&l>0?l:null}async function He(l){if(!Number.isFinite(l)||l<=0)return[];const R=await K(je,{id:l,perPage:Ve},!1),v=R.data?.Staff?.staffMedia?.edges;if(!Array.isArray(v))return y("WARN",`Работы автора ${l}: пустой ответ`,R.errors),[];const _=new Map;for(const $ of v){const m=$?.node;if(!m||typeof m.id!="number")continue;const i=S($?.staffRole),u=_.get(m.id);if(u){i!==null&&u.role!==null&&!u.role.includes(i)?u.role=`${u.role}, ${i}`:i!==null&&u.role===null&&(u.role=i);continue}_.set(m.id,{mediaId:m.id,name:S(m.title?.romaji)??S(m.title?.english)??`#${m.id}`,role:i,year:Ye(m.seasonYear),cover:S(m.coverImage?.large)??S(m.coverImage?.medium),color:S(m.coverImage?.color),isAdult:m.isAdult===!0})}const d=[..._.values()];return y("API",`Работы автора ${l}: граней ${v.length}, тайтлов ${d.length}`),d}const Ke={class:"am-sheet__box"},qe={class:"am-sheet__head"},Qe={class:"am-ps-top"},ze={class:"am-ps-portrait"},Ge=["src","alt"],Je={key:1,class:"am-ps-portrait__img am-ps-portrait__img--empty","aria-hidden":"true"},Xe={class:"am-ps-names"},Ze={class:"am-ps-names__full"},ea={key:0,class:"am-ps-names__russian"},aa={key:1,class:"am-ps-names__native"},ta={key:2,class:"am-ps-names__alt"},sa={key:0,class:"am-dim am-ps-names__occ"},na={key:1,class:"am-dim"},ra={key:2,class:"am-dim"},la={key:0,class:"am-dim"},oa={key:1,class:"am-dim"},ia={class:"am-ps-acts"},ua={key:0,class:"am-skeleton am-ps-skel"},ca={key:1,class:"am-skeleton am-ps-skel am-ps-skel--short"},da={key:2,class:"am-ps-fail"},ma={class:"am-ps-fail__word"},fa={class:"am-rail am-ps-works"},pa=["onClick"],va=["src","alt"],_a={key:1,class:"am-ps-work__art am-ps-work__art--empty","aria-hidden":"true"},ga={class:"am-ps-work__name"},ha={key:2,class:"am-ps-work__year"},ya={class:"am-ps-voices"},ka=["onClick"],wa=["src","alt"],Ra={key:1,class:"am-ps-va__art am-ps-va__art--empty","aria-hidden":"true"},$a={class:"am-ps-va__name"},Aa=600,oe=10,ba=_e({__name:"PersonSheet",props:{start:{}},emits:["close"],setup(l,{emit:R}){const v=l,_=R,d=h(v.start),$=[],m=h(0),i=h(null),u=h(null),M=h(!0),U=h(!1),O=h(!1),I=h(!1),D=h(!1),T=h([]),E=re(new Map),q=h(null),A=h(null),B=re(new Map);let k=!0,w=0;function x(){return d.value.kind==="character"?H.translateCharacters:H.translateStaff}function L(){return I.value?"":A.value?.description?A.value.description:(d.value.kind==="character"?i.value?.description:u.value?.description)??""}function Q(){return L().length>Aa}function z(){return be(T.value,e=>e.isAdult)}function W(e){return E.get(e.mediaId)??e.name}function F(){return(d.value.kind==="character"?i.value:u.value)?.name.full??d.value.name}function G(){return(d.value.kind==="character"?i.value:u.value)?.name.native??d.value.native??null}function J(){return(d.value.kind==="character"?i.value:u.value)?.name.alternative?.filter(t=>t.trim()!=="")??[]}function X(){return(d.value.kind==="character"?i.value:u.value)?.image?.large??d.value.image??null}const ue=["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"],ce=["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];function N(e){if(!e)return"";const t=e.day??0,s=e.month??0,a=e.year??0;if(s<1||s>12)return a>0?String(a):"";const p=ue[s-1],b=ce[s-1];return t>0?a>0?`${t} ${p} ${a}`:`${t} ${p}`:a>0?`${b} ${a}`:b}function V(){const e=i.value?.media?.edges;if(!e)return[];const t=new Set,s=[];for(const a of e){const p=a.voiceActors.find(b=>b.language?.toLowerCase()==="japanese")??a.voiceActors[0];!p||t.has(p.id)||(t.add(p.id),s.push(p))}return s.slice(0,6)}function Z(e){return B.get(e.id)??e.name.full}function de(e){$e("media",{id:String(e)}),_("close")}function ee(e){e.key==="Escape"&&(m.value>0?ae():_("close"))}async function me(e,t){const s=t.map(a=>a.mediaId);for(const a of s){const p=le(a);p&&E.set(a,p)}for(let a=0;a<s.length;a+=oe){if(!k||e!==w)return;const p=s.slice(a,a+oe);if(await Ce(p),!k||e!==w)return;for(const b of p){const te=le(b);te&&E.set(b,te)}}}async function fe(e,t){if(x()){const s=await Se(t.kind,t);if(!k||e!==w)return;I.value=!1,D.value=s.state==="fail",s.person&&!(A.value&&!A.value.partial)&&(A.value=s.person)}if(H.translateStaff)for(const s of V()){if(!k||e!==w)return;const a=await Oe("staff",{personId:s.id,name:s.name.full,native:s.name.native,image:s.image?.large??s.image?.medium??null,siteUrl:s.siteUrl});if(!k||e!==w)return;a&&B.set(s.id,a.russian)}}async function P(e){const t=++w;if(d.value=e,i.value=null,u.value=null,T.value=[],E.clear(),B.clear(),U.value=!1,M.value=!0,O.value=!1,D.value=!1,I.value=x(),q.value?.scrollTo({top:0}),A.value=x()?Ne(e.kind,e.personId):null,e.kind==="character"){const s=await Le(e.personId);if(!k||t!==w)return;i.value=s.card,O.value=s.state==="fail"}else{He(e.personId).then(a=>{!k||t!==w||(T.value=a,me(t,a).catch(p=>{y("WARN","Карточка персоны: русские названия работ не доехали",p)}))}).catch(a=>{y("WARN","Карточка персоны: работы не загрузились",a)});const s=await Fe(e.personId);if(!k||t!==w)return;u.value=s.card,O.value=s.state==="fail"}!k||t!==w||(M.value=!1,fe(t,e).catch(s=>{!k||t!==w||(I.value=!1,D.value=!0,y("WARN","Карточка персоны: русское описание не доехало",s))}))}function pe(){P(d.value).catch(e=>{y("WARN","Карточка персоны: повтор не удался",e)})}function ve(e){$.push(d.value),m.value=$.length,P({kind:"staff",personId:e.id,name:e.name.full,native:e.name.native,image:e.image?.large??e.image?.medium??null,siteUrl:e.siteUrl})}function ae(){const e=$.pop();m.value=$.length,e&&P(e)}return ge(()=>v.start,e=>{const t=d.value;e.kind===t.kind&&e.personId===t.personId||($.push(t),m.value=$.length,P(e).catch(s=>{y("WARN","Карточка персоны: загрузка не удалась",s)}))}),he(()=>{window.addEventListener("keydown",ee),P(v.start).catch(e=>{y("WARN","Карточка персоны: загрузка не удалась",e)})}),ye(()=>{k=!1,window.removeEventListener("keydown",ee)}),(e,t)=>{const s=ke("tip");return n(),r("div",{class:"am-sheet",role:"dialog","aria-modal":"true",onClick:t[3]||(t[3]=Re(a=>_("close"),["self"]))},[o("div",Ke,[o("header",qe,[o("div",Qe,[o("div",ze,[X()?(n(),r("img",{key:0,class:"am-ps-portrait__img",src:X(),alt:F(),decoding:"async"},null,8,Ge)):(n(),r("span",Je,f(F().slice(0,1)),1))]),o("div",Xe,[o("p",Ze,f(F()),1),A.value?(n(),r("p",ea,f(A.value.russian),1)):c("",!0),G()?(n(),r("p",aa,f(G()),1)):c("",!0),J().length?(n(),r("p",ta,f(J().join(" · ")),1)):c("",!0),d.value.kind==="staff"&&u.value?(n(),r(g,{key:3},[u.value.primaryOccupations?.length?(n(),r("p",sa,f(u.value.primaryOccupations.map(j(We)).join(", ")),1)):c("",!0),u.value.languageV2?(n(),r("p",na,[C(f(j(Pe)(u.value.languageV2)),1),u.value.homeTown?(n(),r(g,{key:0},[C(", "+f(u.value.homeTown),1)],64)):c("",!0)])):c("",!0),N(u.value.dateOfBirth)?(n(),r("p",ra,[C(f(N(u.value.dateOfBirth)),1),N(u.value.dateOfDeath)?(n(),r(g,{key:0},[C("  — "+f(N(u.value.dateOfDeath)),1)],64)):c("",!0)])):c("",!0)],64)):c("",!0),d.value.kind==="character"&&i.value?(n(),r(g,{key:4},[i.value.gender||i.value.age?(n(),r("p",la,[i.value.gender?(n(),r(g,{key:0},[C(f(j(Ue)(i.value.gender)),1)],64)):c("",!0),i.value.gender&&i.value.age?(n(),r(g,{key:1},[C(" · ")],64)):c("",!0),i.value.age?(n(),r(g,{key:2},[C(f(i.value.age),1)],64)):c("",!0)])):c("",!0),N(i.value.dateOfBirth)?(n(),r("p",oa,f(N(i.value.dateOfBirth)),1)):c("",!0)],64)):c("",!0)]),o("div",ia,[m.value>0?Y((n(),r("button",{key:0,class:"am-ps-back",type:"button",onClick:ae},[...t[4]||(t[4]=[o("span",{class:"am-ps-back__sign","aria-hidden":"true"},[o("svg",{class:"am-ps-back__chev",viewBox:"0 0 16 16"},[o("path",{d:"M9.9 3.3 5.2 8l4.7 4.7"})])],-1),o("span",{class:"am-ps-back__word"},"Назад",-1)])])),[[s,"Шаг назад"]]):c("",!0),o("button",{class:"am-sheet__close",type:"button","aria-label":"Закрыть",onClick:t[0]||(t[0]=a=>_("close"))},[se(De),t[5]||(t[5]=o("span",{"aria-hidden":"true"},"×",-1))])])])]),o("div",{ref_key:"box",ref:q,class:"am-sheet__body"},[M.value?(n(),r(g,{key:0},[t[6]||(t[6]=o("span",{class:"am-skeleton am-ps-skel"},null,-1)),t[7]||(t[7]=o("span",{class:"am-skeleton am-ps-skel"},null,-1)),t[8]||(t[8]=o("span",{class:"am-skeleton am-ps-skel am-ps-skel--short"},null,-1))],64)):(n(),r(g,{key:1},[I.value?(n(),r("span",ua)):c("",!0),I.value?(n(),r("span",ca)):c("",!0),O.value||D.value?(n(),r("div",da,[o("p",ma,f(O.value?"Карточку загрузить не удалось.":"Русское описание не доехало."),1),o("button",{class:"am-btn am-btn--ghost",type:"button",onClick:pe},"Повторить")])):c("",!0),L()?(n(),r("div",{key:3,class:we(["am-ps-desc",{"am-ps-desc--fold":Q()&&!U.value}])},[se(Ie,{text:L(),onInside:t[1]||(t[1]=a=>_("close"))},null,8,["text"])],2)):c("",!0),Q()&&!U.value?(n(),r("button",{key:4,class:"am-btn am-btn--ghost am-ps-wide",type:"button",onClick:t[2]||(t[2]=a=>U.value=!0)}," Показать полностью ")):c("",!0),d.value.kind==="staff"&&z().length?(n(),r(g,{key:5},[t[9]||(t[9]=o("h4",{class:"am-ps-sub"},"Работы",-1)),o("div",fa,[(n(!0),r(g,null,ne(z(),a=>Y((n(),r("button",{key:a.mediaId,class:"am-ps-work",type:"button",onClick:p=>de(a.mediaId)},[a.cover?(n(),r("img",{key:0,class:"am-ps-work__art",src:a.cover,alt:W(a),loading:"lazy",decoding:"async"},null,8,va)):(n(),r("span",_a,f(W(a).slice(0,1)),1)),o("span",ga,f(W(a)),1),a.year?(n(),r("span",ha,f(a.year),1)):c("",!0)],8,pa)),[[s,a.role?`${W(a)} · ${a.role}`:W(a)]])),128))])],64)):c("",!0),d.value.kind==="character"&&V().length?(n(),r(g,{key:6},[t[11]||(t[11]=o("h4",{class:"am-ps-sub"},"Голоса",-1)),o("div",ya,[(n(!0),r(g,null,ne(V(),a=>Y((n(),r("button",{key:a.id,class:"am-ps-va",type:"button",onClick:p=>ve(a)},[a.image?.medium||a.image?.large?(n(),r("img",{key:0,class:"am-ps-va__art",src:a.image.medium??a.image.large,alt:a.name.full,loading:"lazy",decoding:"async"},null,8,wa)):(n(),r("span",Ra,f(a.name.full.slice(0,1)),1)),o("span",$a,f(Z(a)),1),t[10]||(t[10]=o("span",{class:"am-ps-va__go","aria-hidden":"true"},[o("svg",{class:"am-ps-va__chev",viewBox:"0 0 16 16"},[o("path",{d:"M6.1 3.3 10.8 8l-4.7 4.7"})])],-1))],8,ka)),[[s,`Карточка: ${Z(a)}`]])),128))])],64)):c("",!0)],64))],512)])])}}}),Wa=Ae(ba,[["__scopeId","data-v-93d391e0"]]);export{Wa as default};
