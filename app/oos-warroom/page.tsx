"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OosWarroomRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // 🔍 หยิบสิทธิ์บริษัทของลูกค้าที่ล็อกอินสำเร็จออกมา
    // ... ในโดเมนต้นทาง (Hub)
  const rawTag = localStorage.getItem("customer_company_tag") || "rvp";
  const companySlug = rawTag.trim().toLowerCase();
  
  // แนบ tag ไปกับ query parameter เพื่อให้ปลายทางอ่านค่าได้ทันที
  const targetUrl = `https://riverpro-oos-warroom.vercel.app/executive/${companySlug}?tag=${companySlug}&openExternalBrowser=1`;
  window.location.href = targetUrl;
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-sans">
      <p className="text-xs font-bold text-slate-500 animate-pulse">
        🔄 กำลังตรวจสอบพิกัดอาณาเขตข้อมูลและเปิดหน้าต่าง OOS War Room...
      </p>
    </div>
  );
}
