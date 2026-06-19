/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Swal from "sweetalert2";
import { KeyRound } from "lucide-react";

type RoleType = "guest" | "admin" | "auditor" | "customer";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // 🟢 ฟังก์ชันล็อกอินตรวจสอบผ่านโครงสร้างตาราง user_profiles จริงหลังบ้าน
  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    try {
      // 🔍 ค้นหาประวัติบัญชีตรวจสอบผ่านฟิลด์ email โดยไม่สนใจตัวพิมพ์เล็กพิมพ์ใหญ่ (Case-Insensitive)
      // ⚡ ปรับปรุงจุดนี้: เปลี่ยนจาก .eq() เป็น .ilike() สำหรับฟิลด์ email ครับพี่ยอด
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select(
          "username, display_name, company_tag, password_text, email, is_active",
        )
        .ilike("email", email.trim()) // 👈 ใช้ ilike ตรวจสอบอีเมลแบบไม่สนตัวพิมพ์เล็ก-ใหญ่
        .eq("password_text", password.trim())
        .maybeSingle();

      if (error || !profile) {
        Swal.fire(
          "ล็อกอินล้มเหลว",
          "อีเมลหรือรหัสผ่านไม่ถูกต้องครับพี่นิวาส",
          "error",
        );
        setLoading(false);
        return;
      }

      if (!profile.is_active) {
        Swal.fire(
          "บัญชีถูกระงับ",
          "สิทธิ์การเข้าใช้งานของบัญชีนี้ถูกปิดกั้นชั่วคราว",
          "error",
        );
        setLoading(false);
        return;
      }

      // 🟢 แปลงค่าจาก company_tag มาวิเคราะห์ระดับสิทธิ์การเข้าถึงหน้าจอ (Role Routing)
      const tag = profile.company_tag ? profile.company_tag.toUpperCase() : "";
      let derivedRole: RoleType = "customer";

      if (tag === "ADMIN") {
        derivedRole = "admin";
      } else if (tag === "AUDITOR") {
        derivedRole = "auditor";
      }

      // 🎫 บันทึกข้อมูลลงฐานหน่วยความจำเครื่องพกพาเพื่อใช้งานข้ามหน้าจอ (Cross-Project Storage)
      localStorage.setItem("customer_username", profile.username || "");
      localStorage.setItem(
        "customer_display_name",
        profile.display_name || "Guest Partner",
      );
      localStorage.setItem("customer_company_tag", tag || "RVP");

      // เก็บลง sessionStorage รองรับระบบ War Room ตัวเก่าด้วยครับ
      sessionStorage.setItem("user_role", derivedRole);
      sessionStorage.setItem("user_display_name", profile.display_name || "");
      sessionStorage.setItem("user_company", tag.toLowerCase());
      sessionStorage.setItem("user_username", profile.username || "");

      Swal.fire({
        title: `ยินดีต้อนรับคุณ ${profile.display_name}`,
        text: "ผ่านการตรวจสอบความปลอดภัยของระบบพอร์ทัลกลางแล้ว",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      // 🚀 3. จัดการกระจายส่งตัวไปหน้าควบคุมงานตามระดับสิทธิ์จริงผ่านระเบียบ Routing (บังคับล้างแคช)
      if (derivedRole === "admin") {
        window.location.href = "/admin";
      } else if (derivedRole === "auditor") {
        // 🎯 ดีดส่งตัวพนักงานภาคสนามข้ามค่ายไปหาโดเมนหลักของฝั่ง fmbd-tools ทันทีครับพี่นิวาส!
        window.location.href =
          "https://fmbd-tools-niwat-wis-projects.vercel.app";
      } else {
        window.location.href = "/"; // ลูกค้าเข้าหน้า Hub หลักตามปกติ
      }
    } catch (err) {
      console.error("Login Error:", err);
      Swal.fire(
        "เกิดข้อผิดพลาด",
        "ระบบไม่สามารถเชื่อมต่อฐานข้อมูลส่วนกลางได้ในขณะนี้",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // 🟢 ปุ่มลัดทดสอบสิทธิ์สำหรับทีม Dev (Mock Mode)
  const handleMockLogin = (role: RoleType, mockTag: string, name: string) => {
    localStorage.setItem("customer_username", `mock_${role}`);
    localStorage.setItem("customer_display_name", name);
    localStorage.setItem("customer_company_tag", mockTag);

    sessionStorage.setItem("user_role", role);
    sessionStorage.setItem("user_display_name", name);
    sessionStorage.setItem("user_company", mockTag.toLowerCase());

    Swal.fire({
      title: `โหมดจำลองสิทธิ์: ${role.toUpperCase()}`,
      text: `กำลังเข้าใช้งานในค่าย ${mockTag}`,
      icon: "info",
      timer: 1000,
      showConfirmButton: false,
    }).then(() => {
      if (role === "customer") {
        window.location.href = "https://fmbd-customer-tools.vercel.app";
      } else {
        window.location.href = `/${role}`;
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans p-4 max-w-md mx-auto">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-7 w-full space-y-6 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-slate-900 to-blue-900"></div>

        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-800 mb-2 shadow-inner">
            <KeyRound size={22} />
          </div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">
            FMBD CUSTOMER HUB
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            โปรดเข้าสู่ระบบความมั่นคงหน้าร้านด้วยอีเมลบริษัท
          </p>
        </div>

        <form onSubmit={handleRealLogin} className="space-y-4 text-left">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
              📧 Email Address / อีเมลผู้ใช้งาน
            </label>
            <input
              type="text" // ⚡ เปลี่ยนเป็น text เผื่อกรณี autocomplete เติมอีเมลในบางเบราว์เซอร์
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="เช่น Niwat_wiy@riverpro.co.th"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-slate-900 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
              🔑 Password / รหัสผ่าน
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-slate-900 focus:bg-white transition-all font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all shadow-md active:scale-[0.99] cursor-pointer"
          >
            {loading
              ? "กำลังยืนยันสิทธิ์ความปลอดภัย..."
              : "เข้าสู่ระบบคลังข้อมูลคู่ค้า ➔"}
          </button>
        </form>

        <div className="h-px bg-slate-100 my-2"></div>

        {/* DEV MODE PANEL */}
        <div className="bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
          <p className="text-[9px] text-center text-slate-400 font-black uppercase tracking-wider mb-2">
            🛠️ แผงทดสอบระบบด่วนรายบริษัท (Dev Mode)
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() =>
                handleMockLogin("customer", "RVP", "ผจก. แบรนด์ Riverpro")
              }
              className="p-1.5 bg-slate-800 text-white rounded-lg text-[10px] font-black hover:opacity-95 cursor-pointer"
            >
              RVP
            </button>
            <button
              type="button"
              onClick={() =>
                handleMockLogin("customer", "LOXLEY", "ผู้บริหาร Loxley")
              }
              className="p-1.5 bg-slate-800 text-white rounded-lg text-[10px] font-black hover:opacity-95 cursor-pointer"
            >
              Loxley
            </button>
            <button
              type="button"
              onClick={() =>
                handleMockLogin("customer", "KEWPIE", "ทีมตรวจค่าย Kewpie")
              }
              className="p-1.5 bg-slate-800 text-white rounded-lg text-[10px] font-black hover:opacity-95 cursor-pointer"
            >
              Kewpie
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
