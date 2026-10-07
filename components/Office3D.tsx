"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const L=-7,R=7,F=-11.5,B=14.5,W=14,D=26,H=2.7,T=.3;

const mat=(color:number,roughness=.5,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const box=(s:THREE.Scene,w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material)=>{
  const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); o.position.set(x,y,z); o.castShadow=true; o.receiveShadow=true; s.add(o); return o;
};
const cyl=(s:THREE.Scene,r:number,h:number,x:number,y:number,z:number,m:THREE.Material)=>{
  const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,18),m); o.position.set(x,y,z); o.castShadow=true; s.add(o); return o;
};

function directorChair(s:THREE.Scene,x:number,z:number){
  const black=mat(0x15171a,.42), soft=mat(0x34393e,.52), gold=mat(0xc99a45,.2,.9);
  box(s,1.05,.18,1.02,x,.67,z,black);
  const seat=new THREE.Mesh(new THREE.CapsuleGeometry(.35,.26,5,16),soft); seat.scale.set(1.3,.3,1.34); seat.position.set(x,.8,z); seat.castShadow=true; s.add(seat);
  box(s,1.1,1.3,.18,x,1.28,z-.44,black);
  const pad=new THREE.Mesh(new THREE.CapsuleGeometry(.37,.39,6,18),soft); pad.scale.set(1.32,1.48,.28); pad.position.set(x,1.3,z-.52); pad.castShadow=true; s.add(pad);
  const head=new THREE.Mesh(new THREE.CapsuleGeometry(.28,.16,5,14),black); head.scale.set(1.3,.62,.31); head.position.set(x,1.88,z-.54); head.castShadow=true; s.add(head);
  for(const q of[-1,1]){const a=new THREE.Mesh(new THREE.CapsuleGeometry(.11,.28,4,10),black);a.scale.set(1.16,.54,1.45);a.position.set(x+q*.45,1.01,z-.03);a.castShadow=true;s.add(a);box(s,.07,.34,.07,x+q*.45,.82,z-.03,black);}
  for(const dx of[-.22,0,.22])box(s,.028,.74,.018,x+dx,1.34,z+.56,gold);
  cyl(s,.085,.34,x,.43,z,black);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.15,.018,8,20),gold);ring.rotation.x=Math.PI/2;ring.position.set(x,.25,z);s.add(ring);
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2,len=.42;const sp=box(s,.045,.038,len,x+Math.cos(a)*len/2,.12,z+Math.sin(a)*len/2,black);sp.rotation.y=a;}
}
function guest(s:THREE.Scene,x:number,z:number){
  const black=mat(0x191b1e,.46),soft=mat(0x34393e,.52),gold=mat(0xc99a45,.2,.86);
  box(s,.78,.16,.76,x,.54,z,black);const b=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.3,4,12),soft);b.scale.set(1.44,1.2,.56);b.position.set(x,.91,z-.24);b.castShadow=true;s.add(b);
  for(const q of[-1,1])box(s,.1,.24,.58,x+q*.34,.78,z,black);cyl(s,.065,.42,x,.28,z,black);cyl(s,.07,.22,x,.33,z,gold);
}
function directorOffice(s:THREE.Scene){
  const black=mat(0x101214,.34,.1),charcoal=mat(0x202328,.44),walnut=mat(0x5a3925,.48),walnut2=mat(0x754e31,.5),marble=mat(0x292a2d,.22),gold=mat(0xc99a45,.2,.9),leather=mat(0x17191c,.42),soft=mat(0x32373c,.5),green=mat(0x3d744e,.76),pot=mat(0x111315,.38,.18);
  box(s,5.7,2.48,.08,4,1.42,14.28,black);
  for(const x of[1.42,1.6,1.78,6.22,6.4,6.58])box(s,.07,2.18,.055,x,1.38,14.21,walnut);
  const plaque=box(s,1.85,.68,.07,4,2.02,14.15,charcoal);
  for(const y of[1.68,2.36])box(s,1.95,.025,.025,4,y,14.1,gold);
  for(const dx of[-.13,0,.13])box(s,.04,.16,.025,4+dx,2.47,14.1,gold);
  for(const x of[1.6,6.4]){box(s,.62,1.92,.2,x,1.4,14.08,charcoal);for(const y of[.72,1.2,1.68,2.16])box(s,.5,.035,.22,x,y,13.95,gold);}
  const dz=12.84;box(s,2.72,.16,1.04,4,.84,dz,marble);box(s,2.48,.56,.09,4,.55,dz-.49,walnut2);box(s,2.42,.05,.022,4,.91,dz-.54,gold);
  for(const q of[-1,1])box(s,.16,.62,.16,4+q*1.02,.35,dz+.1,black);
  box(s,.58,.035,.4,3.8,.95,12.82,mat(0x59666f,.18,.45));directorChair(s,4,11.6);guest(s,2.55,11.02);guest(s,3.62,11.02);
  const rug=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),mat(0x383a3d,.96));rug.rotation.x=-Math.PI/2;rug.position.set(5.65,.17,10.3);s.add(rug);
  box(s,.84,.68,1.74,6.2,.62,10.28,leather);box(s,.68,.16,1.48,6.08,.74,10.06,soft);box(s,.72,.54,.16,6.24,1,10.5,leather);
  for(const q of[-1,1]){const c=new THREE.Mesh(new THREE.CapsuleGeometry(.2,.28,4,12),soft);c.scale.set(1.04,1.14,.68);c.position.set(6.02,1,10.24+q*.42);c.castShadow=true;s.add(c);}
  cyl(s,.4,.08,5.12,.52,10.3,marble);const ring=new THREE.Mesh(new THREE.TorusGeometry(.33,.015,8,24),gold);ring.rotation.x=Math.PI/2;ring.position.set(5.12,.57,10.3);s.add(ring);cyl(s,.05,.36,5.12,.31,10.3,black);
  cyl(s,.23,.4,6.42,.22,13.1,pot);for(const [dx,dz,h] of[[0,0,1.08],[-.1,.02,.84],[.09,-.04,.92]] as Array<[number,number,number]>){const l=new THREE.Mesh(new THREE.SphereGeometry(.15,12,10),green);l.scale.set(.46,1.08,.3);l.position.set(6.42+dx,.45+h*.48,13.1+dz);l.castShadow=true;s.add(l);}
  const lx=5.12,lz=11.82;cyl(s,.16,.055,lx,.08,lz,gold);cyl(s,.025,1.42,lx,.8,lz,black);const sh=new THREE.Mesh(new THREE.ConeGeometry(.21,.28,20,1,true),black);sh.position.set(lx,1.58,lz);s.add(sh);const gl=new THREE.PointLight(0xffd39a,.55,3.5,2);gl.position.set(lx,1.45,lz);s.add(gl);
  const wg=new THREE.PointLight(0xffc46a,.95,4.8,2);wg.position.set(4,2.05,13.78);s.add(wg);s.userData.directorOffice={fresh:true,door:{x:1,z:12,width:1.5}};
}
function shell(s:THREE.Scene){
  const wall=mat(0x3f4650,.78),floor=mat(0xf0eee9,.92),corr=mat(0xe5e9ee,.9);
  box(s,W,.12,D,0,.06,(F+B)/2,floor);box(s,2,.025,D-.4,0,.125,(F+B)/2,corr);
  box(s,T,H,D,L,H/2,(F+B)/2,wall);box(s,T,H,D,R,H/2,(F+B)/2,wall);box(s,W,H,T,0,H/2,B,wall);box(s,5.8,H,T,-4.1,H/2,F,wall);box(s,5.8,H,T,4.1,H/2,F,wall);
  for(const z of[-2.5,2.5,9.5]){box(s,6,H,T,-4,H/2,z,wall);box(s,6,H,T,4,H/2,z,wall);}
  const desks=mat(0x95673a,.56),chair=mat(0x202830,.66);
  for(const [x,z] of[[-4.9,-5],[4.9,-5],[-4.9,0],[4.9,0]] as Array<[number,number]>){box(s,1.1,.12,2.1,x,.8,z,desks);box(s,.72,.14,.72,x+Math.sign(x)*1.05,.54,z,chair);}
  box(s,2.55,.14,1,-4.05,.84,12.85,desks);
  directorOffice(s);
}
export default function Office3D(){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const mount=ref.current;if(!mount)return;const scene=new THREE.Scene();scene.background=new THREE.Color(0xdce8e5);
    const cam=new THREE.PerspectiveCamera(48,mount.clientWidth/Math.max(1,mount.clientHeight),.1,120);cam.position.set(24,28,-29);
    const r=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});r.setPixelRatio(Math.min(devicePixelRatio,2));r.setSize(mount.clientWidth,mount.clientHeight);r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.05;mount.appendChild(r.domElement);
    const c=new OrbitControls(cam,r.domElement);c.enableDamping=true;c.dampingFactor=.07;c.minDistance=10;c.maxDistance=42;c.maxPolarAngle=Math.PI*.47;c.target.set(0,0,1.5);
    scene.add(new THREE.HemisphereLight(0xf8fbff,0x66717b,2.2));const sun=new THREE.DirectionalLight(0xfff3d2,3);sun.position.set(-8,18,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);scene.add(sun);shell(scene);
    let id=0;const loop=()=>{c.update();r.render(scene,cam);id=requestAnimationFrame(loop)};loop();const resize=()=>{const w=mount.clientWidth,h=Math.max(520,mount.clientHeight);cam.aspect=w/h;cam.updateProjectionMatrix();r.setSize(w,h)};resize();window.addEventListener("resize",resize);return()=>{cancelAnimationFrame(id);window.removeEventListener("resize",resize);c.dispose();r.dispose();if(r.domElement.parentElement===mount)mount.removeChild(r.domElement);}},[]);
  return <div className="office-3d-shell"><div ref={ref} style={{width:"100%",height:"100%",minHeight:520}}/></div>;
}
