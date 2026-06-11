"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OosWarroomRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // 🔍 หยิบสิทธิ์บริษัทของลูกค้าที่ล็อกอินสำเร็จออกมา
    const rawTag = localStorage.getItem("customer_company_tag");

    if (!rawTag) {
      // หากไม่มีข้อมูล ให้ดีดกลับไปหน้า Login หรือหน้าหลักแทน
      router.push("/login");
      return;
    }
    const companySlug = rawTag.trim().toLowerCase();

    // 🔗 URL ปลายทางโครงสร้างหลักของพี่นิวาส
    const targetUrl = `https://riverpro-oos-warroom.vercel.app/executive/${companySlug}?openExternalBrowser=1`;

    // 🚀 สั่งถีบเปิดหน้าจอแสดงผลรายงานทันที พร้อมกระโดดข้ามหน้าประวัติกลับมาที่ Hub หลัก
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
