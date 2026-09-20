import{L as k,q,d as ye,m as y,w as ke,A as we,a7 as Re,o as Ae,r as $e,a as s,b as n,e as l,t as m,h as u,F as g,u as M,g as C,f as ne,i as re,n as oe,j as le,l as be,a1 as Ce,C as Ie,U as ie,R as K,_ as Ne}from"./index-cQf-OHY6.js";import{k as Se}from"./adult-2Fi79OXj.js";import{p as ue,a as We}from"./media-title-CxHmKDKl.js";import{R as Oe,a as Pe,b as Ue,g as De}from"./RichText-BlaEmof4.js";import{o as Ee,l as Me,e as Te,_ as Be}from"./SakuraBloom.vue_vue_type_style_index_0_lang-D2oJ13YK.js";import"./sakura-BhbWbBtr.js";const xe=`
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
`,Le=`
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
`,Fe=2,Ve=900;function je(o){return new Promise(A=>setTimeout(A,o))}async function de(o,A){for(let v=1;;v+=1)try{const _=await A();return{state:_===null?"none":"ready",card:_}}catch(_){if(v>=Fe)return k("WARN",`${o}: карточка не доехала`,_),{state:"fail",card:null};k("WARN",`${o}: повторяем`,_),await je(Ve)}}async function Ye(o){return await de(`Персонаж ${o}`,async()=>{const v=(await q(xe,{id:o}))?.data?.Character??null;return k("API",`Персонаж ${o}: ${v?.name.full??"нет данных"}`),v})}async function He(o){return await de(`Автор ${o}`,async()=>{const v=(await q(Le,{id:o}))?.data?.Staff??null;return k("API",`Автор ${o}: ${v?.name.full??"нет данных"}`),v})}const Ke=14,qe=`query ($id: Int!, $perPage: Int!) {
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
}`;function S(o){return typeof o=="string"&&o.trim()!==""?o:null}function Qe(o){return typeof o=="number"&&o>0?o:null}async function ze(o){if(!Number.isFinite(o)||o<=0)return[];const A=await q(qe,{id:o,perPage:Ke},!1),v=A.data?.Staff?.staffMedia?.edges;if(!Array.isArray(v))return k("WARN",`Работы автора ${o}: пустой ответ`,A.errors),[];const _=new Map;for(const c of v){const d=c?.node;if(!d||typeof d.id!="number")continue;const h=S(c?.staffRole),i=_.get(d.id);if(i){h!==null&&i.role!==null&&!i.role.includes(h)?i.role=`${i.role}, ${h}`:h!==null&&i.role===null&&(i.role=h);continue}_.set(d.id,{mediaId:d.id,name:S(d.title?.romaji)??S(d.title?.english)??`#${d.id}`,role:h,year:Qe(d.seasonYear),cover:S(d.coverImage?.large)??S(d.coverImage?.medium),color:S(d.coverImage?.color),isAdult:d.isAdult===!0})}const P=[..._.values()];return k("API",`Работы автора ${o}: граней ${v.length}, тайтлов ${P.length}`),P}const Ge={class:"am-sheet__box"},Je={class:"am-sheet__head"},Xe={class:"am-ps-top"},Ze={class:"am-ps-portrait"},ea=["src","alt"],aa={key:1,class:"am-ps-portrait__img am-ps-portrait__img--empty","aria-hidden":"true"},ta={class:"am-ps-names"},sa={class:"am-ps-names__full"},na={key:0,class:"am-ps-names__russian"},ra={key:1,class:"am-ps-names__native"},oa={key:2,class:"am-ps-names__alt"},la={key:0,class:"am-dim am-ps-names__occ"},ia={key:1,class:"am-dim"},ua={key:2,class:"am-dim"},ca={key:0,class:"am-dim"},da={key:1,class:"am-dim"},ma={class:"am-ps-acts"},fa={key:0,class:"am-skeleton am-ps-skel"},pa={key:1,class:"am-skeleton am-ps-skel am-ps-skel--short"},va={key:2,class:"am-ps-fail"},_a={class:"am-ps-fail__word"},ga={class:"am-rail am-ps-works"},ha=["onClick"],ya=["src","alt"],ka={key:1,class:"am-ps-work__art am-ps-work__art--empty","aria-hidden":"true"},wa={class:"am-ps-work__name"},Ra={key:2,class:"am-ps-work__year"},Aa={class:"am-ps-voices"},$a=["onClick"],ba=["src","alt"],Ca={key:1,class:"am-ps-va__art am-ps-va__art--empty","aria-hidden":"true"},Ia={class:"am-ps-va__name"},Na=600,ce=10,Sa=ye({__name:"PersonSheet",props:{start:{}},emits:["close"],setup(o,{emit:A}){const v=o,_=A,P=Ce(),c=y(v.start),d=[],h=y(0),i=y(null),f=y(null),T=y(!0),U=y(!1),W=y(!1),I=y(!1),D=y(!1),B=y([]),E=ie(new Map),Q=y(null),$=y(null),x=ie(new Map);let w=!0,R=0;function L(){return c.value.kind==="character"?K.translateCharacters:K.translateStaff}function F(){return I.value?"":$.value?.description?$.value.description:(c.value.kind==="character"?i.value?.description:f.value?.description)??""}function z(){return F().length>Na}function G(){return Se(B.value,e=>e.isAdult)}function V(e){return E.get(e.mediaId)??e.name}function j(){return(c.value.kind==="character"?i.value:f.value)?.name.full??c.value.name}function J(){return(c.value.kind==="character"?i.value:f.value)?.name.native??c.value.native??null}function X(){return(c.value.kind==="character"?i.value:f.value)?.name.alternative?.filter(t=>t.trim()!=="")??[]}function Z(){return(c.value.kind==="character"?i.value:f.value)?.image?.large??c.value.image??null}const me=["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"],fe=["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];function N(e){if(!e)return"";const t=e.day??0,r=e.month??0,a=e.year??0;if(r<1||r>12)return a>0?String(a):"";const p=me[r-1],b=fe[r-1];return t>0?a>0?`${t} ${p} ${a}`:`${t} ${p}`:a>0?`${b} ${a}`:b}function Y(){const e=i.value?.media?.edges;if(!e)return[];const t=new Set,r=[];for(const a of e){const p=a.voiceActors.find(b=>b.language?.toLowerCase()==="japanese")??a.voiceActors[0];!p||t.has(p.id)||(t.add(p.id),r.push(p))}return r.slice(0,6)}function ee(e){return x.get(e.id)??e.name.full}function pe(e){Ie("media",{id:String(e)}),_("close")}function ae(e){e.key==="Escape"&&(h.value>0?te():_("close"))}async function ve(e,t){const r=t.map(a=>a.mediaId);for(const a of r){const p=ue(a);p&&E.set(a,p)}for(let a=0;a<r.length;a+=ce){if(!w||e!==R)return;const p=r.slice(a,a+ce);if(await We(p),!w||e!==R)return;for(const b of p){const se=ue(b);se&&E.set(b,se)}}}async function _e(e,t){if(L()){const r=await Ue(t.kind,t);if(!w||e!==R)return;I.value=!1,D.value=r.state==="fail",r.person&&!($.value&&!$.value.partial)&&($.value=r.person)}if(K.translateStaff)for(const r of Y()){if(!w||e!==R)return;const a=await De("staff",{personId:r.id,name:r.name.full,native:r.name.native,image:r.image?.large??r.image?.medium??null,siteUrl:r.siteUrl});if(!w||e!==R)return;a&&x.set(r.id,a.russian)}}async function O(e){const t=++R;if(c.value=e,i.value=null,f.value=null,B.value=[],E.clear(),x.clear(),U.value=!1,T.value=!0,W.value=!1,D.value=!1,I.value=L(),Q.value?.scrollTo({top:0}),$.value=L()?Pe(e.kind,e.personId):null,e.kind==="character"){const r=await Ye(e.personId);if(!w||t!==R)return;i.value=r.card,W.value=r.state==="fail"}else{ze(e.personId).then(a=>{!w||t!==R||(B.value=a,ve(t,a).catch(p=>{k("WARN","Карточка персоны: русские названия работ не доехали",p)}))}).catch(a=>{k("WARN","Карточка персоны: работы не загрузились",a)});const r=await He(e.personId);if(!w||t!==R)return;f.value=r.card,W.value=r.state==="fail"}!w||t!==R||(T.value=!1,_e(t,e).catch(r=>{!w||t!==R||(I.value=!1,D.value=!0,k("WARN","Карточка персоны: русское описание не доехало",r))}))}function ge(){O(c.value).catch(e=>{k("WARN","Карточка персоны: повтор не удался",e)})}function he(e){d.push(c.value),h.value=d.length,O({kind:"staff",personId:e.id,name:e.name.full,native:e.name.native,image:e.image?.large??e.image?.medium??null,siteUrl:e.siteUrl})}function te(){const e=d.pop();h.value=d.length,e&&O(e)}ke(()=>v.start,e=>{const t=c.value;e.kind===t.kind&&e.personId===t.personId||(d.push(t),h.value=d.length,O(e).catch(r=>{k("WARN","Карточка персоны: загрузка не удалась",r)}))});let H=null;return we(()=>{window.addEventListener("keydown",ae),H=Re(function(){return _("close"),!0}),O(v.start).catch(e=>{k("WARN","Карточка персоны: загрузка не удалась",e)})}),Ae(()=>{w=!1,H?.(),H=null,window.removeEventListener("keydown",ae)}),(e,t)=>{const r=$e("tip");return s(),n("div",{class:oe(["am-sheet",{"am-sheet--tv":M(P)}]),role:"dialog","aria-modal":"true",onClick:t[3]||(t[3]=be(a=>_("close"),["self"]))},[l("div",Ge,[l("header",Je,[l("div",Xe,[l("div",Ze,[Z()?(s(),n("img",{key:0,class:"am-ps-portrait__img",src:Z(),alt:j(),decoding:"async"},null,8,ea)):(s(),n("span",aa,m(j().slice(0,1)),1))]),l("div",ta,[l("p",sa,m(j()),1),$.value?(s(),n("p",na,m($.value.russian),1)):u("",!0),J()?(s(),n("p",ra,m(J()),1)):u("",!0),X().length?(s(),n("p",oa,m(X().join(" · ")),1)):u("",!0),c.value.kind==="staff"&&f.value?(s(),n(g,{key:3},[f.value.primaryOccupations?.length?(s(),n("p",la,m(f.value.primaryOccupations.map(M(Ee)).join(", ")),1)):u("",!0),f.value.languageV2?(s(),n("p",ia,[C(m(M(Me)(f.value.languageV2)),1),f.value.homeTown?(s(),n(g,{key:0},[C(", "+m(f.value.homeTown),1)],64)):u("",!0)])):u("",!0),N(f.value.dateOfBirth)?(s(),n("p",ua,[C(m(N(f.value.dateOfBirth)),1),N(f.value.dateOfDeath)?(s(),n(g,{key:0},[C("  — "+m(N(f.value.dateOfDeath)),1)],64)):u("",!0)])):u("",!0)],64)):u("",!0),c.value.kind==="character"&&i.value?(s(),n(g,{key:4},[i.value.gender||i.value.age?(s(),n("p",ca,[i.value.gender?(s(),n(g,{key:0},[C(m(M(Te)(i.value.gender)),1)],64)):u("",!0),i.value.gender&&i.value.age?(s(),n(g,{key:1},[C(" · ")],64)):u("",!0),i.value.age?(s(),n(g,{key:2},[C(m(i.value.age),1)],64)):u("",!0)])):u("",!0),N(i.value.dateOfBirth)?(s(),n("p",da,m(N(i.value.dateOfBirth)),1)):u("",!0)],64)):u("",!0)]),l("div",ma,[h.value>0?ne((s(),n("button",{key:0,class:"am-ps-back",type:"button",onClick:te},[...t[4]||(t[4]=[l("span",{class:"am-ps-back__sign","aria-hidden":"true"},[l("svg",{class:"am-ps-back__chev",viewBox:"0 0 16 16"},[l("path",{d:"M9.9 3.3 5.2 8l4.7 4.7"})])],-1),l("span",{class:"am-ps-back__word"},"Назад",-1)])])),[[r,"Шаг назад"]]):u("",!0),l("button",{class:"am-sheet__close",type:"button","aria-label":"Закрыть",onClick:t[0]||(t[0]=a=>_("close"))},[re(Be),t[5]||(t[5]=l("span",{"aria-hidden":"true"},"×",-1))])])])]),l("div",{ref_key:"box",ref:Q,class:"am-sheet__body"},[T.value?(s(),n(g,{key:0},[t[6]||(t[6]=l("span",{class:"am-skeleton am-ps-skel"},null,-1)),t[7]||(t[7]=l("span",{class:"am-skeleton am-ps-skel"},null,-1)),t[8]||(t[8]=l("span",{class:"am-skeleton am-ps-skel am-ps-skel--short"},null,-1))],64)):(s(),n(g,{key:1},[I.value?(s(),n("span",fa)):u("",!0),I.value?(s(),n("span",pa)):u("",!0),W.value||D.value?(s(),n("div",va,[l("p",_a,m(W.value?"Карточку загрузить не удалось.":"Русское описание не доехало."),1),l("button",{class:"am-btn am-btn--ghost",type:"button",onClick:ge},"Повторить")])):u("",!0),F()?(s(),n("div",{key:3,class:oe(["am-ps-desc",{"am-ps-desc--fold":z()&&!U.value}])},[re(Oe,{text:F(),plain:"",onInside:t[1]||(t[1]=a=>_("close"))},null,8,["text"])],2)):u("",!0),z()&&!U.value?(s(),n("button",{key:4,class:"am-btn am-btn--ghost am-ps-wide",type:"button",onClick:t[2]||(t[2]=a=>U.value=!0)}," Показать полностью ")):u("",!0),c.value.kind==="staff"&&G().length?(s(),n(g,{key:5},[t[9]||(t[9]=l("h4",{class:"am-ps-sub"},"Работы",-1)),l("div",ga,[(s(!0),n(g,null,le(G(),a=>(s(),n("button",{key:a.mediaId,class:"am-ps-work",type:"button",onClick:p=>pe(a.mediaId)},[a.cover?(s(),n("img",{key:0,class:"am-ps-work__art",src:a.cover,alt:V(a),loading:"lazy",decoding:"async"},null,8,ya)):(s(),n("span",ka,m(V(a).slice(0,1)),1)),l("span",wa,m(V(a)),1),a.year?(s(),n("span",Ra,m(a.year),1)):u("",!0)],8,ha))),128))])],64)):u("",!0),c.value.kind==="character"&&Y().length?(s(),n(g,{key:6},[t[11]||(t[11]=l("h4",{class:"am-ps-sub"},"Голоса",-1)),l("div",Aa,[(s(!0),n(g,null,le(Y(),a=>ne((s(),n("button",{key:a.id,class:"am-ps-va",type:"button",onClick:p=>he(a)},[a.image?.medium||a.image?.large?(s(),n("img",{key:0,class:"am-ps-va__art",src:a.image.medium??a.image.large,alt:a.name.full,loading:"lazy",decoding:"async"},null,8,ba)):(s(),n("span",Ca,m(a.name.full.slice(0,1)),1)),l("span",Ia,m(ee(a)),1),t[10]||(t[10]=l("span",{class:"am-ps-va__go","aria-hidden":"true"},[l("svg",{class:"am-ps-va__chev",viewBox:"0 0 16 16"},[l("path",{d:"M6.1 3.3 10.8 8l-4.7 4.7"})])],-1))],8,$a)),[[r,`Карточка: ${ee(a)}`]])),128))])],64)):u("",!0)],64))],512)])],2)}}}),Ma=Ne(Sa,[["__scopeId","data-v-a031ee76"]]);export{Ma as default};
