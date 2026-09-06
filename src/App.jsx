import { useState, useEffect, useCallback } from "react";
import emailjs from "@emailjs/browser";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL    = "https://wefvtxrhvhjhmjpltzcd.supabase.co";
const SUPABASE_KEY    = "sb_publishable_pxrcYHHOY0KnNG6vjNdM_w_534kbrAG";
const EMAILJS_SERVICE = "service_tpqo6ue";
const EMAILJS_TEMPLATE= "template_yuofybm";
const EMAILJS_PUBLIC  = "6q9Iq7CQPtWXQn99V";
const ADMIN_PASSWORD  = "SCHLF2026@RoyalTech";
const CREDIT_PER_LINK = 10000;
const ANNUAL_PREMIUM  = 50000;
const COMPANY = "Social Clique Health Link Foundation";
const ABBR    = "SCHLF";
const MANTRA  = "Good Health is Real Wealth";
const ADDRESS = "2B, Olawale Cole, Onitiri Avenue, Lekki Phase 1, Lagos, Nigeria.";
const EMAIL_ADDR = "schlf2026@gmail.com";
const PHONE   = "+234 806 163 1222";

const TEAL       = "#0B6E6E";
const TEAL_DARK  = "#084F4F";
const TEAL_LIGHT = "#E0F4F4";
const GOLD       = "#C9A84C";
const GOLD_LIGHT = "#FFF9EC";
const WHITE      = "#FFFFFF";
const DARK       = "#1A1A1A";
const MUTED      = "#6B7280";
const ERROR      = "#9F1239";
const SUCCESS    = "#166534";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const fmtNGN = (v) => "₦" + Number(v||0).toLocaleString("en-NG");
const genCode = (name) => {
  const ini = name.trim().split(" ").map(w=>w[0]?.toUpperCase()||"X").join("").slice(0,3);
  const rand = Math.random().toString(36).substring(2,6).toUpperCase();
  return `SCHLF-${ini}-${rand}`;
};
const addDays = (d,n) => { const r=new Date(d); r.setDate(r.getDate()+n); return r.toISOString(); };

const DB = {
  async getMembers() {
    const {data} = await supabase.from("schlf_members").select("*");
    const map = {};
    (data||[]).forEach(m => {
      map[m.link_code] = {
        linkCode:m.link_code, fullName:m.full_name, email:m.email, phone:m.phone,
        institution:m.institution, state:m.state, country:m.country, dob:m.dob,
        refCode:m.ref_code, status:m.status, memberType:m.member_type,
        linkActive:m.link_active, activatedAt:m.activated_at, expiresAt:m.expires_at,
        expendableBalance:Number(m.expendable_balance||0),
        reserveBalance:Number(m.reserve_balance||0),
        totalCredited:Number(m.total_credited||0),
        createdAt:m.created_at,
      };
    });
    return map;
  },
  async getCredits(code) {
    const {data} = await supabase.from("schlf_credits").select("*").eq("beneficiary_code",code).order("created_at",{ascending:false});
    return data||[];
  },
  async getCashouts(code) {
    const {data} = await supabase.from("schlf_cashouts").select("*").eq("link_code",code).order("created_at",{ascending:false});
    return data||[];
  },
  async getAllCashouts() {
    const {data} = await supabase.from("schlf_cashouts").select("*").order("created_at",{ascending:false});
    return data||[];
  },
};

const sendEmail = async ({to_email,to_name,subject,message}) => {
  try { await emailjs.send(EMAILJS_SERVICE,EMAILJS_TEMPLATE,{to_email,to_name,subject,message},EMAILJS_PUBLIC); }
  catch(e) { console.error("EmailJS:",e); }
};

