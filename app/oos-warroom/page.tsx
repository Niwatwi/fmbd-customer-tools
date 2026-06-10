"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OosWarroomRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // 1. ดึงค่าจาก URL
    const urlParams = new URLSearchParams(window.location.search);
    const tagFromUrl = urlParams.get('tag');

    // 2. ถ้ามี tag ให้เซฟลง localStorage
    if (tagFromUrl) {
      localStorage.setItem("customer_company_tag", tagFromUrl);
      localStorage.setItem("customer_username", "executive_user");
      console.log("War Room: ได้รับสิทธิ์จาก URL แล้ว");
    }

    // 3. ตรวจสอบสิทธิ์
    const storedUser = localStorage.getItem("customer_username");
    
    if (!storedUser) {
        console.warn("War Room: ไม่มีข้อมูลสิทธิ์, กำลังไปหน้า Login");
        // เปลี่ยนเป็น windows.location.href ถ้าต้องการโหลดหน้าใหม่ทั้งหมด
        window.location.href = "https://fmbd-customer-tools-egqddg3cl-niwat-wis-projects.vercel.app/login?openExternalBrowser=1";
    } else {
        // แทนที่จะ set state ให้ย้ายไปหน้าหลักทันที
        const tag = localStorage.getItem("customer_company_tag") || "rvp";
        console.log("War Room: ผ่านสิทธิ์แล้ว, กำลังส่งไปหน้า Dashboard...");
        router.replace(`/executive/${tag}`); 
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-sans">
      <p className="text-xs font-bold text-slate-500 animate-pulse">
        🔄 กำลังตรวจสอบพิกัดอาณาเขตข้อมูลและเปิดหน้าต่าง OOS War Room...
      </p>
    </div>
  );
}
