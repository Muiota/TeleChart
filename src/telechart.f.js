eval(function(){var s="@TeleChart=~(cp){@ap=Math,bi=window.parseInt,a4=ap.abs,l=ap.ceil,a3=ap.floor,bY=ap.round,b9=ap.log,cb=document,b5=undefined,g=null,H=true,A=false;@aE=12,al=25,a6=1.5,bO=5,aV=0.5,cn=bO/2,m=bO*2,j=bO*3,i=bO*4,ab=20,ai=ab*2,bW=[2,5,10],az=[\"Jan\",\"Feb\",\"Mar\",\"Apr\",\"May\",\"Jun\",\"Jul\",\"Aug\",\"Sep\",\"Oct\",\"Nov\",\"Dec\"],K=[\"Sun\",\"Mon\",\"Tue\",\"Wed\",\"Thu\",\"Fri\",\"Sat\"],P=[\"inherit\",\"pointer\",\"col-resize\"],b0=2*Math.PI,bG=Math.LOG2E,br=\"px\",R=\"bold \",bu=\"width\",ao=\"height\",aB=co(a9),h=co(bE),bU=1,n=2,bt=3,ck=4,ad=5,bK=6;@b=cb.getElementById(cp),cc=b.offsetWidth*a6,F=bi(cc*aE/100),q=cc-F-F*2,aZ=F/2,cl=q+aZ,y=q+F+i,cw=y+F,W=cw+bO*10+ab*4,k,v,b8,bf,a0,cm,ay=[],ce={},e=0,T,Q,ci,cg,aI,aw,w={},bj,aQ,bw,bL,bs,aS,bd,be,aO,cv,cu,ch,N,aP,au,b2,aX,bh,cf,cs,E=1,r,bo,aM=1,aL,aK,Z,bV=0,bZ,bX,aT,bP,af,ak,b6,c,s=[],a2,aa=1,aG=0,ax,I,bJ=[],bc=[],C,ca,bB,bA,ct,bk=0,aN;~bH(){v=cd(cc,W);bf=v.getContext(\"2d\");bf.lineJoin=\"bevel\";@cC=G(\"font-size\"),cD=br+\" \"+G(\"font-family\"),cB=v.style,cy=bi(cC.replace(/\\D/g,\"\")),cA=~(cE){bF(cE,H)},cz=~(cE){bF(cE,A)};b8=cd(cc,F);a0=b8.getContext(\"2d\");a0.lineWidth=2;ax=bi(cy*1.2);I=bi(cy*a6);C=ax+cD;bA=I+cD;ca=R+C;bB=R+bA;Y(C);cB[bu]=bi(cc/a6)+br;cB[ao]=bi(W/a6)+br;b.appendChild(v);v_zmove=bl;v.ontouchmove=bl;v_zout=bl;v_zover=cz;v_zdown=cA;v_zup=cz;v.ontouchstart=cA;v.ontouchend=cz;ar(\"scroll\",am);ar(\"resize\",am);ar(\"mouseup\",cz);am();aD()}~ar(cy,cz){window.addEventListener(cy,cz)}~cd(cz,cy){@cA=cb.createElement(\"canvas\");cA[bu]=cz;cA[ao]=cy;_r cA}~bE(cy){cu=cy}~bN(cy){aK=cy;bX=H}~a8(cy){bV=cy}~p(cy){bj=cy;aP=H}~bS(cy){aQ=cy;aP=H}~aq(cy){aO=cy}~S(cy){aG=cy}~d(cy){af=cy}~M(cz,cy){cy.sO=cz;bX=H}~bx(cz,cy){cy.bPulse=cz}~b3(cy){aM=cy}~t(cy){r=cy}~a9(cy){E=cy}~bq(cy){bh=cy}~f(cy){aN=cy}~cj(){cm=g;ay=[];bM()}~L(){v.parentNode.remove(v)}~bM(){k=H}~aD(){@cz=G(\"_c\"),cB=G(\"background-_c\"),cy,cA;_lcA=0;cA<=100;cA++){cy=cA/100;bJ[cA]=D(cz,cy);bc[cA]=D(cB,cy)}bM()}~aW(cy){`cy){bT(cy);bM()}}~G(cy){@cA=cb.body,cz=cA.currentStyle;_r cz?cz[cy]:cb.defaultView.getComputedStyle(cA,g)[cy]}~o(cz,cA){@cy=new Date(cz);_r(cA?K[cy.getDay()]+\", \":\"\")+az[cy.getMonth()]+\" \"+cy.getDate()}~b1(cz,cy){_r cy===b5||cz>cy?cz:cy}~X(cz,cy){_r cy===b5||cz<cy?cz:cy}~av(cy){v.style.cursor=P[cy]}~ag(cz){@cB=g,cA;`!aL){_r}`Q<y&&T>0&&T<cc&&cv){@cD=bY(T/cv+bs);aC(cD);B(aO,aq,cD);w.tS=bj;w.tE=aQ;w.tF=T;cB=bK;bM()}_e{`Q>y&&Q<cw){cB=bU;@cE=(bj)*aL,cy=(aQ)*aL,cC=cE-T,cF=cy-T;`a4(cC+m)<i){cB=n}_e{`a4(cF-m)<i){cB=bt}_e{`T>cE&&T<cy){w.nS=cC/aL;w.nE=cF/aL;cB=ck}}}}_e{`Q>cw){_lcA_tay){@cG=ay[cA];cG.bO=A;`T>cG.bX&&T<cG.bX+cG.bW&&Q>cG.bY&&Q<cG.bY+cG.bH){cG.bO=H;cB=ad}}}}}`aI!==cB||cz){aI=cB;`aI!==bK){B(aG,S,0)}_e{`aI!==ad){_lcA_tay){ay[cA].bO=A}}}`aI===bK){B(aG,S,1);av(0)}_e{`aI===ck||aI===ad){av(1)}_e{`aI===n||aI===bt){av(2)}_e{av(0)}}}}}~bg(cy){cy.preventDefault();cy.stopPropagation()}~a5(cy){bw=cy*aL;B(bj,p,cy)}~ae(cy){bL=cy*aL;B(aQ,bS,cy)}~bp(cz,cC,cD,cy){@cB=cz+cD,cA=cz+cy;aN=0;`cB<0){aN=b1(cB*3/(cA-cB),-1);cB=0;cA=cy-cD}`cA>cC){aN=X((cA-cC)*3/(cA-cB),1);cA=cC;cB=cC-cy+cD}a5(cB);ae(cA)}~aH(){`aL){@cz=T/aL,cA=cm.l-2,cy=30/aL;`cz<0){cz=0}_e{`cz>cA){cz=cA}}`aI===ck){bp(cz,cA,w.nS,w.nE)}_e{`aI===n){`aQ-cz>cy){a5(cz)}}_e{`aI===bt){`cz-bj>cy){ae(cz)}}}}}}~a(){`cm){`aI===bK){@cy=(w.tF-T)/cv,cz=cm.l-2;bp(cy,cz,w.tS,w.tE)}_e{aH()}}}~bQ(cA,cB){@cz=cA.clientX,cy=cA.clientY;`cz&&cy){T=bi((cz-ci)*a6);Q=bi((cy-cg)*a6);aw&&!cB?a():ag();bM()}}~bl(cA,cz){@cy=cA.touches;cy&&J(cy)?bQ(cy[0],cz):bQ(cA,cz)}~bF(cB,cA){aw=cA;bl(cB,H);`cA){B(bh,bq,0,1);cf=bs;cs=aS;aX=H;ag(H);`aI===ad){bg(cB);aw=A;_l@cz_tay){@cy=ay[cz];`cy.bO){cy.bOn=!cy.bOn;B(cy.sO,M,cy.bOn?1:0,b5,cy);B(0,bx,1,30,cy);bD();ah()}}}_e{`aI===ck||aI===n||aI===bt){bg(cB);B(bV,a8,1,15);bZ=aI}}}_e{B(bV,a8,0,15);B(aN,f,0,15);`aX){`cf!==bs||cs!==aS){B(E,a9,0,5)}_e{aX=A;B(bh,bq,0,1)}}}bM()}~am(){@cy=v.getBoundingClientRect();ci=cy.left;cg=cy.top;bM()}~D(cz,cB){`cB<1){`cz.indexOf(\"#\")!==-1){@cy=J(cz)===7,cD=cy?/^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i:/^#?([a-f\\d])([a-f\\d])([a-f\\d])$/i,cC=cD.exec(cz),cF=bi(cC[1],16),cE=bi(cC[2],16),cA=bi(cC[3],16);`!cy){cF=(cF<<4)+cF;cE=(cE<<4)+cF;cA=(cA<<4)+cF}cz=\"rgb(\"+cF+\",\"+cE+\",\"+cA+\")\"}`cz.indexOf(\"a\")===-1){cz=cz.replace(\")\",\", \"+cB+\")\").replace(\"rgb\",\"rgba\")}}_r cz}~bb(cy){bf.lineWidth=cy||1}~an(){bf.beginPath()}~z(){bf.stroke()}~bC(){bf.closePath()}~bR(cy){_r bf.measureText(cy)[bu]}~aY(cz,cy,cA){bf.fillText(cz,cy,cA)}~ac(cz,cy,cA){cz?bf.moveTo(cy,cA):bf.lineTo(cy,cA)}~bm(cA,cz,cy,cB){bf.quadraticCurveTo(cA,cz,cy,cB)}~bn(){bf.fill()}~U(cz,cA,cy){bf.arc(cz,cA,cy,0,b0)}~bI(cy,cB,cz,cA){bf.fillRect(cy,cB,cz,cA)}~x(cz,cF,cB,cy,cC,cA){@cD=cz+cB,cE=cF+cy;an();aU(bJ[bi((cC?40:20)*cA)]);b7(bc[bi(30+60*cA)]);bb();ac(H,cz+ab,cF);ac(A,cD-ab,cF);bm(cD,cF,cD,cF+ab);ac(A,cD,cE-ab);bm(cD,cE,cD-ab,cE);ac(A,cz+ab,cE);bm(cz,cE,cz,cE-ab);ac(A,cz,cF+ab);bm(cz,cF,cz+ab,cF);bC();bn();z()}~aU(cy){bf.strokeStyle=cy}~b7(cy){bf.fillStyle=cy}~Y(cy){bf.font=cy}~O(cy,cz){bf.translate(cy,cz)}~aF(){@cz=cl,cy;an();aU(bJ[10]);bb(2);_wcz>aZ){cy=l(cz)+aV;ac(H,0,cy);ac(A,cc,cy);cz=cz+r*cu}z()}~cx(){@cD=cl,cJ=bJ[bi(50*aT*E)],cL=bc[bi(70*aM)],cB=!au||!aX,cG,cK,cA,cC,cz,cF=0,cI,cH,cy,cM,cE;`cB){b2=l((aS-bs)/5);au=bd-b2+1;`au<1){au=1}}cA=au;cy=b2;`!cB){`bh<0){cH=a3(bh);cI=1-bh+cH;_lcG=0;cG>cH;cG--){cK=cy;cy/=2}}_e{`bh>0){cH=l(bh);cI=cH-bh;cK=cy;_lcG=0;cG<cH;cG++){cy=cK;cK*=2}}}_wcA-cy>=bd){cA=cA-cy}_wcA<bd){cA=cA+cy}cI=bJ[bi(50*cI*aT*E)]}cz=cD+bO*5;bb();_lcG=cA-cy;cG<=be;cG+=cy){cA=l(cG);cC=(cA-bs)*cv;cI&&a4((cA-au)%cK)>=1?b7(cI):b7(cJ);`cA>0){aY(o(cm._d[cA]),cC,cz)}}cJ=bJ[bi(50*X(aT,aM))];_wcD>aZ){cz=bi(cD)+aV-bO;cM=cF.toString();cE=J(cM);`cE>6){cM=cF/1000000+\"M\"}_e{`cE>3){cM=cF/1000+\"K\"}}b7(cL);bI(cn,cz-ax+2,bR(cM)+m,ax);b7(cJ);aY(cM,bO,cz);cF=bi(cF+bo);cD=cD+r*cu}}~aJ(cC){@cA=cC.bX,cz=cC.bY,cE=cC._c,cy=cC._n,cB=cA+ab,cD=cz+ab;x(cA,cz,cC.bW,cC.bH,cC.bO,1);b7(cE);an();U(cB,cD,ab-bO);bn();aU(bc[100]);bb(4);an();O(-2,4);ac(H,cB-bO,cD-bO);ac(A,cB,cD);ac(A,cB+bO*1.8,cD-bO*1.8);O(2,-4);z();an();b7(bc[100]);U(cB,cD,12*(1-cC.sO));bn();b7(bJ[100]);Y(bA);aY(cy,cA+ai+bO+1,cD+ax/2-bO+4);Y(C);an();aU(bJ[bi((1-cC.bPulse)*40)]);bb(10);U(cB,cD,cC.bPulse*30);z()}~b4(){_l@cy_tay){aJ(ay[cy])}}~V(cy){@cB=0,cA,cz;a0.beginPath();a0.strokeStyle=cy.sCg[100];a0.globalAlpha=cy.sO;_lcz=1;cz<cm.l;){cA=F+(cy._d[cz]-Z)*aK;cz===1?a0.moveTo(cB,cA):a0.lineTo(cB,cA);cB=cz++*aL}a0.stroke()}~aj(){aT=0;@cA,cz,cy,cC,cB;`bX){aA(a0,cc,F)}_lcA_tay){cy=ay[cA];aT=b1(cy.sO,aT);`bX){V(cy)}an();aU(cy.sCg[bi(100*cy.sO)]);bb(3);_lcz=bd;cz<=be;){cC=(cz-bs)*cv;cB=cl+(cy._d[cz]-ch)*cu;ac(cz++===bd,cC,cB)}z()}bX=A;bf.drawImage(b8,0,y)}~cq(){@cK=cl,cA=(aO-bs)*cv,cz,cJ=cA+c-3,cP=0,cF=a3(aO),cN=cF+1,cy,cM,cB=10*aG,cL=0,cH,cD,cE,cI,cO,cG,cC;an();aU(bJ[bi(40*aG)]);bb();ac(H,cA,0);ac(A,cA,cl);z();bb(3);_lcy_tay){cM=ay[cy];cD=cK+(cM._d[cF]-ch)*cu;cI=cM.sO;`cF===aO||cN>=aS){cz=cD}_e{cE=cK+(cM._d[cN]-ch)*cu;cz=cD+(cE-cD)*(aO-cF)}an();b7(bc[bi(10*cB*cI)]);U(cA,cz,4);bn();an();aU(cM.sCg[bi(10*cB*cI)]);U(cA,cz,5);z()}`cJ<0){cA=3-c}_e{cH=cJ+af-cc+6;`cH>0){cP=cH-af+ai;cA=cc-c-af-3}cJ=0}`cP<0){cP=0}x(cA+c+cJ,b6,af-cJ+cP,ak,H,aG);Y(ca);b7(bJ[bi(10*cB*aa)]);aY(bP,cA+s[0],a2);cz=ab+m;_lcy_tay){cM=ay[cy];cC=cM._d[bY(aO)];`cM.bOn){cO=(cL&1);cG=s[cO];`!cO){cz+=(I+ax+i)}b7(cM.sCg[bi(10*cB*aa)]);Y(bB);aY(cC,cA+cG,cz);Y(C);aY(cM._n,cA+cG,cz+I+bO);cL++}}}~ba(){`bV>0){@cy;`bZ===n){cy=bw}_e{`bZ===bt){cy=bL}_e{cy=bw+(bL-bw)/2}}an();b7(bJ[bi(bV*20)]);U(cy,y+aZ,bV*35);bn()}`aN){u(aN)}}~u(cA){`cA!==0){@cz=cA<0?0:cc-ab,cy;cy=bf.createLinearGradient(cz,0,cz+ab,0);cy.addColorStop(cz?0:1,bJ[0]);cy.addColorStop(cz?1:0,bJ[bi(20*a4(cA))]);b7(cy);bI(cz,0,ab,cl)}}~a1(cy){`cy){b7(bJ[30]);bI(bw,y,bL-bw,F);b7(bc[100]);bI(bw+m,y+cn,bL-bw-i,F-bO)}_e{b7(bJ[10]);bI(0,y,bw,F);bI(bL,y,cc-bL,F);b7(bc[50]);bI(0,y,bw,F);bI(bL,y,cc-bL,F)}}~aA(cz,cA,cy){cz.clearRect(0,0,cA,cy)}~bv(){aA(bf,cc,W);`cm&&ay){Y(C);a1(H);aF();aj();a1();`aT>0){cx();`aG>0){cq()}}b4();ba()}}~bD(cC){@cy=b5,cB=e,cD,cA,cz;_lcD_tay){cA=ay[cD];`cA.bOn){cy=b1(cA.max,cy);cB=X(cA.min,cB)}}`cy){Z=cB+1;cz=-(F-2)/(cy-cB);`cC){bN(cz);aM=1}_e{`B(aK,bN,cz,g,b5,H)){B(aM,b3,0,2)}}}}~a7(){@cA=l((N-ch)/6),cy=cA/25,cB=0,cD=1,cC,cz;do{`cB>=J(bW)){cB=0;cD=cD*10}cz=bW[cB]*cD;cC=l(cA/cz)*cz;cB++}_wcC-cA<cy);B(r,t,cC);bo=cC}~ah(){bs=bj+1;aS=aQ+1;@cy=b5,cB=e,cD,cC,cA,cz;`aX&&cs>cf){cz=bY(b9((aS-bs)/(cs-cf))*bG);`a4(cz-bh)>=1){B(bh,bq,cz,10)}}_lcD_tay){cA=ay[cD];`cA.bOn){bd=a3(bs);`bd===0){bd++}be=l(aS);_lcC=bd;cC<=be;cC++){cz=cA._d[cC];cy=b1(cz,cy);cB=X(cz,cB)}}}`cy){cv=cc/(aS-bs);ch=cB;N=cy;B(cu,bE,-(q-2)/(cy-cB),g,b5,H);a7()}}~aR(){@cB=m,cz=cw+j*2,cC=ai,cA,cy,cE,cD;Y(bA);_lcE_tay){cA=ay[cE];cy=ab*2+i+bR(cA._n);`cB+cy>cc){cB=m;cz+=cC+j}cA.bX=cB;cA.bY=cz;cA.bW=cy;cA.bH=cC;cA.sCg=[];cB+=cy+j;_lcD=0;cD<=100;cD++){cA.sCg[cD]=D(cA._c,cD/100)}}Y(C)}~bz(cB,cC){`cB){@cz,cA,cy;_lcz_tcB){_lcA_tay){cy=ay[cA];`cy.alias===cz){cy[cC]=cB[cz]}}}}}~bT(cy){cj();`cy){@cB=cy.columns,cC,cA,cH;`cB){_lcC_tcB){@cG=cB[cC],cz=J(cG),cI=b5,cD=b5,cE=cG[0];_lcA=1;cA<cz;cA++){@cF=cG[cA];cI=b1(cF,cI);cD=X(cF,cD)}`cE===\"x\"){cm={_d:cG,l:cz,min:cD,max:cI};cH=cz-2;aL=(cc)/(cH);ae(cH);a5(cH-(cH)*al/100)}_e{ay.push({alias:cE,_d:cG,_n:cE,min:cD,max:cI,bOn:H,sO:1})}}bz(cy.types,\"type\");bz(cy._cs,\"_c\");bz(cy._ns,\"_n\");bD(H);aR()}}}~co(cy){_r cy._n||cy.toString().substring(9,32)}~J(cy){_r cy.length}~B(cD,cF,cz,cG,cA,cC){@cy=co(cF),cE,cB;`cD!==cz&&cF){`cA){cy+=cA.alias}cE=cG||(aw||aI===bK?5:15);`cC&&cD){cB=l(a4(b9(a4(cz/cD))*10));cE+=X(cB,15)}ce[cy]={i:cD,c:cF,p:cz,s:cE,o:cA};_r H}delete ce[cy];by(cy)}~cr(){@cz,cA,cy;_lcz_tce){cA=ce[cz];`cA){`!cA.f){cA.f=(cA.p-cA.i)/cA.s}cy=cA.f;`bk>20){cy=cy*bk/20}cA.i=cA.i+cy;`cA.f!==0&&a4(cA.i-cA.p)>a4(cy*2)){cA.c(cA.i,cA.o)}_e{cA.c(cA.p,cA.o);delete ce[cz];by(cz)}bM()}}}~aC(cD){b6=ab+aV;c=-25+aV;s[0]=-25+j;a2=ab+j+ax+aV;@cF=a3(cD),cy=[],cB,cC=0,cA,cG,cE,cz;bP=o(cm._d[cF],H);_lcz_tay){cA=ay[cz];`cA.bOn){cB=(cC&1);cG=cA._d[cF];Y(bB);cy[cB]=b1(bR(cG)+bO,cy[cB]);Y(C);cy[cB]=b1(bR(cA._n)+bO,cy[cB]);cC++}}s[1]=cy[0];cE=cy[0]+(cy[1]||0)+j*2;cE=b1(120+aV,cE);ak=36+I+l(cC/2)*(I+ax+i);B(af,d,cE)}~by(cy){`cy===h){B(aM,b3,1,10)}_e{`cy===aB&&aX){aX=A;B(bh,bq,0,1);B(E,a9,1,5)}}}~at(){cr();`aP){aP=A;ah()}`k){k=A;bv()}@cy=performance.now();`ct){bk=0.8*bk+0.2*(cy-ct)}ct=cy;requestAnimationFrame(at)}bH();at();_r{draw:aW,invalidate:aD,clear:cj,destroy:L}};",r={"`":"if(","@":"var ",_r:"return",_c:"color",_t:" in ",_d:"data",_e:"else",_w:"while(",_z:".onmouse",_l:"for(","~":"function ",_n:"name"},k;for(k in r){s=s.replace(new RegExp(k,"g"),r[k])} return s}());