export default function App() {
  const [view,setView]             = useState("landing");
  const [modal,setModal]           = useState(null);
  const [members,setMembers]       = useState({});
  const [note,setNote]             = useState(null);
  const [adminAuth,setAdminAuth]   = useState(false);
  const [adminPwd,setAdminPwd]     = useState("");
  const [adminPwdErr,setAdminPwdErr] = useState("");
  const [adminTab,setAdminTab]     = useState("members");
  const [portalTab,setPortalTab]   = useState("overview");
  const [currentMember,setCurrentMember] = useState(null);
  const [credits,setCredits]       = useState([]);
  const [cashouts,setCashouts]     = useState([]);
  const [allCashouts,setAllCashouts] = useState([]);
  const [loginCode,setLoginCode]   = useState("");
  const [loginErr,setLoginErr]     = useState("");
  const [regForm,setRegForm]       = useState({fullName:"",email:"",phone:"",institution:"",state:"",country:"Nigeria",dob:""});
  const [regErrors,setRegErrors]   = useState({});
  const [cashoutForm,setCashoutForm] = useState({amount:"",type:"regular",notes:""});
  const [cashoutErr,setCashoutErr] = useState("");

  const showNote = (msg,type="success") => { setNote({msg,type}); setTimeout(()=>setNote(null),4000); };
  const urlRef = new URLSearchParams(window.location.search).get("ref")||"";

  const loadMembers = useCallback(async()=>{ setMembers(await DB.getMembers()); },[]);
  useEffect(()=>{ loadMembers(); },[loadMembers]);
  useEffect(()=>{
    if(!currentMember) return;
    DB.getCredits(currentMember.linkCode).then(setCredits);
    DB.getCashouts(currentMember.linkCode).then(setCashouts);
  },[currentMember]);

  const refreshMember = async () => {
    const m = await DB.getMembers();
    setMembers(m);
    if(currentMember) setCurrentMember(m[currentMember.linkCode]||null);
  };

  const handleRegister = async () => {
    const errs={};
    ["fullName","email","phone","institution","state","dob"].forEach(k=>{ if(!regForm[k].trim()) errs[k]="Required"; });
    if(Object.keys(errs).length){ setRegErrors(errs); return; }
    const linkCode = genCode(regForm.fullName);
    const {error} = await supabase.from("schlf_members").insert({
      link_code:linkCode, full_name:regForm.fullName.trim(), email:regForm.email.trim(),
      phone:regForm.phone.trim(), institution:regForm.institution.trim(), state:regForm.state.trim(),
      country:regForm.country, dob:regForm.dob, ref_code:urlRef||null,
      status:"pending", member_type:"regular", link_active:false,
      expendable_balance:0, reserve_balance:0, total_credited:0,
    });
    if(error){ showNote("Registration failed. Please try again.","error"); return; }
    await sendEmail({to_email:EMAIL_ADDR,to_name:"SCHLF Admin",
      subject:`New SCHLF Registration — ${regForm.fullName}`,
      message:`New member:\nName: ${regForm.fullName}\nEmail: ${regForm.email}\nPhone: ${regForm.phone}\nLink Code: ${linkCode}\nReferred by: ${urlRef||"Direct"}\n\nMust pay ₦50,000 to activate.`});
    setModal({type:"reg_success",linkCode,name:regForm.fullName});
    setRegForm({fullName:"",email:"",phone:"",institution:"",state:"",country:"Nigeria",dob:""});
    setRegErrors({});
    loadMembers();
  };

  const handleLogin = async () => {
    setLoginErr("");
    const code = loginCode.trim().toUpperCase();
    const m = await DB.getMembers();
    const found = m[code];
    if(!found){ setLoginErr("Health Link ID not found."); return; }
    setCurrentMember(found);
    setLoginCode("");
    setModal(null);
    setPortalTab("overview");
    setView("portal");
  };

  const handleCashoutRequest = async () => {
    setCashoutErr("");
    const amt = Number(cashoutForm.amount);
    if(!amt||amt<10000){ setCashoutErr("Minimum cashout is ₦10,000."); return; }
    const m = currentMember;
    if(cashoutForm.type==="regular"){
      const max = Math.floor(m.expendableBalance*0.5);
      if(amt>max){ setCashoutErr(`Maximum regular cashout is 50% of expendable balance: ${fmtNGN(max)}.`); return; }
    } else {
      const max = Math.floor(m.reserveBalance*0.5);
      if(amt>max){ setCashoutErr(`Maximum emergency cashout is 50% of reserve balance: ${fmtNGN(max)}.`); return; }
      if(!cashoutForm.notes.trim()){ setCashoutErr("Please describe your health emergency."); return; }
    }
    await supabase.from("schlf_cashouts").insert({
      link_code:m.linkCode, full_name:m.fullName, email:m.email,
      amount:amt, type:cashoutForm.type, notes:cashoutForm.notes.trim(), status:"pending",
    });
    await sendEmail({to_email:EMAIL_ADDR,to_name:"SCHLF Admin",
      subject:`Cashout Request — ${m.fullName} (${cashoutForm.type})`,
      message:`Name: ${m.fullName}\nCode: ${m.linkCode}\nType: ${cashoutForm.type}\nAmount: ${fmtNGN(amt)}\nNotes: ${cashoutForm.notes||"N/A"}`});
    setCashoutForm({amount:"",type:"regular",notes:""});
    setModal(null);
    showNote("Cashout request submitted. Admin will process within 24 hours.");
    DB.getCashouts(m.linkCode).then(setCashouts);
  };

  const distributeCredits = async (newCode,refCode) => {
    if(!refCode) return;
    const m = await DB.getMembers();
    const levels = ["direct","indirect","extended"];
    let cur = refCode;
    for(let i=0;i<3;i++){
      const b = m[cur];
      if(!b) break;
      if(!b.linkActive){ cur=b.refCode; continue; }
      await supabase.from("schlf_credits").insert({beneficiary_code:cur,source_code:newCode,level:levels[i],amount:CREDIT_PER_LINK});
      await supabase.rpc("schlf_credit_member",{p_code:cur,p_amount:CREDIT_PER_LINK}).catch(async()=>{
        await supabase.from("schlf_members").update({
          expendable_balance:b.expendableBalance+(CREDIT_PER_LINK/2),
          reserve_balance:b.reserveBalance+(CREDIT_PER_LINK/2),
          total_credited:b.totalCredited+CREDIT_PER_LINK,
        }).eq("link_code",cur);
      });
      cur = b.refCode;
    }
  };

  const handleActivate = async (code) => {
    const m = members[code];
    const now = new Date().toISOString();
    const expires = addDays(now,365);
    await supabase.from("schlf_members").update({status:"active",link_active:true,activated_at:now,expires_at:expires}).eq("link_code",code);
    await distributeCredits(code,m.refCode);
    await sendEmail({to_email:EMAIL_ADDR,to_name:"SCHLF Admin",
      subject:`Forward to: ${m.fullName} | ${m.email} — SCHLF Health Link Activated`,
      message:`Dear ${m.fullName},\n\nYour SCHLF Health Link account is now ACTIVE!\n\nHealth Link ID: ${code}\nYour unique link: https://schlf-platform.vercel.app?ref=${code}\n\nShare your link. Every activation earns you ₦10,000 — up to 3 generations deep.\n\nExpires: ${new Date(expires).toLocaleDateString("en-NG",{day:"numeric",month:"long",year:"numeric"})}\n\n"${MANTRA}"\n\n${COMPANY}\n${ADDRESS}\n${EMAIL_ADDR}`});
    await loadMembers();
    showNote(`${m.fullName} activated successfully.`);
  };

  const handleRenew = async (code) => {
    const m = members[code];
    const now = new Date().toISOString();
    const expires = addDays(now,365);
    await supabase.from("schlf_members").update({status:"active",link_active:true,expires_at:expires,reminder_sent:false}).eq("link_code",code);
    await loadMembers();
    showNote(`${m.fullName} renewed for 12 months.`);
  };

  const handleApproveCashout = async (c) => {
    const m = members[c.link_code];
    if(!m) return;
    const amt = Number(c.amount);
    const updates = c.type==="regular"
      ? {expendable_balance:Math.max(0,m.expendableBalance-amt)}
      : {reserve_balance:Math.max(0,m.reserveBalance-amt)};
    await supabase.from("schlf_cashouts").update({status:"approved"}).eq("id",c.id);
    await supabase.from("schlf_members").update(updates).eq("link_code",c.link_code);
    await sendEmail({to_email:EMAIL_ADDR,to_name:"SCHLF Admin",
      subject:`Forward to: ${c.full_name} | ${c.email} — Cashout Approved`,
      message:`Dear ${c.full_name},\n\nYour ${c.type} cashout of ${fmtNGN(amt)} has been APPROVED and will be credited to your bank account within 24 hours.\n\n"${MANTRA}"\n${COMPANY}`});
    setAllCashouts(await DB.getAllCashouts());
    await loadMembers();
    showNote(`Cashout approved for ${c.full_name}.`);
  };

  const handleRejectCashout = async (c) => {
    await supabase.from("schlf_cashouts").update({status:"rejected"}).eq("id",c.id);
    setAllCashouts(await DB.getAllCashouts());
    showNote("Cashout rejected.");
  };

  const handleSuspend = async (code) => {
    await supabase.from("schlf_members").update({link_active:false,status:"suspended"}).eq("link_code",code);
    await loadMembers();
    showNote("Member suspended.");
  };

  const handleDelete = async (code,name) => {
    if(!window.confirm(`Permanently delete member "${name}" (${code})? This cannot be undone.`)) return;
    await supabase.from("schlf_credits").delete().eq("beneficiary_code",code);
    await supabase.from("schlf_cashouts").delete().eq("link_code",code);
    await supabase.from("schlf_members").delete().eq("link_code",code);
    await loadMembers();
    showNote(`${name} permanently deleted.`);
  };

  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',sans-serif;background:#F0F7F7;color:${DARK};min-height:100vh}
    .nav{background:linear-gradient(135deg,${TEAL_DARK},${TEAL});padding:12px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 2px 12px rgba(11,110,110,0.3)}
    .nav-logo{width:38px;height:38px;background:${WHITE};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer}
    .nav-name{color:${WHITE};font-weight:800;font-size:15px;cursor:pointer}
    .nav-sub{font-size:10px;color:rgba(255,255,255,0.6)}
    .nav-links{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .nav-btn{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:${WHITE};padding:7px 14px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;transition:all .2s}
    .nav-btn:hover{background:rgba(255,255,255,0.25)}
    .nav-btn-gold{background:${GOLD}!important;border-color:${GOLD}!important;color:${DARK}!important}
    .hero{background:linear-gradient(135deg,${TEAL_DARK} 0%,${TEAL} 60%,#0D8A8A 100%);padding:72px 24px 56px;text-align:center;position:relative;overflow:hidden}
    .hero-badge{display:inline-block;background:rgba(201,168,76,0.25);border:1px solid ${GOLD};color:${GOLD};font-size:12px;font-weight:700;padding:4px 16px;border-radius:20px;margin-bottom:16px;letter-spacing:1px}
    .hero-title{font-size:clamp(28px,5vw,52px);font-weight:900;color:${WHITE};line-height:1.15;margin-bottom:12px}
    .hero-title span{color:${GOLD}}
    .hero-sub{font-size:clamp(13px,2vw,17px);color:rgba(255,255,255,0.82);max-width:580px;margin:0 auto 28px;line-height:1.7}
    .hero-mantra{font-size:14px;font-style:italic;color:rgba(255,255,255,0.65);margin-bottom:32px}
    .hero-btns{display:flex;flex-direction:column;align-items:center;gap:12px}
    .btn{padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;border:none;font-family:inherit;transition:all .2s}
    .btn:disabled{opacity:.5;cursor:not-allowed}
    .btn-teal{background:${TEAL};color:${WHITE}}
    .btn-teal:hover:not(:disabled){background:${TEAL_DARK}}
    .btn-gold{background:${GOLD};color:${DARK}}
    .btn-gold:hover{opacity:.9}
    .btn-outline{background:transparent;border:2px solid rgba(255,255,255,0.5);color:${WHITE}}
    .btn-outline:hover{background:rgba(255,255,255,0.1)}
    .btn-outline-teal{background:transparent;border:2px solid ${TEAL};color:${TEAL}}
    .btn-sm{padding:7px 16px;font-size:12px}
    .btn-lg{padding:14px 36px;font-size:15px;width:100%;max-width:300px}
    .stats-bar{background:${GOLD};padding:14px 24px;display:flex;justify-content:space-around;gap:12px;flex-wrap:wrap}
    .stat-item{text-align:center}
    .stat-val{font-size:20px;font-weight:900;color:${TEAL_DARK}}
    .stat-lbl{font-size:10px;font-weight:700;color:${TEAL_DARK};opacity:.8;text-transform:uppercase;letter-spacing:.5px}
    .section{padding:56px 24px;max-width:1100px;margin:0 auto}
    .section-title{font-size:clamp(22px,3vw,32px);font-weight:900;color:${TEAL_DARK};text-align:center;margin-bottom:8px}
    .section-sub{font-size:15px;color:${MUTED};text-align:center;margin-bottom:40px;line-height:1.7}
    .card{background:${WHITE};border-radius:16px;padding:28px;box-shadow:0 4px 24px rgba(11,110,110,0.08);border:1px solid #D0EDED}
    .how-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}
    .how-card{background:${WHITE};border-radius:14px;padding:24px;box-shadow:0 2px 12px rgba(11,110,110,0.07);border:1px solid #D0EDED;text-align:center}
    .how-icon{font-size:36px;margin-bottom:12px}
    .how-title{font-size:15px;font-weight:800;color:${TEAL_DARK};margin-bottom:8px}
    .how-desc{font-size:13px;color:${MUTED};line-height:1.7}
    .credit-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:20px}
    .credit-cell{background:${TEAL_LIGHT};border-radius:10px;padding:16px;text-align:center}
    .credit-level{font-size:11px;font-weight:700;color:${TEAL};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
    .credit-amt{font-size:22px;font-weight:900;color:${TEAL_DARK}}
    .credit-desc{font-size:11px;color:${MUTED};margin-top:4px}
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px}
    .modal{background:${WHITE};border-radius:16px;padding:32px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,0.2)}
    .modal-title{font-size:20px;font-weight:900;color:${TEAL_DARK};margin-bottom:6px}
    .modal-sub{font-size:13px;color:${MUTED};margin-bottom:20px}
    .field{margin-bottom:14px}
    .field label{display:block;font-size:13px;font-weight:600;color:${TEAL_DARK};margin-bottom:5px}
    .field input,.field select,.field textarea{width:100%;padding:10px 14px;border:1.5px solid #C8E6E6;border-radius:8px;font-size:14px;font-family:inherit;outline:none;background:${WHITE};color:${DARK};transition:border .2s}
    .field input:focus,.field select:focus,.field textarea:focus{border-color:${TEAL}}
    .field-err{border-color:${ERROR}!important}
    .err-msg{font-size:11px;color:${ERROR};margin-top:3px}
    .notification{position:fixed;top:80px;right:20px;z-index:9999;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,0.15);max-width:340px}
    .note-success{background:#DCFCE7;color:${SUCCESS};border:1px solid #86EFAC}
    .note-error{background:#FEE2E2;color:${ERROR};border:1px solid #FCA5A5}
    .portal-wrap{max-width:900px;margin:0 auto;padding:32px 20px}
    .portal-header{background:linear-gradient(135deg,${TEAL_DARK},${TEAL});border-radius:16px;padding:28px;color:${WHITE};margin-bottom:24px}
    .balance-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
    .balance-card{background:rgba(255,255,255,0.12);border-radius:10px;padding:14px}
    .balance-label{font-size:11px;font-weight:700;opacity:.75;text-transform:uppercase;letter-spacing:.5px}
    .balance-val{font-size:22px;font-weight:900;margin-top:4px}
    .portal-tabs{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
    .portal-tab{padding:8px 18px;border-radius:8px;border:2px solid #C8E6E6;background:${WHITE};font-size:13px;font-weight:600;cursor:pointer;color:${TEAL_DARK};font-family:inherit;transition:all .2s}
    .portal-tab.active{background:${TEAL};border-color:${TEAL};color:${WHITE}}
    .status-pill{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700}
    .pill-active{background:#DCFCE7;color:${SUCCESS}}
    .pill-pending{background:#FEF9C3;color:#92400E}
    .pill-suspended{background:#FEE2E2;color:${ERROR}}
    .admin-wrap{max-width:1100px;margin:0 auto;padding:32px 20px}
    .admin-header{background:linear-gradient(135deg,${TEAL_DARK},${TEAL});border-radius:16px;padding:24px 28px;color:${WHITE};margin-bottom:24px}
    .admin-tabs{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
    .admin-tab{padding:8px 18px;border-radius:8px;border:2px solid #C8E6E6;background:${WHITE};font-size:13px;font-weight:600;cursor:pointer;color:${TEAL_DARK};font-family:inherit;transition:all .2s}
    .admin-tab.active{background:${TEAL};border-color:${TEAL};color:${WHITE}}
    .table-wrap{background:${WHITE};border-radius:12px;overflow:hidden;border:1px solid #D0EDED;box-shadow:0 2px 8px rgba(11,110,110,0.06)}
    .table-head{background:${TEAL_LIGHT};padding:12px 16px;font-size:11px;font-weight:700;color:${TEAL_DARK};text-transform:uppercase;letter-spacing:.5px}
    .table-row{padding:14px 16px;border-top:1px solid #EBF5F5;font-size:13px;align-items:center}
    .table-row:hover{background:#F7FDFD}
    .link-box{background:${TEAL_LIGHT};border:1.5px solid #A8D8D8;border-radius:10px;padding:16px;word-break:break-all;font-size:13px;color:${TEAL_DARK};margin-bottom:12px}
    .info-box{background:${GOLD_LIGHT};border:1.5px solid ${GOLD};border-radius:10px;padding:16px;margin-bottom:16px}
    .cta-section{background:linear-gradient(135deg,${TEAL_DARK},${TEAL});padding:64px 24px;text-align:center;color:${WHITE}}
    .footer{background:${TEAL_DARK};color:rgba(255,255,255,0.7);padding:32px 24px;text-align:center;font-size:13px;line-height:1.8}
    @media(max-width:600px){.balance-grid,.credit-row{grid-template-columns:1fr}.how-grid{grid-template-columns:1fr}}
  `;

  const allArr = Object.values(members);
  const pendingArr = allArr.filter(m=>m.status==="pending");
  const activeArr = allArr.filter(m=>m.status==="active");

  return (
    <>
      <style>{css}</style>

      {note && <div className={`notification ${note.type==="error"?"note-error":"note-success"}`}>{note.msg}</div>}

      {/* NAV */}
      <nav className="nav">
        <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setView("landing")}>
          <div className="nav-logo">🏥</div>
          <div>
            <div className="nav-name">{ABBR}</div>
            <div className="nav-sub">Health Link Foundation</div>
          </div>
        </div>
        <div className="nav-links">
          {currentMember ? (
            <>
              <button className="nav-btn" onClick={()=>{setPortalTab("overview");setView("portal");}}>My Portal</button>
              <button className="nav-btn" onClick={()=>{setCurrentMember(null);setView("landing");}}>Log Out</button>
            </>
          ) : (
            <>
              <button className="nav-btn" onClick={()=>setModal({type:"login"})}>Log In</button>
              <button className="nav-btn nav-btn-gold" onClick={()=>setView("register")}>Join Free</button>
            </>
          )}
          <button style={{opacity:.12,fontSize:10,padding:"4px 8px",background:"none",border:"none",color:"white",cursor:"pointer"}}
            onClick={()=>{setAdminPwd("");setAdminPwdErr("");setModal({type:"admin_login"});}}>
            [ADM]
          </button>
        </div>
      </nav>

      {/* LANDING */}
      {view==="landing" && (
        <>
          <div className="hero">
            <div className="hero-badge">🏥 {COMPANY}</div>
            <h1 className="hero-title">Your Emergency Response Network<br/><span>Is Your Critical Net Worth</span></h1>
            <p className="hero-sub">Registration is FREE. Contribute ₦50,000/year to Activate your Health Link ID on the Platform and unlock your Health Link to invite all your contacts. Share your link and start receiving ₦10,000 credits from third party activation stemming from your direct, Indirect and Extended link invite circulations — and build a lifetime health emergency reserve.</p>
            <p className="hero-mantra">🌿 "{MANTRA}"</p>
            <div className="hero-btns">
              <button className="btn btn-gold btn-lg" onClick={()=>setView("register")}>Register Free Today</button>
              <button className="btn btn-outline btn-lg" onClick={()=>setModal({type:"login"})}>Log In to My Portal</button>
            </div>
          </div>

          <div className="stats-bar">
            {[["₦50,000","Annual Premium"],["₦10,000","Credit per Direct Link"],["₦10,000","Credit per Indirect Link"],["₦10,000","Credit per Extended Link"],["50%","Monthly Cashout"],["50%","Health Emergency Reserve"]].map(([v,l])=>(
              <div key={l} className="stat-item"><div className="stat-val">{v}</div><div className="stat-lbl">{l}</div></div>
            ))}
          </div>

          <div className="section">
            <h2 className="section-title">How SCHLF Works</h2>
            <p className="section-sub">A simple, transparent health funding network built on the power of collective contribution Network.</p>
            <div className="how-grid">
              {[
                ["📋","Register Free","Create your SCHLF account at no cost. Simple, quick registration with no hidden charges."],
                ["🔑","Activate Your Health Link","Contribute ₦50,000 to unlock your unique Health Link ID — valid for 12 months."],
                ["🔗","Share Your Link","Forward your Health Link ID to contacts, friends, and family anywhere in Nigeria."],
                ["💰","₦10,000 Credited Per Third Party Activation","For every person who activates a Health Link through your direct link invite — your emergency health account is credited with ₦10,000 from distributed contributions."],
                ["🔄","₦10,000 Credited Per Fourth Party Activation","For every person who activates a Health Link through your indirect link invite (invites from your direct invites) — your emergency health account is credited with ₦10,000 from distributed contributions."],
                ["🔁","₦10,000 Credited Per Fifth Party Activation","For every person who activates a Health Link through your extended link invites (invites from your indirect invites) — your emergency health account is again credited with ₦10,000 from distributed contributions."],
                ["🏦","Cash Out Regularly While Building Your Reserve","Withdraw up to 50% of monthly credits anytime. The other 50% grows as your health emergency reserve for Emergency Health Care Situations Only."],
              ].map(([icon,title,desc])=>(
                <div key={title} className="how-card">
                  <div className="how-icon">{icon}</div>
                  <div className="how-title">{title}</div>
                  <div className="how-desc">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{background:WHITE,padding:"48px 24px"}}>
            <div style={{maxWidth:800,margin:"0 auto"}}>
              <h2 className="section-title">Your Credit Structure</h2>
              <p className="section-sub">Every activated link in your network earns you ₦10,000 — up to 3 levels deep. No cap.</p>
              <div className="credit-row">
                {[["Direct Outreach","₦10,000","People who activate directly through your link"],["Indirect Outreach","₦10,000","People who activate through your direct contacts' links"],["Extended Outreach","₦10,000","People who activate through your indirect contacts' links"]].map(([level,amt,desc])=>(
                  <div key={level} className="credit-cell">
                    <div className="credit-level">{level}</div>
                    <div className="credit-amt">{amt}</div>
                    <div className="credit-desc">{desc}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:20,background:TEAL_LIGHT,borderRadius:12,padding:20,textAlign:"center",fontSize:13,color:TEAL_DARK,lineHeight:1.8}}>
                <strong>No cap.</strong> Credits accumulate indefinitely. Your 50% expendable balance is available for cashout monthly. Your 50% reserve grows as your lifetime health emergency fund.
              </div>
            </div>
          </div>

          <div className="section">
            <h2 className="section-title">Your Two Balances</h2>
            <p className="section-sub">Every ₦10,000 credit is automatically split — half to spend, half to save.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,maxWidth:700,margin:"0 auto"}}>
              {[
                {icon:"💸",title:"Expendable Balance",color:TEAL,desc:"50% of every credit. Cash out up to your monthly accrued amount on demand. Processed within 24 hours by admin."},
                {icon:"🛡️",title:"Reserve Balance",color:GOLD,desc:"50% of every credit. Grows indefinitely as your lifetime health emergency fund. Accessible only for verified health emergencies with admin approval and proof of situation."},
              ].map(b=>(
                <div key={b.title} className="card" style={{textAlign:"center",borderTop:`4px solid ${b.color}`}}>
                  <div style={{fontSize:40,marginBottom:12}}>{b.icon}</div>
                  <div style={{fontWeight:800,fontSize:16,color:TEAL_DARK,marginBottom:8}}>{b.title}</div>
                  <div style={{fontSize:13,color:MUTED,lineHeight:1.7}}>{b.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="cta-section">
            <h2 style={{fontSize:"clamp(22px,3vw,36px)",fontWeight:900,marginBottom:12}}>Ready to Build Your Health Network?</h2>
            <p style={{fontSize:15,opacity:.85,maxWidth:560,margin:"0 auto 28px",lineHeight:1.7}}>
              Register free today. Activate your Health Link ID for just ₦50,000 per year and start building a health funding network that works for you — and for life.
            </p>
            <button className="btn btn-gold btn-lg" onClick={()=>setView("register")}>Register Free Now</button>
          </div>

          <div className="footer">
            <div style={{fontWeight:800,color:WHITE,fontSize:16,marginBottom:4}}>{COMPANY}</div>
            <div style={{fontStyle:"italic",color:"rgba(255,255,255,0.5)",marginBottom:8}}>"{MANTRA}"</div>
            <div>{ADDRESS}</div>
            <div>Email: {EMAIL_ADDR} | Phone: {PHONE}</div>
            <div style={{marginTop:12,fontSize:11,opacity:.5}}>© 2026 {COMPANY}. All rights reserved. SCHLF is a health link foundation and is not an insurance company, financial institution, or investment scheme.</div>
          </div>
        </>
      )}

      {/* REGISTER */}
      {view==="register" && (
        <div style={{padding:"40px 24px",background:"#F0F7F7",minHeight:"80vh"}}>
          <div className="card" style={{maxWidth:560,margin:"0 auto"}}>
            <button onClick={()=>setView("landing")} style={{background:"none",border:"none",color:MUTED,cursor:"pointer",fontSize:13,marginBottom:16}}>← Back</button>
            <div className="modal-title">Register for SCHLF</div>
            <div className="modal-sub">Free registration. Activate your Health Link ID after payment of ₦50,000 annual premium.</div>
            {urlRef && <div className="info-box" style={{fontSize:13,color:TEAL_DARK}}>🔗 Referred by: <strong>{urlRef}</strong></div>}
            {[["fullName","Full Name","text","Your legal full name"],["email","Email Address","email",""],["phone","Phone Number","tel",""],["institution","Institution / Organisation","text","University, workplace, etc."],["state","State of Residence","text",""],["dob","Date of Birth","date",""]].map(([key,label,type,ph])=>(
              <div className="field" key={key}>
                <label>{label}</label>
                <input type={type} placeholder={ph} className={regErrors[key]?"field-err":""} value={regForm[key]} onChange={e=>setRegForm({...regForm,[key]:e.target.value})}/>
                {regErrors[key]&&<div className="err-msg">{regErrors[key]}</div>}
              </div>
            ))}
            <div className="field">
              <label>Country</label>
              <select value={regForm.country} onChange={e=>setRegForm({...regForm,country:e.target.value})}>
                {["Nigeria","Ghana","Kenya","South Africa","Uganda","Tanzania","Rwanda","Zambia","Zimbabwe","United Kingdom","United States","Canada","Other"].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="info-box">
              <div style={{fontWeight:700,color:TEAL_DARK,marginBottom:6}}>After Registration — Activate Your Health Link:</div>
              <div style={{fontSize:13,color:TEAL_DARK,lineHeight:1.8}}>
                Pay <strong>₦50,000</strong> to activate your Health Link ID.<br/>
                Account Name: <strong>Royal Tech Partnership & Investment Limited</strong><br/>
                Account Number: <strong>1016621205</strong> | Bank: <strong>Zenith Bank</strong><br/>
                Reference: Your name + SCHLF<br/>
                Then WhatsApp: <strong>+234 909 999 4816</strong>
              </div>
            </div>
            <button className="btn btn-teal" style={{width:"100%"}} onClick={handleRegister}>Register Free</button>
          </div>
        </div>
      )}

      {/* PORTAL */}
      {view==="portal" && currentMember && (
        <div className="portal-wrap">
          <div className="portal-header">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
              <div>
                <div style={{fontWeight:900,fontSize:22}}>{currentMember.fullName}</div>
                <div style={{fontSize:13,opacity:.75,marginTop:4}}>Health Link ID: {currentMember.linkCode}</div>
                <div style={{marginTop:8}}>
                  <span className={`status-pill ${currentMember.status==="active"?"pill-active":currentMember.status==="suspended"?"pill-suspended":"pill-pending"}`}>
                    {currentMember.status==="active"?"✅ Active":currentMember.status==="suspended"?"⛔ Suspended":"⏳ Pending Activation"}
                  </span>
                  {currentMember.status==="active"&&currentMember.expiresAt&&(
                    <span style={{fontSize:11,marginLeft:8,opacity:.75}}>
                      Expires: {new Date(currentMember.expiresAt).toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"})}
                    </span>
                  )}
                  {currentMember.memberType==="founding"&&<span style={{marginLeft:8,fontSize:11,background:"rgba(201,168,76,0.3)",color:GOLD,padding:"2px 8px",borderRadius:10,fontWeight:700}}>🏅 Founding Member</span>}
                </div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={()=>{setCurrentMember(null);setView("landing");}}>Log Out</button>
            </div>
            <div className="balance-grid">
              <div className="balance-card">
                <div className="balance-label">💸 Expendable Balance</div>
                <div className="balance-val">{fmtNGN(currentMember.expendableBalance)}</div>
                <div style={{fontSize:11,opacity:.65,marginTop:2}}>50% available for cashout</div>
              </div>
              <div className="balance-card">
                <div className="balance-label">🛡️ Reserve Balance</div>
                <div className="balance-val">{fmtNGN(currentMember.reserveBalance)}</div>
                <div style={{fontSize:11,opacity:.65,marginTop:2}}>Health emergency fund</div>
              </div>
            </div>
          </div>

          <div className="portal-tabs">
            {[["overview","Overview"],["link","My Health Link"],["credits","Credit History"],["cashout","Cash Out"],["renew","Renew"]].map(([id,label])=>(
              <button key={id} className={`portal-tab${portalTab===id?" active":""}`} onClick={()=>setPortalTab(id)}>{label}</button>
            ))}
          </div>

          {portalTab==="overview" && (
            <div className="card">
              <div style={{fontWeight:800,fontSize:16,color:TEAL_DARK,marginBottom:16}}>Account Summary</div>
              {[["Total Credited",fmtNGN(currentMember.totalCredited)],["Expendable Balance",fmtNGN(currentMember.expendableBalance)],["Reserve Balance",fmtNGN(currentMember.reserveBalance)],["Member Type",currentMember.memberType==="founding"?"Founding Member 🏅":"Regular Member"],["Status",currentMember.status],["Member Since",currentMember.createdAt?new Date(currentMember.createdAt).toLocaleDateString("en-NG"):"—"]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #EBF5F5",fontSize:14}}>
                  <span style={{color:MUTED}}>{k}</span>
                  <span style={{fontWeight:700,color:TEAL_DARK}}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {portalTab==="link" && (
            <div className="card">
              <div style={{fontWeight:800,fontSize:16,color:TEAL_DARK,marginBottom:12}}>Your Health Link</div>
              {!currentMember.linkActive ? (
                <div className="info-box">
                  <div style={{fontWeight:700,color:TEAL_DARK,marginBottom:6}}>🔒 Health Link Not Active</div>
                  <div style={{fontSize:13,color:TEAL_DARK,lineHeight:1.8}}>
                    Pay ₦50,000 to activate your Health Link ID.<br/>
                    Royal Tech Partnership & Investment Limited<br/>
                    Zenith Bank — 1016621205<br/>
                    Reference: {currentMember.linkCode}<br/>
                    WhatsApp: +234 909 999 4816
                  </div>
                </div>
              ):(
                <>
                  <div style={{fontSize:13,color:MUTED,marginBottom:10}}>Share this link with your network. Every activation earns you ₦10,000.</div>
                  <div className="link-box">https://schlf-platform.vercel.app?ref={currentMember.linkCode}</div>
                  <button className="btn btn-teal btn-sm" onClick={()=>{navigator.clipboard.writeText(`https://schlf-platform.vercel.app?ref=${currentMember.linkCode}`);showNote("Link copied!");}}>Copy Link</button>
                </>
              )}
            </div>
          )}

          {portalTab==="credits" && (
            <div className="table-wrap">
              <div className="table-head" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12}}>
                <span>Date</span><span>From</span><span>Level</span><span>Amount</span>
              </div>
              {credits.length===0?(
                <div style={{padding:32,textAlign:"center",color:MUTED}}>No credits yet. Share your link to start earning.</div>
              ):credits.map((c,i)=>(
                <div key={i} className="table-row" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12}}>
                  <div>{new Date(c.created_at).toLocaleDateString("en-NG")}</div>
                  <div style={{fontSize:12,color:MUTED}}>{c.source_code}</div>
                  <div><span className="status-pill pill-active" style={{textTransform:"capitalize"}}>{c.level}</span></div>
                  <div style={{fontWeight:700,color:TEAL_DARK}}>{fmtNGN(c.amount)}</div>
                </div>
              ))}
            </div>
          )}

          {portalTab==="cashout" && (
            <div>
              <div className="card" style={{marginBottom:16}}>
                <div style={{fontWeight:800,fontSize:15,color:TEAL_DARK,marginBottom:14}}>Request a Cashout</div>
                <div style={{fontSize:13,color:MUTED,marginBottom:16,lineHeight:1.8,background:TEAL_LIGHT,borderRadius:8,padding:12}}>
                  <strong>Regular cashout:</strong> Up to 50% of expendable balance. Available: <strong>{fmtNGN(Math.floor(currentMember.expendableBalance*0.5))}</strong><br/>
                  <strong>Emergency cashout:</strong> Up to 50% of reserve balance. Available: <strong>{fmtNGN(Math.floor(currentMember.reserveBalance*0.5))}</strong> — requires proof of health emergency.
                </div>
                <div className="field">
                  <label>Cashout Type</label>
                  <select value={cashoutForm.type} onChange={e=>setCashoutForm({...cashoutForm,type:e.target.value})}>
                    <option value="regular">Regular Cashout (Expendable Balance)</option>
                    <option value="emergency">Emergency Cashout (Reserve Balance)</option>
                  </select>
                </div>
                <div className="field">
                  <label>Amount (₦)</label>
                  <input type="number" placeholder="Enter amount" value={cashoutForm.amount} onChange={e=>setCashoutForm({...cashoutForm,amount:e.target.value})}/>
                </div>
                {cashoutForm.type==="emergency" && (
                  <div className="field">
                    <label>Describe Your Health Emergency</label>
                    <textarea rows={4} placeholder="Provide details. Proof/documentation required by admin before approval." value={cashoutForm.notes} onChange={e=>setCashoutForm({...cashoutForm,notes:e.target.value})} style={{resize:"vertical"}}/>
                  </div>
                )}
                {cashoutErr&&<div style={{color:ERROR,fontSize:13,marginBottom:10}}>{cashoutErr}</div>}
                <button className="btn btn-teal" style={{width:"100%"}} onClick={handleCashoutRequest}>Submit Cashout Request</button>
              </div>
              {cashouts.length>0&&(
                <div className="table-wrap">
                  <div className="table-head" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12}}>
                    <span>Date</span><span>Type</span><span>Amount</span><span>Status</span>
                  </div>
                  {cashouts.map((c,i)=>(
                    <div key={i} className="table-row" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12}}>
                      <div>{new Date(c.created_at).toLocaleDateString("en-NG")}</div>
                      <div style={{textTransform:"capitalize",fontSize:12}}>{c.type}</div>
                      <div style={{fontWeight:700}}>{fmtNGN(c.amount)}</div>
                      <div><span className={`status-pill ${c.status==="approved"?"pill-active":c.status==="rejected"?"pill-suspended":"pill-pending"}`}>{c.status}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {portalTab==="renew" && (
            <div className="card">
              <div style={{fontWeight:800,fontSize:15,color:TEAL_DARK,marginBottom:12}}>Renew Your Health Link</div>
              <div style={{fontSize:13,color:MUTED,lineHeight:1.8,marginBottom:16}}>
                Annual renewal fee: <strong style={{color:TEAL_DARK}}>₦50,000</strong><br/>
                Renew before expiry to keep your Health Link active and all credit channels preserved.<br/>
                <strong>Credits during inactive periods are permanently lost and irreversible.</strong>
              </div>
              {currentMember.expiresAt&&(
                <div style={{background:TEAL_LIGHT,borderRadius:8,padding:12,fontSize:13,color:TEAL_DARK,marginBottom:16}}>
                  Current expiry: <strong>{new Date(currentMember.expiresAt).toLocaleDateString("en-NG",{day:"numeric",month:"long",year:"numeric"})}</strong>
                </div>
              )}
              <div className="info-box">
                <div style={{fontWeight:700,color:TEAL_DARK,marginBottom:6}}>Renewal Payment Details</div>
                <div style={{fontSize:13,color:TEAL_DARK,lineHeight:1.8}}>
                  Account Name: Royal Tech Partnership & Investment Limited<br/>
                  Account Number: 1016621205 | Bank: Zenith Bank<br/>
                  Amount: ₦50,000 | Reference: {currentMember.linkCode} — RENEWAL<br/>
                  After payment, notify via WhatsApp: +234 909 999 4816
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADMIN */}
      {view==="admin" && !adminAuth && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh",flexDirection:"column",gap:16}}>
          <div style={{fontSize:18,fontWeight:700,color:TEAL_DARK}}>Admin access required</div>
          <button className="btn btn-teal" onClick={()=>{setAdminPwd("");setAdminPwdErr("");setModal({type:"admin_login"});}}>Log In</button>
          <button className="btn btn-sm btn-outline-teal" onClick={()=>setView("landing")}>Back</button>
        </div>
      )}

      {view==="admin" && adminAuth && (
        <div className="admin-wrap">
          <div className="admin-header">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
              <div>
                <div style={{fontWeight:900,fontSize:22}}>SCHLF Admin Dashboard</div>
                <div style={{fontSize:13,opacity:.7,marginTop:2}}>{COMPANY}</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={()=>{setAdminAuth(false);setAdminPwd("");setView("landing");}}>🔒 Lock & Exit</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginTop:20}}>
              {[["Total Members",allArr.length],["Active",activeArr.length],["Pending",pendingArr.length],["Founding",allArr.filter(m=>m.memberType==="founding").length],["Total Credits",fmtNGN(allArr.reduce((s,m)=>s+m.totalCredited,0))]].map(([l,v])=>(
                <div key={l} style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:12}}>
                  <div style={{fontSize:20,fontWeight:900}}>{v}</div>
                  <div style={{fontSize:11,opacity:.7,textTransform:"uppercase",letterSpacing:.5}}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-tabs">
            {[["members","All Members"],["pending","Pending Activation"],["cashouts","Cashout Queue"],["founding","Founding Members"]].map(([id,label])=>(
              <button key={id} className={`admin-tab${adminTab===id?" active":""}`}
                onClick={async()=>{setAdminTab(id);if(id==="cashouts"){setAllCashouts(await DB.getAllCashouts());}}}>
                {label}
              </button>
            ))}
          </div>

          {adminTab==="members" && (
            <div className="table-wrap">
              <div className="table-head" style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr 1fr 80px",gap:12}}>
                <span>Member</span><span>Institution</span><span>Type</span><span>Expendable</span><span>Reserve</span><span>Status</span><span>Delete</span>
              </div>
              {allArr.length===0?<div style={{padding:32,textAlign:"center",color:MUTED}}>No members yet.</div>:allArr.map(m=>(
                <div key={m.linkCode} className="table-row" style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr 1fr 80px",gap:12,alignItems:"center"}}>
                  <div><div style={{fontWeight:700}}>{m.fullName}</div><div style={{fontSize:11,color:MUTED}}>{m.email}</div><div style={{fontSize:11,color:TEAL}}>{m.linkCode}</div></div>
                  <div style={{fontSize:12}}>{m.institution}</div>
                  <div><span style={{fontSize:11,background:m.memberType==="founding"?GOLD_LIGHT:TEAL_LIGHT,color:m.memberType==="founding"?GOLD:TEAL,padding:"2px 8px",borderRadius:10,fontWeight:700}}>{m.memberType==="founding"?"Founding":"Regular"}</span></div>
                  <div style={{fontWeight:700,color:TEAL_DARK,fontSize:13}}>{fmtNGN(m.expendableBalance)}</div>
                  <div style={{fontWeight:700,color:GOLD,fontSize:13}}>{fmtNGN(m.reserveBalance)}</div>
                  <div>
                    <span className={`status-pill ${m.status==="active"?"pill-active":m.status==="suspended"?"pill-suspended":"pill-pending"}`}>{m.status}</span>
                    {m.status==="active"&&<button style={{display:"block",marginTop:4,fontSize:10,background:"#FEE2E2",color:ERROR,border:"none",borderRadius:6,padding:"3px 8px",cursor:"pointer"}} onClick={()=>handleSuspend(m.linkCode)}>Suspend</button>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <button onClick={()=>handleDelete(m.linkCode,m.fullName)} style={{background:"#FEE2E2",border:"none",borderRadius:6,color:ERROR,fontSize:11,fontWeight:700,padding:"6px 10px",cursor:"pointer"}}>🗑 Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {adminTab==="pending" && (
            <div className="table-wrap">
              <div className="table-head" style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr 160px",gap:12}}>
                <span>Member</span><span>Institution</span><span>Country</span><span>Referred By</span><span>Action</span>
              </div>
              {pendingArr.length===0?<div style={{padding:32,textAlign:"center",color:MUTED}}>No pending activations.</div>:pendingArr.map(m=>(
                <div key={m.linkCode} className="table-row" style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr 160px",gap:12,alignItems:"center"}}>
                  <div><div style={{fontWeight:700}}>{m.fullName}</div><div style={{fontSize:11,color:MUTED}}>{m.email}</div><div style={{fontSize:11,color:MUTED}}>{m.phone}</div><div style={{fontSize:11,color:TEAL}}>{m.linkCode}</div></div>
                  <div style={{fontSize:12}}>{m.institution}</div>
                  <div style={{fontSize:12}}>{m.country}</div>
                  <div style={{fontSize:12,color:MUTED}}>{m.refCode||"Direct"}</div>
                  <div>
                    <button className="btn btn-teal btn-sm" style={{width:"100%",marginBottom:4}} onClick={()=>handleActivate(m.linkCode)}>✅ Activate Health Link</button>
                    <button style={{width:"100%",padding:"5px",fontSize:11,background:"#FEE2E2",color:ERROR,border:"none",borderRadius:6,cursor:"pointer"}} onClick={()=>handleDelete(m.linkCode,m.fullName)}>🗑 Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {adminTab==="cashouts" && (
            <div className="table-wrap">
              <div className="table-head" style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1.5fr 1fr 160px",gap:12}}>
                <span>Member</span><span>Type</span><span>Amount</span><span>Notes</span><span>Status</span><span>Action</span>
              </div>
              {allCashouts.length===0?<div style={{padding:32,textAlign:"center",color:MUTED}}>No cashout requests.</div>:allCashouts.map((c,i)=>(
                <div key={i} className="table-row" style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1.5fr 1fr 160px",gap:12,alignItems:"center"}}>
                  <div><div style={{fontWeight:700}}>{c.full_name}</div><div style={{fontSize:11,color:MUTED}}>{c.link_code}</div></div>
                  <div><span style={{textTransform:"capitalize",fontSize:12,fontWeight:600,color:c.type==="emergency"?ERROR:TEAL}}>{c.type}</span></div>
                  <div style={{fontWeight:700,color:TEAL_DARK}}>{fmtNGN(c.amount)}</div>
                  <div style={{fontSize:11,color:MUTED}}>{c.notes||"—"}</div>
                  <div><span className={`status-pill ${c.status==="approved"?"pill-active":c.status==="rejected"?"pill-suspended":"pill-pending"}`}>{c.status}</span></div>
                  <div>
                    {c.status==="pending"&&(
                      <>
                        <button className="btn btn-teal btn-sm" style={{width:"100%",marginBottom:4}} onClick={()=>handleApproveCashout(c)}>✅ Approve</button>
                        <button style={{width:"100%",padding:"5px",fontSize:11,background:"#FEE2E2",color:ERROR,border:"none",borderRadius:6,cursor:"pointer"}} onClick={()=>handleRejectCashout(c)}>✗ Reject</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {adminTab==="founding" && (
            <div>
              <div className="card" style={{marginBottom:16}}>
                <div style={{fontWeight:800,fontSize:15,color:TEAL_DARK,marginBottom:8}}>Founding Members — Permanent Root Links</div>
                <div style={{fontSize:13,color:MUTED,lineHeight:1.8}}>
                  Founding members hold permanently active Health Link IDs with no annual premium requirement. They participate in the credit chain as root links and receive ₦10,000 credits from all members who registered through their links — up to 3 generations deep.
                </div>
              </div>
              <div className="table-wrap">
                <div className="table-head" style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr",gap:12}}>
                  <span>Name</span><span>Link Code</span><span>Expendable</span><span>Reserve</span><span>Total Credited</span>
                </div>
                {allArr.filter(m=>m.memberType==="founding").length===0?(
                  <div style={{padding:32,textAlign:"center",color:MUTED}}>No founding members yet. Insert them directly in Supabase with member_type = 'founding' and link_active = true.</div>
                ):allArr.filter(m=>m.memberType==="founding").map(m=>(
                  <div key={m.linkCode} className="table-row" style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr",gap:12}}>
                    <div><div style={{fontWeight:700}}>{m.fullName}</div><div style={{fontSize:11,color:MUTED}}>{m.email}</div></div>
                    <div style={{fontSize:12,color:TEAL,fontWeight:600}}>{m.linkCode}</div>
                    <div style={{fontWeight:700,color:TEAL_DARK}}>{fmtNGN(m.expendableBalance)}</div>
                    <div style={{fontWeight:700,color:GOLD}}>{fmtNGN(m.reserveBalance)}</div>
                    <div style={{fontWeight:700}}>{fmtNGN(m.totalCredited)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {modal?.type==="admin_login" && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setModal(null)}>
          <div className="modal" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Admin Access</div>
            <div className="modal-sub">SCHLF Admin Dashboard</div>
            <div className="field">
              <label>Password</label>
              <input type="password" placeholder="Enter admin password" value={adminPwd}
                onChange={e=>{setAdminPwd(e.target.value);setAdminPwdErr("");}}
                onKeyDown={e=>{if(e.key==="Enter"){if(adminPwd===ADMIN_PASSWORD){setAdminAuth(true);setModal(null);setView("admin");setAdminTab("members");}else setAdminPwdErr("Incorrect password.");}}}/>
              {adminPwdErr&&<div className="err-msg">{adminPwdErr}</div>}
            </div>
            <button className="btn btn-teal" style={{width:"100%",marginBottom:8}}
              onClick={()=>{if(adminPwd===ADMIN_PASSWORD){setAdminAuth(true);setModal(null);setView("admin");setAdminTab("members");}else setAdminPwdErr("Incorrect password.");}}>Log In</button>
            <button className="btn btn-sm btn-outline-teal" style={{width:"100%"}} onClick={()=>setModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {modal?.type==="login" && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setModal(null)}>
          <div className="modal" style={{maxWidth:400}} onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Log In to Your Portal</div>
            <div className="modal-sub">Enter your Health Link ID to access your account.</div>
            <div className="field">
              <label>Health Link ID</label>
              <input type="text" placeholder="e.g. SCHLF-EIG-AB12" value={loginCode}
                onChange={e=>{setLoginCode(e.target.value.toUpperCase());setLoginErr("");}}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
              {loginErr&&<div className="err-msg">{loginErr}</div>}
            </div>
            <button className="btn btn-teal" style={{width:"100%",marginBottom:8}} onClick={handleLogin}>Log In</button>
            <button className="btn btn-sm btn-outline-teal" style={{width:"100%"}} onClick={()=>setModal(null)}>Cancel</button>
            <div style={{fontSize:12,color:MUTED,marginTop:12,textAlign:"center"}}>
              No account yet?{" "}<button style={{background:"none",border:"none",color:TEAL,cursor:"pointer",fontWeight:600,fontSize:12}} onClick={()=>{setModal(null);setView("register");}}>Register Free</button>
            </div>
          </div>
        </div>
      )}

      {modal?.type==="reg_success" && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div className="modal" style={{maxWidth:460,textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:12}}>🎉</div>
            <div className="modal-title" style={{textAlign:"center"}}>Registration Successful!</div>
            <div style={{fontSize:14,color:MUTED,margin:"12px 0 20px",lineHeight:1.7}}>Welcome, <strong>{modal.name}</strong>! Your Health Link ID is:</div>
            <div style={{background:TEAL_LIGHT,border:`2px solid ${TEAL}`,borderRadius:10,padding:16,fontSize:18,fontWeight:900,color:TEAL_DARK,marginBottom:20,letterSpacing:2}}>{modal.linkCode}</div>
            <div className="info-box" style={{textAlign:"left"}}>
              <div style={{fontWeight:700,color:TEAL_DARK,marginBottom:6}}>Next Step — Activate Your Health Link:</div>
              <div style={{fontSize:13,color:TEAL_DARK,lineHeight:1.8}}>
                Pay ₦50,000 to:<br/><strong>Royal Tech Partnership & Investment Limited</strong><br/>Zenith Bank — 1016621205<br/>Reference: <strong>{modal.linkCode}</strong><br/>Then WhatsApp: <strong>+234 909 999 4816</strong>
              </div>
            </div>
            <button className="btn btn-teal" style={{width:"100%"}} onClick={()=>{setModal(null);setView("landing");}}>Done</button>
          </div>
        </div>
      )}
    </>
  );
}
